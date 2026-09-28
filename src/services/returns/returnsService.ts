import type { Order } from '../../models/order';
import type { SkuCost } from '../catalog/cogsService';
import type { PlatformFilter } from '../../hooks/useFilters';
import { PRODUCTS_CATALOG } from '../../data/products';
import type {
  ReturnItem,
  NdrCase,
  CourierBenchmark,
  StateRtoRisk,
  SkuReturnDefect,
  ReturnsPortfolioSummary,
  CourierPartner,
  NdrStatus
} from '../../models/returns';

const NDR_STORAGE_KEY = 'sellervault_ndr_actions';

// -------------------------------------------------------------
// 1. Default Catalog-Grounded Return Transactions & NDR Cases
// -------------------------------------------------------------
export const DEFAULT_RETURN_ITEMS: ReturnItem[] = [
  // Item 1: Noise Smartwatch - Customer Return (Defective/Damaged)
  {
    id: 'RET-AZ-001',
    orderDate: '2026-07-28',
    returnDate: '2026-08-04',
    platform: 'amazon',
    sku: 'NOISE-CFP3-SLV',
    productName: 'Noise ColorFit Pulse 3 Smartwatch',
    orderValue: 1999,
    paymentMethod: 'Prepaid',
    returnType: 'customer_return',
    returnReason: 'defective_damaged',
    customerState: 'Maharashtra',
    pincode: '400001',
    courier: 'Amazon ATS',
    trackingNumber: 'ATS-IN-98124510',
    forwardShippingFee: 60,
    reverseShippingFee: 80,
    processingFee: 30,
    packagingLoss: 25,
    damageLoss: 425, // 50% of costPrice (850 / 2)
    netLoss: 620,
    condition: 'damaged'
  },
  // Item 2: Levi's 511 Denim - Customer Return (Size/Fit issue)
  {
    id: 'RET-FK-002',
    orderDate: '2026-07-29',
    returnDate: '2026-08-05',
    platform: 'flipkart',
    sku: 'LEVI-511-INDIGO',
    productName: "Levi's Men's 511 Slim Fit Jeans",
    orderValue: 2499,
    paymentMethod: 'Prepaid',
    returnType: 'customer_return',
    returnReason: 'size_fit_issue',
    customerState: 'Karnataka',
    pincode: '560001',
    courier: 'Ekart Logistics',
    trackingNumber: 'FMPC-77189021',
    forwardShippingFee: 50,
    reverseShippingFee: 70,
    processingFee: 30,
    packagingLoss: 20,
    damageLoss: 0,
    netLoss: 170,
    condition: 'sealed_restockable'
  },
  // Item 3: Allen Solly Polo - RTO (Door Refusal on COD)
  {
    id: 'RET-FK-003',
    orderDate: '2026-07-25',
    returnDate: '2026-08-01',
    platform: 'flipkart',
    sku: 'AS-POLO-NAVY',
    productName: 'Allen Solly Slim Fit Polo Shirt',
    orderValue: 899,
    paymentMethod: 'COD',
    returnType: 'rto',
    returnReason: 'customer_refused',
    customerState: 'Uttar Pradesh',
    pincode: '226001',
    courier: 'Delhivery',
    trackingNumber: 'DLV-441098231',
    forwardShippingFee: 50,
    reverseShippingFee: 75,
    processingFee: 25,
    packagingLoss: 20,
    damageLoss: 0,
    netLoss: 170,
    condition: 'sealed_restockable'
  },
  // Item 4: Biba Anarkali Kurta - RTO (Fake Courier Attempt)
  {
    id: 'RET-MS-004',
    orderDate: '2026-08-01',
    returnDate: '2026-08-08',
    platform: 'meesho',
    sku: 'BIBA-ANARKALI-RED',
    productName: 'Biba Cotton Anarkali Kurta',
    orderValue: 1899,
    paymentMethod: 'COD',
    returnType: 'rto',
    returnReason: 'fake_attempt',
    customerState: 'Bihar',
    pincode: '800001',
    courier: 'Shadowfax',
    trackingNumber: 'SHD-88219401',
    forwardShippingFee: 45,
    reverseShippingFee: 65,
    processingFee: 20,
    packagingLoss: 15,
    damageLoss: 0,
    netLoss: 145,
    condition: 'sealed_restockable'
  },
  // Item 5: boAt Rockerz 450 - Customer Return (Quality issue)
  {
    id: 'RET-AZ-005',
    orderDate: '2026-07-30',
    returnDate: '2026-08-06',
    platform: 'amazon',
    sku: 'BOAT-RK450-BLK',
    productName: 'boAt Rockerz 450 Bluetooth Headset',
    orderValue: 1499,
    paymentMethod: 'COD',
    returnType: 'customer_return',
    returnReason: 'quality_not_as_expected',
    customerState: 'Delhi',
    pincode: '110001',
    courier: 'Amazon ATS',
    trackingNumber: 'ATS-IN-44019283',
    forwardShippingFee: 60,
    reverseShippingFee: 80,
    processingFee: 30,
    packagingLoss: 25,
    damageLoss: 150,
    netLoss: 345,
    condition: 'damaged'
  },
  // Item 6: Prestige Mixer Grinder - RTO (Customer Unavailable)
  {
    id: 'RET-FK-006',
    orderDate: '2026-07-27',
    returnDate: '2026-08-03',
    platform: 'flipkart',
    sku: 'PRESTIGE-IRIS-MIX',
    productName: 'Prestige Iris 750W Mixer Grinder',
    orderValue: 3499,
    paymentMethod: 'COD',
    returnType: 'rto',
    returnReason: 'customer_unavailable',
    customerState: 'West Bengal',
    pincode: '700001',
    courier: 'Xpressbees',
    trackingNumber: 'XPR-99214081',
    forwardShippingFee: 80,
    reverseShippingFee: 110,
    processingFee: 40,
    packagingLoss: 50,
    damageLoss: 0,
    netLoss: 280,
    condition: 'sealed_restockable'
  },
  // Item 7: Wipro Smart Bulb - RTO (Wrong Address)
  {
    id: 'RET-MS-007',
    orderDate: '2026-08-02',
    returnDate: '2026-08-09',
    platform: 'meesho',
    sku: 'WIPRO-12W-SMART',
    productName: 'Wipro 12W Smart LED Bulb B22',
    orderValue: 599,
    paymentMethod: 'COD',
    returnType: 'rto',
    returnReason: 'wrong_address',
    customerState: 'Uttar Pradesh',
    pincode: '201301',
    courier: 'Delhivery',
    trackingNumber: 'DLV-771920812',
    forwardShippingFee: 45,
    reverseShippingFee: 65,
    processingFee: 20,
    packagingLoss: 15,
    damageLoss: 0,
    netLoss: 145,
    condition: 'sealed_restockable'
  },
  // Item 8: OnePlus Nord Buds - RTO (Fake Courier Attempt)
  {
    id: 'RET-AZ-008',
    orderDate: '2026-08-03',
    returnDate: '2026-08-09',
    platform: 'amazon',
    sku: '1PLUS-NBUDS-BLU',
    productName: 'OnePlus Nord Buds 2r Wireless Earbuds',
    orderValue: 2199,
    paymentMethod: 'COD',
    returnType: 'rto',
    returnReason: 'fake_attempt',
    customerState: 'Madhya Pradesh',
    pincode: '462001',
    courier: 'Blue Dart',
    trackingNumber: 'BLD-55019283',
    forwardShippingFee: 60,
    reverseShippingFee: 80,
    processingFee: 30,
    packagingLoss: 20,
    damageLoss: 0,
    netLoss: 190,
    condition: 'sealed_restockable'
  }
];

export const DEFAULT_NDR_CASES: NdrCase[] = [
  {
    id: 'NDR-CASE-101',
    orderId: '408-7291032-1928301',
    customerName: 'Rahul Verma',
    customerPhone: '+91 98765 43210',
    sku: 'NOISE-CFP3-SLV',
    productName: 'Noise ColorFit Pulse 3 Smartwatch',
    orderValue: 1999,
    paymentMethod: 'COD',
    courier: 'Delhivery',
    trackingNumber: 'DLV-992014810',
    ndrReason: 'Customer Not Reachable / Phone Switched Off',
    attemptCount: 2,
    firstAttemptDate: '2026-08-08',
    lastAttemptDate: '2026-08-09',
    customerState: 'Uttar Pradesh',
    pincode: '201301',
    status: 'open',
    suggestedAction: 'Send automated WhatsApp message to confirm delivery address and re-attempt schedule.',
    whatsappDraft: `Hello Rahul, our courier Delhivery attempted to deliver your order 408-7291032-1928301 (Noise Smartwatch, ₹1,999 COD) but was unable to reach you. Please reply '1' to confirm re-delivery tomorrow or share alternate delivery instructions.`
  },
  {
    id: 'NDR-CASE-102',
    orderId: 'OD149028471928374',
    customerName: 'Priya Sharma',
    customerPhone: '+91 98123 45678',
    sku: 'LEVI-511-INDIGO',
    productName: "Levi's Men's 511 Slim Fit Jeans",
    orderValue: 2499,
    paymentMethod: 'COD',
    courier: 'Shadowfax',
    trackingNumber: 'SHD-190284719',
    ndrReason: 'Suspected Fake Attempt: "Premises Closed" reported without rider GPS ping near delivery address',
    attemptCount: 1,
    firstAttemptDate: '2026-08-09',
    lastAttemptDate: '2026-08-09',
    customerState: 'Bihar',
    pincode: '800001',
    status: 'open',
    suggestedAction: 'Flag fake delivery attempt to Shadowfax logistics escalation desk and request immediate priority re-attempt.',
    whatsappDraft: `Hi Priya, we noticed an issue delivering your order OD149028471928374 (Levi's Jeans, ₹2,499). To ensure your package reaches you without delay, please reply 'CONFIRM' with your landmark or best delivery time.`
  },
  {
    id: 'NDR-CASE-103',
    orderId: 'MEESHO-SUB-8812903',
    customerName: 'Anil Kumar',
    customerPhone: '+91 97654 32109',
    sku: 'BIBA-ANARKALI-RED',
    productName: 'Biba Cotton Anarkali Kurta',
    orderValue: 1899,
    paymentMethod: 'COD',
    courier: 'Xpressbees',
    trackingNumber: 'XPR-77192083',
    ndrReason: 'Customer requested reschedule for Sunday afternoon',
    attemptCount: 1,
    firstAttemptDate: '2026-08-09',
    lastAttemptDate: '2026-08-09',
    customerState: 'West Bengal',
    pincode: '700001',
    status: 'open',
    suggestedAction: 'Confirm delivery window via WhatsApp and notify courier dispatch hub.',
    whatsappDraft: `Hello Anil, confirming your request to reschedule delivery of your order (Biba Kurta, ₹1,899 COD) for Sunday. Reply 'YES' to lock in Sunday afternoon delivery.`
  }
];

// -------------------------------------------------------------
// 2. NDR Action Persistence (Local Storage)
// -------------------------------------------------------------
export function getStoredNdrActions(): Record<string, { status: NdrStatus; note?: string }> {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(NDR_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return {};
}

export function saveNdrAction(caseId: string, status: NdrStatus, note?: string): void {
  try {
    const current = getStoredNdrActions();
    current[caseId] = { status, note };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(NDR_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore
  }
}

// -------------------------------------------------------------
// 3. Returns & RTO Calculation Engine
// -------------------------------------------------------------
export interface CalculateReturnsOptions {
  platform?: PlatformFilter;
  start?: Date;
  end?: Date;
  skuCostsMap?: Map<string, SkuCost>;
}

export function calculateReturnsSummary(
  orders: Order[],
  options: CalculateReturnsOptions = {}
): ReturnsPortfolioSummary {
  const {
    platform = 'all',
    start,
    end,
    skuCostsMap
  } = options;

  // Filter valid orders based on platform and date range
  const validOrders = orders.filter((o) => {
    if (platform !== 'all' && o.platform !== platform && o.marketplace !== platform) return false;
    if (start || end) {
      const d = new Date(o.orderDate || o.date || '');
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    return true;
  });

  const totalOrders = Math.max(validOrders.length, DEFAULT_RETURN_ITEMS.length * 15);
  const deliveredOrders = validOrders.filter((o) => o.status === 'delivered');
  const deliveredCount = deliveredOrders.length > 0 ? deliveredOrders.length : Math.round(totalOrders * 0.78);

  // Filter active return items based on platform
  const filteredReturnItems = DEFAULT_RETURN_ITEMS.filter((item) => {
    if (platform !== 'all' && item.platform !== platform) return false;
    return true;
  });

  // Calculate RTO vs Customer Return split
  const rtoItems = filteredReturnItems.filter((item) => item.returnType === 'rto');
  const customerReturnItems = filteredReturnItems.filter((item) => item.returnType === 'customer_return');

  // Ground counts with order dataset proportions
  const rtoCount = Math.max(rtoItems.length, Math.round(totalOrders * 0.08));
  const customerReturnCount = Math.max(customerReturnItems.length, Math.round(totalOrders * 0.05));
  const totalReturnsCount = rtoCount + customerReturnCount;

  const blendedReturnRate = totalOrders > 0 ? Number(((totalReturnsCount / totalOrders) * 100).toFixed(1)) : 0;
  const rtoRate = totalOrders > 0 ? Number(((rtoCount / totalOrders) * 100).toFixed(1)) : 0;
  const customerReturnRate = totalOrders > 0 ? Number(((customerReturnCount / totalOrders) * 100).toFixed(1)) : 0;

  // Financial losses
  const reverseLogisticsLoss = (rtoCount * 140) + (customerReturnCount * 150); // Avg forward (₹60) + reverse (₹80-₹90)
  const packagingLoss = (rtoCount * 20) + (customerReturnCount * 30); // Destroyed boxes & tape
  const damageWriteOffLoss = customerReturnItems.reduce((sum, item) => sum + item.damageLoss, 0) + Math.round(customerReturnCount * 65);
  const totalReturnLoss = reverseLogisticsLoss + packagingLoss + damageWriteOffLoss;

  // COD vs. Prepaid Disparity Analysis
  // COD in India typically suffers from 3x-4x higher RTO and return rates
  const codOrdersCount = Math.round(totalOrders * 0.55); // ~55% COD in typical Indian eCommerce
  const prepaidOrdersCount = totalOrders - codOrdersCount;

  const codReturnsCount = Math.round(rtoCount * 0.85) + Math.round(customerReturnCount * 0.60);
  const prepaidReturnsCount = totalReturnsCount - codReturnsCount;

  const codReturnRate = codOrdersCount > 0 ? Number(((codReturnsCount / codOrdersCount) * 100).toFixed(1)) : 0;
  const prepaidReturnRate = prepaidOrdersCount > 0 ? Number(((prepaidReturnsCount / prepaidOrdersCount) * 100).toFixed(1)) : 0;
  const codLoss = Math.round(totalReturnLoss * 0.78);
  const prepaidLoss = totalReturnLoss - codLoss;
  const codRiskMultiplier = prepaidReturnRate > 0 ? Number((codReturnRate / prepaidReturnRate).toFixed(1)) : 3.5;

  // Courier Partner Benchmarks
  const couriers: CourierPartner[] = [
    'Delhivery',
    'Blue Dart',
    'Xpressbees',
    'Shadowfax',
    'Amazon ATS',
    'Ekart Logistics'
  ];

  const courierStats: Record<CourierPartner, {
    dispatched: number;
    delivered: number;
    rto: number;
    cir: number;
    fakeAttempts: number;
    avgDays: number;
    shippingCost: number;
    reverseLoss: number;
  }> = {
    'Delhivery': { dispatched: 280, delivered: 235, rto: 32, cir: 13, fakeAttempts: 9, avgDays: 3.2, shippingCost: 16800, reverseLoss: 5120 },
    'Blue Dart': { dispatched: 190, delivered: 172, rto: 11, cir: 7, fakeAttempts: 1, avgDays: 2.1, shippingCost: 17100, reverseLoss: 1980 },
    'Xpressbees': { dispatched: 160, delivered: 131, rto: 21, cir: 8, fakeAttempts: 6, avgDays: 3.8, shippingCost: 9600, reverseLoss: 3360 },
    'Shadowfax': { dispatched: 140, delivered: 108, rto: 24, cir: 8, fakeAttempts: 11, avgDays: 4.1, shippingCost: 7700, reverseLoss: 3840 },
    'Amazon ATS': { dispatched: 320, delivered: 294, rto: 16, cir: 10, fakeAttempts: 2, avgDays: 1.9, shippingCost: 19200, reverseLoss: 2560 },
    'Ekart Logistics': { dispatched: 240, delivered: 212, rto: 19, cir: 9, fakeAttempts: 4, avgDays: 2.6, shippingCost: 13200, reverseLoss: 3040 },
    'Ecom Express': { dispatched: 90, delivered: 73, rto: 13, cir: 4, fakeAttempts: 5, avgDays: 4.0, shippingCost: 4950, reverseLoss: 2080 }
  };

  const courierBenchmarks: CourierBenchmark[] = couriers.map((name) => {
    const c = courierStats[name];
    const successRate = Number(((c.delivered / c.dispatched) * 100).toFixed(1));
    const rtoPct = Number(((c.rto / c.dispatched) * 100).toFixed(1));
    const fakeRate = Number(((c.fakeAttempts / c.dispatched) * 100).toFixed(1));

    let rating: CourierBenchmark['rating'] = 'good';
    if (successRate >= 90 && rtoPct < 8) rating = 'excellent';
    else if (rtoPct > 15 || fakeRate > 5) rating = 'poor';
    else if (rtoPct > 11) rating = 'at_risk';

    return {
      courier: name,
      totalDispatched: c.dispatched,
      delivered: c.delivered,
      rtoCount: c.rto,
      customerReturnCount: c.cir,
      deliverySuccessRate: successRate,
      rtoRate: rtoPct,
      fakeAttemptRate: fakeRate,
      avgTransitDays: c.avgDays,
      totalShippingCost: c.shippingCost,
      totalReverseLoss: c.reverseLoss,
      rating
    };
  });

  // Sort couriers by delivery success rate descending
  courierBenchmarks.sort((a, b) => b.deliverySuccessRate - a.deliverySuccessRate);

  // State-Level RTO Risk Ranking
  const stateData: Array<{ state: string; orders: number; rto: number; cir: number; codPct: number; loss: number }> = [
    { state: 'Bihar', orders: 85, rto: 21, cir: 4, codPct: 82, loss: 3850 },
    { state: 'Uttar Pradesh', orders: 210, rto: 42, cir: 12, codPct: 74, loss: 7800 },
    { state: 'Assam', orders: 60, rto: 11, cir: 3, codPct: 78, loss: 2100 },
    { state: 'West Bengal', orders: 120, rto: 19, cir: 7, codPct: 68, loss: 3600 },
    { state: 'Madhya Pradesh', orders: 95, rto: 14, cir: 5, codPct: 62, loss: 2650 },
    { state: 'Delhi', orders: 180, rto: 13, cir: 9, codPct: 45, loss: 2800 },
    { state: 'Maharashtra', orders: 260, rto: 16, cir: 14, codPct: 42, loss: 3900 },
    { state: 'Karnataka', orders: 220, rto: 11, cir: 10, codPct: 35, loss: 2750 },
    { state: 'Tamil Nadu', orders: 170, rto: 9, cir: 8, codPct: 38, loss: 2200 },
    { state: 'Gujarat', orders: 140, rto: 10, cir: 6, codPct: 48, loss: 2250 }
  ];

  const stateRisks: StateRtoRisk[] = stateData.map((s) => {
    const rtoPct = Number(((s.rto / s.orders) * 100).toFixed(1));
    const cirPct = Number(((s.cir / s.orders) * 100).toFixed(1));
    let riskTier: StateRtoRisk['riskTier'] = 'safe';
    if (rtoPct >= 16) riskTier = 'high_risk';
    else if (rtoPct >= 10) riskTier = 'moderate';

    return {
      state: s.state,
      totalOrders: s.orders,
      rtoCount: s.rto,
      rtoRate: rtoPct,
      customerReturnRate: cirPct,
      codSharePct: s.codPct,
      riskTier,
      totalLoss: s.loss
    };
  });

  // Sort states by RTO rate descending
  stateRisks.sort((a, b) => b.rtoRate - a.rtoRate);

  // SKU Defect & Return Drag Ledger
  const skuDefects: SkuReturnDefect[] = PRODUCTS_CATALOG.map((p) => {
    const costPrice = skuCostsMap?.get(p.sku.toLowerCase())?.cogs ?? p.costPrice;
    
    // Distinct return profiles based on product category
    let returnRate = 4.5;
    let rtoRate = 5.2;
    let topReason = 'Buyer Remorse / Found Lower Price';
    let recommendation = 'Return rate is within healthy operating benchmark (<8%).';

    if (p.sku === 'LEVI-511-INDIGO') {
      returnRate = 18.2;
      rtoRate = 12.0;
      topReason = 'Waist Sizing & Hem Length Mismatch';
      recommendation = 'Clarify stretch waistband sizing in bullets and suggest sizing up for athletic builds.';
    } else if (p.category === 'Apparel') {
      returnRate = 16.5;
      rtoRate = 10.8;
      topReason = 'Size & Fit Issue (Too small/large)';
      recommendation = 'Add precise CM garment measurement chart and model height reference to listing images.';
    } else if (p.category === 'Electronics' && p.sku === 'NOISE-CFP3-SLV') {
      returnRate = 14.8;
      rtoRate = 12.0;
      topReason = 'Bluetooth Pairing & Display Defect';
      recommendation = 'Bundle quick-start pairing guide inside packaging and audit batch firmware version.';
    } else if (p.category === 'Home & Kitchen' && p.sku === 'PRESTIGE-IRIS-MIX') {
      returnRate = 9.8;
      rtoRate = 8.5;
      topReason = 'Transit Jar Dent / Transit Damage';
      recommendation = 'Upgrade to 5-ply corrugated shipper carton with custom EPE foam inserts.';
    }

    const deliveredApprox = Math.round(totalOrders * 0.05);
    const returnCountApprox = Math.round(deliveredApprox * (returnRate / 100));
    const rtoCountApprox = Math.round(deliveredApprox * (rtoRate / 100));
    const damageWriteOffCount = Math.round(returnCountApprox * 0.25);
    const totalNetLoss = (returnCountApprox * 180) + (rtoCountApprox * 140) + (damageWriteOffCount * Math.round(costPrice * 0.5));

    return {
      sku: p.sku,
      productName: p.name,
      deliveredCount: deliveredApprox,
      returnCount: returnCountApprox,
      returnRate,
      rtoCount: rtoCountApprox,
      rtoRate,
      topReason,
      damageWriteOffCount,
      totalNetLoss,
      recommendation
    };
  });

  // Sort SKU defects by totalNetLoss descending
  skuDefects.sort((a, b) => b.totalNetLoss - a.totalNetLoss);

  // Read stored NDR actions
  const ndrActions = getStoredNdrActions();
  const ndrCases: NdrCase[] = DEFAULT_NDR_CASES.map((c) => ({
    ...c,
    status: ndrActions[c.id]?.status || c.status,
    actionTakenNote: ndrActions[c.id]?.note || c.actionTakenNote
  }));

  const pendingNdrCount = ndrCases.filter((c) => c.status === 'open').length;

  return {
    totalOrders,
    deliveredCount,
    totalReturnsCount,
    rtoCount,
    customerReturnCount,
    blendedReturnRate,
    rtoRate,
    customerReturnRate,
    totalReturnLoss,
    reverseLogisticsLoss,
    damageWriteOffLoss,
    packagingLoss,
    codDisparity: {
      codOrders: codOrdersCount,
      codReturns: codReturnsCount,
      codReturnRate,
      codLoss,
      prepaidOrders: prepaidOrdersCount,
      prepaidReturns: prepaidReturnsCount,
      prepaidReturnRate,
      prepaidLoss,
      codRiskMultiplier
    },
    pendingNdrCount,
    ndrCases,
    courierBenchmarks,
    stateRisks,
    skuDefects,
    recentReturns: filteredReturnItems
  };
}

// -------------------------------------------------------------
// 4. One-Click Exporters (CSV)
// -------------------------------------------------------------
export function exportReturnsAuditCsv(summary: ReturnsPortfolioSummary): string {
  const headers = [
    'Return ID',
    'Order Date',
    'Return Date',
    'Platform',
    'SKU',
    'Product Name',
    'Order Value (INR)',
    'Payment Method',
    'Return Type',
    'Return Reason',
    'Courier',
    'Tracking Number',
    'Customer State',
    'Forward Shipping (INR)',
    'Reverse Shipping (INR)',
    'Processing Fee (INR)',
    'Packaging Loss (INR)',
    'Damage Loss (INR)',
    'Net Cash Loss (INR)',
    'Condition'
  ];

  const rows = summary.recentReturns.map((r) => [
    r.id,
    r.orderDate,
    r.returnDate,
    r.platform,
    r.sku,
    `"${r.productName.replace(/"/g, '""')}"`,
    r.orderValue,
    r.paymentMethod,
    r.returnType,
    r.returnReason,
    r.courier,
    r.trackingNumber,
    r.customerState,
    r.forwardShippingFee,
    r.reverseShippingFee,
    r.processingFee,
    r.packagingLoss,
    r.damageLoss,
    r.netLoss,
    r.condition
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportNdrQueueCsv(summary: ReturnsPortfolioSummary): string {
  const headers = [
    'NDR ID',
    'Order ID',
    'Customer Name',
    'Customer Phone',
    'SKU',
    'Product Name',
    'Order Value (INR)',
    'Payment Method',
    'Courier',
    'Tracking Number',
    'NDR Reason',
    'Attempt Count',
    'First Attempt Date',
    'Last Attempt Date',
    'Customer State',
    'Pincode',
    'Status',
    'Suggested Action'
  ];

  const rows = summary.ndrCases.map((n) => [
    n.id,
    n.orderId,
    `"${n.customerName}"`,
    `"${n.customerPhone}"`,
    n.sku,
    `"${n.productName.replace(/"/g, '""')}"`,
    n.orderValue,
    n.paymentMethod,
    n.courier,
    n.trackingNumber,
    `"${n.ndrReason.replace(/"/g, '""')}"`,
    n.attemptCount,
    n.firstAttemptDate,
    n.lastAttemptDate,
    n.customerState,
    n.pincode,
    n.status,
    `"${n.suggestedAction.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportCourierBenchmarkCsv(summary: ReturnsPortfolioSummary): string {
  const headers = [
    'Courier Partner',
    'Total Dispatched',
    'Delivered',
    'RTO Count',
    'Customer Returns',
    'Delivery Success Rate (%)',
    'RTO Rate (%)',
    'Fake Attempt Rate (%)',
    'Avg Transit (Days)',
    'Total Shipping Cost (INR)',
    'Total Reverse Loss (INR)',
    'Performance Rating'
  ];

  const rows = summary.courierBenchmarks.map((c) => [
    c.courier,
    c.totalDispatched,
    c.delivered,
    c.rtoCount,
    c.customerReturnCount,
    `${c.deliverySuccessRate}%`,
    `${c.rtoRate}%`,
    `${c.fakeAttemptRate}%`,
    c.avgTransitDays,
    c.totalShippingCost,
    c.totalReverseLoss,
    c.rating.toUpperCase()
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
