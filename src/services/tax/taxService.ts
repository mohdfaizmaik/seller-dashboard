import type { Order } from '../../models/order';
import type { SkuCost } from '../catalog/cogsService';
import type { PlatformFilter } from '../../hooks/useFilters';
import { PRODUCTS_CATALOG } from '../../data/products';
import { MARKETPLACE_CONFIG } from '../../data/marketplaceConfig';
import type {
  GstStateInfo,
  TaxSupplyType,
  B2csSummaryItem,
  HsnSummaryItem,
  MarketplaceTcsItem,
  Section52TcsSummary,
  Gstr3bSummary,
  TaxComplianceSummary
} from '../../models/tax';

// -------------------------------------------------------------
// 1. Official Indian GST State Codes (All 36 States & Union Territories)
// -------------------------------------------------------------
export const INDIAN_GST_STATE_CODES: Record<string, GstStateInfo> = {
  'jammu and kashmir': { code: '01', name: 'Jammu and Kashmir', pos: '01-Jammu and Kashmir' },
  'jammu & kashmir': { code: '01', name: 'Jammu and Kashmir', pos: '01-Jammu and Kashmir' },
  'himachal pradesh': { code: '02', name: 'Himachal Pradesh', pos: '02-Himachal Pradesh' },
  'punjab': { code: '03', name: 'Punjab', pos: '03-Punjab' },
  'chandigarh': { code: '04', name: 'Chandigarh', pos: '04-Chandigarh' },
  'uttarakhand': { code: '05', name: 'Uttarakhand', pos: '05-Uttarakhand' },
  'haryana': { code: '06', name: 'Haryana', pos: '06-Haryana' },
  'delhi': { code: '07', name: 'Delhi', pos: '07-Delhi' },
  'new delhi': { code: '07', name: 'Delhi', pos: '07-Delhi' },
  'rajasthan': { code: '08', name: 'Rajasthan', pos: '08-Rajasthan' },
  'uttar pradesh': { code: '09', name: 'Uttar Pradesh', pos: '09-Uttar Pradesh' },
  'bihar': { code: '10', name: 'Bihar', pos: '10-Bihar' },
  'sikkim': { code: '11', name: 'Sikkim', pos: '11-Sikkim' },
  'arunachal pradesh': { code: '12', name: 'Arunachal Pradesh', pos: '12-Arunachal Pradesh' },
  'nagaland': { code: '13', name: 'Nagaland', pos: '13-Nagaland' },
  'manipur': { code: '14', name: 'Manipur', pos: '14-Manipur' },
  'mizoram': { code: '15', name: 'Mizoram', pos: '15-Mizoram' },
  'tripura': { code: '16', name: 'Tripura', pos: '16-Tripura' },
  'meghalaya': { code: '17', name: 'Meghalaya', pos: '17-Meghalaya' },
  'assam': { code: '18', name: 'Assam', pos: '18-Assam' },
  'west bengal': { code: '19', name: 'West Bengal', pos: '19-West Bengal' },
  'jharkhand': { code: '20', name: 'Jharkhand', pos: '20-Jharkhand' },
  'odisha': { code: '21', name: 'Odisha', pos: '21-Odisha' },
  'orissa': { code: '21', name: 'Odisha', pos: '21-Odisha' },
  'chhattisgarh': { code: '22', name: 'Chhattisgarh', pos: '22-Chhattisgarh' },
  'madhya pradesh': { code: '23', name: 'Madhya Pradesh', pos: '23-Madhya Pradesh' },
  'gujarat': { code: '24', name: 'Gujarat', pos: '24-Gujarat' },
  'dadra and nagar haveli and daman and diu': { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', pos: '26-Dadra and Nagar Haveli and Daman and Diu' },
  'daman and diu': { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu', pos: '26-Dadra and Nagar Haveli and Daman and Diu' },
  'maharashtra': { code: '27', name: 'Maharashtra', pos: '27-Maharashtra' },
  'andhra pradesh': { code: '37', name: 'Andhra Pradesh', pos: '37-Andhra Pradesh' },
  'karnataka': { code: '29', name: 'Karnataka', pos: '29-Karnataka' },
  'goa': { code: '30', name: 'Goa', pos: '30-Goa' },
  'lakshadweep': { code: '31', name: 'Lakshadweep', pos: '31-Lakshadweep' },
  'kerala': { code: '32', name: 'Kerala', pos: '32-Kerala' },
  'tamil nadu': { code: '33', name: 'Tamil Nadu', pos: '33-Tamil Nadu' },
  'puducherry': { code: '34', name: 'Puducherry', pos: '34-Puducherry' },
  'andaman and nicobar islands': { code: '35', name: 'Andaman and Nicobar Islands', pos: '35-Andaman and Nicobar Islands' },
  'telangana': { code: '36', name: 'Telangana', pos: '36-Telangana' },
  'ladakh': { code: '38', name: 'Ladakh', pos: '38-Ladakh' },
  'other territory': { code: '97', name: 'Other Territory', pos: '97-Other Territory' }
};

export const DEFAULT_SELLER_STATE: GstStateInfo = INDIAN_GST_STATE_CODES['karnataka'];

/**
 * Resolves any state name to standard GstStateInfo with code and POS string.
 */
export function getGstStateInfo(stateName?: string): GstStateInfo {
  if (!stateName) {
    return { code: '97', name: 'Other Territory', pos: '97-Other Territory' };
  }
  const clean = stateName.trim().toLowerCase().replace(/[^a-z0-9\s&]/g, '');
  if (INDIAN_GST_STATE_CODES[clean]) {
    return INDIAN_GST_STATE_CODES[clean];
  }
  // Try partial match
  for (const [key, info] of Object.entries(INDIAN_GST_STATE_CODES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return info;
    }
  }
  return { code: '97', name: stateName.trim() || 'Other Territory', pos: `97-${stateName.trim() || 'Other Territory'}` };
}

/**
 * Deterministically generates an Indian state for mock orders that lack shipToState,
 * ensuring repeatable, realistic regional distribution without shifting PRNG seeds.
 */
const HIGH_VOLUME_STATES = [
  'Maharashtra',
  'Karnataka',
  'Delhi',
  'Uttar Pradesh',
  'Tamil Nadu',
  'Gujarat',
  'West Bengal',
  'Telangana',
  'Haryana',
  'Kerala',
  'Rajasthan',
  'Punjab',
  'Madhya Pradesh',
  'Bihar',
  'Andhra Pradesh',
  'Assam'
];

export function getOrderShipToState(order: Order): string {
  if (order.shipToState && order.shipToState.trim().length > 0) {
    return order.shipToState.trim();
  }
  // Hash order ID into a stable state index
  let hash = 0;
  const str = order.id || order.sku || 'default';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  const idx = Math.abs(hash) % HIGH_VOLUME_STATES.length;
  return HIGH_VOLUME_STATES[idx];
}

// -------------------------------------------------------------
// 2. Default Statutory HSN Code & GST Rate Catalog
// -------------------------------------------------------------
export interface HsnItemMetadata {
  hsnCode: string;
  description: string;
  taxRate: number; // 0, 5, 12, 18, 28
  uqc: string;     // default 'NOS'
}

export const DEFAULT_HSN_CATALOG: Record<string, HsnItemMetadata> = {
  // Electronics & Accessories (18% GST)
  'BOAT-RK450-BLK': { hsnCode: '8518', description: 'Headphones & Earphones with Mic', taxRate: 18, uqc: 'NOS' },
  '1PLUS-NBUDS-BLU': { hsnCode: '8518', description: 'Wireless Bluetooth Earbuds', taxRate: 18, uqc: 'NOS' },
  'NOISE-CFP3-SLV': { hsnCode: '9102', description: 'Wrist Watches & Smart Watches', taxRate: 18, uqc: 'NOS' },
  'SANDISK-64GB-SD': { hsnCode: '8523', description: 'Solid-State Storage Devices / MicroSD', taxRate: 18, uqc: 'NOS' },

  // Home & Kitchen Appliances (18% / 12% GST)
  'PIGEON-AMZ-KET': { hsnCode: '8516', description: 'Electro-Thermic Domestic Appliances (Kettles)', taxRate: 18, uqc: 'NOS' },
  'PRESTIGE-IRIS-MIX': { hsnCode: '8509', description: 'Electro-Mechanical Domestic Food Mixers', taxRate: 18, uqc: 'NOS' },
  'MILTON-TSD-1000': { hsnCode: '7323', description: 'Stainless Steel Table & Kitchenware', taxRate: 12, uqc: 'NOS' },
  'WIPRO-12W-SMART': { hsnCode: '9405', description: 'LED Lamps and Light Fittings', taxRate: 18, uqc: 'NOS' },
  'SAFARI-PENT-55': { hsnCode: '4202', description: 'Trunks, Suit-Cases & Executive Cases', taxRate: 18, uqc: 'NOS' },

  // Apparel & Footwear (12% / 5% GST)
  'AS-POLO-NAVY': { hsnCode: '6105', description: "Men's Polo Shirts Knitted / Crocheted", taxRate: 12, uqc: 'PCS' },
  'LEVI-511-INDIGO': { hsnCode: '6203', description: "Men's Trousers & Denim Jeans", taxRate: 12, uqc: 'PCS' },
  'ADI-RUN-COSMO': { hsnCode: '6404', description: 'Footwear with Outer Soles of Rubber', taxRate: 18, uqc: 'PRS' },
  'BIBA-ANARKALI-RED': { hsnCode: '6204', description: "Women's Kurtas and Dresses", taxRate: 5, uqc: 'PCS' },

  // Printed Books (0% GST - Statutory Exempt)
  'BOOK-ALCHEMIST': { hsnCode: '4901', description: 'Printed Books, Brochures & Leaflets', taxRate: 0, uqc: 'NOS' },
  'BOOK-HABITS': { hsnCode: '4901', description: 'Printed Books & Self-Help Literature', taxRate: 0, uqc: 'NOS' },
  'BOOK-RICHDAD': { hsnCode: '4901', description: 'Printed Books & Financial Literature', taxRate: 0, uqc: 'NOS' },

  // Beauty, Health & Personal Care (18% GST)
  'NIVEA-SOFT-200': { hsnCode: '3304', description: 'Beauty / Skin Care Preparations', taxRate: 18, uqc: 'NOS' },
  'LOREAL-SHMP-300': { hsnCode: '3305', description: 'Hair Preparations / Shampoos', taxRate: 18, uqc: 'NOS' },
  'COLGATE-MAXF-3P': { hsnCode: '3306', description: 'Preparations for Oral Hygiene / Toothpaste', taxRate: 18, uqc: 'NOS' },
  'DETT-HW-REFILL': { hsnCode: '3402', description: 'Organic Surface-Active Agents / Hand Wash', taxRate: 18, uqc: 'NOS' }
};

/** Category level fallback for unmapped SKUs */
export const CATEGORY_HSN_FALLBACK: Record<string, HsnItemMetadata> = {
  'Electronics': { hsnCode: '8518', description: 'Electronic Sound & Video Equipment', taxRate: 18, uqc: 'NOS' },
  'Home & Kitchen': { hsnCode: '8516', description: 'Household Electro-Thermic Goods', taxRate: 18, uqc: 'NOS' },
  'Apparel': { hsnCode: '6203', description: 'Textile Garments & Clothing Accessories', taxRate: 12, uqc: 'PCS' },
  'Books': { hsnCode: '4901', description: 'Printed Books & Periodicals (Exempt)', taxRate: 0, uqc: 'NOS' },
  'Beauty & Health': { hsnCode: '3304', description: 'Cosmetics & Personal Toiletries', taxRate: 18, uqc: 'NOS' }
};

/**
 * Resolves HSN metadata and tax rate for any given SKU.
 */
export function resolveSkuHsn(sku: string, skuCostsMap?: Map<string, SkuCost>): HsnItemMetadata {
  const normSku = sku.trim().toUpperCase();
  if (DEFAULT_HSN_CATALOG[normSku]) {
    const item = { ...DEFAULT_HSN_CATALOG[normSku] };
    if (skuCostsMap) {
      const configured = skuCostsMap.get(sku.toLowerCase());
      if (configured && configured.taxRate !== undefined) {
        item.taxRate = configured.taxRate;
      }
    }
    return item;
  }

  const product = PRODUCTS_CATALOG.find((p) => p.sku.toUpperCase() === normSku);
  if (product && CATEGORY_HSN_FALLBACK[product.category]) {
    const item = { ...CATEGORY_HSN_FALLBACK[product.category] };
    item.description = product.name;
    if (skuCostsMap) {
      const configured = skuCostsMap.get(sku.toLowerCase());
      if (configured && configured.taxRate !== undefined) {
        item.taxRate = configured.taxRate;
      }
    }
    return item;
  }

  const userRate = skuCostsMap?.get(sku.toLowerCase())?.taxRate ?? 18;
  return {
    hsnCode: '9999',
    description: 'General Merchandise',
    taxRate: userRate,
    uqc: 'NOS'
  };
}

// -------------------------------------------------------------
// 3. Tax Compliance Engine Core Calculation
// -------------------------------------------------------------

export interface CalculateTaxOptions {
  sellerState?: string;       // e.g. "Karnataka" or "Maharashtra"
  platform?: PlatformFilter;  // 'all' | 'amazon' | 'flipkart' | 'meesho'
  start?: Date;
  end?: Date;
  skuCostsMap?: Map<string, SkuCost>;
}

export function calculateTaxCompliance(
  orders: Order[],
  options: CalculateTaxOptions = {}
): TaxComplianceSummary {
  const {
    sellerState = 'Karnataka',
    platform = 'all',
    start,
    end,
    skuCostsMap
  } = options;

  const sellerInfo = getGstStateInfo(sellerState);

  // Filter orders by platform, cancellation, and date range
  const validOrders = orders.filter((o) => {
    if (o.status === 'cancelled') return false;
    if (platform !== 'all' && o.platform !== platform) return false;
    if (start || end) {
      const d = new Date(o.orderDate || o.date || '');
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    return true;
  });

  const b2csMap = new Map<string, B2csSummaryItem>();
  const hsnMap = new Map<string, HsnSummaryItem>();

  const tcsAmazon: MarketplaceTcsItem = {
    marketplace: 'amazon',
    displayName: 'Amazon India',
    grossTaxableValue: 0,
    returnedTaxableValue: 0,
    netTaxableValue: 0,
    igstTcs: 0,
    cgstTcs: 0,
    sgstTcs: 0,
    totalTcs: 0,
    orderCount: 0,
    returnCount: 0
  };

  const tcsFlipkart: MarketplaceTcsItem = {
    marketplace: 'flipkart',
    displayName: 'Flipkart',
    grossTaxableValue: 0,
    returnedTaxableValue: 0,
    netTaxableValue: 0,
    igstTcs: 0,
    cgstTcs: 0,
    sgstTcs: 0,
    totalTcs: 0,
    orderCount: 0,
    returnCount: 0
  };

  const tcsMeesho: MarketplaceTcsItem = {
    marketplace: 'meesho',
    displayName: 'Meesho',
    grossTaxableValue: 0,
    returnedTaxableValue: 0,
    netTaxableValue: 0,
    igstTcs: 0,
    cgstTcs: 0,
    sgstTcs: 0,
    totalTcs: 0,
    orderCount: 0,
    returnCount: 0
  };

  let totalGrossSales = 0;
  let totalTaxableValue = 0;
  let totalOutputTax = 0;
  let totalIgst = 0;
  let totalCgst = 0;
  let totalSgst = 0;

  let totalCogsPurchased = 0;
  let totalCogsItc = 0;
  let totalMarketplaceFees = 0;
  let totalShippingFees = 0;

  for (const o of validOrders) {
    const isReturned = o.status === 'returned';
    const grossVal = Math.abs(o.orderValue || o.gross_amount || 0);
    const qty = o.quantity || 1;
    const hsnMeta = resolveSkuHsn(o.sku || '', skuCostsMap);
    const rate = hsnMeta.taxRate;

    const shipStateName = getOrderShipToState(o);
    const buyerStateInfo = getGstStateInfo(shipStateName);
    const isIntraState = buyerStateInfo.code === sellerInfo.code;
    const supplyType: TaxSupplyType = isIntraState ? 'intra_state' : 'inter_state';

    let orderTaxable = 0;
    let orderTax = 0;

    if (rate === 0) {
      orderTaxable = grossVal;
      orderTax = 0;
    } else if (o.tax_amount !== undefined && o.tax_amount > 0) {
      orderTax = o.tax_amount;
      orderTaxable = Math.max(0, grossVal - orderTax);
    } else {
      orderTaxable = Number(((grossVal * 100) / (100 + rate)).toFixed(2));
      orderTax = Number((grossVal - orderTaxable).toFixed(2));
    }

    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (isIntraState) {
      cgst = Number((orderTax / 2).toFixed(2));
      sgst = Number((orderTax / 2).toFixed(2));
      igst = 0;
    } else {
      igst = orderTax;
      cgst = 0;
      sgst = 0;
    }

    const multiplier = isReturned ? -1 : 1;
    totalGrossSales += grossVal * multiplier;
    totalTaxableValue += orderTaxable * multiplier;
    totalOutputTax += orderTax * multiplier;
    totalIgst += igst * multiplier;
    totalCgst += cgst * multiplier;
    totalSgst += sgst * multiplier;

    // 1. B2CS Summary aggregation
    const b2csKey = `${buyerStateInfo.pos}_${rate}`;
    const existingB2cs = b2csMap.get(b2csKey) || {
      pos: buyerStateInfo.pos,
      stateName: buyerStateInfo.name,
      stateCode: buyerStateInfo.code,
      supplyType,
      taxRate: rate,
      grossValue: 0,
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      totalTax: 0,
      orderCount: 0
    };

    existingB2cs.grossValue += grossVal * multiplier;
    existingB2cs.taxableValue += orderTaxable * multiplier;
    existingB2cs.igst += igst * multiplier;
    existingB2cs.cgst += cgst * multiplier;
    existingB2cs.sgst += sgst * multiplier;
    existingB2cs.totalTax += orderTax * multiplier;
    existingB2cs.orderCount += 1;
    b2csMap.set(b2csKey, existingB2cs);

    // 2. HSN Summary aggregation
    const hsnKey = `${hsnMeta.hsnCode}_${rate}`;
    const existingHsn = hsnMap.get(hsnKey) || {
      hsnCode: hsnMeta.hsnCode,
      description: hsnMeta.description,
      uqc: hsnMeta.uqc,
      totalQuantity: 0,
      totalValue: 0,
      taxableValue: 0,
      taxRate: rate,
      igst: 0,
      cgst: 0,
      sgst: 0,
      totalTax: 0
    };

    existingHsn.totalQuantity += qty * multiplier;
    existingHsn.totalValue += grossVal * multiplier;
    existingHsn.taxableValue += orderTaxable * multiplier;
    existingHsn.igst += igst * multiplier;
    existingHsn.cgst += cgst * multiplier;
    existingHsn.sgst += sgst * multiplier;
    existingHsn.totalTax += orderTax * multiplier;
    hsnMap.set(hsnKey, existingHsn);

    // 3. Section 52 TCS aggregation by platform
    const platformKey = o.platform === 'amazon' ? 'amazon' : o.platform === 'flipkart' ? 'flipkart' : 'meesho';
    const tcsTarget = platformKey === 'amazon' ? tcsAmazon : platformKey === 'flipkart' ? tcsFlipkart : tcsMeesho;

    if (isReturned) {
      tcsTarget.returnCount += 1;
      tcsTarget.returnedTaxableValue += orderTaxable;
    } else {
      tcsTarget.orderCount += 1;
      tcsTarget.grossTaxableValue += orderTaxable;
    }

    // 4. Input Tax Credit (ITC) tracking on non-returned orders
    if (!isReturned) {
      const matchedProd = PRODUCTS_CATALOG.find((p) => p.sku.toLowerCase() === (o.sku || '').toLowerCase());
      const itemCost = skuCostsMap?.get((o.sku || '').toLowerCase())?.cogs ?? matchedProd?.costPrice ?? 0;
      const cogsVal = itemCost * qty;
      totalCogsPurchased += cogsVal;
      totalCogsItc += cogsVal * (rate / 100);

      const platConfig = MARKETPLACE_CONFIG[platformKey] || MARKETPLACE_CONFIG.amazon;
      const fee = o.estimatedFees?.totalFees ?? ((grossVal * platConfig.referralFeeRate) + platConfig.fixedClosingFee);
      totalMarketplaceFees += fee;

      const shipFee = o.shipping_fee ?? platConfig.flatShippingRate;
      totalShippingFees += shipFee;
    }
  }

  // Finalize Section 52 TCS totals (1% on net taxable value = Gross Taxable - Returned Taxable)
  const finalizeTcs = (t: MarketplaceTcsItem) => {
    t.netTaxableValue = Math.max(0, t.grossTaxableValue - t.returnedTaxableValue);
    t.igstTcs = Number((t.netTaxableValue * 0.01 * 0.8).toFixed(2));
    t.cgstTcs = Number((t.netTaxableValue * 0.01 * 0.1).toFixed(2));
    t.sgstTcs = Number((t.netTaxableValue * 0.01 * 0.1).toFixed(2));
    t.totalTcs = Number((t.netTaxableValue * 0.01).toFixed(2));
  };

  finalizeTcs(tcsAmazon);
  finalizeTcs(tcsFlipkart);
  finalizeTcs(tcsMeesho);

  const tcsBlended: MarketplaceTcsItem = {
    marketplace: 'blended',
    displayName: 'All Marketplaces (Total)',
    grossTaxableValue: tcsAmazon.grossTaxableValue + tcsFlipkart.grossTaxableValue + tcsMeesho.grossTaxableValue,
    returnedTaxableValue: tcsAmazon.returnedTaxableValue + tcsFlipkart.returnedTaxableValue + tcsMeesho.returnedTaxableValue,
    netTaxableValue: tcsAmazon.netTaxableValue + tcsFlipkart.netTaxableValue + tcsMeesho.netTaxableValue,
    igstTcs: Number((tcsAmazon.igstTcs + tcsFlipkart.igstTcs + tcsMeesho.igstTcs).toFixed(2)),
    cgstTcs: Number((tcsAmazon.cgstTcs + tcsFlipkart.cgstTcs + tcsMeesho.cgstTcs).toFixed(2)),
    sgstTcs: Number((tcsAmazon.sgstTcs + tcsFlipkart.sgstTcs + tcsMeesho.sgstTcs).toFixed(2)),
    totalTcs: Number((tcsAmazon.totalTcs + tcsFlipkart.totalTcs + tcsMeesho.totalTcs).toFixed(2)),
    orderCount: tcsAmazon.orderCount + tcsFlipkart.orderCount + tcsMeesho.orderCount,
    returnCount: tcsAmazon.returnCount + tcsFlipkart.returnCount + tcsMeesho.returnCount
  };

  const tcsSummary: Section52TcsSummary = {
    amazon: tcsAmazon,
    flipkart: tcsFlipkart,
    meesho: tcsMeesho,
    blended: tcsBlended
  };

  // 4. GSTR-3B & Input Tax Credit (ITC) Summary
  const marketplaceServicesItc = Number((totalMarketplaceFees * 0.18).toFixed(2));
  const shippingLogisticsItc = Number((totalShippingFees * 0.18).toFixed(2));
  const cogsProcurementItc = Number(totalCogsItc.toFixed(2));
  const totalAvailableItc = Number((cogsProcurementItc + marketplaceServicesItc + shippingLogisticsItc).toFixed(2));

  const totalTcsAvailable = tcsBlended.totalTcs;
  const netOutputTax = Math.max(0, totalOutputTax);
  const netTaxPayableInCash = Math.max(0, Number((netOutputTax - totalAvailableItc - totalTcsAvailable).toFixed(2)));
  const excessCreditCarriedForward = Math.max(0, Number(((totalAvailableItc + totalTcsAvailable) - netOutputTax).toFixed(2)));

  const gstr3b: Gstr3bSummary = {
    outwardTaxableSupplies: {
      totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
      igst: Number(totalIgst.toFixed(2)),
      cgst: Number(totalCgst.toFixed(2)),
      sgst: Number(totalSgst.toFixed(2)),
      totalTax: Number(totalOutputTax.toFixed(2))
    },
    eligibleItc: {
      cogsProcurementItc,
      marketplaceServicesItc,
      shippingLogisticsItc,
      totalAvailableItc
    },
    tcsCreditAvailable: totalTcsAvailable,
    netTaxPayableInCash,
    excessCreditCarriedForward
  };

  const b2csSummary = Array.from(b2csMap.values()).sort((a, b) => b.taxableValue - a.taxableValue);
  const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue);

  return {
    sellerState: sellerInfo.name,
    sellerStateCode: sellerInfo.code,
    sellerPos: sellerInfo.pos,
    dateRange: {
      start: start ? start.toISOString().split('T')[0] : 'All Time',
      end: end ? end.toISOString().split('T')[0] : 'Present'
    },
    totalGrossSales: Number(totalGrossSales.toFixed(2)),
    totalTaxableValue: Number(totalTaxableValue.toFixed(2)),
    totalOutputTax: Number(totalOutputTax.toFixed(2)),
    totalIgst: Number(totalIgst.toFixed(2)),
    totalCgst: Number(totalCgst.toFixed(2)),
    totalSgst: Number(totalSgst.toFixed(2)),
    b2csSummary,
    hsnSummary,
    tcsSummary,
    gstr3b
  };
}

// -------------------------------------------------------------
// 4. One-Click Exporters (CSV & GST Portal JSON)
// -------------------------------------------------------------

export function exportGstr1B2csCsv(summary: TaxComplianceSummary): string {
  const headers = [
    'Place Of Supply (POS)',
    'State Code',
    'State Name',
    'Supply Type',
    'Rate (%)',
    'Gross Invoiced Value (INR)',
    'Taxable Value (INR)',
    'Integrated Tax (IGST)',
    'Central Tax (CGST)',
    'State/UT Tax (SGST)',
    'Cess Amount',
    'Order Count'
  ];

  const rows = summary.b2csSummary.map((item) => [
    `"${item.pos}"`,
    item.stateCode,
    `"${item.stateName}"`,
    item.supplyType === 'intra_state' ? 'Intra-State' : 'Inter-State',
    `${item.taxRate}%`,
    item.grossValue.toFixed(2),
    item.taxableValue.toFixed(2),
    item.igst.toFixed(2),
    item.cgst.toFixed(2),
    item.sgst.toFixed(2),
    '0.00',
    item.orderCount
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportGstr1HsnCsv(summary: TaxComplianceSummary): string {
  const headers = [
    'HSN Code',
    'Description',
    'UQC',
    'Total Quantity',
    'Total Value (INR)',
    'Taxable Value (INR)',
    'Rate (%)',
    'Integrated Tax (IGST)',
    'Central Tax (CGST)',
    'State/UT Tax (SGST)',
    'Cess Amount'
  ];

  const rows = summary.hsnSummary.map((item) => [
    item.hsnCode,
    `"${item.description.replace(/"/g, '""')}"`,
    item.uqc,
    item.totalQuantity,
    item.totalValue.toFixed(2),
    item.taxableValue.toFixed(2),
    `${item.taxRate}%`,
    item.igst.toFixed(2),
    item.cgst.toFixed(2),
    item.sgst.toFixed(2),
    '0.00'
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportSection52TcsCsv(summary: TaxComplianceSummary): string {
  const headers = [
    'Marketplace / Platform',
    'Gross Taxable Supplies (INR)',
    'Returned Supplies (INR)',
    'Net Taxable Value (INR)',
    'IGST TCS 1.0% (INR)',
    'CGST TCS 0.5% (INR)',
    'SGST TCS 0.5% (INR)',
    'Total 1% TCS Withheld (INR)',
    'Orders',
    'Returns'
  ];

  const targets = [
    summary.tcsSummary.amazon,
    summary.tcsSummary.flipkart,
    summary.tcsSummary.meesho,
    summary.tcsSummary.blended
  ];

  const rows = targets.map((t) => [
    `"${t.displayName}"`,
    t.grossTaxableValue.toFixed(2),
    t.returnedTaxableValue.toFixed(2),
    t.netTaxableValue.toFixed(2),
    t.igstTcs.toFixed(2),
    t.cgstTcs.toFixed(2),
    t.sgstTcs.toFixed(2),
    t.totalTcs.toFixed(2),
    t.orderCount,
    t.returnCount
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportGstr1Json(summary: TaxComplianceSummary): string {
  const payload = {
    gstin: '29AAACH7409R1ZZ',
    fp: summary.dateRange.end.substring(0, 7).replace('-', ''),
    cur_gt: summary.totalGrossSales,
    b2cs: summary.b2csSummary.map((b) => ({
      sply_ty: b.supplyType === 'inter_state' ? 'INTER' : 'INTRA',
      pos: b.stateCode,
      rt: b.taxRate,
      txval: Number(b.taxableValue.toFixed(2)),
      iamt: Number(b.igst.toFixed(2)),
      camt: Number(b.cgst.toFixed(2)),
      samt: Number(b.sgst.toFixed(2)),
      csamt: 0
    })),
    hsn: {
      data: summary.hsnSummary.map((h, idx) => ({
        num: idx + 1,
        hsn_sc: h.hsnCode,
        desc: h.description,
        uqc: h.uqc,
        qty: h.totalQuantity,
        val: Number(h.totalValue.toFixed(2)),
        txval: Number(h.taxableValue.toFixed(2)),
        iamt: Number(h.igst.toFixed(2)),
        camt: Number(h.cgst.toFixed(2)),
        samt: Number(h.sgst.toFixed(2)),
        csamt: 0
      }))
    }
  };

  return JSON.stringify(payload, null, 2);
}
