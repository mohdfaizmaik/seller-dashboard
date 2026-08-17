/**
 * Phase 4B — marketplace performance page integration validation.
 *
 * Runtime assertions for filter/date-range consumption of normalized
 * Amazon Business Report + Flipkart Sales Report data.
 * Does not touch financial analytics.
 */

import type { MarketplaceDailyMetric } from '../../models/marketplaceReport';
import type { PlatformFilter, DatePresetFilter } from '../../hooks/useFilters';
import { AMAZON_BR_SAMPLE_EXPECTED } from './amazon/amazonBusinessReportValidation';
import { FLIPKART_SR_SAMPLE_DAY_EXPECTED } from './flipkart/flipkartSalesReportValidation';
import { MARKETPLACE_ORDER_ITEMS_LABEL } from './marketplacePerformanceLabels';

export interface MarketplacePerformanceIntegrationDeps {
  getMarketplaceDailyMetrics: (
    platform: PlatformFilter,
    startDate?: string,
    endDate?: string
  ) => MarketplaceDailyMetric[];
  resolveMarketplaceDateRange: (
    preset: DatePresetFilter,
    customStart?: string,
    customEnd?: string
  ) => { startDate: string; endDate: string };
}

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

function sumNonNull(
  rows: MarketplaceDailyMetric[],
  key: keyof MarketplaceDailyMetric
): number | null {
  let total = 0;
  let hasValue = false;
  for (const row of rows) {
    const value = row[key];
    if (typeof value === 'number') {
      total += value;
      hasValue = true;
    }
  }
  return hasValue ? total : null;
}

/**
 * Validates Phase 4B filter integration against real normalized marketplace data.
 * Dependencies are injected to avoid circular imports with marketplaceReportService.
 */
export function validateMarketplacePerformanceIntegration(
  deps: MarketplacePerformanceIntegrationDeps
): void {
  const { getMarketplaceDailyMetrics, resolveMarketplaceDateRange } = deps;
  const errors: string[] = [];

  // Order Items vs Orders semantics
  if ((MARKETPLACE_ORDER_ITEMS_LABEL as string) === 'Orders') {
    errors.push('Order Items label must not be "Orders" (totalOrderItems ≠ distinct orders)');
  }
  assertEqual(
    'orderItemsLabel',
    MARKETPLACE_ORDER_ITEMS_LABEL,
    'Order Items',
    errors
  );

  // Amazon July sample (known Business Report day)
  const amazonJuly = getMarketplaceDailyMetrics('amazon', '2026-07-01', '2026-07-01');
  assertEqual('amazonJuly.count', amazonJuly.length, 1, errors);
  if (amazonJuly[0]) {
    assertEqual(
      'amazonJuly.orderedProductSales',
      amazonJuly[0].orderedProductSales,
      AMAZON_BR_SAMPLE_EXPECTED.orderedProductSales,
      errors
    );
    assertEqual(
      'amazonJuly.sessions',
      amazonJuly[0].sessions,
      AMAZON_BR_SAMPLE_EXPECTED.sessions,
      errors
    );
    assertEqual(
      'amazonJuly.pageViews',
      amazonJuly[0].pageViews,
      AMAZON_BR_SAMPLE_EXPECTED.pageViews,
      errors
    );
  }

  // Flipkart July sample (known Sales Report day)
  const flipkartJuly = getMarketplaceDailyMetrics('flipkart', '2026-07-07', '2026-07-07');
  assertEqual('flipkartJuly.count', flipkartJuly.length, 1, errors);
  if (flipkartJuly[0]) {
    assertEqual(
      'flipkartJuly.orderedProductSales',
      flipkartJuly[0].orderedProductSales,
      FLIPKART_SR_SAMPLE_DAY_EXPECTED.orderedProductSales,
      errors
    );
    assertEqual(
      'flipkartJuly.unitsOrdered',
      flipkartJuly[0].unitsOrdered,
      FLIPKART_SR_SAMPLE_DAY_EXPECTED.unitsOrdered,
      errors
    );
    assertEqual(
      'flipkartJuly.totalOrderItems',
      flipkartJuly[0].totalOrderItems,
      FLIPKART_SR_SAMPLE_DAY_EXPECTED.totalOrderItems,
      errors
    );
  }

  // Null Flipkart traffic metrics
  const flipkartAll = getMarketplaceDailyMetrics('flipkart');
  for (const row of flipkartAll) {
    if (row.sessions !== null || row.pageViews !== null) {
      errors.push(
        `flipkart traffic must remain null (${row.date}: sessions=${String(row.sessions)}, pageViews=${String(row.pageViews)})`
      );
      break;
    }
  }
  assertEqual(
    'flipkart.sessionsSum',
    sumNonNull(flipkartAll, 'sessions'),
    null,
    errors
  );
  assertEqual(
    'flipkart.pageViewsSum',
    sumNonNull(flipkartAll, 'pageViews'),
    null,
    errors
  );

  // Combined Amazon + Flipkart custom July range
  const combinedRange = resolveMarketplaceDateRange('custom', '2026-07-01', '2026-07-31');
  assertEqual('combined.start', combinedRange.startDate, '2026-07-01', errors);
  assertEqual('combined.end', combinedRange.endDate, '2026-07-31', errors);
  const combined = getMarketplaceDailyMetrics(
    'all',
    combinedRange.startDate,
    combinedRange.endDate
  );
  const combinedAmazon = combined.filter((r) => r.platform === 'amazon');
  const combinedFlipkart = combined.filter((r) => r.platform === 'flipkart');
  assertEqual('combined.amazonDays', combinedAmazon.length, 3, errors);
  if (combinedFlipkart.length === 0) {
    errors.push('combined.flipkartDays: expected Flipkart Sale days in July, got 0');
  }
  if (combined.length !== combinedAmazon.length + combinedFlipkart.length) {
    errors.push('combined: unexpected platform mix');
  }

  // Platform filter
  const amazonOnly = getMarketplaceDailyMetrics(
    'amazon',
    combinedRange.startDate,
    combinedRange.endDate
  );
  const flipkartOnly = getMarketplaceDailyMetrics(
    'flipkart',
    combinedRange.startDate,
    combinedRange.endDate
  );
  if (amazonOnly.some((r) => r.platform !== 'amazon')) {
    errors.push('platformFilter.amazon leaked non-Amazon rows');
  }
  if (flipkartOnly.some((r) => r.platform !== 'flipkart')) {
    errors.push('platformFilter.flipkart leaked non-Flipkart rows');
  }
  assertEqual('platformFilter.amazon.count', amazonOnly.length, combinedAmazon.length, errors);
  assertEqual(
    'platformFilter.flipkart.count',
    flipkartOnly.length,
    combinedFlipkart.length,
    errors
  );

  // Custom date range (both platforms on 2026-07-02)
  const customDay = resolveMarketplaceDateRange('custom', '2026-07-02', '2026-07-02');
  const customRows = getMarketplaceDailyMetrics('all', customDay.startDate, customDay.endDate);
  assertEqual('customDay.count', customRows.length, 2, errors);
  assertEqual(
    'customDay.platforms',
    [...new Set(customRows.map((r) => r.platform))].sort().join(','),
    'amazon,flipkart',
    errors
  );

  // 30d preset — shared getDateRangeFromPreset semantics (anchor 2026-08-10 → 2026-07-12..2026-08-10)
  const range30d = resolveMarketplaceDateRange('30d');
  assertEqual('30d.start', range30d.startDate, '2026-07-12', errors);
  assertEqual('30d.end', range30d.endDate, '2026-08-10', errors);
  const rows30d = getMarketplaceDailyMetrics('all', range30d.startDate, range30d.endDate);
  if (rows30d.some((r) => r.date < '2026-07-12' || r.date > '2026-08-10')) {
    errors.push('30d: row outside resolved range');
  }
  // Amazon July 1–3 sample falls outside 30d window
  if (rows30d.some((r) => r.platform === 'amazon')) {
    errors.push('30d: Amazon Jul 1–3 sample must be excluded from 30d window');
  }
  if (!rows30d.some((r) => r.platform === 'flipkart')) {
    errors.push('30d: expected Flipkart Sale days on/after 2026-07-12');
  }

  // YTD preset — includes Amazon sample + Flipkart Sale corpus
  const rangeYtd = resolveMarketplaceDateRange('ytd');
  assertEqual('ytd.start', rangeYtd.startDate, '2026-01-01', errors);
  assertEqual('ytd.end', rangeYtd.endDate, '2026-08-10', errors);
  const rowsYtd = getMarketplaceDailyMetrics('all', rangeYtd.startDate, rangeYtd.endDate);
  assertEqual(
    'ytd.amazonDays',
    rowsYtd.filter((r) => r.platform === 'amazon').length,
    3,
    errors
  );
  assertEqual(
    'ytd.flipkartDays',
    rowsYtd.filter((r) => r.platform === 'flipkart').length,
    flipkartAll.length,
    errors
  );

  // KPI aggregation null semantics: sessions sum ignores Flipkart nulls (does not become 0 from them)
  const ytdSessions = sumNonNull(rowsYtd, 'sessions');
  const amazonSessions = sumNonNull(
    rowsYtd.filter((r) => r.platform === 'amazon'),
    'sessions'
  );
  assertEqual('ytd.sessionsEqualsAmazonOnly', ytdSessions, amazonSessions, errors);
  if (ytdSessions === null || ytdSessions === 0) {
    errors.push('ytd.sessions: expected positive Amazon session sum, not null/0 from Flipkart gaps');
  }

  // Empty period → no rows (page shows empty state; no fabricated zeros)
  const emptyRange = resolveMarketplaceDateRange('custom', '2026-08-01', '2026-08-10');
  const emptyRows = getMarketplaceDailyMetrics('all', emptyRange.startDate, emptyRange.endDate);
  assertEqual('emptyPeriod.count', emptyRows.length, 0, errors);

  if (errors.length > 0) {
    throw new Error(
      `Marketplace performance integration mismatch:\n- ${errors.join('\n- ')}`
    );
  }
}
