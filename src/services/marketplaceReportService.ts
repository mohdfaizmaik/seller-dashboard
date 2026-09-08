/**
 * Marketplace report service — retrieves normalized daily marketplace metrics.
 *
 * Platform-specific report loading is delegated to marketplace adapters
 * (src/integrations/marketplaces). This service filters the normalized corpus
 * for dashboard consumers.
 *
 * Current adapters are local-report backed (Amazon Business Report /
 * Flipkart Sales Report). No live marketplace APIs. No credentials.
 *
 * Do NOT mix these traffic/listing metrics into financial profit calculations.
 */

import {
  AMAZON_BR_SAMPLE_EXPECTED,
  validateAmazonBusinessReportNormalization
} from '../data/marketplace/amazon/amazonBusinessReportValidation';
import {
  FLIPKART_SR_SAMPLE_DAY_EXPECTED,
  validateFlipkartSalesReportNormalization
} from '../data/marketplace/flipkart/flipkartSalesReportValidation';
import { validateMarketplacePerformanceIntegration } from '../data/marketplace/marketplacePerformanceIntegrationValidation';
import { validateMarketplaceAdapterFoundation } from '../data/marketplace/marketplaceAdapterValidation';
import {
  ACTIVE_LOCAL_REPORT_PLATFORMS,
  getMarketplaceAdapter
} from '../integrations/marketplaces/marketplaceRegistry';
import { isLocalReportMarketplaceAdapter } from '../integrations/marketplaces/types';
import type { MarketplaceDailyMetric, MarketplacePlatform } from '../models/marketplaceReport';
import type { PlatformFilter, DatePresetFilter } from '../hooks/useFilters';
import { getDateRangeFromPreset } from './analyticsService';
import { getAmazonPerformance } from './marketplaceApiService';
import { getImportedMetrics } from './marketplaceImportService';

/**
 * Builds the full normalized corpus from active local-report adapters (once).
 * Meesho is registered but not implemented and is excluded from this corpus.
 */
function loadNormalizedMetrics(): MarketplaceDailyMetric[] {
  const rows: MarketplaceDailyMetric[] = [];
  for (const platform of ACTIVE_LOCAL_REPORT_PLATFORMS) {
    const adapter = getMarketplaceAdapter(platform);
    if (!isLocalReportMarketplaceAdapter(adapter)) {
      throw new Error(
        `Expected local_report adapter for ${platform}, got a non-local adapter`
      );
    }
    rows.push(...adapter.getAllPerformanceDataSync());
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

const NORMALIZED_MARKETPLACE_METRICS = loadNormalizedMetrics();

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolves marketplace filter dates using the shared dashboard preset helper.
 * Reuses getDateRangeFromPreset without modifying financial calculation logic.
 *
 * Note: Amazon sample rows are dated 2026-07-01..03; Flipkart Sales Report
 * Sale days span 2026-06-29..2026-07-31. The default financial preset `30d`
 * (relative to 2026-08-10) starts on 2026-07-12 and may exclude earlier rows
 * — callers that apply this helper must use a range that covers the report
 * dates (e.g. custom or ytd).
 */
export function resolveMarketplaceDateRange(
  preset: DatePresetFilter,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const { start, end } = getDateRangeFromPreset(preset, customStart, customEnd);
  return {
    startDate: toYmd(start),
    endDate: toYmd(end)
  };
}

/**
 * Returns normalized marketplace daily metrics filtered by platform and date range.
 *
 * @param platform - 'all' | 'amazon' | 'flipkart'
 * @param startDate - inclusive YYYY-MM-DD (optional)
 * @param endDate - inclusive YYYY-MM-DD (optional)
 */
export function getMarketplaceDailyMetrics(
  platform: PlatformFilter,
  startDate?: string,
  endDate?: string
): MarketplaceDailyMetric[] {
  const imported = getImportedMetrics();

  const wantAmazon = platform === 'all' || platform === 'amazon';
  const wantFlipkart = platform === 'all' || platform === 'flipkart';

  let amazonMetrics: MarketplaceDailyMetric[] = [];
  if (wantAmazon) {
    const importedAmazon = imported.filter(
      (m) => m.platform === 'amazon' &&
      (!startDate || m.date >= startDate) &&
      (!endDate || m.date <= endDate)
    );
    if (importedAmazon.length > 0) {
      amazonMetrics = importedAmazon;
    } else {
      amazonMetrics = NORMALIZED_MARKETPLACE_METRICS.filter(
        (m) => m.platform === 'amazon' &&
        (!startDate || m.date >= startDate) &&
        (!endDate || m.date <= endDate)
      );
    }
  }

  let flipkartMetrics: MarketplaceDailyMetric[] = [];
  if (wantFlipkart) {
    const importedFlipkart = imported.filter(
      (m) => m.platform === 'flipkart' &&
      (!startDate || m.date >= startDate) &&
      (!endDate || m.date <= endDate)
    );
    if (importedFlipkart.length > 0) {
      flipkartMetrics = importedFlipkart;
    } else {
      flipkartMetrics = NORMALIZED_MARKETPLACE_METRICS.filter(
        (m) => m.platform === 'flipkart' &&
        (!startDate || m.date >= startDate) &&
        (!endDate || m.date <= endDate)
      );
    }
  }

  return [...amazonMetrics, ...flipkartMetrics].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Developer helper: sample of normalized rows proving Amazon and Flipkart
 * adapters both produce MarketplaceDailyMetric.
 * Not used by the Overview UI.
 */
export function getMarketplaceNormalizationDemo(): {
  amazonSample: MarketplaceDailyMetric | undefined;
  flipkartSample: MarketplaceDailyMetric | undefined;
  platforms: MarketplacePlatform[];
} {
  const amazonSample = NORMALIZED_MARKETPLACE_METRICS.find((m) => m.platform === 'amazon');
  const flipkartSample = NORMALIZED_MARKETPLACE_METRICS.find((m) => m.platform === 'flipkart');
  return {
    amazonSample,
    flipkartSample,
    platforms: ['amazon', 'flipkart']
  };
}

/**
 * Phase 5D — async backend-enabled data fetcher for MarketplacePerformance.
 *
 * Source strategy:
 *   Amazon  → backend (preferred) → local adapter (fallback)
 *   Flipkart → local adapter only
 *   Meesho  → not implemented
 *
 * Does NOT replace getMarketplaceDailyMetrics which remains the synchronous
 * local-only function used by validation, Overview, and other consumers.
 *
 * Never returns duplicate Amazon data (backend + local).
 */
/**
 * Phase 5D — async backend-enabled data fetcher for MarketplacePerformance.
 *
 * Source strategy:
 *   Amazon  → imported (if active imported report exists) → backend (preferred) → local adapter (fallback)
 *   Flipkart → imported (if active imported report exists) → local adapter only
 *   Meesho  → not implemented
 *
 * Does NOT replace getMarketplaceDailyMetrics which remains the synchronous
 * local-only function used by validation, Overview, and other consumers.
 *
 * Never returns duplicate Amazon data (backend + local).
 */
export async function getMarketplacePerformanceData(
  platform: PlatformFilter,
  startDate: string,
  endDate: string
): Promise<{
  metrics: MarketplaceDailyMetric[];
  amazonSource: 'backend' | 'local' | 'imported';
}> {
  const wantAmazon = platform === 'all' || platform === 'amazon';
  const wantFlipkart = platform === 'all' || platform === 'flipkart';

  const imported = getImportedMetrics();

  let amazonMetrics: MarketplaceDailyMetric[] = [];
  let amazonSource: 'backend' | 'local' | 'imported' = 'local';

  if (wantAmazon) {
    const importedAmazon = imported.filter(
      (m) => m.platform === 'amazon' && m.date >= startDate && m.date <= endDate
    );
    if (importedAmazon.length > 0) {
      amazonMetrics = importedAmazon;
      amazonSource = 'imported';
    } else {
      const result = await getAmazonPerformance(startDate, endDate);
      if (result.ok) {
        // Backend succeeded (may be empty []) — use backend data exclusively
        amazonMetrics = result.data;
        amazonSource = 'backend';
      } else {
        // Backend failed — fall back to existing local adapter
        amazonMetrics = getMarketplaceDailyMetrics('amazon', startDate, endDate);
        amazonSource = 'local';
      }
    }
  }

  // Flipkart: imported (if active imported report exists) -> local adapter only
  let flipkartMetrics: MarketplaceDailyMetric[] = [];
  if (wantFlipkart) {
    flipkartMetrics = getMarketplaceDailyMetrics('flipkart', startDate, endDate);
  }

  const metrics = [...amazonMetrics, ...flipkartMetrics].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  return { metrics, amazonSource };
}

/**
 * Phase 4A.1 — validates Amazon sample normalization + service date filtering.
 * Throws on mismatch so regressions fail loudly.
 */
export function runAmazonBusinessReportValidation(): MarketplaceDailyMetric {
  const normalized = validateAmazonBusinessReportNormalization();

  const allAmazon = getMarketplaceDailyMetrics('amazon');
  const sample = allAmazon.find((row) => row.date === '2026-07-01');
  if (!sample) {
    throw new Error(
      'marketplaceReportService did not return Amazon sample row for 2026-07-01'
    );
  }

  const errors: string[] = [];
  (Object.keys(AMAZON_BR_SAMPLE_EXPECTED) as (keyof MarketplaceDailyMetric)[]).forEach((key) => {
    if (sample[key] !== AMAZON_BR_SAMPLE_EXPECTED[key]) {
      const actual = sample[key];
      const expected = AMAZON_BR_SAMPLE_EXPECTED[key];
      if (
        typeof actual === 'number' &&
        typeof expected === 'number' &&
        Math.abs(actual - expected) < 1e-9
      ) {
        return;
      }
      errors.push(
        `service.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  });
  if (errors.length > 0) {
    throw new Error(
      `marketplaceReportService Amazon sample mismatch:\n- ${errors.join('\n- ')}`
    );
  }

  const inRange = getMarketplaceDailyMetrics('amazon', '2026-07-01', '2026-07-01');
  if (inRange.length !== 1 || inRange[0].date !== '2026-07-01') {
    throw new Error(
      `Date filter inclusive single-day failed: expected 1 row on 2026-07-01, got ${inRange.length}`
    );
  }

  const outOfRange = getMarketplaceDailyMetrics('amazon', '2026-08-01', '2026-08-10');
  if (outOfRange.length !== 0) {
    throw new Error(
      `Date filter exclude failed: expected 0 Amazon rows in Aug 2026 window, got ${outOfRange.length}`
    );
  }

  const multiDay = getMarketplaceDailyMetrics('amazon', '2026-07-01', '2026-07-03');
  if (multiDay.length !== 3) {
    throw new Error(
      `Date filter multi-day failed: expected 3 Amazon rows for Jul 1–3, got ${multiDay.length}`
    );
  }

  return normalized;
}

/**
 * Phase 4A.2 — validates Flipkart Sales Report sample normalization +
 * service date filtering. Throws on mismatch so regressions fail loudly.
 */
export function runFlipkartSalesReportValidation(): MarketplaceDailyMetric {
  const normalized = validateFlipkartSalesReportNormalization();

  const allFlipkart = getMarketplaceDailyMetrics('flipkart');
  const sample = allFlipkart.find((row) => row.date === '2026-07-07');
  if (!sample) {
    throw new Error(
      'marketplaceReportService did not return Flipkart sample row for 2026-07-07'
    );
  }

  const errors: string[] = [];
  (Object.keys(FLIPKART_SR_SAMPLE_DAY_EXPECTED) as (keyof MarketplaceDailyMetric)[]).forEach(
    (key) => {
      if (sample[key] !== FLIPKART_SR_SAMPLE_DAY_EXPECTED[key]) {
        const actual = sample[key];
        const expected = FLIPKART_SR_SAMPLE_DAY_EXPECTED[key];
        if (
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          Math.abs(actual - expected) < 1e-9
        ) {
          return;
        }
        errors.push(
          `service.${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
        );
      }
    }
  );
  if (errors.length > 0) {
    throw new Error(
      `marketplaceReportService Flipkart sample mismatch:\n- ${errors.join('\n- ')}`
    );
  }

  const inRange = getMarketplaceDailyMetrics('flipkart', '2026-07-07', '2026-07-07');
  if (inRange.length !== 1 || inRange[0].date !== '2026-07-07') {
    throw new Error(
      `Date filter inclusive single-day failed: expected 1 Flipkart row on 2026-07-07, got ${inRange.length}`
    );
  }

  const outOfRange = getMarketplaceDailyMetrics('flipkart', '2026-08-01', '2026-08-10');
  if (outOfRange.length !== 0) {
    throw new Error(
      `Date filter exclude failed: expected 0 Flipkart rows in Aug 2026 window, got ${outOfRange.length}`
    );
  }

  // Mixed Sale+Return day must expose Sale-only totals via the service
  const mixed = getMarketplaceDailyMetrics('flipkart', '2026-06-29', '2026-06-29');
  if (
    mixed.length !== 1 ||
    mixed[0].orderedProductSales !== 169 ||
    mixed[0].totalOrderItems !== 1
  ) {
    throw new Error(
      `Flipkart mixed-day filter failed: expected Sale-only 169 / 1 item on 2026-06-29, got ${JSON.stringify(mixed[0] ?? null)}`
    );
  }

  return normalized;
}

// Fail fast if Amazon / Flipkart report ingestion, page integration,
// or marketplace adapter foundation regresses.
runAmazonBusinessReportValidation();
runFlipkartSalesReportValidation();
validateMarketplacePerformanceIntegration({
  getMarketplaceDailyMetrics,
  resolveMarketplaceDateRange
});
await validateMarketplaceAdapterFoundation({
  getMarketplaceDailyMetrics
});
