import type { Order } from '../../models/order';
import { MARKETPLACE_CONFIG } from '../../data/marketplaceConfig';
import { PRODUCTS_CATALOG } from '../../data/products';

export interface Recommendation {
  id: string;
  type: 'danger' | 'warning' | 'opportunity' | 'info';
  category: 'margin' | 'returns' | 'velocity' | 'concentration' | 'channel_arbitrage';
  title: string;
  metric: string; // e.g., "Flipkart Return Rate: 28.5% vs Amazon: 6.2%"
  description: string;
  action: string; // Concrete operational recommendation
  impact: 'high' | 'medium' | 'low';
  marketplace: 'amazon' | 'flipkart' | 'both';
  affectedSkus?: string[];
}

/**
 * Pure function computing actionable insights and operational corrective steps
 * by evaluating blended and platform-specific order data against marketplace configurations.
 */
export function generateRecommendations(
  orders: Order[],
  marketplaceConfigs: typeof MARKETPLACE_CONFIG = MARKETPLACE_CONFIG
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (!orders || orders.length === 0) {
    return [
      {
        id: 'rec_no_data',
        type: 'info',
        category: 'velocity',
        title: 'No Order Data Available',
        metric: '0 Orders Detected',
        description: 'Upload your Amazon India MTR or Flipkart Sales flat files to generate automated recommendations.',
        action: 'Import an MTR CSV or Flipkart Sales Report from the top bar.',
        impact: 'low',
        marketplace: 'both'
      }
    ];
  }

  // -------------------------------------------------------------
  // Data Aggregations
  // -------------------------------------------------------------
  const azOrders = orders.filter((o) => (o.marketplace || o.platform) === 'amazon');
  const fkOrders = orders.filter((o) => (o.marketplace || o.platform) === 'flipkart');

  const calcPlatformStats = (platformOrders: Order[], cfg: typeof marketplaceConfigs.amazon) => {
    let gross = 0;
    let fulfilledOrders = 0;
    let returns = 0;
    let cancellations = 0;
    let fees = 0;
    let cogs = 0;
    let units = 0;

    for (const o of platformOrders) {
      if (o.status === 'cancelled') {
        cancellations += 1;
        continue;
      }

      const val = o.gross_amount || o.orderValue || 0;
      gross += val;
      fulfilledOrders += 1;
      units += o.quantity || 1;

      const prod = PRODUCTS_CATALOG.find((p) => p.id === o.productId || p.sku === o.sku);
      const cost = prod ? prod.costPrice : 0;
      cogs += cost * (o.quantity || 1);

      // Fees
      const ref = o.estimatedFees?.referralFee ?? (val * cfg.referralFeeRate);
      const close = o.estimatedFees?.closingFee ?? cfg.fixedClosingFee;
      fees += ref + close;

      if (o.status === 'returned') {
        returns += 1;
      }
    }

    const netProfit = gross - cogs - fees - (fulfilledOrders * cfg.flatShippingRate);
    const returnRate = fulfilledOrders > 0 ? (returns / fulfilledOrders) * 100 : 0;
    const margin = gross > 0 ? (netProfit / gross) * 100 : 0;
    const aov = fulfilledOrders > 0 ? gross / fulfilledOrders : 0;

    return {
      gross,
      fulfilledOrders,
      returns,
      cancellations,
      returnRate,
      fees,
      cogs,
      netProfit,
      margin,
      aov,
      units
    };
  };

  const azStats = calcPlatformStats(azOrders, marketplaceConfigs.amazon);
  const fkStats = calcPlatformStats(fkOrders, marketplaceConfigs.flipkart);

  const totalGross = azStats.gross + fkStats.gross;
  const totalFulfilled = azStats.fulfilledOrders + fkStats.fulfilledOrders;
  const totalReturns = azStats.returns + fkStats.returns;
  const totalReturnRate = totalFulfilled > 0 ? (totalReturns / totalFulfilled) * 100 : 0;
  const totalFees = azStats.fees + fkStats.fees;

  // SKU level statistics
  const skuStatsMap = new Map<
    string,
    {
      sku: string;
      name: string;
      orders: number;
      returns: number;
      revenue: number;
      cogs: number;
      fees: number;
      netProfit: number;
      azOrders: number;
      azRevenue: number;
      azProfit: number;
      fkOrders: number;
      fkRevenue: number;
      fkProfit: number;
    }
  >();

  for (const o of orders) {
    if (o.status === 'cancelled') continue;
    const sku = o.sku || 'UNKNOWN-SKU';
    const prod = PRODUCTS_CATALOG.find((p) => p.id === o.productId || p.sku === sku);
    const cost = prod ? prod.costPrice : 0;
    const val = o.gross_amount || o.orderValue || 0;
    const qty = o.quantity || 1;

    const plat = (o.marketplace || o.platform) === 'amazon' ? 'amazon' : 'flipkart';
    const cfg = marketplaceConfigs[plat];
    const fee = o.estimatedFees?.totalFees ?? ((val * cfg.referralFeeRate) + cfg.fixedClosingFee);
    const profit = o.estimatedNetProfit ?? (val - (cost * qty) - fee - (o.shipping_fee || cfg.flatShippingRate));

    const existing = skuStatsMap.get(sku) || {
      sku,
      name: o.product_name || o.productName || prod?.name || sku,
      orders: 0,
      returns: 0,
      revenue: 0,
      cogs: 0,
      fees: 0,
      netProfit: 0,
      azOrders: 0,
      azRevenue: 0,
      azProfit: 0,
      fkOrders: 0,
      fkRevenue: 0,
      fkProfit: 0
    };

    existing.orders += 1;
    existing.revenue += val;
    existing.cogs += cost * qty;
    existing.fees += fee;
    existing.netProfit += profit;

    if (o.status === 'returned') {
      existing.returns += 1;
    }

    if (plat === 'amazon') {
      existing.azOrders += 1;
      existing.azRevenue += val;
      existing.azProfit += profit;
    } else {
      existing.fkOrders += 1;
      existing.fkRevenue += val;
      existing.fkProfit += profit;
    }

    skuStatsMap.set(sku, existing);
  }

  // -------------------------------------------------------------
  // Rule 1: High Return Rate Detection
  // -------------------------------------------------------------
  // 1a. Platform Return Rate Alerts
  if (fkStats.fulfilledOrders >= 5 && fkStats.returnRate > 15) {
    recommendations.push({
      id: 'rec_returns_flipkart_high',
      type: 'danger',
      category: 'returns',
      title: 'High Return Rate on Flipkart',
      metric: `Flipkart Return Rate: ${fkStats.returnRate.toFixed(1)}% vs Amazon: ${azStats.returnRate.toFixed(1)}%`,
      description: `Flipkart return volumes are significantly elevated (${fkStats.returns} returns out of ${fkStats.fulfilledOrders} orders). Reverse logistics fees and non-refundable closing fees create heavy profit drag.`,
      action: 'Audit customer return reasons in your Flipkart seller portal. Consider disabling COD for pin codes with >35% return history or transitioning SKUs to FBF.',
      impact: 'high',
      marketplace: 'flipkart'
    });
  }

  if (azStats.fulfilledOrders >= 5 && azStats.returnRate > 15) {
    recommendations.push({
      id: 'rec_returns_amazon_high',
      type: 'danger',
      category: 'returns',
      title: 'High Return Rate on Amazon India',
      metric: `Amazon Return Rate: ${azStats.returnRate.toFixed(1)}%`,
      description: `Amazon return rate of ${azStats.returnRate.toFixed(1)}% exceeds the healthy benchmark of 10%. Returns incur reverse processing fees and risk inventory grading write-offs.`,
      action: 'Inspect product detail page sizing charts and images to eliminate customer expectation mismatches, and upgrade packaging to protect against transit damage.',
      impact: 'high',
      marketplace: 'amazon'
    });
  }

  // 1b. SKU Return Rate Anomalies
  skuStatsMap.forEach((s) => {
    if (s.orders >= 3) {
      const skuReturnRate = (s.returns / s.orders) * 100;
      if (skuReturnRate >= 20) {
        recommendations.push({
          id: `rec_returns_sku_${s.sku.toLowerCase()}`,
          type: 'danger',
          category: 'returns',
          title: `Severe Return Rate on SKU: ${s.sku}`,
          metric: `${s.sku} Return Rate: ${skuReturnRate.toFixed(1)}% (${s.returns}/${s.orders} orders)`,
          description: `Product "${s.name}" is suffering from an abnormally high return rate. Each return erodes unit economics and lowers marketplace search visibility.`,
          action: `Initiate a quality inspection for "${s.sku}". Review customer feedback keywords (e.g. "damaged", "wrong size", "defective") and reinforce protective packaging.`,
          impact: 'high',
          marketplace: s.azOrders > s.fkOrders ? 'amazon' : (s.fkOrders > s.azOrders ? 'flipkart' : 'both'),
          affectedSkus: [s.sku]
        });
      }
    }
  });

  // -------------------------------------------------------------
  // Rule 2: Negative or Thin Margin Warnings
  // -------------------------------------------------------------
  // 2a. Platform Margin Warning
  if (fkStats.fulfilledOrders >= 5 && fkStats.margin < 5) {
    recommendations.push({
      id: 'rec_margin_flipkart_thin',
      type: 'warning',
      category: 'margin',
      title: 'Thin Profit Margin on Flipkart',
      metric: `Flipkart Net Margin: ${fkStats.margin.toFixed(1)}% (Target: > 15%)`,
      description: `Flipkart commission (12%), fixed closing fee (₹15), and shipping costs are absorbing almost all operating margin.`,
      action: 'Increase product list price by 8–12% to protect against fixed fee drag, or introduce multi-packs to lift average order value above ₹1,000.',
      impact: 'high',
      marketplace: 'flipkart'
    });
  }

  if (azStats.fulfilledOrders >= 5 && azStats.margin < 5) {
    recommendations.push({
      id: 'rec_margin_amazon_thin',
      type: 'warning',
      category: 'margin',
      title: 'Thin Profit Margin on Amazon',
      metric: `Amazon Net Margin: ${azStats.margin.toFixed(1)}% (Target: > 15%)`,
      description: `Amazon 15% referral fee and ₹20 closing fee are severely reducing profitability across your Amazon catalog.`,
      action: 'Audit whether items are properly classified in the lowest applicable referral fee category and optimize package dimensions to decrease shipping tiers.',
      impact: 'high',
      marketplace: 'amazon'
    });
  }

  // 2b. Unprofitable SKUs
  skuStatsMap.forEach((s) => {
    if (s.orders >= 2 && s.revenue > 0) {
      const skuMargin = (s.netProfit / s.revenue) * 100;
      if (s.netProfit < 0) {
        recommendations.push({
          id: `rec_unprofitable_sku_${s.sku.toLowerCase()}`,
          type: 'danger',
          category: 'margin',
          title: `Unprofitable Unit Economics: ${s.sku}`,
          metric: `Net Margin: ${skuMargin.toFixed(1)}% (Loss: ₹${Math.abs(s.netProfit).toFixed(0)})`,
          description: `"${s.name}" is losing money on every fulfilled order once COGS, marketplace commissions, and shipping expenses are deducted.`,
          action: `Raise selling price by at least ₹${Math.ceil((Math.abs(s.netProfit) / s.orders) + 30)} immediately, or pause active promotional discounts on this SKU.`,
          impact: 'high',
          marketplace: s.azOrders > s.fkOrders ? 'amazon' : (s.fkOrders > s.azOrders ? 'flipkart' : 'both'),
          affectedSkus: [s.sku]
        });
      }
    }
  });

  // -------------------------------------------------------------
  // Rule 3: Channel Arbitrage Opportunities
  // -------------------------------------------------------------
  skuStatsMap.forEach((s) => {
    if (s.azOrders >= 2 && s.fkOrders >= 2 && s.azRevenue > 0 && s.fkRevenue > 0) {
      const azMargin = (s.azProfit / s.azRevenue) * 100;
      const fkMargin = (s.fkProfit / s.fkRevenue) * 100;
      const marginDiff = Math.abs(azMargin - fkMargin);

      if (marginDiff >= 10) {
        const higherPlatform = azMargin > fkMargin ? 'Amazon' : 'Flipkart';
        const lowerPlatform = azMargin > fkMargin ? 'Flipkart' : 'Amazon';
        const higherMargin = Math.max(azMargin, fkMargin);
        const lowerMargin = Math.min(azMargin, fkMargin);

        recommendations.push({
          id: `rec_arbitrage_sku_${s.sku.toLowerCase()}`,
          type: 'opportunity',
          category: 'channel_arbitrage',
          title: `Channel Margin Arbitrage for ${s.sku}`,
          metric: `${higherPlatform}: ${higherMargin.toFixed(1)}% vs ${lowerPlatform}: ${lowerMargin.toFixed(1)}% margin`,
          description: `"${s.name}" earns a ${marginDiff.toFixed(1)}% higher net margin on ${higherPlatform}. Shifting customer demand toward ${higherPlatform} will immediately expand overall profit.`,
          action: `Reallocate advertising budget toward ${higherPlatform} sponsored listings and ensure ${higherPlatform} fulfillment centers are stocked with priority inventory.`,
          impact: 'medium',
          marketplace: 'both',
          affectedSkus: [s.sku]
        });
      }
    }
  });

  // Platform AOV Arbitrage
  if (azStats.fulfilledOrders >= 5 && fkStats.fulfilledOrders >= 5) {
    const aovDiff = Math.abs(azStats.aov - fkStats.aov);
    if (aovDiff >= 300) {
      const higher = azStats.aov > fkStats.aov ? 'Amazon' : 'Flipkart';
      const lower = azStats.aov > fkStats.aov ? 'Flipkart' : 'Amazon';
      const highVal = Math.max(azStats.aov, fkStats.aov);
      const lowVal = Math.min(azStats.aov, fkStats.aov);

      recommendations.push({
        id: 'rec_arbitrage_aov',
        type: 'opportunity',
        category: 'channel_arbitrage',
        title: 'Cross-Marketplace Basket Size Arbitrage',
        metric: `${higher} AOV: ₹${highVal.toFixed(0)} vs ${lower}: ₹${lowVal.toFixed(0)}`,
        description: `Shoppers on ${higher} are purchasing higher ticket baskets (+₹${aovDiff.toFixed(0)} per order).`,
        action: `Introduce premium product variants and multi-item bundles on ${higher} to maximize ticket size.`,
        impact: 'medium',
        marketplace: 'both'
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 4: Catalog Concentration Risk
  // -------------------------------------------------------------
  if (totalGross > 0 && skuStatsMap.size > 1) {
    let topSku = '';
    let topSkuRevenue = 0;
    let topSkuName = '';

    skuStatsMap.forEach((s) => {
      if (s.revenue > topSkuRevenue) {
        topSkuRevenue = s.revenue;
        topSku = s.sku;
        topSkuName = s.name;
      }
    });

    const share = (topSkuRevenue / totalGross) * 100;
    if (share >= 45) {
      recommendations.push({
        id: 'rec_concentration_risk',
        type: 'warning',
        category: 'concentration',
        title: `Catalog Revenue Concentration Risk`,
        metric: `Top SKU "${topSku}" drives ${share.toFixed(1)}% of total revenue`,
        description: `Over ${share.toFixed(0)}% of your sales depend on a single SKU (${topSkuName}). A sudden stockout, Buy Box loss, or algorithm change could severely disrupt total cash flow.`,
        action: `Diversify paid advertising spend toward tier-2 products in your catalog to establish a balanced revenue baseline.`,
        impact: 'high',
        marketplace: 'both',
        affectedSkus: [topSku]
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 5: Fulfillment Disparity (FBF/AFN vs NON_FBF/MFN)
  // -------------------------------------------------------------
  const mfnOrders = orders.filter((o) => {
    const ch = (o.fulfillmentChannel || '').toUpperCase();
    return ch.includes('MFN') || ch.includes('NON');
  });
  const afnOrders = orders.filter((o) => {
    const ch = (o.fulfillmentChannel || '').toUpperCase();
    return (ch.includes('AFN') || ch.includes('FBF')) && !ch.includes('NON');
  });

  if (mfnOrders.length >= 5 && afnOrders.length >= 5) {
    const mfnCancels = mfnOrders.filter((o) => o.status === 'cancelled').length;
    const mfnCancelRate = (mfnCancels / mfnOrders.length) * 100;
    const afnCancels = afnOrders.filter((o) => o.status === 'cancelled').length;
    const afnCancelRate = (afnCancels / afnOrders.length) * 100;

    if (mfnCancelRate > afnCancelRate + 5) {
      recommendations.push({
        id: 'rec_fulfillment_cancellation_gap',
        type: 'warning',
        category: 'velocity',
        title: 'High Seller-Fulfilled Cancellation Rate',
        metric: `Merchant-Fulfilled: ${mfnCancelRate.toFixed(1)}% vs Marketplace-Fulfilled: ${afnCancelRate.toFixed(1)}%`,
        description: 'Seller-fulfilled orders (MFN / NON_FBF) have noticeably higher cancellation rates due to dispatch lead times and inventory reconciliation delays.',
        action: 'Inbound top velocity inventory to Amazon FBA (AFN) and Flipkart Fulfilled (FBF) to enable 1-2 day delivery badges and reduce buyer cancellations.',
        impact: 'medium',
        marketplace: 'both'
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 6: Total Marketplace Fee Drag
  // -------------------------------------------------------------
  if (totalGross > 0) {
    const feeRatio = (totalFees / totalGross) * 100;
    if (feeRatio >= 25) {
      recommendations.push({
        id: 'rec_fee_drag_high',
        type: 'warning',
        category: 'margin',
        title: 'High Marketplace Fee Drag',
        metric: `Fees Consume ${feeRatio.toFixed(1)}% of Gross Revenue (₹${totalFees.toFixed(0)})`,
        description: 'Marketplace commission, fixed closing fees, and collection fees consume over a quarter of gross sales, squeezing your profit cushion.',
        action: 'Review price points on items priced just below closing fee tier breaks (e.g. ₹500, ₹1000) and evaluate volume bundling to dilute fixed per-order closing fees.',
        impact: 'high',
        marketplace: 'both'
      });
    }
  }

  // -------------------------------------------------------------
  // Rule 7: Healthy Benchmark Confirmation (Info)
  // -------------------------------------------------------------
  if (totalFulfilled >= 10 && totalReturnRate < 10 && recommendations.filter((r) => r.type === 'danger').length === 0) {
    recommendations.push({
      id: 'rec_healthy_return_rate',
      type: 'info',
      category: 'returns',
      title: 'Optimal Return Benchmark Maintained',
      metric: `Blended Return Rate: ${totalReturnRate.toFixed(1)}% (< 10%)`,
      description: 'Your combined catalog return rate across Amazon and Flipkart is performing better than industry averages.',
      action: 'Maintain existing quality inspection routines and packaging standards to sustain strong marketplace seller ratings.',
      impact: 'low',
      marketplace: 'both'
    });
  }

  // Sort: danger (high impact) -> warning (high/medium) -> opportunity -> info
  const typePriority: Record<Recommendation['type'], number> = {
    danger: 0,
    warning: 1,
    opportunity: 2,
    info: 3
  };

  const impactPriority: Record<Recommendation['impact'], number> = {
    high: 0,
    medium: 1,
    low: 2
  };

  return recommendations.sort((a, b) => {
    if (typePriority[a.type] !== typePriority[b.type]) {
      return typePriority[a.type] - typePriority[b.type];
    }
    return impactPriority[a.impact] - impactPriority[b.impact];
  });
}
