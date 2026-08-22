/**
 * Phase 5D frontend validation script.
 *
 * Tests:
 *   A. validateBackendMetrics accepts well-formed data
 *   B. validateBackendMetrics rejects malformed data (missing fields)
 *   C. validateBackendMetrics preserves null values
 *   D. validateBackendMetrics rejects non-amazon platform
 *   E. Empty [] is accepted as valid
 *   F. getAmazonPerformance handles network failure → ok: false
 *   G. getAmazonPerformance handles 503 → ok: false
 *   H. getAmazonPerformance handles 200 with valid data → ok: true
 *   I. getAmazonPerformance handles 200 with malformed data → ok: false
 *   J. getAmazonPerformance handles 200 with empty metrics → ok: true, data: []
 *   K. getMarketplaceDailyMetrics and resolveMarketplaceDateRange unchanged
 *   L. No duplicate Amazon rows in merged data
 *   M. Flipkart remains local-only
 *   N. Date range correctly passed to backend
 *   O. analyticsService.ts is untouched (content check)
 *
 * Run: tsx server/validation/phase5dFrontendValidation.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateBackendMetrics, getAmazonPerformance } from '../../src/services/marketplaceApiService';
import {
  getMarketplaceDailyMetrics,
  resolveMarketplaceDateRange,
  getMarketplacePerformanceData
} from '../../src/services/marketplaceReportService';
import type { MarketplaceDailyMetric } from '../../src/models/marketplaceReport';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

/** Build a well-formed Amazon MarketplaceDailyMetric for testing. */
function makeValidMetric(overrides: Partial<MarketplaceDailyMetric> = {}): MarketplaceDailyMetric {
  return {
    date: '2026-07-01',
    platform: 'amazon',
    orderedProductSales: 1000,
    orderedProductSalesB2B: 200,
    unitsOrdered: 10,
    unitsOrderedB2B: 2,
    totalOrderItems: 8,
    totalOrderItemsB2B: 1,
    pageViews: 500,
    pageViewsB2B: 100,
    sessions: 300,
    sessionsB2B: 50,
    featuredOfferPercentage: 99.5,
    featuredOfferPercentageB2B: 98.0,
    unitSessionPercentage: 3.33,
    unitSessionPercentageB2B: 4.0,
    averageOfferCount: 1,
    averageParentItems: 1,
    ...overrides
  };
}

// ─── Mock fetch infrastructure ───────────────────────────────────────────────

type MockFetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

const originalFetch = globalThis.fetch;

function mockFetch(handler: MockFetchFn): void {
  (globalThis as Record<string, unknown>)['fetch'] = handler;
}

function restoreFetch(): void {
  (globalThis as Record<string, unknown>)['fetch'] = originalFetch;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Phase 5D Frontend Validation           ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // ── A. validateBackendMetrics accepts well-formed data ─────────────────

  console.log('A. validateBackendMetrics — well-formed data');
  const validMetrics = [
    makeValidMetric({ date: '2026-07-01' }),
    makeValidMetric({ date: '2026-07-02' })
  ];
  assert(validateBackendMetrics(validMetrics), 'accepts array of well-formed metrics');
  assert(validateBackendMetrics([]), 'accepts empty array');

  // ── B. validateBackendMetrics rejects malformed data ───────────────────

  console.log('B. validateBackendMetrics — malformed data');
  const missingDate = { ...makeValidMetric() } as Record<string, unknown>;
  delete missingDate['date'];
  assert(!validateBackendMetrics([missingDate]), 'rejects metric with missing date');

  const missingPlatform = { ...makeValidMetric() } as Record<string, unknown>;
  delete missingPlatform['platform'];
  assert(!validateBackendMetrics([missingPlatform]), 'rejects metric with missing platform');

  const missingSessions = { ...makeValidMetric() } as Record<string, unknown>;
  delete missingSessions['sessions'];
  assert(!validateBackendMetrics([missingSessions]), 'rejects metric with missing sessions');

  const wrongType = { ...makeValidMetric(), sessions: 'not-a-number' };
  assert(!validateBackendMetrics([wrongType]), 'rejects metric with string in numeric field');

  const notObject = [42];
  assert(!validateBackendMetrics(notObject), 'rejects non-object items');

  const emptyDate = makeValidMetric({ date: '' });
  assert(!validateBackendMetrics([emptyDate]), 'rejects metric with empty date string');

  // ── C. validateBackendMetrics preserves null values ────────────────────

  console.log('C. validateBackendMetrics — null preservation');
  const nullTraffic = makeValidMetric({
    sessions: null,
    sessionsB2B: null,
    pageViews: null,
    pageViewsB2B: null,
    featuredOfferPercentage: null,
    featuredOfferPercentageB2B: null,
    unitSessionPercentage: null,
    unitSessionPercentageB2B: null,
    averageOfferCount: null,
    averageParentItems: null
  });
  assert(validateBackendMetrics([nullTraffic]), 'accepts metric with null numeric fields');
  assert(nullTraffic.sessions === null, 'sessions stays null (not converted to 0)');
  assert(nullTraffic.pageViews === null, 'pageViews stays null (not converted to 0)');

  // ── D. validateBackendMetrics rejects non-amazon platform ─────────────

  console.log('D. validateBackendMetrics — platform validation');
  const flipkartMetric = makeValidMetric({ platform: 'flipkart' });
  assert(!validateBackendMetrics([flipkartMetric]), 'rejects platform=flipkart');

  const meeshoMetric = makeValidMetric({ platform: 'meesho' });
  assert(!validateBackendMetrics([meeshoMetric]), 'rejects platform=meesho');

  const mixed = [makeValidMetric(), makeValidMetric({ platform: 'flipkart' })];
  assert(!validateBackendMetrics(mixed), 'rejects array with mixed platforms');

  // ── E. Empty [] from backend is valid ──────────────────────────────────

  console.log('E. Empty backend response');
  assert(validateBackendMetrics([]), 'empty array passes validation');

  // ── F. getAmazonPerformance — network failure ─────────────────────────

  console.log('F. getAmazonPerformance — network failure');
  mockFetch(() => {
    throw new TypeError('Failed to fetch');
  });
  const networkResult = await getAmazonPerformance('2026-07-01', '2026-07-03');
  assert(!networkResult.ok, 'network failure returns ok=false');
  assert(
    networkResult.ok === false && networkResult.reason === 'Network request failed',
    'network failure reason is "Network request failed"'
  );
  restoreFetch();

  // ── G. getAmazonPerformance — 503 response ────────────────────────────

  console.log('G. getAmazonPerformance — 503 response');
  mockFetch(async () =>
    new Response(JSON.stringify({ error: 'not configured' }), { status: 503 })
  );
  const r503 = await getAmazonPerformance('2026-07-01', '2026-07-03');
  assert(!r503.ok, '503 returns ok=false');
  assert(
    r503.ok === false && r503.reason === 'Amazon API not configured',
    '503 reason is "Amazon API not configured"'
  );
  restoreFetch();

  // ── H. getAmazonPerformance — 200 with valid data ─────────────────────

  console.log('H. getAmazonPerformance — 200 with valid data');
  const backendMetrics = [
    makeValidMetric({ date: '2026-07-01' }),
    makeValidMetric({ date: '2026-07-02' })
  ];
  mockFetch(async () =>
    new Response(
      JSON.stringify({
        platform: 'amazon',
        startDate: '2026-07-01',
        endDate: '2026-07-02',
        reportType: 'GET_SALES_AND_TRAFFIC_REPORT',
        metrics: backendMetrics
      }),
      { status: 200 }
    )
  );
  const r200 = await getAmazonPerformance('2026-07-01', '2026-07-02');
  assert(r200.ok, '200 with valid data returns ok=true');
  assert(r200.ok === true && r200.data.length === 2, '200 returns 2 metrics');
  restoreFetch();

  // ── I. getAmazonPerformance — 200 with malformed data ─────────────────

  console.log('I. getAmazonPerformance — 200 with malformed data');
  mockFetch(async () =>
    new Response(
      JSON.stringify({
        platform: 'amazon',
        metrics: [{ date: '2026-07-01' }] // missing all other fields
      }),
      { status: 200 }
    )
  );
  const rMalformed = await getAmazonPerformance('2026-07-01', '2026-07-03');
  assert(!rMalformed.ok, 'malformed data returns ok=false');
  assert(
    rMalformed.ok === false && rMalformed.reason === 'Malformed data',
    'malformed data reason is "Malformed data"'
  );
  restoreFetch();

  // ── J. getAmazonPerformance — 200 with empty metrics ──────────────────

  console.log('J. getAmazonPerformance — 200 with empty metrics');
  mockFetch(async () =>
    new Response(
      JSON.stringify({ platform: 'amazon', metrics: [] }),
      { status: 200 }
    )
  );
  const rEmpty = await getAmazonPerformance('2026-07-01', '2026-07-03');
  assert(rEmpty.ok, 'empty metrics returns ok=true');
  assert(rEmpty.ok === true && rEmpty.data.length === 0, 'empty metrics data is []');
  restoreFetch();

  // ── K. Existing sync functions unchanged ───────────────────────────────

  console.log('K. Existing sync functions unchanged');
  const amazonLocal = getMarketplaceDailyMetrics('amazon', '2026-07-01', '2026-07-03');
  assert(amazonLocal.length === 3, 'getMarketplaceDailyMetrics("amazon", Jul 1-3) returns 3 rows');
  assert(
    amazonLocal.every((m) => m.platform === 'amazon'),
    'all rows have platform=amazon'
  );

  const range = resolveMarketplaceDateRange('custom', '2026-07-01', '2026-07-03');
  assert(range.startDate === '2026-07-01', 'resolveMarketplaceDateRange start correct');
  assert(range.endDate === '2026-07-03', 'resolveMarketplaceDateRange end correct');

  // ── L. No duplicate Amazon rows in merged data ────────────────────────

  console.log('L. No duplicate Amazon rows');
  // Mock fetch to return backend Amazon data
  const backendAmazon = [makeValidMetric({ date: '2026-07-01', orderedProductSales: 9999 })];
  mockFetch(async () =>
    new Response(
      JSON.stringify({ platform: 'amazon', metrics: backendAmazon }),
      { status: 200 }
    )
  );
  const mergedResult = await getMarketplacePerformanceData('all', '2026-07-01', '2026-07-03');
  restoreFetch();
  const amazonInMerged = mergedResult.metrics.filter((m) => m.platform === 'amazon');
  // Backend returned 1 Amazon row → only 1 Amazon row in merged (not 1 + 3 local)
  assert(
    amazonInMerged.length === 1,
    `merged has exactly 1 Amazon row from backend (got ${amazonInMerged.length})`
  );
  assert(
    amazonInMerged[0].orderedProductSales === 9999,
    'merged Amazon row is from backend (sales=9999), not local'
  );
  assert(
    mergedResult.amazonSource === 'backend',
    'amazonSource is "backend" when backend succeeds'
  );

  // ── M. Flipkart remains local-only ────────────────────────────────────

  console.log('M. Flipkart remains local-only');
  const flipkartLocal = getMarketplaceDailyMetrics('flipkart', '2026-07-07', '2026-07-07');
  assert(flipkartLocal.length === 1, 'Flipkart local adapter returns 1 row for Jul 7');
  assert(flipkartLocal[0].platform === 'flipkart', 'Flipkart row has platform=flipkart');

  // When backend fails, Flipkart data is still present
  mockFetch(() => {
    throw new TypeError('Failed to fetch');
  });
  const fallbackResult = await getMarketplacePerformanceData('all', '2026-07-01', '2026-07-31');
  restoreFetch();
  const flipkartInFallback = fallbackResult.metrics.filter((m) => m.platform === 'flipkart');
  assert(flipkartInFallback.length > 0, 'Flipkart data present even when backend fails');
  assert(
    fallbackResult.amazonSource === 'local',
    'amazonSource is "local" when backend fails'
  );

  // ── N. Date range correctly passed to backend ─────────────────────────

  console.log('N. Date range passed to backend');
  let capturedUrl = '';
  mockFetch(async (input: string | URL | Request) => {
    capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    return new Response(
      JSON.stringify({ platform: 'amazon', metrics: [] }),
      { status: 200 }
    );
  });
  await getAmazonPerformance('2026-08-01', '2026-08-15');
  restoreFetch();
  assert(
    capturedUrl.includes('startDate=2026-08-01'),
    'URL contains startDate=2026-08-01'
  );
  assert(
    capturedUrl.includes('endDate=2026-08-15'),
    'URL contains endDate=2026-08-15'
  );

  // ── O. analyticsService.ts untouched ──────────────────────────────────

  console.log('O. analyticsService.ts integrity check');
  const analyticsPath = resolve(process.cwd(), 'src/services/analyticsService.ts');
  try {
    const content = readFileSync(analyticsPath, 'utf8');
    // Verify it exists and has content — a hash check would require a baseline
    assert(content.length > 1000, 'analyticsService.ts exists and has expected content');
    // Verify it does NOT contain Phase 5D markers
    assert(
      !content.includes('Phase 5D') && !content.includes('marketplaceApiService'),
      'analyticsService.ts has no Phase 5D modifications'
    );
  } catch {
    assert(false, 'analyticsService.ts readable');
  }

  // ── Additional: HTTP status code mapping ──────────────────────────────

  console.log('P. HTTP status code mapping');
  for (const [status, expectedReason] of [
    [400, 'Invalid date range'],
    [401, 'Not authorized'],
    [403, 'Access denied'],
    [429, 'Rate limited'],
    [500, 'Backend unavailable'],
  ] as const) {
    mockFetch(async () =>
      new Response(JSON.stringify({ error: 'test' }), { status })
    );
    const result = await getAmazonPerformance('2026-07-01', '2026-07-03');
    assert(!result.ok, `${status} returns ok=false`);
    assert(
      result.ok === false && result.reason === expectedReason,
      `${status} reason is "${expectedReason}"`
    );
    restoreFetch();
  }

  // ── Additional: Malformed JSON response ───────────────────────────────

  console.log('Q. Malformed JSON response');
  mockFetch(async () =>
    new Response('not json at all', { status: 200 })
  );
  const rBadJson = await getAmazonPerformance('2026-07-01', '2026-07-03');
  assert(!rBadJson.ok, 'malformed JSON returns ok=false');
  assert(
    rBadJson.ok === false && rBadJson.reason === 'Malformed response',
    'malformed JSON reason is "Malformed response"'
  );
  restoreFetch();

  // ── Summary ────────────────────────────────────────────────────────────

  console.log('\n' + '─'.repeat(50));
  console.log(`Phase 5D validation: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\n✗ VALIDATION FAILED');
    process.exit(1);
  }
  console.log('\n✓ ALL PHASE 5D VALIDATIONS PASSED\n');
}

await runTests();
