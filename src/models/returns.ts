export type ReturnType = 'rto' | 'customer_return';

export type PaymentType = 'COD' | 'Prepaid';

export type ReturnReason = 
  | 'fake_attempt' 
  | 'customer_unavailable' 
  | 'customer_refused' 
  | 'wrong_address' 
  | 'defective_damaged' 
  | 'size_fit_issue' 
  | 'quality_not_as_expected' 
  | 'buyer_remorse' 
  | 'other';

export type NdrStatus = 'open' | 'action_taken' | 'resolved_delivered' | 'rto_initiated';

export type CourierPartner = 
  | 'Delhivery' 
  | 'Blue Dart' 
  | 'Xpressbees' 
  | 'Shadowfax' 
  | 'Ecom Express' 
  | 'Amazon ATS' 
  | 'Ekart Logistics';

export type ItemCondition = 'sealed_restockable' | 'damaged' | 'missing_parts' | 'counterfeit_fraud';

export interface ReturnItem {
  id: string;                    // Order / Return ID
  orderDate: string;             // ISO date YYYY-MM-DD
  returnDate: string;            // ISO date YYYY-MM-DD
  platform: 'amazon' | 'flipkart' | 'meesho';
  sku: string;
  productName: string;
  orderValue: number;            // Gross order value in INR
  paymentMethod: PaymentType;
  returnType: ReturnType;        // 'rto' (undelivered courier return) vs 'customer_return' (delivered & returned)
  returnReason: ReturnReason;
  customerState: string;
  pincode: string;
  courier: CourierPartner;
  trackingNumber: string;
  forwardShippingFee: number;    // INR
  reverseShippingFee: number;    // INR
  processingFee: number;         // INR
  packagingLoss: number;         // INR
  damageLoss: number;            // INR
  netLoss: number;               // Total unrecoverable cash lost on this return in INR
  condition: ItemCondition;
}

export interface NdrCase {
  id: string;
  orderId: string;
  customerName: string;
  customerPhone: string;
  sku: string;
  productName: string;
  orderValue: number;
  paymentMethod: PaymentType;
  courier: CourierPartner;
  trackingNumber: string;
  ndrReason: string;
  attemptCount: number;
  firstAttemptDate: string;
  lastAttemptDate: string;
  customerState: string;
  pincode: string;
  status: NdrStatus;
  suggestedAction: string;
  whatsappDraft: string;
  actionTakenNote?: string;
}

export interface CourierBenchmark {
  courier: CourierPartner;
  totalDispatched: number;
  delivered: number;
  rtoCount: number;
  customerReturnCount: number;
  deliverySuccessRate: number;   // %
  rtoRate: number;               // %
  fakeAttemptRate: number;       // %
  avgTransitDays: number;
  totalShippingCost: number;     // INR
  totalReverseLoss: number;      // INR
  rating: 'excellent' | 'good' | 'at_risk' | 'poor';
}

export interface StateRtoRisk {
  state: string;
  totalOrders: number;
  rtoCount: number;
  rtoRate: number;               // %
  customerReturnRate: number;    // %
  codSharePct: number;           // %
  riskTier: 'high_risk' | 'moderate' | 'safe';
  totalLoss: number;             // INR
}

export interface SkuReturnDefect {
  sku: string;
  productName: string;
  deliveredCount: number;
  returnCount: number;
  returnRate: number;            // %
  rtoCount: number;
  rtoRate: number;               // %
  topReason: string;
  damageWriteOffCount: number;
  totalNetLoss: number;          // INR
  recommendation: string;
}

export interface ReturnsPortfolioSummary {
  totalOrders: number;
  deliveredCount: number;
  totalReturnsCount: number;
  rtoCount: number;
  customerReturnCount: number;
  blendedReturnRate: number;     // (totalReturns / totalOrders) * 100 %
  rtoRate: number;               // (rtoCount / totalOrders) * 100 %
  customerReturnRate: number;    // (customerReturnCount / totalOrders) * 100 %
  totalReturnLoss: number;       // Total cash drag in INR
  reverseLogisticsLoss: number;  // Forward + Reverse shipping paid on returns
  damageWriteOffLoss: number;    // Damaged inventory write-off in INR
  packagingLoss: number;         // Destroyed boxes & packing materials
  codDisparity: {
    codOrders: number;
    codReturns: number;
    codReturnRate: number;       // %
    codLoss: number;             // INR
    prepaidOrders: number;
    prepaidReturns: number;
    prepaidReturnRate: number;   // %
    prepaidLoss: number;         // INR
    codRiskMultiplier: number;   // Ratio of COD return rate / Prepaid return rate
  };
  pendingNdrCount: number;
  ndrCases: NdrCase[];
  courierBenchmarks: CourierBenchmark[];
  stateRisks: StateRtoRisk[];
  skuDefects: SkuReturnDefect[];
  recentReturns: ReturnItem[];
}
