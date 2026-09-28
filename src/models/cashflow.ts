export type CashFlowCategory = 
  | 'marketplace_settlement' 
  | 'supplier_restock' 
  | 'gst_tax' 
  | 'advertising' 
  | 'rto_freight' 
  | 'operating_expenses' 
  | 'capital_infusion';

export type DisbursementPlatform = 'amazon' | 'flipkart' | 'meesho';

export type DisbursementStatus = 'pending_escrow' | 'processing' | 'deposited';

export type OutflowUrgency = 'critical' | 'upcoming' | 'flexible';

export type OutflowStatus = 'scheduled' | 'paid' | 'delayed';

export type RunwayStatus = 'healthy' | 'caution' | 'critical_crunch';

export interface DisbursementPipelineItem {
  id: string;
  platform: DisbursementPlatform;
  settlementCycle: string;
  orderDateRange: string;
  expectedDepositDate: string; // ISO date YYYY-MM-DD
  grossSales: number;          // Gross order value in INR
  marketplaceFees: number;     // Commissions, closing fees, shipping deductions in INR
  reserveWithheld: number;     // Account level escrow reserve (e.g. Amazon 7-day reserve) in INR
  netDisbursement: number;     // Net cash deposited into seller's bank in INR
  status: DisbursementStatus;
}

export interface ScheduledOutflowItem {
  id: string;
  title: string;
  category: CashFlowCategory;
  payee: string;
  dueDate: string;             // ISO date YYYY-MM-DD
  amount: number;              // Invoiced liability amount in INR
  urgency: OutflowUrgency;
  status: OutflowStatus;
  description: string;
}

export interface DailyCashFlowPoint {
  date: string;                // ISO date YYYY-MM-DD
  dayIndex: number;            // 1 to 90
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCash: number;
  closingBalance: number;
  isTrough: boolean;
  isUnderSafetyBuffer: boolean;
  inflowBreakdown: {
    amazon: number;
    flipkart: number;
    meesho: number;
    capitalInfusion: number;
  };
  outflowBreakdown: {
    supplier: number;
    gstTax: number;
    ads: number;
    rto: number;
    opex: number;
  };
}

export interface ScenarioSimulation {
  salesGrowthPct: number;      // -50% to +100%
  adSpendChangePct: number;    // -50% to +100%
  supplierCreditDays: number;  // 0, 15, 30, 45, 60 days
  rtoRateChangePct: number;    // -50% to +50%
  capitalInjection: number;    // Additional equity / debt line in INR (e.g. 0 to 1,000,000)
}

export interface CashFlowSummary {
  startingCash: number;
  currentCash: number;
  safeReserveBuffer: number;   // Minimum cash buffer to prevent bounced payments (default: ₹1,00,000)
  inflows30d: number;
  outflows30d: number;
  netCash30d: number;
  projectedBalance30d: number;
  projectedBalance60d: number;
  projectedBalance90d: number;
  minTroughBalance: number;    // Lowest cash balance projected across 90 days
  troughDate: string;
  troughDayIndex: number;
  dailyBurnRate: number;       // Average daily net negative outflow (if net burn) or 0
  runwayDays: number;          // Days until cash depletion (<0 or 999 if cash flow positive)
  runwayStatus: RunwayStatus;  // 'healthy' (>90d), 'caution' (30-90d), 'critical_crunch' (<30d)
  dailyPoints: DailyCashFlowPoint[];
  disbursements: DisbursementPipelineItem[];
  scheduledOutflows: ScheduledOutflowItem[];
  simulation: ScenarioSimulation;
}
