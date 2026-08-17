/**
 * Phase 4A.2 — focused Flipkart Sales Report normalization validation.
 *
 * No external test framework: runtime assertions against known uploaded rows.
 */

import type {
  FlipkartRawSalesReportRow,
  MarketplaceDailyMetric
} from '../../../models/marketplaceReport';
import { FLIPKART_CASH_BACK_REPORT_ROWS } from './cashBackReport';
import { FLIPKART_RAW_SALES_REPORT_ROWS } from './rawSalesReports';
import {
  isFlipkartSaleEvent,
  normalizeFlipkartReport,
  parseFlipkartOrderDate
} from './normalizeFlipkartReport';

const FINAL_INVOICE_AMOUNT =
  'Final Invoice Amount (Price after discount+Shipping Charges)' as const;

const flipkartSampleRaw = FLIPKART_RAW_SALES_REPORT_ROWS.find(
  (row) => row['Order Item ID'] === '338029153437394102'
);

if (!flipkartSampleRaw) {
  throw new Error(
    'Flipkart Sales Report validation fixture missing: Order Item ID 338029153437394102'
  );
}

/** Known Sale row from the uploaded Sales Report (Order Item ID 338029153437394102). */
export const FLIPKART_SR_SAMPLE_RAW: FlipkartRawSalesReportRow = flipkartSampleRaw;

/** Expected daily aggregate for 2026-07-07 (Sale events only). */
export const FLIPKART_SR_SAMPLE_DAY_EXPECTED: MarketplaceDailyMetric = {
  date: '2026-07-07',
  platform: 'flipkart',
  orderedProductSales: 1326,
  orderedProductSalesB2B: null,
  unitsOrdered: 6,
  unitsOrderedB2B: null,
  totalOrderItems: 6,
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
};

/** Mixed day: one Sale + one Return — only Sale must contribute. */
export const FLIPKART_SR_MIXED_DAY_EXPECTED: MarketplaceDailyMetric = {
  date: '2026-06-29',
  platform: 'flipkart',
  orderedProductSales: 169,
  orderedProductSalesB2B: null,
  unitsOrdered: 1,
  unitsOrderedB2B: null,
  totalOrderItems: 1,
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

function assertMetricRow(
  label: string,
  actual: MarketplaceDailyMetric | undefined,
  expected: MarketplaceDailyMetric,
  errors: string[]
): void {
  if (!actual) {
    errors.push(`${label}: missing normalized row for ${expected.date}`);
    return;
  }
  (Object.keys(expected) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
    assertEqual(`${label}.${key}`, actual[key], expected[key], errors);
  });
}

/**
 * Validates Flipkart Sales Report → MarketplaceDailyMetric normalization.
 */
export function validateFlipkartSalesReportNormalization(): MarketplaceDailyMetric {
  const errors: string[] = [];

  // Known Sale row field checks
  assertEqual(
    'sample.Event Type',
    FLIPKART_SR_SAMPLE_RAW['Event Type'],
    'Sale',
    errors
  );
  assertEqual(
    'sample.Event Sub Type',
    FLIPKART_SR_SAMPLE_RAW['Event Sub Type'],
    'Sale',
    errors
  );
  assertEqual(
    'sample.Order Date normalized',
    parseFlipkartOrderDate(FLIPKART_SR_SAMPLE_RAW['Order Date']),
    '2026-07-07',
    errors
  );
  assertEqual(
    'sample.Item Quantity',
    FLIPKART_SR_SAMPLE_RAW['Item Quantity'],
    1,
    errors
  );
  assertEqual(
    'sample.Final Invoice Amount',
    FLIPKART_SR_SAMPLE_RAW[FINAL_INVOICE_AMOUNT],
    468,
    errors
  );
  assertEqual(
    'sample.Order Item ID',
    FLIPKART_SR_SAMPLE_RAW['Order Item ID'],
    '338029153437394102',
    errors
  );
  if (typeof FLIPKART_SR_SAMPLE_RAW['Order Item ID'] !== 'string') {
    errors.push('sample.Order Item ID must remain a string (JS safe-integer limit)');
  }

  const normalized = normalizeFlipkartReport(FLIPKART_RAW_SALES_REPORT_ROWS);
  const day20270707 = normalized.find((row) => row.date === '2026-07-07');
  assertMetricRow('2026-07-07', day20270707, FLIPKART_SR_SAMPLE_DAY_EXPECTED, errors);

  const day20260629 = normalized.find((row) => row.date === '2026-06-29');
  assertMetricRow('2026-06-29', day20260629, FLIPKART_SR_MIXED_DAY_EXPECTED, errors);

  // Return-only day (Return Cancellation, no Sale) must not appear
  if (normalized.some((row) => row.date === '2026-06-23')) {
    errors.push(
      '2026-06-23: return-only day must not produce MarketplaceDailyMetric sales row'
    );
  }

  // Cancellation / Return must not be treated as Sale
  const cancellation = FLIPKART_RAW_SALES_REPORT_ROWS.find(
    (row) =>
      row['Event Type'] === 'Return' && row['Event Sub Type'] === 'Cancellation'
  );
  const plainReturn = FLIPKART_RAW_SALES_REPORT_ROWS.find(
    (row) => row['Event Type'] === 'Return' && row['Event Sub Type'] === 'Return'
  );
  if (!cancellation || !plainReturn) {
    errors.push('missing Cancellation or Return fixture rows in Sales Report corpus');
  } else {
    if (isFlipkartSaleEvent(cancellation) || isFlipkartSaleEvent(plainReturn)) {
      errors.push('Return/Cancellation rows incorrectly classified as Sale events');
    }

    const isolated = normalizeFlipkartReport([
      cancellation,
      plainReturn,
      {
        ...cancellation,
        'Event Type': 'Return',
        'Event Sub Type': 'Return Cancellation',
        'Order Date': '2026-08-01 00:00:00',
        [FINAL_INVOICE_AMOUNT]: 999,
        'Item Quantity': 5
      }
    ]);
    if (isolated.length !== 0) {
      errors.push(
        `non-Sale-only input must yield 0 daily rows, got ${isolated.length}`
      );
    }
  }

  // Day with Sale + Cancellation + Return: ignore non-Sale invoice amounts
  const day20270704 = normalized.find((row) => row.date === '2026-07-04');
  assertEqual('2026-07-04.orderedProductSales', day20270704?.orderedProductSales, 2075, errors);
  assertEqual('2026-07-04.unitsOrdered', day20270704?.unitsOrdered, 11, errors);
  assertEqual('2026-07-04.totalOrderItems', day20270704?.totalOrderItems, 11, errors);

  // Unsupported traffic / conversion metrics stay null
  const nullKeys: (keyof MarketplaceDailyMetric)[] = [
    'pageViews',
    'pageViewsB2B',
    'sessions',
    'sessionsB2B',
    'featuredOfferPercentage',
    'featuredOfferPercentageB2B',
    'unitSessionPercentage',
    'unitSessionPercentageB2B',
    'averageOfferCount',
    'averageParentItems',
    'orderedProductSalesB2B',
    'unitsOrderedB2B',
    'totalOrderItemsB2B'
  ];
  if (day20270707) {
    nullKeys.forEach((key) => {
      assertEqual(`unsupported.${key}`, day20270707[key], null, errors);
    });
  }

  // Date normalization variants
  assertEqual(
    'parseFlipkartOrderDate.dateOnly',
    parseFlipkartOrderDate('2026-07-07'),
    '2026-07-07',
    errors
  );
  assertEqual(
    'parseFlipkartOrderDate.dateTime',
    parseFlipkartOrderDate('2026-07-07 00:00:00'),
    '2026-07-07',
    errors
  );

  // Cash Back Report must remain outside MarketplaceDailyMetric ingestion
  if (FLIPKART_CASH_BACK_REPORT_ROWS.length !== 0) {
    errors.push(
      'Cash Back Report rows must not be ingested into MarketplaceDailyMetric yet'
    );
  }

  if (errors.length > 0) {
    throw new Error(
      `Flipkart Sales Report normalization mismatch:\n- ${errors.join('\n- ')}`
    );
  }

  return day20270707!;
}
