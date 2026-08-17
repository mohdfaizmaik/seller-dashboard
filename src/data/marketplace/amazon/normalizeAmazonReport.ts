/**
 * Amazon Business Report → MarketplaceDailyMetric normalizer.
 *
 * Parses Amazon-formatted currency / percentage / date strings into
 * the shared normalized marketplace metric shape.
 *
 * Rules:
 * - Actual zero values remain 0
 * - Missing / blank / unparseable values become null (never silently coerced to 0)
 */

import type { AmazonRawDailyReport, MarketplaceDailyMetric } from '../../../models/marketplaceReport';

/** Parses values like "₹1,08,218.36" or plain numbers. Blank/invalid → null. */
function parseINR(value: string | number | null | undefined): number | null {
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

/** Parses values like "99.89%" or plain numbers. Blank/invalid → null. */
function parsePercentage(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const cleaned = trimmed.replace(/%/g, '').trim();
  if (cleaned === '') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Parses integer-like fields. Blank/invalid → null. Zero remains 0. */
function parseCount(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Converts Amazon report dates (DD/MM/YY or DD/MM/YYYY) to YYYY-MM-DD.
 */
function parseAmazonDate(raw: string): string {
  const parts = raw.trim().split('/');
  if (parts.length !== 3) {
    throw new Error(`Invalid Amazon report date: ${raw}`);
  }
  const [dd, mm, yy] = parts;
  const year = yy.length === 2 ? `20${yy}` : yy;
  return `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

export function normalizeAmazonReport(
  rows: AmazonRawDailyReport[]
): MarketplaceDailyMetric[] {
  return rows.map((row) => ({
    date: parseAmazonDate(row.Date),
    platform: 'amazon',
    orderedProductSales: parseINR(row['Ordered Product Sales']),
    orderedProductSalesB2B: parseINR(row['Ordered Product Sales - B2B']),
    unitsOrdered: parseCount(row['Units Ordered']),
    unitsOrderedB2B: parseCount(row['Units Ordered - B2B']),
    totalOrderItems: parseCount(row['Total Order Items']),
    totalOrderItemsB2B: parseCount(row['Total Order Items - B2B']),
    pageViews: parseCount(row['Page Views - Total']),
    pageViewsB2B: parseCount(row['Page Views - Total - B2B']),
    sessions: parseCount(row['Sessions - Total']),
    sessionsB2B: parseCount(row['Sessions - Total - B2B']),
    featuredOfferPercentage: parsePercentage(row['Featured Offer Percentage']),
    featuredOfferPercentageB2B: parsePercentage(row['Featured Offer Percentage - B2B']),
    unitSessionPercentage: parsePercentage(row['Unit Session Percentage']),
    unitSessionPercentageB2B: parsePercentage(row['Unit Session Percentage - B2B']),
    averageOfferCount: parseCount(row['Average Offer Count']),
    averageParentItems: parseCount(row['Average Parent Items'])
  }));
}
