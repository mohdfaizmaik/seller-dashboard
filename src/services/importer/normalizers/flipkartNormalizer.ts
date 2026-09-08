import type { Order, OrderEstimatedFees } from '../../../models/order';
import type { ImportError, RawRow } from '../types';
import { PRODUCTS_CATALOG } from '../../../data/products';
import { MARKETPLACE_CONFIG } from '../../../data/marketplaceConfig';

/**
 * Strips redundant surrounding single/double/triple quotes from raw report tokens.
 * E.g., `"""Dilstitch Back Cover for Iphone 17..."""` -> `Dilstitch Back Cover for Iphone 17...`
 */
export function cleanString(val: unknown): string {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  while (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

/**
 * Cleans SKU values, stripping surrounding quotes and redundant "SKU:" prefix.
 * E.g., `"""SKU:D-SF1-ip17"""` -> `D-SF1-ip17`
 */
export function cleanSku(val: unknown): string {
  let sku = cleanString(val);
  if (/^sku:\s*/i.test(sku)) {
    sku = sku.replace(/^sku:\s*/i, '').trim();
  }
  return sku;
}

/**
 * Parses diverse Flipkart timestamp formats (e.g. "2026-07-07 00:00:00", "2026-07-07 00:00:00.0", ISO)
 * into a valid ISO-8601 string.
 */
export function parseFlipkartDate(rawDate: string): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const cleaned = cleanString(rawDate);
  if (!cleaned) return null;

  // 1. Matches "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm:ss.S" or "YYYY-MM-DDTHH:mm:ss"
  const isoLikeMatch = cleaned.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?/
  );
  if (isoLikeMatch) {
    const [, y, m, d, hh, mm, ss, ms] = isoLikeMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const day = parseInt(d, 10);
    const hours = hh ? parseInt(hh, 10) : 0;
    const minutes = mm ? parseInt(mm, 10) : 0;
    const seconds = ss ? parseInt(ss, 10) : 0;
    const millis = ms ? parseInt(ms.slice(0, 3).padEnd(3, '0'), 10) : 0;

    const dateObj = new Date(Date.UTC(year, month, day, hours, minutes, seconds, millis));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString();
    }
  }

  // 2. Matches Indian date formats: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = cleaned.match(
    /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/
  );
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

  // 3. Fallback native Date parse
  const fallback = new Date(cleaned);
  if (!isNaN(fallback.getTime())) {
    return fallback.toISOString();
  }

  return null;
}

/** Parses monetary string (cleaning symbols like ₹, $, commas, whitespace) */
export function parseAmount(val: unknown): { amount: number; isNegative: boolean } {
  if (val === undefined || val === null) return { amount: 0, isNegative: false };
  const str = cleanString(val).replace(/[₹$,\s]/g, '');
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
      return cleanString(row[k]);
    }
  }

  // 2. Normalized key match
  const normalizedKeys = candidateKeys.map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const [key, val] of Object.entries(row)) {
    const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalizedKeys.includes(normKey)) {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        return cleanString(val);
      }
    }
  }

  return '';
}

export interface NormalizeFlipkartSalesResult {
  orders: Order[];
  errors: ImportError[];
  warnings: ImportError[];
}

/**
 * Pure parser and normalizer function converting raw CSV/TSV parsed rows
 * from Flipkart Sales Reports (GSTR-1 / Sales Transaction Flat File) into our unified Order[] structure.
 */
export function normalizeFlipkartSales(rows: RawRow[]): NormalizeFlipkartSalesResult {
  const orders: Order[] = [];
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const rowNumber = idx + 2; // 1-based index (header is row 1)

    // Skip empty rows
    const hasAnyValue = Object.values(row).some((v) => v !== undefined && String(v).trim() !== '');
    if (!hasAnyValue) continue;

    // 1. Identifiers: Order ID & Order Item ID
    const orderId = getRowValue(row, ['Order ID', 'Order Id', 'order_id']);
    const orderItemId = getRowValue(row, ['Order Item ID', 'Order Item Id', 'order_item_id']);

    if (!orderId && !orderItemId) {
      errors.push({
        rowNumber,
        column: 'Order ID',
        message: 'Missing Order ID and Order Item ID',
        severity: 'error'
      });
      continue;
    }

    const id = orderId || orderItemId;

    // 2. Date: Order Date or Buyer Invoice Date
    const rawOrderDate = getRowValue(row, ['Order Date', 'order_date', 'OrderDate']);
    const rawBuyerInvoiceDate = getRowValue(row, ['Buyer Invoice Date', 'buyer_invoice_date']);
    const rawApprovalDate = getRowValue(row, ['Order Approval Date', 'order_approval_date']);
    const dateToParse = rawOrderDate || rawBuyerInvoiceDate || rawApprovalDate;

    let isoDate: string;
    const parsedDate = parseFlipkartDate(dateToParse);
    if (!parsedDate) {
      warnings.push({
        rowNumber,
        column: 'Order Date',
        message: `Unparseable date "${dateToParse}". Defaulting to current date.`,
        severity: 'warning',
        rawValue: dateToParse
      });
      isoDate = new Date().toISOString();
    } else {
      isoDate = parsedDate;
    }

    // 3. Product & Catalog Identifiers
    const rawSku = getRowValue(row, ['SKU', 'Sku', 'sku']);
    const sku = cleanSku(rawSku);
    const fsn = cleanString(getRowValue(row, ['FSN', 'Fsn', 'fsn']));
    const productTitle = cleanString(
      getRowValue(row, [
        'Product Title/Description',
        'Product Title',
        'product_title',
        'Description',
        'Item Description'
      ])
    );
    const productName = productTitle || sku || fsn || 'Flipkart Item';

    // 4. Quantity: Math.round(Number(Item Quantity) || 1)
    const rawQuantity = getRowValue(row, ['Item Quantity', 'item_quantity', 'Quantity', 'Qty']);
    const parsedQty = Math.round(parseFloat(rawQuantity.replace(/[^0-9.]/g, '')));
    const quantity = isNaN(parsedQty) || parsedQty <= 0 ? 1 : parsedQty;

    // 5. Financials & Taxes
    const rawFinalInvoiceAmount = getRowValue(row, [
      'Final Invoice Amount (Price after discount+Shipping Charges)',
      'Final Invoice Amount',
      'final_invoice_amount',
      'Invoice Amount'
    ]);
    const rawShippingCharges = getRowValue(row, ['Shipping Charges', 'shipping_charges', 'Shipping']);
    const rawIgst = getRowValue(row, ['IGST Amount', 'igst_amount', 'IGST']);
    const rawCgst = getRowValue(row, ['CGST Amount', 'cgst_amount', 'CGST']);
    const rawSgst = getRowValue(row, [
      'SGST Amount (Or UTGST as applicable)',
      'SGST Amount',
      'sgst_amount',
      'SGST'
    ]);

    const { amount: grossAmount, isNegative: amountIsNegative } = parseAmount(rawFinalInvoiceAmount);
    const { amount: shippingFee } = parseAmount(rawShippingCharges);
    const { amount: igstAmount } = parseAmount(rawIgst);
    const { amount: cgstAmount } = parseAmount(rawCgst);
    const { amount: sgstAmount } = parseAmount(rawSgst);
    const taxAmount = igstAmount + cgstAmount + sgstAmount;

    // 6. Status Determination
    // - Event Type === 'Return' OR Event Sub Type === 'Return' OR negative amount -> 'returned'
    // - Event Type === 'Cancellation' OR Event Sub Type === 'Cancellation' -> 'cancelled'
    // - Event Type === 'Sale' -> 'shipped'
    const eventType = getRowValue(row, ['Event Type', 'event_type']).toLowerCase();
    const eventSubType = getRowValue(row, ['Event Sub Type', 'event_sub_type']).toLowerCase();

    let status: Order['status'] = 'shipped';
    if (
      eventType.includes('return') ||
      eventSubType.includes('return') ||
      amountIsNegative
    ) {
      status = 'returned';
    } else if (
      eventType.includes('cancel') ||
      eventSubType.includes('cancel')
    ) {
      status = 'cancelled';
    } else if (eventType.includes('sale') || eventSubType.includes('sale')) {
      status = 'shipped';
    }

    // 7. Fulfillment Channel & Payment Method & Delivery State
    const rawFulfilmentType = getRowValue(row, ['Fulfilment Type', 'fulfilment_type', 'Fulfillment Type']).toUpperCase();
    const fulfillmentChannel =
      rawFulfilmentType.includes('FBF') && !rawFulfilmentType.includes('NON') ? 'FBF' : 'NON_FBF';

    const rawOrderType = getRowValue(row, ['Order Type', 'order_type']).toLowerCase();
    const paymentMethod = rawOrderType.includes('prepaid') ? 'Prepaid' : 'COD';

    const shipToState = getRowValue(row, [
      "Customer's Delivery State",
      'Customer Delivery State',
      'customer_delivery_state',
      'Delivery State',
      'State'
    ]);

    // 8. Is Shopsy Order
    const rawShopsy = getRowValue(row, ['Is Shopsy Order?', 'Is Shopsy Order', 'is_shopsy_order']).toLowerCase();
    const isShopsy = rawShopsy === 'yes' || rawShopsy === 'true' || rawShopsy === 'y';

    // 9. Product Catalog Integration & COGS
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
        column: 'SKU',
        message: `SKU "${sku}" not found in product catalog. Estimated COGS set to ₹0.`,
        severity: 'warning',
        rawValue: sku
      });
    }

    // 10. Fee Handling (Phase 4 Config Assumption Engine for Flipkart)
    const fkConfig = MARKETPLACE_CONFIG.flipkart;
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
      const returnConfig = MARKETPLACE_CONFIG.returns;
      referralFee = 0; // commission reversed
      closingFee = fkConfig.fixedClosingFee;
      totalFees = closingFee;

      const reverseShipping = returnConfig.flatReturnShipping;
      const reverseProcessing = returnConfig.reverseProcessingFee;
      const cogs = costPrice * quantity;
      const damageLoss = cogs * returnConfig.writeOffPercentage;
      const returnCosts = reverseShipping + reverseProcessing + damageLoss;

      estimatedNetProfit = -(cogs + totalFees + returnCosts);
    } else {
      referralFee = grossAmount * fkConfig.referralFeeRate;
      closingFee = fkConfig.fixedClosingFee;
      totalFees = referralFee + closingFee;

      const cogs = costPrice * quantity;
      const effectiveShipping = shippingFee > 0 ? shippingFee : fkConfig.flatShippingRate;
      estimatedNetProfit = grossAmount - cogs - totalFees - effectiveShipping;
    }

    const estimatedFees: OrderEstimatedFees = {
      referralFee: Number(referralFee.toFixed(2)),
      closingFee: Number(closingFee.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2))
    };

    const order: Order = {
      id,
      orderItemId: orderItemId || undefined,
      orderDate: isoDate,
      date: isoDate,
      platform: 'flipkart',
      marketplace: 'flipkart',
      productId,
      productName,
      product_name: productName,
      sku: sku || 'UNKNOWN-SKU',
      fsn: fsn || undefined,
      isShopsy,
      orderValue: grossAmount,
      gross_amount: grossAmount,
      quantity,
      tax_amount: Number(taxAmount.toFixed(2)),
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
