import type { Order } from '../../models/order';
import type { PlatformFilter, DatePresetFilter } from '../../hooks/useFilters';
import type { SkuCost } from '../catalog/cogsService';
import type { InventoryItem } from '../inventory/inventoryService';
import {
  getDateRangeFromPreset,
  calculateFinancialSummary,
  getPreviousPeriod,
  formatINR,
  formatPercent
} from '../analyticsService';
import {
  computeRestockMetrics,
  computeWorkingCapitalSummary,
  type RestockMetrics,
  type WorkingCapitalSummary
} from '../inventory/inventoryCalculations';
import {
  generateRecommendations,
  type Recommendation
} from '../recommendations/recommendationEngine';
import { calculateTaxCompliance } from '../tax/taxService';
import { calculateAdvertisingSummary } from '../advertising/advertisingService';
import { calculateReturnsSummary } from '../returns/returnsService';
import { calculateCashFlowForecast } from '../cashflow/cashflowService';

export interface TaxSnapshotSummary {
  outputGst: number;
  igst: number;
  cgst: number;
  sgst: number;
  eligibleItc: number;
  cogsItc: number;
  platformServicesItc: number;
  tcsWithheld: number;
  netCashTaxPayable: number;
  excessCredit: number;
}

export interface AdvertisingSnapshotSummary {
  totalAdSpend: number;
  totalAdSales: number;
  blendedRoas: number;
  blendedAcos: number;
  blendedTacos: number;
  blendedCac: number;
  adBleedCount: number;
  moneyPitSpend: number;
}

export interface ReturnsSnapshotSummary {
  totalReturnLoss: number;
  blendedReturnRate: number;
  rtoCount: number;
  rtoRate: number;
  customerReturnCount: number;
  customerReturnRate: number;
  codReturnRate: number;
  prepaidReturnRate: number;
  codRiskMultiplier: number;
  pendingNdrCount: number;
  topLossCourier: string;
}

export interface CashFlowSnapshotSummary {
  currentCash: number;
  inflows30d: number;
  outflows30d: number;
  netCash30d: number;
  projectedBalance90d: number;
  minTroughBalance: number;
  troughDate: string;
  runwayDays: number;
  runwayStatus: string;
  upcomingPayables30d: number;
}

export interface CriticalSkuItem {
  sku: string;
  name: string;
  available: number;
  doi: number;
  vDaily: number;
  reorderQty: number;
  reorderPoValue: number;
  urgency: string;
}

export interface DeadStockItem {
  sku: string;
  name: string;
  stock: number;
  lockedValue: number;
  doi: number;
  playbookAction: string;
}

export interface PlatformStatSummary {
  revenue: number;
  netSales: number;
  netProfit: number;
  margin: number;
  orders: number;
  returnRate: number;
  cancellationRate: number;
}

export interface StoreContextSnapshot {
  periodLabel: string;
  startDate: string;
  endDate: string;
  platform: PlatformFilter;
  totalRevenue: number;
  netSales: number;
  netProfit: number;
  profitMargin: number;
  orderCount: number;
  unitsSold: number;
  returnRate: number;
  returnedCount: number;
  refundedValue: number;
  cancellationRate: number;
  cancelledCount: number;
  aov: number;
  marketplaceFees: number;
  cogs: number;
  shippingCosts: number;
  growth: {
    revenueGrowth: number;
    profitGrowth: number;
    ordersGrowth: number;
  };
  marketplaceBreakdown: {
    amazon: PlatformStatSummary;
    flipkart: PlatformStatSummary;
    meesho: PlatformStatSummary;
  };
  inventorySummary: {
    totalAssetValue: number;
    activeCapital: number;
    lockedDeadCapital: number;
    totalReorderPoValue: number;
    criticalStockoutCount: number;
    deadStockCount: number;
  };
  criticalSkus: CriticalSkuItem[];
  deadStockSkus: DeadStockItem[];
  topRecommendations: Array<{
    category: string;
    title: string;
    metric: string;
    action: string;
    impact: string;
    marketplace: string;
  }>;
  taxSummary?: TaxSnapshotSummary;
  advertisingSummary?: AdvertisingSnapshotSummary;
  returnsSummary?: ReturnsSnapshotSummary;
  cashflowSummary?: CashFlowSnapshotSummary;
}

export interface StoreContextPayload {
  markdown: string;
  snapshot: StoreContextSnapshot;
  tokenEstimate: number;
}

export interface BuildStoreContextOptions {
  orders: Order[];
  inventory?: InventoryItem[];
  skuCostsMap?: Map<string, SkuCost>;
  preset?: DatePresetFilter;
  platform?: PlatformFilter;
  startDate?: string;
  endDate?: string;
}

/**
 * Builds a deterministic, token-optimized context document and structured snapshot
 * representing the complete operational and financial state of the store.
 */
export function buildStoreContext(options: BuildStoreContextOptions): StoreContextPayload {
  const {
    orders = [],
    inventory = [],
    skuCostsMap,
    preset = '30d',
    platform = 'all',
    startDate,
    endDate
  } = options;

  // 1. Resolve active and previous date ranges
  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);
  const { start: prevStart, end: prevEnd } = getPreviousPeriod(start, end);

  const startIso = start.toISOString().split('T')[0];
  const endIso = end.toISOString().split('T')[0];
  const periodLabel = `${preset.toUpperCase()} (${startIso} to ${endIso})`;

  // 2. Financial Summaries
  const currentFin = calculateFinancialSummary(orders, start, end, platform, skuCostsMap);
  const prevFin = calculateFinancialSummary(orders, prevStart, prevEnd, platform, skuCostsMap);

  // Growth calculations
  const calcGrowth = (curr: number, prev: number): number => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  const calcCancellationRate = (cancelled: number, active: number): number => {
    const total = cancelled + active;
    if (total === 0) return 0;
    return (cancelled / total) * 100;
  };

  const revenueGrowth = calcGrowth(currentFin.grossRevenue, prevFin.grossRevenue);
  const profitGrowth = calcGrowth(currentFin.netProfit, prevFin.netProfit);
  const ordersGrowth = calcGrowth(currentFin.orderCount, prevFin.orderCount);
  const currentCancellationRate = calcCancellationRate(currentFin.cancelledOrderCount, currentFin.orderCount);

  // 3. Platform Breakdown (Amazon vs Flipkart vs Meesho)
  const azFin = calculateFinancialSummary(orders, start, end, 'amazon', skuCostsMap);
  const fkFin = calculateFinancialSummary(orders, start, end, 'flipkart', skuCostsMap);
  const meeshoFin = calculateFinancialSummary(orders, start, end, 'meesho', skuCostsMap);

  const amazonStats: PlatformStatSummary = {
    revenue: azFin.grossRevenue,
    netSales: azFin.netSales,
    netProfit: azFin.netProfit,
    margin: azFin.profitMargin,
    orders: azFin.orderCount,
    returnRate: azFin.returnRate,
    cancellationRate: calcCancellationRate(azFin.cancelledOrderCount, azFin.orderCount)
  };

  const flipkartStats: PlatformStatSummary = {
    revenue: fkFin.grossRevenue,
    netSales: fkFin.netSales,
    netProfit: fkFin.netProfit,
    margin: fkFin.profitMargin,
    orders: fkFin.orderCount,
    returnRate: fkFin.returnRate,
    cancellationRate: calcCancellationRate(fkFin.cancelledOrderCount, fkFin.orderCount)
  };

  const meeshoStats: PlatformStatSummary = {
    revenue: meeshoFin.grossRevenue,
    netSales: meeshoFin.netSales,
    netProfit: meeshoFin.netProfit,
    margin: meeshoFin.profitMargin,
    orders: meeshoFin.orderCount,
    returnRate: meeshoFin.returnRate,
    cancellationRate: calcCancellationRate(meeshoFin.cancelledOrderCount, meeshoFin.orderCount)
  };

  // 4. Inventory Intelligence & Velocity
  const restockMetrics: RestockMetrics[] = inventory.map((item) =>
    computeRestockMetrics(item, orders)
  );
  const workingCapital: WorkingCapitalSummary = computeWorkingCapitalSummary(inventory, orders);

  // Filter critical stockouts / reorders needed
  const criticalSkus: CriticalSkuItem[] = restockMetrics
    .filter(
      (m) =>
        m.urgency === 'STOCKOUT' ||
        m.urgency === 'CRITICAL_STOCKOUT_RISK' ||
        m.urgency === 'REORDER_NOW'
    )
    .sort((a, b) => a.doi - b.doi)
    .slice(0, 5)
    .map((m) => ({
      sku: m.sku,
      name: m.productName,
      available: m.availableStock,
      doi: Number(m.doi.toFixed(1)),
      vDaily: Number(m.velocity.vDaily.toFixed(2)),
      reorderQty: m.recommendedReorderQty,
      reorderPoValue: m.reorderPoValue,
      urgency: m.urgency
    }));

  // Top dead stock items
  const deadStockSkus: DeadStockItem[] = workingCapital.deadStockList
    .slice(0, 5)
    .map((item) => ({
      sku: item.sku,
      name: item.productName,
      stock: item.currentStock,
      lockedValue: item.lockedValue,
      doi: Number(item.doi.toFixed(1)),
      playbookAction: item.recommendedLiquidationAction
    }));

  // 5. Active Tactical Recommendations
  const recs: Recommendation[] = generateRecommendations(
    orders,
    undefined,
    skuCostsMap,
    inventory
  );
  const topRecommendations = recs.slice(0, 4).map((r) => ({
    category: r.category,
    title: r.title,
    metric: r.metric,
    action: r.action,
    impact: r.impact,
    marketplace: r.marketplace
  }));

  // 6. Snapshot Object
  const snapshot: StoreContextSnapshot = {
    periodLabel,
    startDate: startIso,
    endDate: endIso,
    platform,
    totalRevenue: currentFin.grossRevenue,
    netSales: currentFin.netSales,
    netProfit: currentFin.netProfit,
    profitMargin: currentFin.profitMargin,
    orderCount: currentFin.orderCount,
    unitsSold: currentFin.unitsSold,
    returnRate: currentFin.returnRate,
    returnedCount: currentFin.returnedOrderCount,
    refundedValue: currentFin.refundedValue,
    cancellationRate: currentCancellationRate,
    cancelledCount: currentFin.cancelledOrderCount,
    aov: currentFin.aov,
    marketplaceFees: currentFin.marketplaceFees,
    cogs: currentFin.cogs,
    shippingCosts: currentFin.shipping,
    growth: {
      revenueGrowth,
      profitGrowth,
      ordersGrowth
    },
    marketplaceBreakdown: {
      amazon: amazonStats,
      flipkart: flipkartStats,
      meesho: meeshoStats
    },
    inventorySummary: {
      totalAssetValue: workingCapital.totalAssetValue,
      activeCapital: workingCapital.activeCapital,
      lockedDeadCapital: workingCapital.lockedDeadCapital,
      totalReorderPoValue: workingCapital.totalReorderPoValue,
      criticalStockoutCount: criticalSkus.length,
      deadStockCount: workingCapital.deadStockList.length
    },
    criticalSkus,
    deadStockSkus,
    topRecommendations
  };

  // 6.5 Indian GST Tax & Compliance calculation
  const taxComp = calculateTaxCompliance(orders, {
    sellerState: 'Karnataka',
    platform,
    start,
    end,
    skuCostsMap
  });

  const taxSummary: TaxSnapshotSummary = {
    outputGst: taxComp.totalOutputTax,
    igst: taxComp.totalIgst,
    cgst: taxComp.totalCgst,
    sgst: taxComp.totalSgst,
    eligibleItc: taxComp.gstr3b.eligibleItc.totalAvailableItc,
    cogsItc: taxComp.gstr3b.eligibleItc.cogsProcurementItc,
    platformServicesItc: taxComp.gstr3b.eligibleItc.marketplaceServicesItc + taxComp.gstr3b.eligibleItc.shippingLogisticsItc,
    tcsWithheld: taxComp.tcsSummary.blended.totalTcs,
    netCashTaxPayable: taxComp.gstr3b.netTaxPayableInCash,
    excessCredit: taxComp.gstr3b.excessCreditCarriedForward
  };

  snapshot.taxSummary = taxSummary;

  // 7. Token-Optimized Markdown Serializer
  const mdParts: string[] = [];

  mdParts.push(`## Store Grounding Context — ${periodLabel}`);
  mdParts.push(`Active Sales Channel: ${platform.toUpperCase()}`);

  mdParts.push(`\n### 1. Executive Financial Performance`);
  mdParts.push(`- Gross Revenue: ${formatINR(currentFin.grossRevenue)} (${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth.toFixed(1)}% vs prev period)`);
  mdParts.push(`- Net Realized Sales: ${formatINR(currentFin.netSales)}`);
  mdParts.push(`- Net Operating Profit: ${formatINR(currentFin.netProfit)} (${profitGrowth >= 0 ? '+' : ''}${profitGrowth.toFixed(1)}% vs prev period)`);
  mdParts.push(`- Net Profit Margin: ${formatPercent(currentFin.profitMargin)}`);
  mdParts.push(`- Total Orders Fulfilled: ${currentFin.orderCount} (${ordersGrowth >= 0 ? '+' : ''}${ordersGrowth.toFixed(1)}%) | Units Sold: ${currentFin.unitsSold}`);
  mdParts.push(`- Average Order Value (AOV): ${formatINR(currentFin.aov)}`);
  mdParts.push(`- Customer Returns: ${currentFin.returnedOrderCount} orders (${formatPercent(currentFin.returnRate)}) | Refund Value: ${formatINR(currentFin.refundedValue)}`);
  mdParts.push(`- Buyer Cancellations: ${currentFin.cancelledOrderCount} orders (${formatPercent(currentCancellationRate)})`);
  mdParts.push(`- Cost Deductions: COGS ${formatINR(currentFin.cogs)} | Marketplace Fees ${formatINR(currentFin.marketplaceFees)} | Shipping ${formatINR(currentFin.shipping)}`);

  mdParts.push(`\n### 2. Multi-Marketplace Contrast (Amazon vs Flipkart vs Meesho)`);
  mdParts.push(`| Marketplace | Gross Revenue | Net Profit | Net Margin | Orders | Return Rate | Cancellation Rate | Fee Structure |`);
  mdParts.push(`| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |`);
  mdParts.push(`| Amazon India | ${formatINR(amazonStats.revenue)} | ${formatINR(amazonStats.netProfit)} | ${formatPercent(amazonStats.margin)} | ${amazonStats.orders} | ${formatPercent(amazonStats.returnRate)} | ${formatPercent(amazonStats.cancellationRate)} | 15% Comm + ₹20 Closing |`);
  mdParts.push(`| Flipkart | ${formatINR(flipkartStats.revenue)} | ${formatINR(flipkartStats.netProfit)} | ${formatPercent(flipkartStats.margin)} | ${flipkartStats.orders} | ${formatPercent(flipkartStats.returnRate)} | ${formatPercent(flipkartStats.cancellationRate)} | 12% Comm + ₹15 Closing |`);
  mdParts.push(`| Meesho | ${formatINR(meeshoStats.revenue)} | ${formatINR(meeshoStats.netProfit)} | ${formatPercent(meeshoStats.margin)} | ${meeshoStats.orders} | ${formatPercent(meeshoStats.returnRate)} | ${formatPercent(meeshoStats.cancellationRate)} | 0% Referral Fee (Zero Comm) |`);

  mdParts.push(`\n### 3. Inventory & Working Capital Health`);
  mdParts.push(`- Total Warehouse Asset Value: ${formatINR(workingCapital.totalAssetValue)} across ${workingCapital.totalSkus} SKUs`);
  mdParts.push(`- Active Working Capital (Healthy Turnover): ${formatINR(workingCapital.activeCapital)}`);
  mdParts.push(`- Trapped in Stagnant / Dead Stock: ${formatINR(workingCapital.lockedDeadCapital)} (${workingCapital.deadStockList.length} SKUs idle >60d)`);
  mdParts.push(`- Restock Reorder PO Requirement: ${formatINR(workingCapital.totalReorderPoValue)} required to prevent stockouts`);

  if (criticalSkus.length > 0) {
    mdParts.push(`\n**Top Stockout Risks (Immediate Action Required):**`);
    for (const item of criticalSkus) {
      mdParts.push(`- **${item.sku}** (${item.name}): ${item.available} units avail, ${item.doi} days DOI, selling ${item.vDaily} u/d. Urgent Reorder: ${item.reorderQty} units (${formatINR(item.reorderPoValue)} PO cost) [${item.urgency}]`);
    }
  } else {
    mdParts.push(`\n- No immediate stockout risks detected. Inventory velocity is balanced.`);
  }

  if (deadStockSkus.length > 0) {
    mdParts.push(`\n**Top Dead Stock SKUs (Liquidation Playbook Recommended):**`);
    for (const item of deadStockSkus) {
      mdParts.push(`- **${item.sku}** (${item.name}): ${item.stock} idle units (${formatINR(item.lockedValue)} locked). Action: ${item.playbookAction}`);
    }
  }

  if (topRecommendations.length > 0) {
    mdParts.push(`\n### 4. Active Tactical System Recommendations`);
    for (const rec of topRecommendations) {
      mdParts.push(`- [${rec.impact.toUpperCase()}] **${rec.title}** (${rec.marketplace}): ${rec.metric} -> Action: ${rec.action}`);
    }
  }

  mdParts.push(`\n### 5. Indian GST Tax, ITC & Section 52 TCS Compliance`);
  mdParts.push(`- Total Output GST Liability: ${formatINR(taxSummary.outputGst)} (IGST: ${formatINR(taxSummary.igst)} | CGST+SGST: ${formatINR(taxSummary.cgst + taxSummary.sgst)})`);
  mdParts.push(`- Total Eligible ITC: ${formatINR(taxSummary.eligibleItc)} (COGS: ${formatINR(taxSummary.cogsItc)} | Platform Services & Logistics: ${formatINR(taxSummary.platformServicesItc)})`);
  mdParts.push(`- Section 52 TCS Credit (withheld by marketplaces): ${formatINR(taxSummary.tcsWithheld)}`);
  mdParts.push(`- Net GST Cash Tax Due: ${formatINR(taxSummary.netCashTaxPayable)}${taxSummary.excessCredit > 0 ? ` (Excess Credit Carried Forward: ${formatINR(taxSummary.excessCredit)})` : ''}`);

  // 6.6 Advertising & Marketing Performance calculation
  const adSummary = calculateAdvertisingSummary(orders, {
    platform,
    start,
    end,
    skuCostsMap
  });

  const advertisingSummary: AdvertisingSnapshotSummary = {
    totalAdSpend: adSummary.totalAdSpend,
    totalAdSales: adSummary.totalAdSales,
    blendedRoas: adSummary.blendedRoas,
    blendedAcos: adSummary.blendedAcos,
    blendedTacos: adSummary.blendedTacos,
    blendedCac: adSummary.blendedCac,
    adBleedCount: adSummary.adBleedCount,
    moneyPitSpend: adSummary.moneyPitSpend
  };

  snapshot.advertisingSummary = advertisingSummary;

  mdParts.push(`\n### 6. Advertising ROI, TACoS & Marketing Performance`);
  mdParts.push(`- Total Ad Spend: ${formatINR(advertisingSummary.totalAdSpend)} | Attributed Ad Sales: ${formatINR(advertisingSummary.totalAdSales)}`);
  mdParts.push(`- Blended ROAS: ${advertisingSummary.blendedRoas}x | Blended ACoS: ${advertisingSummary.blendedAcos}% | Blended TACoS: ${advertisingSummary.blendedTacos}% (Target: <15%)`);
  mdParts.push(`- Blended CAC: ${formatINR(advertisingSummary.blendedCac)} / order`);
  mdParts.push(`- Ad Bleed Alert: ${advertisingSummary.adBleedCount} SKUs where ACoS exceeds Gross Margin | Money Pit Spend: ${formatINR(advertisingSummary.moneyPitSpend)}`);

  // 6.7 Customer Returns, RTO Drag & NDR Intelligence
  const retSummary = calculateReturnsSummary(orders, {
    platform,
    start,
    end,
    skuCostsMap
  });

  const returnsSummary: ReturnsSnapshotSummary = {
    totalReturnLoss: retSummary.totalReturnLoss,
    blendedReturnRate: retSummary.blendedReturnRate,
    rtoCount: retSummary.rtoCount,
    rtoRate: retSummary.rtoRate,
    customerReturnCount: retSummary.customerReturnCount,
    customerReturnRate: retSummary.customerReturnRate,
    codReturnRate: retSummary.codDisparity.codReturnRate,
    prepaidReturnRate: retSummary.codDisparity.prepaidReturnRate,
    codRiskMultiplier: retSummary.codDisparity.codRiskMultiplier,
    pendingNdrCount: retSummary.pendingNdrCount,
    topLossCourier: retSummary.courierBenchmarks[0]?.courier || 'Delhivery'
  };

  snapshot.returnsSummary = returnsSummary;

  mdParts.push(`\n### 7. Customer Returns, RTO Drag & NDR Intelligence`);
  mdParts.push(`- Total Return Cash Loss: ${formatINR(returnsSummary.totalReturnLoss)} | Blended Return Rate: ${returnsSummary.blendedReturnRate}% (Target: <12%)`);
  mdParts.push(`- RTO vs. Customer Returns: ${returnsSummary.rtoCount} RTO (${returnsSummary.rtoRate}%) vs. ${returnsSummary.customerReturnCount} Customer Returns (${returnsSummary.customerReturnRate}%)`);
  mdParts.push(`- COD Disparity: COD return rate is ${returnsSummary.codReturnRate}% vs. Prepaid at ${returnsSummary.prepaidReturnRate}% (${returnsSummary.codRiskMultiplier}x higher risk)`);
  mdParts.push(`- Pending NDR Alerts: ${returnsSummary.pendingNdrCount} delivery failure attempts requiring customer verification`);

  // 6.8 Cash Flow Runway & Working Capital Liquidity
  const cfSummary = calculateCashFlowForecast(orders, {
    platform,
    start,
    end,
    skuCostsMap
  });

  const cashflowSummary: CashFlowSnapshotSummary = {
    currentCash: cfSummary.currentCash,
    inflows30d: cfSummary.inflows30d,
    outflows30d: cfSummary.outflows30d,
    netCash30d: cfSummary.netCash30d,
    projectedBalance90d: cfSummary.projectedBalance90d,
    minTroughBalance: cfSummary.minTroughBalance,
    troughDate: cfSummary.troughDate,
    runwayDays: cfSummary.runwayDays,
    runwayStatus: cfSummary.runwayStatus,
    upcomingPayables30d: cfSummary.outflows30d
  };

  snapshot.cashflowSummary = cashflowSummary;

  mdParts.push(`\n### 8. Cash Flow Runway & Working Capital Liquidity`);
  mdParts.push(`- Current Liquid Cash: ${formatINR(cashflowSummary.currentCash)} | 30-Day Net Cash Flow: ${cashflowSummary.netCash30d >= 0 ? '+' : ''}${formatINR(cashflowSummary.netCash30d)}`);
  mdParts.push(`- Cash Runway: ${cashflowSummary.runwayDays >= 900 ? '>90 Days (Sustainable)' : `${cashflowSummary.runwayDays} Days`} (Status: ${cashflowSummary.runwayStatus.toUpperCase()})`);
  mdParts.push(`- 90-Day Liquidity Trough: ${formatINR(cashflowSummary.minTroughBalance)} on ${cashflowSummary.troughDate}`);
  mdParts.push(`- Upcoming 30-Day Payables: ${formatINR(cashflowSummary.upcomingPayables30d)} (Scheduled GST challans, supplier POs, and ad spend)`);

  const markdown = mdParts.join('\n');
  // Approximate token count: ~4 characters per token
  const tokenEstimate = Math.ceil(markdown.length / 4);

  return {
    markdown,
    snapshot,
    tokenEstimate
  };
}
