/**
 * Normalized marketplace performance report models.
 *
 * These represent traffic / listing / conversion metrics from marketplace
 * business reports (Amazon Business Reports, Flipkart seller reports, etc.).
 *
 * IMPORTANT: Keep this separate from financial/order analytics
 * (revenue, COGS, fees, profit). Do not derive profit from these fields.
 */

/**
 * Marketplace identity for the performance / integration plane.
 *
 * Includes planned marketplaces (e.g. meesho) ahead of financial Order.platform.
 * Order.platform / PlatformFilter remain amazon|flipkart until financial mock
 * data and MARKETPLACE_CONFIG exist for additional channels.
 */
export type MarketplacePlatform = 'amazon' | 'flipkart' | 'meesho';

/**
 * Daily normalized marketplace performance metric.
 * Marketplace adapters must return this shape.
 *
 * Fields that a platform cannot reliably supply are `null`
 * (never invent fake values).
 */
export interface MarketplaceDailyMetric {
  date: string; // YYYY-MM-DD
  platform: MarketplacePlatform;
  orderedProductSales: number | null;
  orderedProductSalesB2B: number | null;
  unitsOrdered: number | null;
  unitsOrderedB2B: number | null;
  totalOrderItems: number | null;
  totalOrderItemsB2B: number | null;
  pageViews: number | null;
  pageViewsB2B: number | null;
  sessions: number | null;
  sessionsB2B: number | null;
  featuredOfferPercentage: number | null; // e.g. 99.89 for 99.89%
  featuredOfferPercentageB2B: number | null;
  unitSessionPercentage: number | null;
  unitSessionPercentageB2B: number | null;
  averageOfferCount: number | null;
  averageParentItems: number | null;
}

/**
 * Raw Amazon Business Report row (as typically exported).
 * Column names mirror Amazon report headers; values may be
 * formatted strings (currency, percentages) or numbers.
 *
 * MOCK/DEMO only — not live SP-API data.
 */
export interface AmazonRawDailyReport {
  Date: string; // DD/MM/YY or DD/MM/YYYY
  'Ordered Product Sales': string | number;
  'Ordered Product Sales - B2B': string | number;
  'Units Ordered': number | string;
  'Units Ordered - B2B': number | string;
  'Total Order Items': number | string;
  'Total Order Items - B2B': number | string;
  'Page Views - Total': number | string;
  'Page Views - Total - B2B': number | string;
  'Sessions - Total': number | string;
  'Sessions - Total - B2B': number | string;
  'Featured Offer Percentage': string | number;
  'Featured Offer Percentage - B2B': string | number;
  'Unit Session Percentage': string | number;
  'Unit Session Percentage - B2B': string | number;
  'Average Offer Count': number | string;
  'Average Parent Items': number | string;
}

/**
 * Raw Flipkart Sales Report line item (uploaded workbook sheet "Sales Report").
 *
 * Column names mirror the Flipkart export headers exactly.
 * Do NOT invent traffic/conversion fields (sessions, page views, buy box, etc.)
 * — those are unavailable from this report.
 *
 * Static sample from the uploaded export — not live Flipkart Seller API data.
 */
export interface FlipkartRawSalesReportRow {
  'Order Date': string; // e.g. YYYY-MM-DD HH:MM:SS
  'Order ID': string;
  /** Stored as string — Flipkart IDs exceed JS Number.MAX_SAFE_INTEGER. */
  'Order Item ID': string;
  'Product Title/Description': string | null;
  FSN: string | null;
  SKU: string | null;
  'Event Type': string; // Sale | Return
  'Event Sub Type': string; // Sale | Return | Cancellation | Return Cancellation
  'Order Type': string | null;
  'Fulfilment Type': string | null;
  'Item Quantity': number | string | null;
  'Price before discount': number | string | null;
  'Total Discount': number | string | null;
  'Seller Share': number | string | null;
  'Bank Offer Share': number | string | null;
  'Price after discount (Price before discount-Total discount)': number | string | null;
  'Shipping Charges': number | string | null;
  'Final Invoice Amount (Price after discount+Shipping Charges)': number | string | null;
  'Taxable Value (Final Invoice Amount -Taxes)': number | string | null;
  'Total TCS Deducted': number | string | null;
  'Buyer Invoice Date': string | null;
  'Buyer Invoice Amount': number | string | null;
}

/**
 * Raw Flipkart Cash Back Report row (uploaded workbook sheet "Cash Back Report").
 *
 * Documented for future returns / refunds / cancellations / financial
 * reconciliation. NOT merged into MarketplaceDailyMetric (performance plane).
 *
 * Document Type includes Credit Note / Debit Note.
 * Document Sub Type includes Sale / Cancellation / Return / Return Cancellation.
 */
export interface FlipkartCashBackReportRow {
  'Order ID': string;
  'Order Item ID': string;
  'Document Type': string; // Credit Note | Debit Note
  'Document Sub Type': string; // Sale | Cancellation | Return | Return Cancellation
  'Credit Note ID/ Debit Note ID': string | null;
  'Invoice Amount': number | string | null;
  'Invoice Date': string | null;
  'Taxable Value': number | string | null;
  'Total TCS Deducted': number | string | null;
}
