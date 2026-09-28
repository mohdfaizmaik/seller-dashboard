import { PRODUCTS_CATALOG } from '../data/products';
import { MOCK_ORDERS } from '../data/orders';
import { MARKETPLACE_CONFIG } from '../data/marketplaceConfig';
import type { Order } from '../models/order';
import type { Product } from '../models/product';
import type { OverviewMetrics, PlatformBreakdown, FinancialSummary, DailyChartMetric } from '../models/analytics';
import type { PlatformFilter, DatePresetFilter } from '../hooks/useFilters';
import { getSkuCostsSync, type SkuCost } from './catalog/cogsService';

// -------------------------------------------------------------
// Date Utility Helpers
// -------------------------------------------------------------

/**
 * Returns Start and End Dates based on a preset, relative to the Aug 10, 2026 anchor date.
/**
 * Returns Start and End Dates based on a preset.
 * Dynamically anchors to the latest date in the provided orders array,
 * or falls back to the canonical Aug 10, 2026 anchor date.
 */
export function getDateRangeFromPreset(
  preset: DatePresetFilter,
  customStart?: string,
  customEnd?: string,
  orders?: Order[]
): { start: Date; end: Date } {
  let anchor = new Date(2026, 7, 10); // Aug 10, 2026

  if (orders && orders.length > 0 && preset !== 'custom') {
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
      anchor = new Date(maxTime);
    }
  }

  const end = new Date(anchor.getTime());
  const start = new Date(anchor.getTime());

  switch (preset) {
    case 'today':
      break;
    case '7d':
      start.setDate(end.getDate() - 6);
      break;
    case '30d':
      start.setDate(end.getDate() - 29);
      break;
    case 'ytd':
      start.setFullYear(anchor.getFullYear(), 0, 1); // Jan 1 of anchor year
      break;
    case 'custom':
      if (customStart) {
        const parsedStart = new Date(customStart);
        if (!isNaN(parsedStart.getTime())) {
          start.setTime(parsedStart.getTime());
        }
      } else {
        start.setFullYear(2025); // Fallback long range
      }
      if (customEnd) {
        const parsedEnd = new Date(customEnd);
        if (!isNaN(parsedEnd.getTime())) {
          end.setTime(parsedEnd.getTime());
        }
      }
      break;
    default:
      start.setDate(end.getDate() - 29);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/** Enforces Indian numbering and currency formatting (₹ via Intl.NumberFormat('en-IN')) */
export function formatINR(val: number, maximumFractionDigits = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits
  }).format(val);
}

/** Formats percentage with standard decimals */
export function formatPercent(val: number, digits = 1): string {
  return `${val.toFixed(digits)}%`;
}

/**
 * Calculates the preceding period of equal length for comparison metrics.
 */
export function getPreviousPeriod(start: Date, end: Date): { start: Date; end: Date } {
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { start: prevStart, end: prevEnd };
}

// -------------------------------------------------------------
// Centralized Accounting Formulas
// -------------------------------------------------------------

/**
 * Calculates a full set of financial metrics from a raw order list and date/platform parameters.
 * 
 * Consistent Treatment of Orders:
 * 1. Cancelled Orders:
 *    - Status === 'cancelled' are tracked in cancelledOrderCount, but excluded completely from:
 *      gross revenue, net sales, units sold, COGS, marketplace fees, shipping costs, and active order counts.
 * 2. Returned Orders:
 *    - Status === 'returned' are tracked in returnedOrderCount.
 *    - Included in Gross Revenue and Gross Order Count (as they were successfully fulfilled and shipped).
 *    - Their full orderValue is added to refundedValue.
 *    - Net Sales = Gross Revenue - Refunded Value.
 *    - Reverse shipping, reverse processing, and damage write-offs are added to returnRelatedCosts.
 * 
 * Marketplace fee formulas:
 *    - Fees = (orderValue * referralFeeRate) + fixedClosingFee
 *    - Shipping = flatShippingRate
 *    - Advertising = durationDays * dailyAdBudget
 * 
 * Net Profit formula:
 *    - Net Profit = Net Sales - COGS - Marketplace Fees - Shipping - Advertising - Return-Related Costs
 * 
 * Profit Margin formula:
 *    - Profit Margin = (Net Profit / Gross Revenue) * 100
 */
export function calculateFinancialSummary(
  orders: Order[],
  start: Date,
  end: Date,
  platform: PlatformFilter,
  skuCostsMap?: Map<string, SkuCost>
): FinancialSummary {
  const activeOrders = orders.filter(o => {
    // 1. Platform Filter
    if (platform !== 'all' && o.platform !== platform && o.marketplace !== platform) return false;
    // 2. Date Filter (handle orderDate or date)
    const rawDate = o.orderDate || o.date || '';
    const oDate = new Date(rawDate);
    return oDate >= start && oDate <= end;
  });

  const costCatalog = skuCostsMap || getSkuCostsSync();

  let grossRevenue = 0;
  let refundedValue = 0;
  let orderCount = 0;
  let returnedOrderCount = 0;
  let cancelledOrderCount = 0;
  let unitsSold = 0;
  let cogs = 0;
  let packagingCost = 0;
  let taxes = 0;
  let marketplaceFees = 0;
  let shipping = 0;
  let returnRelatedCosts = 0;

  activeOrders.forEach(o => {
    if (o.status === 'cancelled') {
      cancelledOrderCount += 1;
      return; // Skip cancellations for all sales/expense metrics
    }

    const val = o.gross_amount || o.orderValue || 0;
    const qty = o.quantity || 1;
    const sku = (o.sku || '').trim().toLowerCase();

    // Look up in COGS catalog first, fallback to PRODUCTS_CATALOG
    const skuEntry = costCatalog.get(sku);
    let costPrice = 0;
    let pkgCost = 0;
    let taxRate = 18;

    if (skuEntry) {
      costPrice = skuEntry.cogs;
      pkgCost = skuEntry.packagingCost;
      taxRate = skuEntry.taxRate;
    } else {
      const prodMeta = PRODUCTS_CATALOG.find(p => p.id === o.productId || p.sku.toLowerCase() === sku);
      if (prodMeta) {
        costPrice = prodMeta.costPrice;
        pkgCost = 25;
      }
    }

    // Accumulate active sales/volume metrics
    grossRevenue += val;
    orderCount += 1;
    unitsSold += qty;
    cogs += costPrice * qty;
    packagingCost += pkgCost * qty;

    // Platform configurations
    const rawPlat = (o.marketplace || o.platform || '').toLowerCase();
    const plat: 'amazon' | 'flipkart' | 'meesho' =
      rawPlat === 'meesho' ? 'meesho' : rawPlat === 'amazon' ? 'amazon' : 'flipkart';
    const platformConfig = MARKETPLACE_CONFIG[plat];

    // Marketplace fees: use estimatedFees if normalized, otherwise formula
    const orderFees = o.estimatedFees?.totalFees !== undefined
      ? o.estimatedFees.totalFees
      : ((val * platformConfig.referralFeeRate) + platformConfig.fixedClosingFee);
    marketplaceFees += orderFees;

    // Shipping charges: use shipping_fee if normalized, otherwise flat rate
    shipping += (o.shipping_fee !== undefined ? o.shipping_fee : platformConfig.flatShippingRate);

    // Taxes
    if (o.tax_amount !== undefined && o.tax_amount > 0) {
      taxes += o.tax_amount;
    } else {
      taxes += (val * (taxRate / (100 + taxRate)));
    }

    // Returned orders treatment
    if (o.status === 'returned') {
      returnedOrderCount += 1;
      refundedValue += val; // Customers are refunded the order value

      const retConfig = MARKETPLACE_CONFIG.returns;
      const reverseShipping = retConfig.flatReturnShipping;
      const reverseProcessing = retConfig.reverseProcessingFee;
      
      // Damage write-off = write-off percentage * COGS
      const itemCost = costPrice * qty;
      const damageLoss = itemCost * retConfig.writeOffPercentage;

      returnRelatedCosts += reverseShipping + reverseProcessing + damageLoss;
    }
  });

  // Calculate advertising spend (pro-rated based on duration days)
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  let advertising = 0;
  if (platform === 'all') {
    advertising = durationDays * (
      MARKETPLACE_CONFIG.amazon.dailyAdBudget +
      MARKETPLACE_CONFIG.flipkart.dailyAdBudget +
      MARKETPLACE_CONFIG.meesho.dailyAdBudget
    );
  } else if (platform === 'amazon') {
    advertising = durationDays * MARKETPLACE_CONFIG.amazon.dailyAdBudget;
  } else if (platform === 'meesho') {
    advertising = durationDays * MARKETPLACE_CONFIG.meesho.dailyAdBudget;
  } else {
    advertising = durationDays * MARKETPLACE_CONFIG.flipkart.dailyAdBudget;
  }

  // Derived metrics
  const netSales = grossRevenue - refundedValue;
  const totalDirectCosts = cogs + packagingCost;
  const netProfit = netSales - totalDirectCosts - marketplaceFees - shipping - advertising - returnRelatedCosts;
  const profitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const aov = orderCount > 0 ? grossRevenue / orderCount : 0;
  const returnRate = orderCount > 0 ? (returnedOrderCount / orderCount) * 100 : 0;

  return {
    grossRevenue,
    refundedValue,
    netSales,
    orderCount,
    returnedOrderCount,
    cancelledOrderCount,
    unitsSold,
    cogs,
    packagingCost,
    totalDirectCosts,
    taxes,
    marketplaceFees,
    shipping,
    advertising,
    returnRelatedCosts,
    netProfit,
    profitMargin,
    aov,
    returnRate
  };
}

/**
 * Calculates percentage growth between current and previous values.
 */
function calculateGrowth(current: number, previous: number): number {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

// -------------------------------------------------------------
// Service Layer APIs
// -------------------------------------------------------------

/**
 * Fetches calculated KPI cards and growth metrics for the Overview page.
 */
export function getOverviewMetrics(
  platform: PlatformFilter,
  preset: DatePresetFilter,
  customStart?: string,
  customEnd?: string,
  orders: Order[] = MOCK_ORDERS
): OverviewMetrics {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd, orders);
  const prevRange = getPreviousPeriod(start, end);

  const current = calculateFinancialSummary(orders, start, end, platform);
  const previous = calculateFinancialSummary(orders, prevRange.start, prevRange.end, platform);

  return {
    totalRevenue: current.grossRevenue,
    revenueGrowth: calculateGrowth(current.grossRevenue, previous.grossRevenue),
    netSales: current.netSales,
    netSalesGrowth: calculateGrowth(current.netSales, previous.netSales),
    totalOrders: current.orderCount,
    ordersGrowth: calculateGrowth(current.orderCount, previous.orderCount),
    unitsSold: current.unitsSold,
    unitsGrowth: calculateGrowth(current.unitsSold, previous.unitsSold),
    netProfit: current.netProfit,
    profitGrowth: calculateGrowth(current.netProfit, previous.netProfit),
    profitMargin: current.profitMargin,
    avgOrderValue: current.aov,
    aovGrowth: calculateGrowth(current.aov, previous.aov),
    returnsCount: current.returnedOrderCount,
    returnRate: current.returnRate,
    returnRateGrowth: current.returnRate - previous.returnRate // Difference in rates
  };
}

/**
 * Fetches order list sorted and truncated for brief logs or tables.
 */
export function getRecentOrders(
  platform: PlatformFilter,
  preset: DatePresetFilter,
  limit = 5,
  customStart?: string,
  customEnd?: string,
  orders: Order[] = MOCK_ORDERS
): Order[] {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd, orders);

  return orders.filter(o => {
    if (platform !== 'all' && o.platform !== platform) return false;
    const oDate = new Date(o.orderDate || o.date || '');
    return oDate >= start && oDate <= end;
  }).slice(0, limit);
}

/**
 * Aggregates product level diagnostics for ranking cards.
 */
export function getProductRankings(
  platform: PlatformFilter,
  preset: DatePresetFilter,
  limit = 5,
  customStart?: string,
  customEnd?: string,
  orders: Order[] = MOCK_ORDERS
): Product[] {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd, orders);

  const activeOrdersInScope = orders.filter(o => {
    if (platform !== 'all' && o.platform !== platform) return false;
    const oDate = new Date(o.orderDate);
    return oDate >= start && oDate <= end;
  });

  // Group calculations by product
  const productAggMap = new Map<string, {
    unitsSold: number;
    revenue: number;
    cogs: number;
    fees: number;
    shipping: number;
    returnsCount: number;
    returnsValue: number;
    returnCosts: number;
  }>();

  activeOrdersInScope.forEach(o => {
    if (o.status === 'cancelled') return;

    const agg = productAggMap.get(o.productId) || {
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      fees: 0,
      shipping: 0,
      returnsCount: 0,
      returnsValue: 0,
      returnCosts: 0
    };

    const prodMeta = PRODUCTS_CATALOG.find(p => p.id === o.productId);
    const costPrice = prodMeta ? prodMeta.costPrice : 0;

    agg.revenue += o.orderValue;
    agg.unitsSold += o.quantity;
    agg.cogs += costPrice * o.quantity;

    const platformKey = o.platform === 'amazon' ? 'amazon' : 'flipkart';
    const platformConfig = MARKETPLACE_CONFIG[platformKey];

    agg.fees += (o.orderValue * platformConfig.referralFeeRate) + platformConfig.fixedClosingFee;
    agg.shipping += platformConfig.flatShippingRate;

    if (o.status === 'returned') {
      agg.returnsCount += 1;
      agg.returnsValue += o.orderValue;

      const retConfig = MARKETPLACE_CONFIG.returns;
      const reverseShipping = retConfig.flatReturnShipping;
      const reverseProcessing = retConfig.reverseProcessingFee;
      const damageLoss = costPrice * o.quantity * retConfig.writeOffPercentage;

      agg.returnCosts += reverseShipping + reverseProcessing + damageLoss;
    }

    productAggMap.set(o.productId, agg);
  });

  // Allocate advertising budget by product revenue weight
  const totalRevenue = Array.from(productAggMap.values()).reduce((sum, item) => sum + item.revenue, 0);
  const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
  
  let totalAdBudget = 0;
  if (platform === 'all') {
    totalAdBudget = durationDays * (MARKETPLACE_CONFIG.amazon.dailyAdBudget + MARKETPLACE_CONFIG.flipkart.dailyAdBudget);
  } else if (platform === 'amazon') {
    totalAdBudget = durationDays * MARKETPLACE_CONFIG.amazon.dailyAdBudget;
  } else {
    totalAdBudget = durationDays * MARKETPLACE_CONFIG.flipkart.dailyAdBudget;
  }

  const productsList: Product[] = PRODUCTS_CATALOG.map(p => {
    const agg = productAggMap.get(p.id) || {
      unitsSold: 0,
      revenue: 0,
      cogs: 0,
      fees: 0,
      shipping: 0,
      returnsCount: 0,
      returnsValue: 0,
      returnCosts: 0
    };

    const revenueShare = totalRevenue > 0 ? agg.revenue / totalRevenue : 0;
    const adSpendAllocated = totalAdBudget * revenueShare;

    // Net Profit = (Revenue - Returns) - COGS - Fees - Shipping - Ads - Reverse Logistics
    const netProfit = (agg.revenue - agg.returnsValue) - agg.cogs - agg.fees - agg.shipping - adSpendAllocated - agg.returnCosts;
    const profitMargin = agg.revenue > 0 ? (netProfit / agg.revenue) * 100 : 0;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      unitsSold: agg.unitsSold,
      revenue: agg.revenue,
      costOfGoods: agg.cogs,
      marketplaceFees: agg.fees,
      shippingCharges: agg.shipping,
      advertisingSpend: adSpendAllocated,
      returnsCount: agg.returnsCount,
      netProfit,
      profitMargin
    };
  });

  // Return sorted list limited
  return productsList.sort((a, b) => b.unitsSold - a.unitsSold).slice(0, limit);
}

/**
 * Calculates marketplace breakdowns (Amazon vs Flipkart) for comparison lists.
 */
export function getPlatformBreakdown(
  preset: DatePresetFilter,
  customStart?: string,
  customEnd?: string,
  orders: Order[] = MOCK_ORDERS
): PlatformBreakdown[] {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd, orders);

  const az = calculateFinancialSummary(orders, start, end, 'amazon');
  const fk = calculateFinancialSummary(orders, start, end, 'flipkart');
  const ms = calculateFinancialSummary(orders, start, end, 'meesho');

  return [
    {
      platform: 'amazon',
      revenue: az.grossRevenue,
      orders: az.orderCount,
      unitsSold: az.unitsSold,
      fees: az.marketplaceFees,
      returns: az.returnedOrderCount,
      profit: az.netProfit,
      margin: az.grossRevenue > 0 ? (az.netProfit / az.grossRevenue) * 100 : 0
    },
    {
      platform: 'flipkart',
      revenue: fk.grossRevenue,
      orders: fk.orderCount,
      unitsSold: fk.unitsSold,
      fees: fk.marketplaceFees,
      returns: fk.returnedOrderCount,
      profit: fk.netProfit,
      margin: fk.grossRevenue > 0 ? (fk.netProfit / fk.grossRevenue) * 100 : 0
    },
    {
      platform: 'meesho',
      revenue: ms.grossRevenue,
      orders: ms.orderCount,
      unitsSold: ms.unitsSold,
      fees: ms.marketplaceFees,
      returns: ms.returnedOrderCount,
      profit: ms.netProfit,
      margin: ms.grossRevenue > 0 ? (ms.netProfit / ms.grossRevenue) * 100 : 0
    }
  ];
}

// -------------------------------------------------------------
// Timeline Helpers
// -------------------------------------------------------------

/**
 * Helper that groups already-filtered orders by date and computes daily analytics.
 * It expects the caller to have applied platform and date range filters.
 * The function generates a continuous date series from `start` to `end`
 * (inclusive) and calculates financial metrics for each day using the
 * existing `calculateFinancialSummary` logic, ensuring advertising and
 * all other cost components stay in sync with the overall summary.
 */
function groupOrdersByDate(
  filteredOrders: Order[],
  start: Date,
  end: Date,
  platform: PlatformFilter
): DailyChartMetric[] {
  // 1. Build list of ISO date strings for the full range
  const datesList: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    datesList.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // 2. Group orders by the date portion of orderDate
  const ordersByDate = new Map<string, Order[]>();
  filteredOrders.forEach(o => {
    const rawDate = o.orderDate || o.date || '';
    const dateKey = new Date(rawDate).toISOString().split('T')[0];
    const arr = ordersByDate.get(dateKey) ?? [];
    arr.push(o);
    ordersByDate.set(dateKey, arr);
  });

  // 3. For each date, compute metrics using existing financial summary logic
  return datesList.map(dateStr => {
    const dayOrders = ordersByDate.get(dateStr) ?? [];
    // Define start/end of the day for the summary call
    const dayStart = new Date(dateStr);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dateStr);
    dayEnd.setHours(23, 59, 59, 999);

    // Use calculateFinancialSummary to ensure consistency
    const summary = calculateFinancialSummary(dayOrders, dayStart, dayEnd, platform);

    return {
      date: dateStr,
      grossRevenue: summary.grossRevenue,
      refundedValue: summary.refundedValue,
      netSales: summary.netSales,
      orderCount: summary.orderCount,
      unitsSold: summary.unitsSold,
      netProfit: summary.netProfit
    } as DailyChartMetric;
  });
}

/**
 * Groups filtered orders by date and computes timelines for Recharts.
 */
export function getSalesTimeline(
  platform: PlatformFilter,
  preset: DatePresetFilter,
  customStart?: string,
  customEnd?: string,
  orders: Order[] = MOCK_ORDERS
): DailyChartMetric[] {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd, orders);

  // Filter orders based on platform and date range
  const filteredOrders = orders.filter(o => {
    if (platform !== 'all' && o.platform !== platform) return false;
    const oDate = new Date(o.orderDate || o.date || '');
    return oDate >= start && oDate <= end;
  });

  // Delegate grouping and daily metric calculation to the shared helper
  return groupOrdersByDate(filteredOrders, start, end, platform);
}

// -------------------------------------------------------------
// Regional Distribution & India Zones
// -------------------------------------------------------------

export type IndiaRegion = 'North' | 'South' | 'West' | 'East' | 'Central' | 'Other';

export interface RegionalDistributionItem {
  region: IndiaRegion;
  orderCount: number;
  revenue: number;
  percentage: number;
  states: string[];
}

const REGION_MAPPING: Record<string, IndiaRegion> = {
  // North
  delhi: 'North',
  'new delhi': 'North',
  haryana: 'North',
  punjab: 'North',
  'himachal pradesh': 'North',
  'jammu and kashmir': 'North',
  'jammu & kashmir': 'North',
  ladakh: 'North',
  uttarakhand: 'North',
  'uttar pradesh': 'North',
  chandigarh: 'North',
  rajasthan: 'North',

  // South
  karnataka: 'South',
  'tamil nadu': 'South',
  kerala: 'South',
  'andhra pradesh': 'South',
  telangana: 'South',
  puducherry: 'South',

  // West
  maharashtra: 'West',
  gujarat: 'West',
  goa: 'West',
  'dadra and nagar haveli and daman and diu': 'West',
  'daman and diu': 'West',

  // East
  'west bengal': 'East',
  odisha: 'East',
  orissa: 'East',
  bihar: 'East',
  jharkhand: 'East',
  assam: 'East',
  sikkim: 'East',
  'arunachal pradesh': 'East',
  nagaland: 'East',
  manipur: 'East',
  mizoram: 'East',
  tripura: 'East',
  meghalaya: 'East',

  // Central
  'madhya pradesh': 'Central',
  chhattisgarh: 'Central'
};

export function getRegionForState(stateName?: string): IndiaRegion {
  if (!stateName) return 'Other';
  const clean = stateName.trim().toLowerCase().replace(/[^a-z\s&]/g, '');
  return REGION_MAPPING[clean] || 'Other';
}

/**
 * Aggregates order geographic distribution across major Indian regions.
 */
export function getRegionalDistribution(
  orders: Order[],
  start?: Date,
  end?: Date,
  platform: PlatformFilter = 'all'
): RegionalDistributionItem[] {
  const filtered = orders.filter((o) => {
    if (o.status === 'cancelled') return false;
    if (platform !== 'all' && o.platform !== platform) return false;
    if (start || end) {
      const d = new Date(o.orderDate || o.date || '');
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    return true;
  });

  const totals: Record<IndiaRegion, { orderCount: number; revenue: number; states: Set<string> }> = {
    North: { orderCount: 0, revenue: 0, states: new Set() },
    South: { orderCount: 0, revenue: 0, states: new Set() },
    West: { orderCount: 0, revenue: 0, states: new Set() },
    East: { orderCount: 0, revenue: 0, states: new Set() },
    Central: { orderCount: 0, revenue: 0, states: new Set() },
    Other: { orderCount: 0, revenue: 0, states: new Set() }
  };

  let totalRev = 0;

  for (const o of filtered) {
    const state = o.shipToState || '';
    const region = getRegionForState(state);
    totals[region].orderCount += 1;
    const val = o.orderValue || o.gross_amount || 0;
    totals[region].revenue += val;
    if (state) totals[region].states.add(state);
    totalRev += val;
  }

  const regions: IndiaRegion[] = ['North', 'South', 'West', 'East', 'Central', 'Other'];
  return regions.map((region) => {
    const data = totals[region];
    return {
      region,
      orderCount: data.orderCount,
      revenue: Number(data.revenue.toFixed(2)),
      percentage: totalRev > 0 ? Number(((data.revenue / totalRev) * 100).toFixed(1)) : 0,
      states: Array.from(data.states)
    };
  });
}

// -------------------------------------------------------------
// Marketplace Comparison
// -------------------------------------------------------------

export interface MarketplaceSideBySideMetric {
  marketplace: 'amazon' | 'flipkart' | 'meesho';
  displayName: string;
  grossRevenue: number;
  unitsSold: number;
  orderCount: number;
  aov: number;
  returnRate: number;
  returnedCount: number;
  cancelledCount: number;
  marketplaceFees: number;
  shipping: number;
  advertising: number;
  netProfit: number;
  profitMargin: number;
}

export interface MarketplaceComparison {
  amazon: MarketplaceSideBySideMetric;
  flipkart: MarketplaceSideBySideMetric;
  meesho: MarketplaceSideBySideMetric;
  blended: {
    grossRevenue: number;
    unitsSold: number;
    orderCount: number;
    aov: number;
    returnRate: number;
    netProfit: number;
    profitMargin: number;
    marketplaceFees: number;
  };
}

export type DualMarketplaceComparison = MarketplaceComparison;

/**
 * Calculates a comprehensive side-by-side comparison across Amazon, Flipkart, and Meesho.
 */
export function getMarketplaceComparison(
  orders: Order[],
  start: Date,
  end: Date
): MarketplaceComparison {
  const azSummary = calculateFinancialSummary(orders, start, end, 'amazon');
  const fkSummary = calculateFinancialSummary(orders, start, end, 'flipkart');
  const msSummary = calculateFinancialSummary(orders, start, end, 'meesho');
  const blendedSummary = calculateFinancialSummary(orders, start, end, 'all');

  const toMetric = (
    mkt: 'amazon' | 'flipkart' | 'meesho',
    disp: string,
    s: FinancialSummary
  ): MarketplaceSideBySideMetric => ({
    marketplace: mkt,
    displayName: disp,
    grossRevenue: s.grossRevenue,
    unitsSold: s.unitsSold,
    orderCount: s.orderCount,
    aov: Number(s.aov.toFixed(2)),
    returnRate: Number(s.returnRate.toFixed(2)),
    returnedCount: s.returnedOrderCount,
    cancelledCount: s.cancelledOrderCount,
    marketplaceFees: Number(s.marketplaceFees.toFixed(2)),
    shipping: Number(s.shipping.toFixed(2)),
    advertising: Number(s.advertising.toFixed(2)),
    netProfit: Number(s.netProfit.toFixed(2)),
    profitMargin: Number(s.profitMargin.toFixed(2))
  });

  return {
    amazon: toMetric('amazon', 'Amazon India', azSummary),
    flipkart: toMetric('flipkart', 'Flipkart', fkSummary),
    meesho: toMetric('meesho', 'Meesho', msSummary),
    blended: {
      grossRevenue: blendedSummary.grossRevenue,
      unitsSold: blendedSummary.unitsSold,
      orderCount: blendedSummary.orderCount,
      aov: Number(blendedSummary.aov.toFixed(2)),
      returnRate: Number(blendedSummary.returnRate.toFixed(2)),
      netProfit: Number(blendedSummary.netProfit.toFixed(2)),
      profitMargin: Number(blendedSummary.profitMargin.toFixed(2)),
      marketplaceFees: Number(blendedSummary.marketplaceFees.toFixed(2))
    }
  };
}

