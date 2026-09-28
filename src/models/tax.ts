export type TaxSupplyType = 'intra_state' | 'inter_state';

export interface GstStateInfo {
  code: string; // 2-digit code, e.g. "29"
  name: string; // State name, e.g. "Karnataka"
  pos: string;  // e.g. "29-Karnataka"
}

export interface B2csSummaryItem {
  pos: string;              // Place of Supply, e.g. "29-Karnataka"
  stateName: string;
  stateCode: string;
  supplyType: TaxSupplyType; // intra_state vs inter_state
  taxRate: number;          // e.g. 18, 12, 5, 0
  grossValue: number;       // Invoiced total amount
  taxableValue: number;     // Value before GST
  igst: number;             // Integrated GST (inter-state)
  cgst: number;             // Central GST (intra-state)
  sgst: number;             // State GST (intra-state)
  totalTax: number;         // igst + cgst + sgst
  orderCount: number;
}

export interface HsnSummaryItem {
  hsnCode: string;          // e.g. "8518", "8517"
  description: string;
  uqc: string;              // Unit Quantity Code, e.g. "NOS"
  totalQuantity: number;
  totalValue: number;       // Gross value
  taxableValue: number;
  taxRate: number;          // e.g. 18
  igst: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface MarketplaceTcsItem {
  marketplace: 'amazon' | 'flipkart' | 'meesho' | 'blended';
  displayName: string;
  grossTaxableValue: number;
  returnedTaxableValue: number;
  netTaxableValue: number;
  igstTcs: number;          // 1% of inter-state net taxable value
  cgstTcs: number;          // 0.5% of intra-state net taxable value
  sgstTcs: number;          // 0.5% of intra-state net taxable value
  totalTcs: number;         // Total 1% TCS withheld by platform
  orderCount: number;
  returnCount: number;
}

export interface Section52TcsSummary {
  amazon: MarketplaceTcsItem;
  flipkart: MarketplaceTcsItem;
  meesho: MarketplaceTcsItem;
  blended: MarketplaceTcsItem;
}

export interface Gstr3bSummary {
  // Table 3.1: Details of Outward Supplies
  outwardTaxableSupplies: {
    totalTaxableValue: number;
    igst: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  };
  // Table 4: Eligible Input Tax Credit (ITC)
  eligibleItc: {
    cogsProcurementItc: number;     // GST paid on wholesale manufacturing / procurement
    marketplaceServicesItc: number; // 18% GST charged by Amazon/Flipkart/Meesho on referral/closing/logistics fees
    shippingLogisticsItc: number;   // 18% GST on shipping/freight invoices
    totalAvailableItc: number;      // Total credit available to offset output tax
  };
  // Section 52 TCS Credit
  tcsCreditAvailable: number;       // Total 1% TCS available in GST cash ledger
  // Net Liability
  netTaxPayableInCash: number;      // Math.max(0, outputTax - totalAvailableItc - tcsCreditAvailable)
  excessCreditCarriedForward: number; // If ITC + TCS exceeds output tax
}

export interface TaxComplianceSummary {
  sellerState: string;              // e.g. "Karnataka"
  sellerStateCode: string;          // e.g. "29"
  sellerPos: string;                // e.g. "29-Karnataka"
  dateRange: {
    start: string;
    end: string;
  };
  // Aggregate KPIs
  totalGrossSales: number;
  totalTaxableValue: number;
  totalOutputTax: number;
  totalIgst: number;
  totalCgst: number;
  totalSgst: number;
  // Detail breakdowns
  b2csSummary: B2csSummaryItem[];
  hsnSummary: HsnSummaryItem[];
  tcsSummary: Section52TcsSummary;
  gstr3b: Gstr3bSummary;
}
