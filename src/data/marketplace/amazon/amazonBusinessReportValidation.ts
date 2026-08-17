/**
 * Phase 4A.1 — focused Amazon Business Report normalization validation.
 *
 * No external test framework: runtime assertions against the known sample row.
 * Service-level date filtering is validated from marketplaceReportService.
 */

import type { AmazonRawDailyReport, MarketplaceDailyMetric } from '../../../models/marketplaceReport';
import { MOCK_AMAZON_RAW_DAILY_REPORTS } from './rawDailyReports';
import { normalizeAmazonReport } from './normalizeAmazonReport';

/** Canonical sample row from the provided Amazon Business Report. */
export const AMAZON_BR_SAMPLE_RAW: AmazonRawDailyReport = MOCK_AMAZON_RAW_DAILY_REPORTS[0];

/** Expected normalized shape for AMAZON_BR_SAMPLE_RAW. */
export const AMAZON_BR_SAMPLE_EXPECTED: MarketplaceDailyMetric = {
  date: '2026-07-01',
  platform: 'amazon',
  orderedProductSales: 108218.36,
  orderedProductSalesB2B: 897.6,
  unitsOrdered: 169,
  unitsOrderedB2B: 2,
  totalOrderItems: 169,
  totalOrderItemsB2B: 2,
  pageViews: 20200,
  pageViewsB2B: 318,
  sessions: 15147,
  sessionsB2B: 226,
  featuredOfferPercentage: 99.89,
  featuredOfferPercentageB2B: 100,
  unitSessionPercentage: 1.12,
  unitSessionPercentageB2B: 0.88,
  averageOfferCount: 49,
  averageParentItems: 23
};

function assertEqual(
  field: string,
  actual: unknown,
  expected: unknown,
  errors: string[]
): void {
  if (actual !== expected) {
    if (
      typeof actual === 'number' &&
      typeof expected === 'number' &&
      Number.isFinite(actual) &&
      Number.isFinite(expected) &&
      Math.abs(actual - expected) < 1e-9
    ) {
      return;
    }
    errors.push(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Validates Amazon column → MarketplaceDailyMetric normalization for the sample row.
 * Also checks that blank currency/percentage inputs become null (not 0).
 */
export function validateAmazonBusinessReportNormalization(): MarketplaceDailyMetric {
  const [normalized] = normalizeAmazonReport([AMAZON_BR_SAMPLE_RAW]);
  if (!normalized) {
    throw new Error('Amazon Business Report validation failed: no normalized row produced');
  }

  const errors: string[] = [];
  const expected = AMAZON_BR_SAMPLE_EXPECTED;

  (Object.keys(expected) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
    assertEqual(key, normalized[key], expected[key], errors);
  });

  // Missing / blank must stay null — never silently become 0
  const [blankRow] = normalizeAmazonReport([
    {
      ...AMAZON_BR_SAMPLE_RAW,
      'Ordered Product Sales': '',
      'Featured Offer Percentage': '   '
    }
  ]);
  if (blankRow.orderedProductSales !== null) {
    errors.push(
      `orderedProductSales blank should be null, got ${JSON.stringify(blankRow.orderedProductSales)}`
    );
  }
  if (blankRow.featuredOfferPercentage !== null) {
    errors.push(
      `featuredOfferPercentage blank should be null, got ${JSON.stringify(blankRow.featuredOfferPercentage)}`
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Amazon Business Report normalization mismatch:\n- ${errors.join('\n- ')}`
    );
  }

  return normalized;
}
