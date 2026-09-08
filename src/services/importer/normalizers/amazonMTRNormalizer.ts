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
 * Parses diverse Amazon date strings (ISO, Indian DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD-MMM-YYYY)
 * into a canonical ISO-8601 string.
 */
export function parseAmazonDate(rawDate: string): string | null {
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
    const month = MONTH_NAMES[monStr.toLowerCase()];
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

  // 4. Native JS Date fallback
  const parsedFallback = new Date(trimmed);
  if (!isNaN(parsedFallback.getTime())) {
    return parsedFallback.toISOString();
  }

  return null;
}

/** Parses monetary string (cleaning symbols like ₹, $, commas, whitespace) */
export function parseAmount(val: unknown): { amount: number; isNegative: boolean } {
  if (val === undefined || val === null) return { amount: 0, isNegative: false };
  const str = String(val).replace(/[₹$,\s]/g, '').trim();
  if (!str) return { amount: 0, isNegative: false };
  const num = parseFloat(str);
  if (isNaN(num)) return { amount: 0, isNegative: false };
  return {
    amount: Math.abs(num),
    isNegative: num < 0
  };
}

/** Case-insensitive and alias-resilient value lookup in row */
function getRowValue(row: RawRow, candidateKeys: string[]): string {
  // 1. Direct key match
  for (const k of candidateKeys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') {
      return String(row[k]).trim();
    }
  }

  // 2. Normalized key match (lowercased without spaces/underscores)
  const normalizedKeys = candidateKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rowEntries = Object.entries(row);

  for (const [key, val] of rowEntries) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedKeys.includes(normKey)) {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return String(val).trim();
      }
    }
  }

  return '';
}

export interface NormalizeAmazonMTRResult {
  orders: Order[];
  errors: ImportError[];
  warnings: ImportError[];
}

/**
 * Pure parser and normalizer function converting raw CSV/TSV parsed rows
 * from Amazon India Merchant Tax Report (MTR / B2C Flat File) into our unified Order[] structure.
 */
export function normalizeAmazonMTR(rows: RawRow[]): NormalizeAmazonMTRResult {
  const orders: Order[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNumber = idx + 2; // 1-based (row 1 is header)

    // Skip completely blank rows
    const hasAnyValue = Object.values(row).some((v) => v !== undefined && String(v).trim() !== '');
    if (!hasAnyValue) continue;

    // 1. Identifier: Order Id (fallback to Invoice Number if missing)
    const orderId = getRowValue(row, ['Order Id', 'Order ID', 'order_id', 'OrderId']);
    const invoiceNumber = getRowValue(row, ['Invoice Number', 'invoice_number', 'InvoiceNumber']);

    if (!orderId && !invoiceNumber) {
      errors.push({
        rowNumber,
        column: 'Order Id',
        message: 'Missing Order Id and Invoice Number',
        severity: 'error'
      });
      continue;
    }

    const id = orderId || invoiceNumber;

    // 2. Date: Order Date if available, fallback to Invoice Date
    const rawOrderDate = getRowValue(row, ['Order Date', 'order_date', 'OrderDate', 'Purchase Date']);
    const rawInvoiceDate = getRowValue(row, ['Invoice Date', 'invoice_date', 'InvoiceDate']);
    const dateToParse = rawOrderDate || rawInvoiceDate;

    let isoDate: string;
    const parsedDate = parseAmazonDate(dateToParse);
    if (!parsedDate) {
      // Create warning and use current ISO timestamp fallback
      warnings.push({
        rowNumber,
        column: rawOrderDate ? 'Order Date' : 'Invoice Date',
        message: `Unparseable date "${dateToParse}". Defaulting to current date.`,
        severity: 'warning',
        rawValue: dateToParse
      });
      isoDate = new Date().toISOString();
    } else {
      isoDate = parsedDate;
    }

    // 3. Product Details: Sku, Asin, Item Description
    const sku = getRowValue(row, ['Sku', 'SKU', 'sku', 'Seller SKU', 'Merchant SKU']);
    const asin = getRowValue(row, ['Asin', 'ASIN', 'asin']);
    const itemDescription = getRowValue(row, [
      'Item Description',
      'item_description',
      'ItemDescription',
      'Title',
      'Product Name'
    ]);

    // Product name: Item Description fallback to Sku if blank
    const productName = itemDescription || sku || 'Amazon Item';

    // 4. Quantity: Number(Quantity) || 1
    const rawQuantity = getRowValue(row, ['Quantity', 'quantity', 'Qty']);
    const parsedQty = parseInt(rawQuantity.replace(/[^0-9]/g, ''), 10);
    const quantity = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;

    // 5. Financials: Invoice Amount, Total Tax Amount, Shipping Amount
    const rawInvoiceAmount = getRowValue(row, ['Invoice Amount', 'invoice_amount', 'Total Amount']);
    const rawTaxAmount = getRowValue(row, ['Total Tax Amount', 'total_tax_amount', 'Tax Amount']);
    const rawShippingAmount = getRowValue(row, ['Shipping Amount', 'shipping_amount', 'Shipping Fee']);
    const creditNoteNo = getRowValue(row, ['Credit Note No', 'Credit Note Number', 'credit_note_no', 'Credit Note']);
    const transactionType = getRowValue(row, ['Transaction Type', 'transaction_type', 'TransactionType']);

    const { amount: grossAmount, isNegative: amountIsNegative } = parseAmount(rawInvoiceAmount);
    const { amount: taxAmount } = parseAmount(rawTaxAmount);
    const { amount: shippingFee } = parseAmount(rawShippingAmount);

    // 6. Status Determination
    // - Transaction Type === 'Cancel' -> 'cancelled'
    // - Has Credit Note No or negative amount -> 'returned'
    // - Transaction Type === 'Shipment' -> 'shipped'
    let status: Order['status'] = 'shipped';
    const normTransType = transactionType.toLowerCase();

    if (normTransType.includes('cancel')) {
      status = 'cancelled';
    } else if (creditNoteNo.length > 0 || amountIsNegative || normTransType.includes('refund') || normTransType.includes('return')) {
      status = 'returned';
    } else if (normTransType.includes('shipment')) {
      status = 'shipped';
    }

    // 7. Fulfillment Channel & Payment Method & Shipping State
    const rawFulfillment = getRowValue(row, ['Fulfillment Channel', 'fulfillment_channel', 'Fulfilment Channel']).toUpperCase();
    const fulfillmentChannel = rawFulfillment.includes('AFN') || rawFulfillment.includes('FBA') ? 'AFN' : 'MFN';

    const rawPayment = getRowValue(row, ['Payment Method Code', 'payment_method_code', 'Payment Method']).toUpperCase();
    const paymentMethod = rawPayment.includes('COD') || rawPayment.includes('CASH') ? 'COD' : 'Prepaid';

    const shipToState = getRowValue(row, ['Ship To State', 'ship_to_state', 'State', 'Shipping State']);

    // 8. Product Catalog Integration & COGS resolution
    const matchedProduct = PRODUCTS_CATALOG.find(
      (p) =>
        (sku && p.sku.toLowerCase() === sku.toLowerCase()) ||
        p.name.toLowerCase() === productName.toLowerCase()
    );
    const productId = matchedProduct ? matchedProduct.id : (sku || `prod-${id}`);
    const costPrice = matchedProduct ? matchedProduct.costPrice : 0;

    if (!matchedProduct && sku) {
      warnings.push({
        rowNumber,
        column: 'Sku',
        message: `SKU "${sku}" not found in product catalog. Estimated COGS set to ₹0.`,
        severity: 'warning',
        rawValue: sku
      });
    }

    // 9. Fee Handling (Phase 4 Marketplace Config Assumption Engine)
    // Amazon MTR reports do NOT contain deduction fees. Estimate referral and closing fees against gross_amount.
    const amazonConfig = MARKETPLACE_CONFIG.amazon;
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
      // In Phase 4 accounting for returns:
      // Refunded value offsets gross revenue to 0. Reverse logistics + processing + damage write-off apply.
      const returnConfig = MARKETPLACE_CONFIG.returns;
      referralFee = 0; // Commission refunded/reversed
      closingFee = amazonConfig.fixedClosingFee;
      totalFees = closingFee;

      const reverseShipping = returnConfig.flatReturnShipping;
      const reverseProcessing = returnConfig.reverseProcessingFee;
      const cogs = costPrice * quantity;
      const damageLoss = cogs * returnConfig.writeOffPercentage;
      const returnCosts = reverseShipping + reverseProcessing + damageLoss;

      // Net profit on return is negative costs
      estimatedNetProfit = -(cogs + totalFees + returnCosts);
    } else {
      // Shipped order
      referralFee = grossAmount * amazonConfig.referralFeeRate;
      closingFee = amazonConfig.fixedClosingFee;
      totalFees = referralFee + closingFee;

      const cogs = costPrice * quantity;
      const effectiveShipping = shippingFee > 0 ? shippingFee : amazonConfig.flatShippingRate;
      estimatedNetProfit = grossAmount - cogs - totalFees - effectiveShipping;
    }

    const estimatedFees: OrderEstimatedFees = {
      referralFee: Number(referralFee.toFixed(2)),
      closingFee: Number(closingFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2))
    };

    const order: Order = {
      id,
      orderDate: isoDate,
      date: isoDate,
      platform: 'amazon',
      marketplace: 'amazon',
      productId,
      productName,
      product_name: productName,
      sku: sku || 'UNKNOWN-SKU',
      asin: asin || undefined,
      orderValue: grossAmount,
      gross_amount: grossAmount,
      quantity,
      tax_amount: taxAmount,
      shipping_fee: shippingFee,
      status,
      fulfillmentChannel,
      paymentMethod,
      shipToState: shipToState || undefined,
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
