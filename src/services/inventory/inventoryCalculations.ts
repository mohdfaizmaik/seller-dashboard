import type { Order } from '../../models/order';
import type { InventoryItem } from './inventoryService';
import { PRODUCTS_CATALOG } from '../../data/products';

export interface SkuVelocity {
  sku: string;
  units7: number;
  units14: number;
  units30: number;
  v7: number;        // Units / day over trailing 7 days
  v14: number;       // Units / day over trailing 14 days
  v30: number;       // Units / day over trailing 30 days
  vDaily: number;    // Weighted daily velocity (0.5*v7 + 0.3*v14 + 0.2*v30)
}

export type RestockUrgency =
  | 'STOCKOUT'
  | 'CRITICAL_STOCKOUT_RISK'
  | 'REORDER_NOW'
  | 'HEALTHY'
  | 'OVERSTOCKED'
  | 'DEAD_STOCK';

export interface RestockMetrics {
  sku: string;
  productName: string;
  marketplace: 'amazon' | 'flipkart' | 'all';
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  unitCost: number;
  sellingPrice: number;
  leadTimeDays: number;
  safetyStockDays: number;
  velocity: SkuVelocity;
  doi: number;             // Days of Inventory Remaining
  rop: number;             // Reorder Point (Units)
  recommendedReorderQty: number; // Suggested PO Reorder Units
  reorderPoValue: number;  // Suggested PO Reorder Investment (INR)
  urgency: RestockUrgency;
  urgencyReason: string;
}

export interface DeadStockItem {
  sku: string;
  productName: string;
  currentStock: number;
  lockedValue: number;
  doi: number;
  urgency: 'OVERSTOCKED' | 'DEAD_STOCK';
  recommendedLiquidationAction: string;
}

export interface WorkingCapitalSummary {
  totalAssetValue: number;        // Total value of inventory on hand (currentStock * unitCost)
  activeCapital: number;          // Capital deployed in active/healthy inventory
  lockedDeadCapital: number;      // Capital trapped in overstocked and dead stock
  deadCapitalRatio: number;       // Percentage of capital trapped
  totalSkus: number;
  stockoutCount: number;
  criticalRiskCount: number;
  reorderNowCount: number;
  healthyCount: number;
  overstockedCount: number;
  deadStockCount: number;
  totalReorderPoValue: number;    // Total capital required for immediate restocks
  dailyStockoutLossRate: number;  // Lost gross revenue / day due to stocked out items
  deadStockList: DeadStockItem[];
}

/**
 * Resolves the reference anchor date.
 * If orders exist, defaults to the latest order timestamp; otherwise falls back to Aug 10, 2026.
 */
export function resolveAnchorDate(orders: Order[], anchorDate?: Date): Date {
  if (anchorDate) {
    return new Date(anchorDate.getTime());
  }

  if (orders && orders.length > 0) {
    let maxTime = -Infinity;
    for (const o of orders) {
      const raw = o.orderDate || o.date;
      if (raw) {
        const t = new Date(raw).getTime();
        if (!isNaN(t) && t > maxTime) {
          maxTime = t;
        }
      }
    }
    if (maxTime > 0) {
      return new Date(maxTime);
    }
  }

  return new Date(2026, 7, 10); // Standard August 10, 2026 anchor
}

/**
 * Computes trailing sales velocity (V7, V14, V30) and blended daily run rate.
 * Uses weighted formula: V_daily = 0.5 * V7 + 0.3 * V14 + 0.2 * V30.
 */
export function computeSkuVelocity(orders: Order[], sku: string, anchorDate?: Date): SkuVelocity {
  const normSku = (sku || '').trim().toLowerCase();
  const anchor = resolveAnchorDate(orders, anchorDate);
  const anchorMs = anchor.getTime();

  const ms7 = anchorMs - 7 * 24 * 60 * 60 * 1000;
  const ms14 = anchorMs - 14 * 24 * 60 * 60 * 1000;
  const ms30 = anchorMs - 30 * 24 * 60 * 60 * 1000;

  let units7 = 0;
  let units14 = 0;
  let units30 = 0;

  for (const o of orders) {
    if (o.status === 'cancelled') continue;

    const oSku = (o.sku || '').trim().toLowerCase();
    const isMatch = oSku === normSku || (o.productId && PRODUCTS_CATALOG.find((p) => p.id === o.productId)?.sku.toLowerCase() === normSku);
    if (!isMatch) continue;

    const raw = o.orderDate || o.date;
    if (!raw) continue;

    const t = new Date(raw).getTime();
    if (isNaN(t) || t > anchorMs) continue;

    const qty = o.quantity || 1;

    if (t >= ms7) {
      units7 += qty;
    }
    if (t >= ms14) {
      units14 += qty;
    }
    if (t >= ms30) {
      units30 += qty;
    }
  }

  const v7 = Math.round((units7 / 7) * 100) / 100;
  const v14 = Math.round((units14 / 14) * 100) / 100;
  const v30 = Math.round((units30 / 30) * 100) / 100;

  const vDaily = Math.round((0.5 * v7 + 0.3 * v14 + 0.2 * v30) * 100) / 100;

  return {
    sku,
    units7,
    units14,
    units30,
    v7,
    v14,
    v30,
    vDaily
  };
}

/**
 * Computes Days of Inventory (DOI), Reorder Point (ROP), recommended reorder quantity,
 * supplier PO value, and restock urgency classification.
 */
export function computeRestockMetrics(
  item: InventoryItem,
  orders: Order[],
  anchorDate?: Date
): RestockMetrics {
  const availableStock = Math.max(0, item.currentStock - item.reservedStock);
  const velocity = computeSkuVelocity(orders, item.sku, anchorDate);

  // Look up catalog selling price
  const catalogProd = PRODUCTS_CATALOG.find((p) => p.sku.toLowerCase() === item.sku.toLowerCase());
  let sellingPrice = catalogProd?.sellingPrice || 0;

  if (sellingPrice === 0) {
    // Derive from matching orders if not in catalog
    const matchingOrder = orders.find((o) => (o.sku || '').toLowerCase() === item.sku.toLowerCase() && (o.orderValue || o.gross_amount));
    if (matchingOrder) {
      sellingPrice = (matchingOrder.gross_amount || matchingOrder.orderValue || 0) / (matchingOrder.quantity || 1);
    } else {
      sellingPrice = item.unitCost > 0 ? item.unitCost * 1.6 : 500;
    }
  }

  // Days of inventory (DOI)
  let doi: number;
  if (velocity.vDaily > 0) {
    doi = Math.round((availableStock / velocity.vDaily) * 10) / 10;
  } else {
    doi = availableStock > 0 ? 999 : 0;
  }

  // Reorder Point (ROP) = Math.ceil(vDaily * (leadTime + safetyStock))
  const rop = Math.ceil(velocity.vDaily * (item.leadTimeDays + item.safetyStockDays));

  // Recommended Reorder Quantity to achieve 30 days of inventory buffer:
  // Math.max(0, Math.ceil(vDaily * 30) - availableStock)
  let recommendedReorderQty = 0;
  if (velocity.vDaily > 0) {
    const target30d = Math.ceil(velocity.vDaily * 30);
    recommendedReorderQty = Math.max(0, target30d - availableStock);
  }

  const reorderPoValue = Math.round(recommendedReorderQty * item.unitCost);

  // Urgency classification
  let urgency: RestockUrgency;
  let urgencyReason: string;

  if (availableStock === 0) {
    urgency = 'STOCKOUT';
    urgencyReason = 'Stockout: 0 sellable units remaining. Listings lose Buy Box and organic ranking.';
  } else if (doi <= item.leadTimeDays) {
    urgency = 'CRITICAL_STOCKOUT_RISK';
    urgencyReason = `Critical Risk: Only ${doi.toFixed(1)} days of stock left, which is less than supplier lead time (${item.leadTimeDays}d).`;
  } else if (doi <= (item.leadTimeDays + item.safetyStockDays)) {
    urgency = 'REORDER_NOW';
    urgencyReason = `Reorder Now: Stock covers ${doi.toFixed(1)} days, currently eroding safety buffer (${item.safetyStockDays}d).`;
  } else if (velocity.units30 === 0 && availableStock > 0) {
    urgency = 'DEAD_STOCK';
    urgencyReason = 'Dead Stock: Zero sales recorded in trailing 30 days while holding idle inventory.';
  } else if (doi > 120) {
    urgency = 'DEAD_STOCK';
    urgencyReason = `Dead Stock: Inventory coverage exceeds 120 days (${doi.toFixed(0)}d) at current velocity.`;
  } else if (doi > 60) {
    urgency = 'OVERSTOCKED';
    urgencyReason = `Overstocked: Stock covers ${doi.toFixed(0)} days of sales, tying up working capital.`;
  } else {
    urgency = 'HEALTHY';
    urgencyReason = `Healthy: Stock runway (${doi.toFixed(1)}d) maintains optimal buffer against supplier lead time.`;
  }

  return {
    sku: item.sku,
    productName: item.productName,
    marketplace: item.marketplace,
    currentStock: item.currentStock,
    reservedStock: item.reservedStock,
    availableStock,
    unitCost: item.unitCost,
    sellingPrice,
    leadTimeDays: item.leadTimeDays,
    safetyStockDays: item.safetyStockDays,
    velocity,
    doi,
    rop,
    recommendedReorderQty,
    reorderPoValue,
    urgency,
    urgencyReason
  };
}

/**
 * Computes high-level working capital analysis, locked dead capital,
 * and daily stockout lost revenue across the inventory portfolio.
 */
export function computeWorkingCapitalSummary(
  items: InventoryItem[],
  orders: Order[],
  anchorDate?: Date
): WorkingCapitalSummary {
  let totalAssetValue = 0;
  let activeCapital = 0;
  let lockedDeadCapital = 0;
  let totalReorderPoValue = 0;
  let dailyStockoutLossRate = 0;

  let stockoutCount = 0;
  let criticalRiskCount = 0;
  let reorderNowCount = 0;
  let healthyCount = 0;
  let overstockedCount = 0;
  let deadStockCount = 0;

  const deadStockList: DeadStockItem[] = [];

  for (const item of items) {
    const metrics = computeRestockMetrics(item, orders, anchorDate);
    const itemAssetValue = item.currentStock * item.unitCost;
    totalAssetValue += itemAssetValue;

    switch (metrics.urgency) {
      case 'STOCKOUT':
        stockoutCount += 1;
        if (metrics.velocity.vDaily > 0) {
          dailyStockoutLossRate += metrics.velocity.vDaily * metrics.sellingPrice;
        } else if (metrics.velocity.v30 > 0) {
          dailyStockoutLossRate += metrics.velocity.v30 * metrics.sellingPrice;
        }
        totalReorderPoValue += metrics.reorderPoValue;
        break;

      case 'CRITICAL_STOCKOUT_RISK':
        criticalRiskCount += 1;
        activeCapital += itemAssetValue;
        totalReorderPoValue += metrics.reorderPoValue;
        break;

      case 'REORDER_NOW':
        reorderNowCount += 1;
        activeCapital += itemAssetValue;
        totalReorderPoValue += metrics.reorderPoValue;
        break;

      case 'HEALTHY':
        healthyCount += 1;
        activeCapital += itemAssetValue;
        break;

      case 'OVERSTOCKED':
        overstockedCount += 1;
        lockedDeadCapital += itemAssetValue;
        deadStockList.push({
          sku: item.sku,
          productName: item.productName,
          currentStock: item.currentStock,
          lockedValue: itemAssetValue,
          doi: metrics.doi,
          urgency: 'OVERSTOCKED',
          recommendedLiquidationAction: 'Run 15-20% lightning deal or bundle promotion to accelerate turnover back to healthy 45d runway.'
        });
        break;

      case 'DEAD_STOCK':
        deadStockCount += 1;
        lockedDeadCapital += itemAssetValue;
        deadStockList.push({
          sku: item.sku,
          productName: item.productName,
          currentStock: item.currentStock,
          lockedValue: itemAssetValue,
          doi: metrics.doi,
          urgency: 'DEAD_STOCK',
          recommendedLiquidationAction: 'Liquidate with 30-40% markdown or clearance flash sale to recover cash for high-velocity SKUs.'
        });
        break;
    }
  }

  const deadCapitalRatio = totalAssetValue > 0 ? (lockedDeadCapital / totalAssetValue) * 100 : 0;

  // Sort dead stock list by highest locked value first
  deadStockList.sort((a, b) => b.lockedValue - a.lockedValue);

  return {
    totalAssetValue: Math.round(totalAssetValue),
    activeCapital: Math.round(activeCapital),
    lockedDeadCapital: Math.round(lockedDeadCapital),
    deadCapitalRatio: Math.round(deadCapitalRatio * 10) / 10,
    totalSkus: items.length,
    stockoutCount,
    criticalRiskCount,
    reorderNowCount,
    healthyCount,
    overstockedCount,
    deadStockCount,
    totalReorderPoValue: Math.round(totalReorderPoValue),
    dailyStockoutLossRate: Math.round(dailyStockoutLossRate),
    deadStockList
  };
}
