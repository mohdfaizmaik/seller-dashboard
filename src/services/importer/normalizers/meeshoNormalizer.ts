import type { Order, OrderEstimatedFees } from '../../../models/order';
import type { ImportError, RawRow } from '../types';
import { PRODUCTS_CATALOG } from '../../../data/products';
import { MARKETPLACE_CONFIG } from '../../../data/marketplaceConfig';

/** Month name dictionary for DD-MMM-YYYY parsing */
const MONTH_NAMES: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/**
 * Parses diverse Meesho date strings (ISO, Indian DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-MMM-YYYY)
 * into a canonical ISO-8601 string.
 */
export function parseMeeshoDate(rawDate: string): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const trimmed = rawDate.trim().replace(/^["']|["']$/g, '');
  if (!trimmed) return null;

  // 1. ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (isoMatch) {
    const [, y, m, d, hh, mm, ss] = isoMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    const hours = hh ? parseInt(hh, 10) : 0;
    const minutes = mm ? parseInt(mm, 10) : 0;
    const seconds = ss ? parseInt(ss, 10) : 0;
    const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  // 2. Indian Standard Date formats: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (with optional time)
  const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    const [, d, m, y, hh, mm, ss] = dmyMatch;
    const day = parseInt(d, 10);
    const month = parseInt(m, 10) - 1;
    const year = parseInt(y, 10);
    const hours = hh ? parseInt(hh, 10) : 0;
    const minutes = mm ? parseInt(mm, 10) : 0;
    const seconds = ss ? parseInt(ss, 10) : 0;

    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString();
      }
    }
  }

  // 3. Indian alphanumeric format: DD-MMM-YYYY (e.g. 15-Aug-2026)
  const alphaMatch = trimmed.match(/^(\d{1,2})[-/\s]([A-Za-z]{3})[-/\s](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (alphaMatch) {
    const [, d, monStr, y, hh, mm, ss] = alphaMatch;
    const day = parseInt(d, 10);
    const monLower = monStr.toLowerCase();
    const month = MONTH_NAMES[monLower];
    const year = parseInt(y, 10);
    const hours = hh ? parseInt(hh, 10) : 0;
    const minutes = mm ? parseInt(mm, 10) : 0;
    const seconds = ss ? parseInt(ss, 10) : 0;

    if (month !== undefined && day >= 1 && day <= 31) {
      const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toISOString();
      }
    }
  }

  return null;
}

/** Helper to clean raw currency and number strings */
function parseAmount(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/** Case-insensitive row key getter */
function getRowValue(row: RawRow, candidates: string[]): string {
  const rowKeys = Object.keys(row);
  for (const candidate of candidates) {
    const normCand = candidate.toLowerCase().replace(/[-_\s]+/g, '');
    for (const key of rowKeys) {
      const normKey = key.toLowerCase().replace(/[-_\s]+/g, '');
      if (normKey === normCand && row[key] !== undefined) {
        return row[key].trim().replace(/^["']|["']$/g, '');
      }
    }
  }
  return '';
}

export interface NormalizeMeeshoResult {
  orders: Order[];
  errors: ImportError[];
  warnings: ImportError[];
}

/**
 * Normalizes raw Meesho Order export rows into unified Order records.
 * Incorporates Meesho's 0% referral fee policy and shipping deductions.
 */
export function normalizeMeeshoOrders(rows: RawRow[]): NormalizeMeeshoResult {
  const orders: Order[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  const meeshoConfig = MARKETPLACE_CONFIG.meesho;
  const returnConfig = MARKETPLACE_CONFIG.returns;

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNum = idx + 2; // header is row 1

    // 1. Sub Order No (Primary identifier)
    const subOrderNo = getRowValue(row, [
      'sub order no',
      'sub order number',
      'sub order id',
      'sub-order no',
      'order no',
      'order id'
    ]);

    if (!subOrderNo) {
      errors.push({
        rowNumber: rowNum,
        column: 'Sub Order No',
        message: 'Row missing required Sub Order No identifier.',
        severity: 'error'
      });
      continue;
    }

    // 2. Order Date Parsing
    const rawDate = getRowValue(row, ['order date', 'order creation date', 'date', 'created at']);
    const isoDate = parseMeeshoDate(rawDate) || new Date().toISOString();

    if (!rawDate) {
      warnings.push({
        rowNumber: rowNum,
        column: 'Order Date',
        message: 'Order date missing; defaulted to current timestamp.',
        severity: 'warning'
      });
    }

    // 3. Product & SKU Details
    const rawSku = getRowValue(row, ['sku', 'sku code', 'seller sku', 'product sku']);
    const cleanSku = rawSku.replace(/^["']|["']$/g, '').trim();

    const rawTitle = getRowValue(row, [
      'product title',
      'product name',
      'item description',
      'product'
    ]);

    // Match catalog product for COGS and fallback description
    const catalogItem = PRODUCTS_CATALOG.find(
      (p) => p.sku.toLowerCase() === cleanSku.toLowerCase()
    );

    const productName = rawTitle || catalogItem?.name || cleanSku || 'Meesho Catalog Item';
    const productId = catalogItem?.id || `meesho_${cleanSku || subOrderNo}`;
    const costPrice = catalogItem?.costPrice || 0;

    if (!catalogItem && cleanSku) {
      warnings.push({
        rowNumber: rowNum,
        column: 'SKU',
        message: `SKU "${cleanSku}" not discovered in catalog; COGS estimated at ₹0.`,
        severity: 'warning',
        rawValue: cleanSku
      });
    }

    // 4. Quantity
    const rawQty = getRowValue(row, ['quantity', 'qty', 'item quantity']);
    const parsedQty = parseInt(rawQty, 10);
    const quantity = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;

    // 5. Financial Amounts (Supplier Discounted Price / Product Price)
    const rawAmount = getRowValue(row, [
      'supplier discounted price',
      'product price',
      'final price',
      'total price',
      'order value',
      'price'
    ]);

    const unitPrice = parseAmount(rawAmount);
    const grossAmount = unitPrice > 0 ? unitPrice * quantity : 0;

    const rawTax = getRowValue(row, ['tax amount', 'gst', 'tax', 'igst']);
    const taxAmount = parseAmount(rawTax);

    const rawShipping = getRowValue(row, ['shipping fee', 'shipping charge', 'customer shipping']);
    const shippingFee = parseAmount(rawShipping);

    // 6. Status Classification
    const rawStatus = getRowValue(row, ['status', 'order status', 'current status']).toLowerCase();
    const rawReturnType = getRowValue(row, ['return type', 'return status']).toLowerCase();

    let status: Order['status'] = 'delivered';

    if (
      rawReturnType.includes('rto') ||
      rawReturnType.includes('return') ||
      rawStatus.includes('return') ||
      rawStatus.includes('rto')
    ) {
      status = 'returned';
    } else if (rawStatus.includes('cancel')) {
      status = 'cancelled';
    } else if (
      rawStatus.includes('ship') ||
      rawStatus.includes('transit') ||
      rawStatus.includes('dispatch')
    ) {
      status = 'shipped';
    } else if (rawStatus.includes('pending') || rawStatus.includes('hold')) {
      status = 'pending';
    } else if (rawStatus.includes('deliver') || rawStatus.includes('complete')) {
      status = 'delivered';
    }

    // 7. Payment Mode & Customer Location
    const rawPayment = getRowValue(row, ['payment mode', 'payment method', 'payment type']).toUpperCase();
    const paymentMethod = rawPayment.includes('COD') || rawPayment.includes('CASH') ? 'COD' : 'Prepaid';

    const rawState = getRowValue(row, ['customer state', 'delivery state', 'state', 'shipping state']);
    const shipToState = rawState || undefined;

    // 8. Meesho Fee Engine Calculations (Zero Commission Platform)
    // Meesho charges 0% referral fee and ₹0 fixed closing fee.
    let referralFee = 0;
    let closingFee = 0;
    let totalFees = 0;
    let estimatedNetProfit = 0;

    if (status === 'cancelled') {
      referralFee = 0;
      closingFee = 0;
      totalFees = 0;
      estimatedNetProfit = 0;
    } else if (status === 'returned') {
      referralFee = 0;
      closingFee = 0;
      totalFees = 0;

      const reverseShipping = returnConfig.flatReturnShipping;
      const reverseProcessing = returnConfig.reverseProcessingFee;
      const cogs = costPrice * quantity;
      const damageLoss = cogs * returnConfig.writeOffPercentage;
      const returnCosts = reverseShipping + reverseProcessing + damageLoss;

      // Net profit on return is negative costs
      estimatedNetProfit = -(cogs + returnCosts);
    } else {
      // Delivered or Shipped
      referralFee = grossAmount * meeshoConfig.referralFeeRate; // 0.00
      closingFee = meeshoConfig.fixedClosingFee; // 0
      totalFees = referralFee + closingFee;

      const cogs = costPrice * quantity;
      const effectiveShipping = shippingFee > 0 ? shippingFee : meeshoConfig.flatShippingRate;
      estimatedNetProfit = grossAmount - cogs - totalFees - effectiveShipping;
    }

    const estimatedFees: OrderEstimatedFees = {
      referralFee: Number(referralFee.toFixed(2)),
      closingFee: Number(closingFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2))
    };

    const order: Order = {
      id: subOrderNo,
      orderDate: isoDate,
      date: isoDate,
      platform: 'meesho',
      marketplace: 'meesho',
      productId,
      productName,
      product_name: productName,
      sku: cleanSku || 'UNKNOWN-SKU',
      orderValue: grossAmount,
      gross_amount: grossAmount,
      quantity,
      tax_amount: taxAmount,
      shipping_fee: shippingFee,
      status,
      fulfillmentChannel: 'Meesho Direct',
      paymentMethod,
      shipToState,
      estimatedFees,
      estimatedNetProfit: Number(estimatedNetProfit.toFixed(2))
    };

    orders.push(order);
  }

  return {
    orders,
    errors,
    warnings
  };
}
