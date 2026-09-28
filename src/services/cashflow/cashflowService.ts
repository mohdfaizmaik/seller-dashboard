import type { Order } from '../../models/order';
import type { SkuCost } from '../catalog/cogsService';
import type { PlatformFilter } from '../../hooks/useFilters';
import type {
  CashFlowSummary,
  DailyCashFlowPoint,
  DisbursementPipelineItem,
  ScheduledOutflowItem,
  ScenarioSimulation,
  RunwayStatus
} from '../../models/cashflow';

const STORAGE_KEY_STARTING_CASH = 'sellervault_starting_cash';
export const DEFAULT_STARTING_CASH = 350000; // ₹3.5 Lakhs default liquid reserve
export const DEFAULT_SAFE_BUFFER = 100000;    // ₹1.0 Lakh safety threshold

export const DEFAULT_SIMULATION: ScenarioSimulation = {
  salesGrowthPct: 0,
  adSpendChangePct: 0,
  supplierCreditDays: 15,
  rtoRateChangePct: 0,
  capitalInjection: 0
};

export function getStoredStartingCash(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY_STARTING_CASH);
      if (stored !== null) {
        const val = Number(stored);
        if (!isNaN(val) && val >= 0) return val;
      }
    }
  } catch {
    // Fall back to default
  }
  return DEFAULT_STARTING_CASH;
}

export function saveStartingCash(amount: number): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_STARTING_CASH, String(amount));
    }
  } catch {
    // Ignore
  }
}

export interface CashFlowCalculationOptions {
  platform?: PlatformFilter;
  start?: string | Date;
  end?: string | Date;
  skuCostsMap?: Map<string, SkuCost>;
  startingCash?: number;
  safeReserveBuffer?: number;
}

/**
 * Calculates a dynamic 90-day cash flow forecast, disbursement pipeline,
 * scheduled liabilities calendar, and scenario simulations.
 */
export function calculateCashFlowForecast(
  orders: Order[],
  options?: CashFlowCalculationOptions,
  simulationParams: ScenarioSimulation = DEFAULT_SIMULATION
): CashFlowSummary {
  const startingCash = options?.startingCash ?? getStoredStartingCash();
  const safeReserveBuffer = options?.safeReserveBuffer ?? DEFAULT_SAFE_BUFFER;

  // Determine baseline date from orders or default to 2026-08-10
  let baseDate = new Date('2026-08-10');
  if (orders.length > 0) {
    const dates = orders
      .map((o) => new Date(o.date || o.orderDate).getTime())
      .filter((t) => !isNaN(t));
    if (dates.length > 0) {
      baseDate = new Date(Math.max(...dates));
    }
  }

  // Calculate baseline platform sales rate per day
  const totalGross = orders.reduce((sum, o) => {
    const amt = o.gross_amount ?? o.orderValue ?? 0;
    return sum + (o.status !== 'cancelled' ? amt : 0);
  }, 0);
  const baselineDailySales = totalGross > 0 ? (totalGross / 30) : 38000; // ~₹38,000 / day
  
  const growthMultiplier = 1 + (simulationParams.salesGrowthPct / 100);
  const projectedDailySales = Math.max(0, baselineDailySales * growthMultiplier);

  // Platform share distribution
  const amazonShare = 0.52;
  const flipkartShare = 0.33;
  const meeshoShare = 0.15;

  // Ad spend baseline: ~₹2,900 / day
  const adSpendMultiplier = 1 + (simulationParams.adSpendChangePct / 100);
  const dailyAdSpend = Math.max(0, 2900 * adSpendMultiplier);

  // RTO cash loss baseline: ~₹650 / day
  const rtoMultiplier = 1 + (simulationParams.rtoRateChangePct / 100);
  const dailyRtoLoss = Math.max(0, 650 * rtoMultiplier);

  // Fixed monthly operating expenses: ₹32,000 (warehouse rent, packing tape/labels, SaaS)
  const monthlyOpex = 32000;

  // Monthly GST Tax baseline: ~₹48,500 due on the 20th of each month
  const monthlyGstTax = 48500 * growthMultiplier;

  // Generate 90 daily points
  const dailyPoints: DailyCashFlowPoint[] = [];
  let currentBalance = startingCash + simulationParams.capitalInjection;
  let minTrough = currentBalance;
  let troughDay = 1;
  let troughDateStr = formatDateIso(baseDate);

  let totalInflows30d = 0;
  let totalOutflows30d = 0;

  for (let day = 1; day <= 90; day++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + day);
    const dateStr = formatDateIso(d);
    const dayOfMonth = d.getDate();
    const dayOfWeek = d.getDay(); // 0 is Sun, 3 is Wed, 5 is Fri

    const opening = currentBalance;

    // -------------------------------------------------------------
    // Inflows Calculation (Disbursements based on settlement cycles)
    // -------------------------------------------------------------
    // Amazon: bi-weekly (every 14 days, e.g. alternate Tuesdays/Fridays)
    let amazonInflow = 0;
    if (day % 14 === 3) {
      // 14 days of accumulated sales less fees & reserve
      amazonInflow = Math.round(projectedDailySales * amazonShare * 14 * 0.72);
    }

    // Flipkart: weekly disbursement on Wednesdays (dayOfWeek === 3)
    let flipkartInflow = 0;
    if (dayOfWeek === 3) {
      flipkartInflow = Math.round(projectedDailySales * flipkartShare * 7 * 0.75);
    }

    // Meesho: bi-weekly disbursements (every 15 days post-delivery)
    let meeshoInflow = 0;
    if (day % 15 === 8) {
      meeshoInflow = Math.round(projectedDailySales * meeshoShare * 15 * 0.85);
    }

    const capitalInfusion = (day === 1 && simulationParams.capitalInjection > 0) ? simulationParams.capitalInjection : 0;
    const totalInflows = amazonInflow + flipkartInflow + meeshoInflow + (day === 1 ? 0 : capitalInfusion);

    // -------------------------------------------------------------
    // Outflows Calculation
    // -------------------------------------------------------------
    // Daily continuous outflows
    const adsOutflow = Math.round(dailyAdSpend);
    const rtoOutflow = Math.round(dailyRtoLoss);

    // Monthly GST Outflow: Due on the 20th of every month
    let gstTaxOutflow = 0;
    if (dayOfMonth === 20) {
      gstTaxOutflow = Math.round(monthlyGstTax);
    }

    // Monthly OPEX Outflow: Rent & Utilities on the 1st of every month
    let opexOutflow = 0;
    if (dayOfMonth === 1) {
      opexOutflow = Math.round(monthlyOpex);
    }

    // Supplier Restock Outflow: Scheduled every 21 days, modulated by supplierCreditDays
    // Standard replenishment batch is ~₹1,45,000
    let supplierOutflow = 0;
    const basePoTriggerDay = 12; // PO issued on day 12, 33, 54, 75
    const paymentDay = basePoTriggerDay + simulationParams.supplierCreditDays;
    if (day === paymentDay || day === paymentDay + 21 || day === paymentDay + 42 || day === paymentDay + 63) {
      supplierOutflow = Math.round(145000 * growthMultiplier);
    }

    const totalOutflows = adsOutflow + rtoOutflow + gstTaxOutflow + opexOutflow + supplierOutflow;
    const netCash = totalInflows - totalOutflows;
    const closing = opening + netCash;

    if (day <= 30) {
      totalInflows30d += totalInflows;
      totalOutflows30d += totalOutflows;
    }

    if (closing < minTrough) {
      minTrough = closing;
      troughDay = day;
      troughDateStr = dateStr;
    }

    dailyPoints.push({
      date: dateStr,
      dayIndex: day,
      openingBalance: opening,
      totalInflows,
      totalOutflows,
      netCash,
      closingBalance: closing,
      isTrough: false, // will mark trough after loop
      isUnderSafetyBuffer: closing < safeReserveBuffer,
      inflowBreakdown: {
        amazon: amazonInflow,
        flipkart: flipkartInflow,
        meesho: meeshoInflow,
        capitalInfusion
      },
      outflowBreakdown: {
        supplier: supplierOutflow,
        gstTax: gstTaxOutflow,
        ads: adsOutflow,
        rto: rtoOutflow,
        opex: opexOutflow
      }
    });

    currentBalance = closing;
  }

  // Mark the trough day
  if (dailyPoints[troughDay - 1]) {
    dailyPoints[troughDay - 1].isTrough = true;
  }

  const netCash30d = totalInflows30d - totalOutflows30d;
  const projectedBalance30d = dailyPoints[29]?.closingBalance ?? currentBalance;
  const projectedBalance60d = dailyPoints[59]?.closingBalance ?? currentBalance;
  const projectedBalance90d = dailyPoints[89]?.closingBalance ?? currentBalance;

  // Runway days calculation
  let dailyBurnRate = 0;
  let runwayDays = 999;
  let runwayStatus: RunwayStatus = 'healthy';

  if (netCash30d < 0) {
    dailyBurnRate = Math.round(Math.abs(netCash30d) / 30);
    runwayDays = dailyBurnRate > 0 ? Math.round(startingCash / dailyBurnRate) : 999;
  }

  if (minTrough < 0 || runwayDays < 30) {
    runwayStatus = 'critical_crunch';
  } else if (minTrough < safeReserveBuffer || runwayDays <= 90) {
    runwayStatus = 'caution';
  } else {
    runwayStatus = 'healthy';
  }

  // Generate realistic upcoming marketplace disbursements
  const disbursements = generateDisbursementPipeline(baseDate, projectedDailySales);

  // Generate scheduled payables calendar
  const scheduledOutflows = generateScheduledOutflows(baseDate, simulationParams);

  return {
    startingCash,
    currentCash: startingCash + simulationParams.capitalInjection,
    safeReserveBuffer,
    inflows30d: totalInflows30d,
    outflows30d: totalOutflows30d,
    netCash30d,
    projectedBalance30d,
    projectedBalance60d,
    projectedBalance90d,
    minTroughBalance: minTrough,
    troughDate: troughDateStr,
    troughDayIndex: troughDay,
    dailyBurnRate,
    runwayDays,
    runwayStatus,
    dailyPoints,
    disbursements,
    scheduledOutflows,
    simulation: simulationParams
  };
}

// -------------------------------------------------------------
// Helper Generators for Pipeline & Outflow Ledger
// -------------------------------------------------------------
function generateDisbursementPipeline(baseDate: Date, dailySales: number): DisbursementPipelineItem[] {
  const d1 = new Date(baseDate);
  d1.setDate(d1.getDate() + 3);
  const d2 = new Date(baseDate);
  d2.setDate(d2.getDate() + 7);
  const d3 = new Date(baseDate);
  d3.setDate(d3.getDate() + 12);
  const d4 = new Date(baseDate);
  d4.setDate(d4.getDate() + 17);

  const azGross = Math.round(dailySales * 0.52 * 14);
  const fkGross = Math.round(dailySales * 0.33 * 7);
  const msGross = Math.round(dailySales * 0.15 * 15);

  return [
    {
      id: 'DISB-AZ-0813',
      platform: 'amazon',
      settlementCycle: 'Bi-weekly Cycle',
      orderDateRange: 'Jul 28 – Aug 10',
      expectedDepositDate: formatDateIso(d1),
      grossSales: azGross,
      marketplaceFees: Math.round(azGross * 0.18),
      reserveWithheld: Math.round(azGross * 0.10), // 7-day reserve
      netDisbursement: Math.round(azGross * 0.72),
      status: 'processing'
    },
    {
      id: 'DISB-FK-0817',
      platform: 'flipkart',
      settlementCycle: 'Weekly Tier 1',
      orderDateRange: 'Aug 03 – Aug 09',
      expectedDepositDate: formatDateIso(d2),
      grossSales: fkGross,
      marketplaceFees: Math.round(fkGross * 0.21),
      reserveWithheld: Math.round(fkGross * 0.04),
      netDisbursement: Math.round(fkGross * 0.75),
      status: 'pending_escrow'
    },
    {
      id: 'DISB-MS-0822',
      platform: 'meesho',
      settlementCycle: 'T+15 Settlement',
      orderDateRange: 'Jul 25 – Aug 07',
      expectedDepositDate: formatDateIso(d3),
      grossSales: msGross,
      marketplaceFees: Math.round(msGross * 0.05), // Zero commission, flat shipping
      reserveWithheld: Math.round(msGross * 0.10),
      netDisbursement: Math.round(msGross * 0.85),
      status: 'pending_escrow'
    },
    {
      id: 'DISB-AZ-0827',
      platform: 'amazon',
      settlementCycle: 'Bi-weekly Cycle',
      orderDateRange: 'Aug 11 – Aug 24',
      expectedDepositDate: formatDateIso(d4),
      grossSales: azGross,
      marketplaceFees: Math.round(azGross * 0.18),
      reserveWithheld: Math.round(azGross * 0.10),
      netDisbursement: Math.round(azGross * 0.72),
      status: 'pending_escrow'
    }
  ];
}

function generateScheduledOutflows(baseDate: Date, sim: ScenarioSimulation): ScheduledOutflowItem[] {
  const dGst = new Date(baseDate);
  dGst.setDate(20);
  if (dGst.getTime() < baseDate.getTime()) {
    dGst.setMonth(dGst.getMonth() + 1);
  }

  const dPo = new Date(baseDate);
  dPo.setDate(dPo.getDate() + sim.supplierCreditDays + 5);

  const dRent = new Date(baseDate);
  dRent.setMonth(dRent.getMonth() + 1);
  dRent.setDate(1);

  const dAds = new Date(baseDate);
  dAds.setDate(dAds.getDate() + 14);

  return [
    {
      id: 'OUT-GST-0820',
      title: 'GSTR-3B PMT-06 Net Tax Challan',
      category: 'gst_tax',
      payee: 'GST Electronic Cash Ledger',
      dueDate: formatDateIso(dGst),
      amount: Math.round(48500 * (1 + sim.salesGrowthPct / 100)),
      urgency: 'critical',
      status: 'scheduled',
      description: 'Statutory net output tax offset after Input Tax Credit (ITC). Delay incurs 18% annual interest.'
    },
    {
      id: 'OUT-PO-0825',
      title: 'Restock Batch PO (Electronics & Audio)',
      category: 'supplier_restock',
      payee: 'Shenzhen Audio Ltd / Mfr Pune',
      dueDate: formatDateIso(dPo),
      amount: Math.round(145000 * (1 + sim.salesGrowthPct / 100)),
      urgency: 'critical',
      status: 'scheduled',
      description: `Purchase order payment scheduled with ${sim.supplierCreditDays}-day credit terms.`
    },
    {
      id: 'OUT-RENT-0901',
      title: 'Warehouse Lease & 3PL Logistics Hub',
      category: 'operating_expenses',
      payee: 'Bhiwandi Warehousing Corp',
      dueDate: formatDateIso(dRent),
      amount: 32000,
      urgency: 'upcoming',
      status: 'scheduled',
      description: 'Monthly fulfillment center rent, security, and packaging material replenishment.'
    },
    {
      id: 'OUT-ADS-0824',
      title: 'Amazon Sponsored Ads Mid-Month Settlement',
      category: 'advertising',
      payee: 'Amazon Advertising India',
      dueDate: formatDateIso(dAds),
      amount: Math.round(42000 * (1 + sim.adSpendChangePct / 100)),
      urgency: 'upcoming',
      status: 'scheduled',
      description: 'Fortnightly ad spend billing cycle for Sponsored Products and Brands.'
    }
  ];
}

function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// -------------------------------------------------------------
// One-Click CSV Exporters
// -------------------------------------------------------------
export function exportCashFlowForecastCsv(summary: CashFlowSummary): string {
  const headers = [
    'Day Index',
    'Date',
    'Opening Cash (INR)',
    'Total Inflows (INR)',
    'Total Outflows (INR)',
    'Net Cash (INR)',
    'Closing Cash (INR)',
    'Safety Buffer Status',
    'Is Trough Day'
  ];

  const rows = summary.dailyPoints.map((p) => [
    p.dayIndex,
    p.date,
    p.openingBalance,
    p.totalInflows,
    p.totalOutflows,
    p.netCash,
    p.closingBalance,
    p.isUnderSafetyBuffer ? 'BELOW_BUFFER' : 'HEALTHY',
    p.isTrough ? 'YES_MIN_TROUGH' : 'NO'
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportDisbursementsCsv(summary: CashFlowSummary): string {
  const headers = [
    'Disbursement ID',
    'Platform',
    'Settlement Cycle',
    'Order Date Range',
    'Expected Deposit Date',
    'Gross Sales (INR)',
    'Marketplace Fees (INR)',
    'Reserve Withheld (INR)',
    'Net Disbursement (INR)',
    'Status'
  ];

  const rows = summary.disbursements.map((d) => [
    d.id,
    d.platform.toUpperCase(),
    `"${d.settlementCycle}"`,
    `"${d.orderDateRange}"`,
    d.expectedDepositDate,
    d.grossSales,
    d.marketplaceFees,
    d.reserveWithheld,
    d.netDisbursement,
    d.status.toUpperCase()
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportPayablesScheduleCsv(summary: CashFlowSummary): string {
  const headers = [
    'Payable ID',
    'Title',
    'Category',
    'Payee',
    'Due Date',
    'Amount (INR)',
    'Urgency',
    'Status',
    'Description'
  ];

  const rows = summary.scheduledOutflows.map((o) => [
    o.id,
    `"${o.title}"`,
    o.category.toUpperCase(),
    `"${o.payee}"`,
    o.dueDate,
    o.amount,
    o.urgency.toUpperCase(),
    o.status.toUpperCase(),
    `"${o.description.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
