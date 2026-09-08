import type { Order } from '../../models/order';

export interface SettlementRecord {
  settlementId: string;
  orderId: string;
  orderItemId?: string;
  sku?: string;
  postedDate: string;
  marketplace: 'amazon' | 'flipkart';
  grossAmount: number;
  referralFeeActual: number;
  closingFeeActual: number;
  shippingFeeActual: number;
  otherFeesActual: number; // weight handling surcharges, return pick & pack penalties
  totalFeesActual: number;
  netDisbursement: number;
}

export interface FeeReconciliationSummary {
  totalReconciledOrders: number;
  estimatedTotalFees: number;
  actualTotalFees: number;
  discrepancy: number; // actual - estimated (positive means hidden overcharge)
  discrepancyPercentage: number;
  overchargeCount: number;
  hiddenFeeBreakdown: {
    closingFeeDiscrepancy: number;
    weightHandlingSurcharge: number;
    pickAndPackOvercharge: number;
    otherSurcharges: number;
  };
  discrepantOrders: Array<{
    orderId: string;
    sku: string;
    marketplace: 'amazon' | 'flipkart';
    estimatedFee: number;
    actualFee: number;
    discrepancy: number;
    reason: string;
  }>;
}

/**
 * Detects if a flat file content is an Amazon or Flipkart settlement report.
 */
export function detectSettlementReport(content: string): {
  isSettlement: boolean;
  marketplace: 'amazon' | 'flipkart' | 'unknown';
} {
  const firstLines = content.slice(0, 2000).toLowerCase();

  // Amazon Settlement signatures
  if (
    firstLines.includes('settlement-id') ||
    firstLines.includes('settlement id') ||
    (firstLines.includes('selling fees') && firstLines.includes('fba fees'))
  ) {
    return { isSettlement: true, marketplace: 'amazon' };
  }

  // Flipkart Settlement signatures
  if (
    firstLines.includes('neft id') ||
    firstLines.includes('bank transaction id') ||
    (firstLines.includes('pick and pack fee') && firstLines.includes('commission'))
  ) {
    return { isSettlement: true, marketplace: 'flipkart' };
  }

  return { isSettlement: false, marketplace: 'unknown' };
}

/**
 * Parses Amazon Settlement Date Range Report flat file (CSV / TSV).
 */
export function parseAmazonSettlement(content: string): SettlementRecord[] {
  const delimiter = content.includes('\t') ? '\t' : ',';
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const orderIdIdx = headers.findIndex((h) => h === 'order id' || h === 'order-id');
  const settlementIdIdx = headers.findIndex((h) => h === 'settlement id' || h === 'settlement-id');
  const skuIdx = headers.findIndex((h) => h === 'sku');
  const salesIdx = headers.findIndex((h) => h === 'product sales' || h === 'price-amount');
  const sellingFeesIdx = headers.findIndex((h) => h === 'selling fees' || h === 'referral fee');
  const fbaFeesIdx = headers.findIndex((h) => h === 'fba fees' || h === 'closing fee');
  const otherFeesIdx = headers.findIndex((h) => h === 'other transaction fees' || h === 'other');
  const totalIdx = headers.findIndex((h) => h === 'total' || h === 'net amount');
  const dateIdx = headers.findIndex((h) => h === 'date/time' || h === 'posted-date' || h === 'deposit-date');

  const records: SettlementRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const orderId = orderIdIdx !== -1 ? row[orderIdIdx] : '';
    if (!orderId) continue;

    const gross = salesIdx !== -1 ? Math.abs(parseFloat(row[salesIdx]) || 0) : 0;
    const referralFee = sellingFeesIdx !== -1 ? Math.abs(parseFloat(row[sellingFeesIdx]) || 0) : 0;
    const closingFee = fbaFeesIdx !== -1 ? Math.abs(parseFloat(row[fbaFeesIdx]) || 0) : 0;
    const otherFees = otherFeesIdx !== -1 ? Math.abs(parseFloat(row[otherFeesIdx]) || 0) : 0;
    const totalFees = referralFee + closingFee + otherFees;
    const netDisbursement = totalIdx !== -1 ? parseFloat(row[totalIdx]) || (gross - totalFees) : (gross - totalFees);

    records.push({
      settlementId: settlementIdIdx !== -1 ? row[settlementIdIdx] : `SETTLE-AZ-${i}`,
      orderId,
      sku: skuIdx !== -1 ? row[skuIdx] : undefined,
      postedDate: dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0],
      marketplace: 'amazon',
      grossAmount: gross,
      referralFeeActual: referralFee,
      closingFeeActual: closingFee,
      shippingFeeActual: 0,
      otherFeesActual: otherFees,
      totalFeesActual: totalFees,
      netDisbursement
    });
  }

  return records;
}

/**
 * Parses Flipkart Settlement sheet flat file (CSV / TSV).
 */
export function parseFlipkartSettlement(content: string): SettlementRecord[] {
  const delimiter = content.includes('\t') ? '\t' : ',';
  const lines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const orderIdIdx = headers.findIndex((h) => h === 'order id');
  const orderItemIdIdx = headers.findIndex((h) => h === 'order item id');
  const neftIdx = headers.findIndex((h) => h === 'neft id' || h === 'bank transaction id');
  const saleAmountIdx = headers.findIndex((h) => h === 'sale amount');
  const commissionIdx = headers.findIndex((h) => h === 'commission');
  const fixedFeeIdx = headers.findIndex((h) => h === 'fixed fee');
  const pickPackIdx = headers.findIndex((h) => h === 'pick and pack fee');
  const shippingIdx = headers.findIndex((h) => h === 'shipping fee');
  const netAmountIdx = headers.findIndex((h) => h === 'net amount');
  const dateIdx = headers.findIndex((h) => h === 'payment date');

  const records: SettlementRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    const orderId = orderIdIdx !== -1 ? row[orderIdIdx] : '';
    if (!orderId) continue;

    const gross = saleAmountIdx !== -1 ? Math.abs(parseFloat(row[saleAmountIdx]) || 0) : 0;
    const commission = commissionIdx !== -1 ? Math.abs(parseFloat(row[commissionIdx]) || 0) : 0;
    const fixedFee = fixedFeeIdx !== -1 ? Math.abs(parseFloat(row[fixedFeeIdx]) || 0) : 0;
    const pickPack = pickPackIdx !== -1 ? Math.abs(parseFloat(row[pickPackIdx]) || 0) : 0;
    const shipping = shippingIdx !== -1 ? Math.abs(parseFloat(row[shippingIdx]) || 0) : 0;
    const totalFees = commission + fixedFee + pickPack + shipping;
    const net = netAmountIdx !== -1 ? parseFloat(row[netAmountIdx]) || (gross - totalFees) : (gross - totalFees);

    records.push({
      settlementId: neftIdx !== -1 && row[neftIdx] ? row[neftIdx] : `NEFT-${i}`,
      orderId,
      orderItemId: orderItemIdIdx !== -1 ? row[orderItemIdIdx] : undefined,
      postedDate: dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0],
      marketplace: 'flipkart',
      grossAmount: gross,
      referralFeeActual: commission,
      closingFeeActual: fixedFee,
      shippingFeeActual: shipping,
      otherFeesActual: pickPack,
      totalFeesActual: totalFees,
      netDisbursement: net
    });
  }

  return records;
}

/**
 * Reconciles estimated order fees against actual bank settlement debits.
 */
export function reconcileSettlementWithOrders(
  settlements: SettlementRecord[],
  orders: Order[]
): FeeReconciliationSummary {
  const orderMap = new Map<string, Order>();
  for (const o of orders) {
    if (o.id) orderMap.set(o.id.trim(), o);
    if (o.orderItemId) orderMap.set(o.orderItemId.trim(), o);
  }

  let totalReconciledOrders = 0;
  let estimatedTotalFees = 0;
  let actualTotalFees = 0;
  let overchargeCount = 0;

  const hiddenFeeBreakdown = {
    closingFeeDiscrepancy: 0,
    weightHandlingSurcharge: 0,
    pickAndPackOvercharge: 0,
    otherSurcharges: 0
  };

  const discrepantOrders: FeeReconciliationSummary['discrepantOrders'] = [];

  for (const s of settlements) {
    const matchedOrder = orderMap.get(s.orderId) || (s.orderItemId ? orderMap.get(s.orderItemId) : undefined);
    if (!matchedOrder) continue;

    totalReconciledOrders += 1;
    const estimatedFee = matchedOrder.estimatedFees?.totalFees ?? 0;
    const actualFee = s.totalFeesActual;

    estimatedTotalFees += estimatedFee;
    actualTotalFees += actualFee;

    const diff = actualFee - estimatedFee;

    if (diff > 5) {
      // Overcharge detected (> ₹5 delta)
      overchargeCount += 1;
      let reason = 'Fee discrepancy';

      if (s.otherFeesActual > 0) {
        hiddenFeeBreakdown.weightHandlingSurcharge += s.otherFeesActual;
        reason = `Weight handling / Pick-pack surcharge (+₹${s.otherFeesActual.toFixed(0)})`;
      } else if (s.closingFeeActual > (matchedOrder.estimatedFees?.closingFee ?? 0)) {
        const cDiff = s.closingFeeActual - (matchedOrder.estimatedFees?.closingFee ?? 0);
        hiddenFeeBreakdown.closingFeeDiscrepancy += cDiff;
        reason = `Closing fee tier reclassification (+₹${cDiff.toFixed(0)})`;
      } else {
        hiddenFeeBreakdown.otherSurcharges += diff;
        reason = `Commission rate differential (+₹${diff.toFixed(0)})`;
      }

      discrepantOrders.push({
        orderId: s.orderId,
        sku: s.sku || matchedOrder.sku || 'UNKNOWN',
        marketplace: s.marketplace,
        estimatedFee,
        actualFee,
        discrepancy: diff,
        reason
      });
    }
  }

  const discrepancy = actualTotalFees - estimatedTotalFees;
  const discrepancyPercentage = estimatedTotalFees > 0 ? (discrepancy / estimatedTotalFees) * 100 : 0;

  return {
    totalReconciledOrders,
    estimatedTotalFees,
    actualTotalFees,
    discrepancy,
    discrepancyPercentage,
    overchargeCount,
    hiddenFeeBreakdown,
    discrepantOrders
  };
}

/**
 * Generates synthetic settlement reconciliation data from orders for initial demo/audit preview.
 */
export function generateDemoSettlementAudit(orders: Order[]): FeeReconciliationSummary {
  const eligibleOrders = orders.filter((o) => o.status === 'shipped').slice(0, 50);
  const syntheticSettlements: SettlementRecord[] = eligibleOrders.map((o, i) => {
    const val = o.gross_amount || o.orderValue || 1000;
    const plat = (o.marketplace || o.platform) === 'amazon' ? 'amazon' : 'flipkart';
    const estFee = o.estimatedFees?.totalFees || (plat === 'amazon' ? val * 0.15 + 20 : val * 0.12 + 15);
    
    // Introduce realistic marketplace overcharges on ~15% of orders:
    // e.g. weight handling surcharge of ₹35-₹65, or extra ₹10 closing fee
    const hasSurcharge = i % 7 === 0;
    const surcharge = hasSurcharge ? (plat === 'amazon' ? 45 : 35) : 0;
    const actualFee = estFee + surcharge;

    return {
      settlementId: `SETTLE-DEMO-${1000 + i}`,
      orderId: o.id,
      sku: o.sku,
      postedDate: o.orderDate || o.date || new Date().toISOString().split('T')[0],
      marketplace: plat,
      grossAmount: val,
      referralFeeActual: estFee - (plat === 'amazon' ? 20 : 15),
      closingFeeActual: plat === 'amazon' ? 20 : 15,
      shippingFeeActual: o.shipping_fee || 50,
      otherFeesActual: surcharge,
      totalFeesActual: actualFee,
      netDisbursement: val - actualFee
    };
  });

  return reconcileSettlementWithOrders(syntheticSettlements, orders);
}
