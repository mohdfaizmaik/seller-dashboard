/**
 * Phase 4E — marketplace adapter / registry validation.
 *
 * Runtime assertions only (no test framework). Injected deps avoid cycles
 * with marketplaceReportService.
 */

import type { MarketplaceDailyMetric } from '../../models/marketplaceReport';
import type { PlatformFilter } from '../../hooks/useFilters';
import {
  getMarketplaceAdapter,
  listRegisteredMarketplacePlatforms,
  ACTIVE_LOCAL_REPORT_PLATFORMS
} from '../../integrations/marketplaces/marketplaceRegistry';
import {
  isLocalReportMarketplaceAdapter,
  MarketplaceNotImplementedError
} from '../../integrations/marketplaces/types';
import { AMAZON_BR_SAMPLE_EXPECTED } from './amazon/amazonBusinessReportValidation';
import { FLIPKART_SR_SAMPLE_DAY_EXPECTED } from './flipkart/flipkartSalesReportValidation';

export interface MarketplaceAdapterValidationDeps {
  getMarketplaceDailyMetrics: (
    platform: PlatformFilter,
    startDate?: string,
    endDate?: string
  ) => MarketplaceDailyMetric[];
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

function assertMetricClose(
  label: string,
  actual: MarketplaceDailyMetric | undefined,
  expected: MarketplaceDailyMetric,
  errors: string[]
): void {
  if (!actual) {
    errors.push(`${label}: missing row`);
    return;
  }
  (Object.keys(expected) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
    assertEqual(`${label}.${key}`, actual[key], expected[key], errors);
  });
}

/**
 * Validates adapter registry behavior and parity with the existing service corpus.
 */
export async function validateMarketplaceAdapterFoundation(
  deps: MarketplaceAdapterValidationDeps
): Promise<void> {
  const errors: string[] = [];
  const { getMarketplaceDailyMetrics } = deps;

  // Registry resolves Amazon / Flipkart / Meesho
  const registered = listRegisteredMarketplacePlatforms().sort();
  assertEqual('registry.platforms', registered.join(','), 'amazon,flipkart,meesho', errors);

  const amazon = getMarketplaceAdapter('amazon');
  const flipkart = getMarketplaceAdapter('flipkart');
  const meesho = getMarketplaceAdapter('meesho');
  assertEqual('registry.amazon.platform', amazon.platform, 'amazon', errors);
  assertEqual('registry.flipkart.platform', flipkart.platform, 'flipkart', errors);
  assertEqual('registry.meesho.platform', meesho.platform, 'meesho', errors);

  if (!isLocalReportMarketplaceAdapter(amazon) || !isLocalReportMarketplaceAdapter(flipkart)) {
    errors.push('Amazon and Flipkart adapters must be local_report adapters');
  }

  // Amazon adapter returns normalized MarketplaceDailyMetric[]
  const amazonRows = await amazon.getPerformanceData();
  if (amazonRows.length === 0) {
    errors.push('amazonAdapter.getPerformanceData: expected rows');
  }
  if (amazonRows.some((r) => r.platform !== 'amazon')) {
    errors.push('amazonAdapter: leaked non-Amazon platform');
  }
  const amazonDay = amazonRows.find((r) => r.date === '2026-07-01');
  assertMetricClose('amazonAdapter.2026-07-01', amazonDay, AMAZON_BR_SAMPLE_EXPECTED, errors);

  // Flipkart adapter returns normalized MarketplaceDailyMetric[]
  const flipkartRows = await flipkart.getPerformanceData();
  if (flipkartRows.length === 0) {
    errors.push('flipkartAdapter.getPerformanceData: expected rows');
  }
  if (flipkartRows.some((r) => r.platform !== 'flipkart')) {
    errors.push('flipkartAdapter: leaked non-Flipkart platform');
  }
  const flipkartDay = flipkartRows.find((r) => r.date === '2026-07-07');
  assertMetricClose(
    'flipkartAdapter.2026-07-07',
    flipkartDay,
    FLIPKART_SR_SAMPLE_DAY_EXPECTED,
    errors
  );

  // Null Flipkart traffic unchanged via adapter
  if (
    flipkartDay &&
    (flipkartDay.sessions !== null ||
      flipkartDay.pageViews !== null ||
      flipkartDay.featuredOfferPercentage !== null)
  ) {
    errors.push('flipkartAdapter: traffic/conversion metrics must remain null');
  }

  // Date filtering on adapter
  const amazonFiltered = await amazon.getPerformanceData('2026-07-01', '2026-07-01');
  assertEqual('amazonAdapter.dateFilter.count', amazonFiltered.length, 1, errors);
  assertEqual('amazonAdapter.dateFilter.date', amazonFiltered[0]?.date, '2026-07-01', errors);

  // Meesho explicitly not implemented
  let meeshoThrew = false;
  try {
    await meesho.getPerformanceData();
  } catch (err) {
    meeshoThrew = true;
    if (!(err instanceof MarketplaceNotImplementedError)) {
      errors.push(
        `meeshoAdapter: expected MarketplaceNotImplementedError, got ${String((err as Error)?.name ?? err)}`
      );
    } else {
      assertEqual('meeshoAdapter.error.platform', err.platform, 'meesho', errors);
    }
  }
  if (!meeshoThrew) {
    errors.push('meeshoAdapter: getPerformanceData must throw (not implemented)');
  }

  // Active local platforms exclude meesho from dashboard corpus
  assertEqual(
    'activeLocal.platforms',
    ACTIVE_LOCAL_REPORT_PLATFORMS.join(','),
    'amazon,flipkart',
    errors
  );

  // Existing MarketplacePerformance service data remains unchanged vs adapters
  if (isLocalReportMarketplaceAdapter(amazon) && isLocalReportMarketplaceAdapter(flipkart)) {
    const serviceAmazon = getMarketplaceDailyMetrics('amazon');
    const serviceFlipkart = getMarketplaceDailyMetrics('flipkart');
    const syncAmazon = amazon.getAllPerformanceDataSync();
    const syncFlipkart = flipkart.getAllPerformanceDataSync();

    assertEqual('parity.amazon.count', serviceAmazon.length, syncAmazon.length, errors);
    assertEqual('parity.flipkart.count', serviceFlipkart.length, syncFlipkart.length, errors);

    for (let i = 0; i < serviceAmazon.length; i += 1) {
      const a = serviceAmazon[i];
      const b = syncAmazon[i];
      if (!a || !b) continue;
      (Object.keys(a) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
        assertEqual(`parity.amazon[${i}].${key}`, a[key], b[key], errors);
      });
    }
    for (let i = 0; i < serviceFlipkart.length; i += 1) {
      const a = serviceFlipkart[i];
      const b = syncFlipkart[i];
      if (!a || !b) continue;
      (Object.keys(a) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
        assertEqual(`parity.flipkart[${i}].${key}`, a[key], b[key], errors);
      });
    }
  }

  // Service date filtering still works (unchanged contract)
  const filteredService = getMarketplaceDailyMetrics('amazon', '2026-07-02', '2026-07-02');
  assertEqual('service.dateFilter.count', filteredService.length, 1, errors);
  assertEqual('service.dateFilter.date', filteredService[0]?.date, '2026-07-02', errors);

  if (errors.length > 0) {
    throw new Error(`Marketplace adapter foundation mismatch:\n- ${errors.join('\n- ')}`);
  }
}
