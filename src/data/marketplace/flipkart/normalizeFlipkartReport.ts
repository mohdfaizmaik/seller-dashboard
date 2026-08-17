/**
 * Flipkart Sales Report → MarketplaceDailyMetric normalizer.
 *
 * Aggregates Sales Report line items by Order Date.
 * Only Event Type === "Sale" contributes to orderedProductSales /
 * unitsOrdered / totalOrderItems. Return / Cancellation /
 * Return Cancellation rows are preserved in the raw input but excluded
 * from these performance totals (do not blindly sum invoice amounts).
 *
 * Unavailable from the Flipkart Sales Report (always null):
 * - pageViews / pageViewsB2B
 * - sessions / sessionsB2B
 * - featuredOfferPercentage / featuredOfferPercentageB2B
 * - unitSessionPercentage / unitSessionPercentageB2B
 * - averageOfferCount / averageParentItems
 * - all B2B sales / units / order-item fields
 *
 * Cash Back Report (Credit Note / Debit Note / Invoice Amount / Invoice Date)
 * is a separate future source and is NOT merged here.
 */

import type {
  FlipkartRawSalesReportRow,
  MarketplaceDailyMetric
} from '../../../models/marketplaceReport';

const FINAL_INVOICE_AMOUNT =
  'Final Invoice Amount (Price after discount+Shipping Charges)' as const;

/** Parses numeric Flipkart cells. Blank/invalid → null. Zero remains 0. */
function parseNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const cleaned = trimmed.replace(/[₹,\s]/g, '');
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Normalizes Flipkart Order Date values to YYYY-MM-DD.
 * Accepts "YYYY-MM-DD", "YYYY-MM-DD HH:MM:SS", and "YYYY-MM-DDTHH:MM:SS".
 */
export function parseFlipkartOrderDate(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('Invalid Flipkart Order Date: empty string');
  }
  const ymd = trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    throw new Error(`Invalid Flipkart Order Date: ${raw}`);
  }
  return ymd;
}

/** Valid sale events only — excludes Return / Cancellation variants. */
export function isFlipkartSaleEvent(row: FlipkartRawSalesReportRow): boolean {
  return row['Event Type'] === 'Sale';
}

interface DailyAccumulator {
  orderedProductSales: number;
  unitsOrdered: number;
  totalOrderItems: number;
  hasSalesAmount: boolean;
  hasUnits: boolean;
}

function emptyAccumulator(): DailyAccumulator {
  return {
    orderedProductSales: 0,
    unitsOrdered: 0,
    totalOrderItems: 0,
    hasSalesAmount: false,
    hasUnits: false
  };
}

/**
 * Maps Flipkart Sales Report line items to daily MarketplaceDailyMetric rows.
 * One output row per Order Date that has at least one Sale event.
 */
export function normalizeFlipkartReport(
  rows: FlipkartRawSalesReportRow[]
): MarketplaceDailyMetric[] {
  const byDate = new Map<string, DailyAccumulator>();

  for (const row of rows) {
    if (!isFlipkartSaleEvent(row)) {
      continue;
    }

    const date = parseFlipkartOrderDate(row['Order Date']);
    let acc = byDate.get(date);
    if (!acc) {
      acc = emptyAccumulator();
      byDate.set(date, acc);
    }

    // totalOrderItems = daily order-item record count (not distinct Order IDs)
    acc.totalOrderItems += 1;

    const amount = parseNumber(row[FINAL_INVOICE_AMOUNT]);
    if (amount !== null) {
      acc.orderedProductSales += amount;
      acc.hasSalesAmount = true;
    }

    const qty = parseNumber(row['Item Quantity']);
    if (qty !== null) {
      acc.unitsOrdered += qty;
      acc.hasUnits = true;
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, acc]) => ({
      date,
      platform: 'flipkart' as const,
      orderedProductSales: acc.hasSalesAmount ? acc.orderedProductSales : null,
      orderedProductSalesB2B: null,
      unitsOrdered: acc.hasUnits ? acc.unitsOrdered : null,
      unitsOrderedB2B: null,
      totalOrderItems: acc.totalOrderItems,
      totalOrderItemsB2B: null,
      pageViews: null,
      pageViewsB2B: null,
      sessions: null,
      sessionsB2B: null,
      featuredOfferPercentage: null,
      featuredOfferPercentageB2B: null,
      unitSessionPercentage: null,
      unitSessionPercentageB2B: null,
      averageOfferCount: null,
      averageParentItems: null
    }));
}
