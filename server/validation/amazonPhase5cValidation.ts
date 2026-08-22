/**
 * Phase 5C — Amazon Business Report ingestion validation (mocked HTTP).
 *
 * Does not require real Amazon credentials.
 * Run: npm run test:server:amazon:reports
 */

import { gzipSync } from 'node:zlib';
import {
  isAmazonSpApiConfigured
} from '../config/env';
import { createAmazonApiClient } from '../integrations/marketplaces/amazon/amazonApiClient';
import {
  clearAmazonReportInflightForTests
} from '../integrations/marketplaces/amazon/amazonBusinessReportIngestion';
import {
  ymdToAmazonDataEndTime,
  ymdToAmazonDataStartTime,
  ymdToAmazonRawDate
} from '../integrations/marketplaces/amazon/amazonDateRange';
import {
  decodeAmazonReportDocument,
  parseAmazonBusinessReportDocument
} from '../integrations/marketplaces/amazon/parseSalesAndTrafficReport';
import { getAmazonPerformanceMetrics } from '../services/amazonPerformanceService';
import { AmazonApiError } from '../integrations/marketplaces/types';
import { normalizeAmazonReport } from '../../src/data/marketplace/amazon/normalizeAmazonReport';

function assert(condition: boolean, message: string, errors: string[]): void {
  if (!condition) errors.push(message);
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
      Math.abs(actual - expected) < 1e-9
    ) {
      return;
    }
    errors.push(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function bytesResponse(status: number, bytes: Uint8Array): Response {
  return new Response(bytes, {
    status,
    headers: { 'Content-Type': 'application/octet-stream' }
  });
}

function withAmazonEnv(run: () => Promise<void>): Promise<void> {
  const previous = {
    AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN: process.env.AMAZON_REFRESH_TOKEN,
    AMAZON_SP_API_REGION: process.env.AMAZON_SP_API_REGION,
    AMAZON_MARKETPLACE_ID: process.env.AMAZON_MARKETPLACE_ID
  };

  process.env.AMAZON_CLIENT_ID = 'amzn1.application-oa2-client.test';
  process.env.AMAZON_CLIENT_SECRET = 'CLIENT_SECRET_VALUE';
  process.env.AMAZON_REFRESH_TOKEN = 'Atzr|REFRESH_TOKEN_VALUE';
  process.env.AMAZON_SP_API_REGION = 'eu';
  process.env.AMAZON_MARKETPLACE_ID = 'A21TJRUUN4KGV';

  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function sampleSalesAndTrafficJson(): string {
  return JSON.stringify({
    reportSpecification: {
      reportType: 'GET_SALES_AND_TRAFFIC_REPORT',
      dataStartTime: '2026-07-01T00:00:00Z',
      dataEndTime: '2026-07-01T23:59:59Z'
    },
    salesAndTrafficByDate: [
      {
        date: '2026-07-01',
        salesByDate: {
          orderedProductSales: { amount: 108218.36, currencyCode: 'INR' },
          orderedProductSalesB2B: { amount: 897.6, currencyCode: 'INR' },
          unitsOrdered: 169,
          unitsOrderedB2B: 2,
          totalOrderItems: 169,
          totalOrderItemsB2B: 2
        },
        trafficByDate: {
          pageViews: 20200,
          pageViewsB2B: 318,
          sessions: 15147,
          sessionsB2B: 226,
          buyBoxPercentage: 99.89,
          buyBoxPercentageB2B: 100,
          unitSessionPercentage: 1.12,
          unitSessionPercentageB2B: 0.88,
          averageOfferCount: 49,
          averageParentItems: 23
        }
      }
    ]
  });
}

function buildMockHttpClient(options?: {
  statuses?: Array<'IN_QUEUE' | 'IN_PROGRESS' | 'DONE' | 'FATAL' | 'CANCELLED'>;
  documentGzip?: boolean;
  failCreate?: boolean;
  throttleDocument?: boolean;
}): {
  httpClient: typeof fetch;
  calls: string[];
} {
  const calls: string[] = [];
  const statuses = options?.statuses ?? ['IN_QUEUE', 'DONE'];
  let statusIdx = 0;

  const httpClient: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push(`${init?.method ?? 'GET'} ${url}`);

    if (url.includes('/auth/o2/token')) {
      return jsonResponse(200, {
        access_token: 'Atza|ACCESS_TOKEN_VALUE',
        token_type: 'bearer',
        expires_in: 3600
      });
    }

    if (url.endsWith('/reports/2021-06-30/reports') && init?.method === 'POST') {
      if (options?.failCreate) {
        return jsonResponse(400, { errors: [{ code: 'InvalidInput' }] });
      }
      const body = JSON.parse(String(init.body ?? '{}')) as Record<string, unknown>;
      assertEqual(
        'create.reportType',
        body.reportType,
        'GET_SALES_AND_TRAFFIC_REPORT',
        []
      );
      return jsonResponse(202, { reportId: 'REPORT_123' });
    }

    if (url.includes('/reports/2021-06-30/reports/REPORT_123')) {
      const processingStatus = statuses[Math.min(statusIdx, statuses.length - 1)];
      statusIdx += 1;
      if (processingStatus === 'DONE') {
        return jsonResponse(200, {
          reportId: 'REPORT_123',
          processingStatus: 'DONE',
          reportDocumentId: 'DOC_123',
          reportType: 'GET_SALES_AND_TRAFFIC_REPORT'
        });
      }
      return jsonResponse(200, {
        reportId: 'REPORT_123',
        processingStatus
      });
    }

    if (url.includes('/reports/2021-06-30/documents/DOC_123')) {
      if (options?.throttleDocument) {
        return new Response(JSON.stringify({ errors: [{ code: 'QuotaExceeded' }] }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'retry-after': '9' }
        });
      }
      return jsonResponse(200, {
        reportDocumentId: 'DOC_123',
        url: 'https://example.invalid/report-download',
        compressionAlgorithm: options?.documentGzip === false ? undefined : 'GZIP'
      });
    }

    if (url.includes('example.invalid/report-download')) {
      const json = sampleSalesAndTrafficJson();
      if (options?.documentGzip === false) {
        return bytesResponse(200, Buffer.from(json, 'utf8'));
      }
      return bytesResponse(200, gzipSync(Buffer.from(json, 'utf8')));
    }

    return jsonResponse(404, { error: 'unexpected' });
  };

  return { httpClient, calls };
}

export async function runAmazonPhase5cValidation(): Promise<void> {
  const errors: string[] = [];
  clearAmazonReportInflightForTests();

  // Date helpers
  assertEqual(
    'date.startIso',
    ymdToAmazonDataStartTime('2026-07-01'),
    '2026-07-01T00:00:00.000Z',
    errors
  );
  assertEqual(
    'date.endIso',
    ymdToAmazonDataEndTime('2026-07-03'),
    '2026-07-03T23:59:59.999Z',
    errors
  );
  assertEqual('date.raw', ymdToAmazonRawDate('2026-07-01'), '01/07/26', errors);

  // Parsing / normalization from Sales & Traffic JSON
  const rawRows = parseAmazonBusinessReportDocument(sampleSalesAndTrafficJson());
  assertEqual('parse.rows', rawRows.length, 1, errors);
  assertEqual('parse.date', rawRows[0]?.Date, '01/07/26', errors);
  assertEqual('parse.sales', rawRows[0]?.['Ordered Product Sales'], 108218.36, errors);
  assertEqual('parse.featured', rawRows[0]?.['Featured Offer Percentage'], 99.89, errors);

  const normalized = normalizeAmazonReport(rawRows);
  assertEqual('norm.date', normalized[0]?.date, '2026-07-01', errors);
  assertEqual('norm.sales', normalized[0]?.orderedProductSales, 108218.36, errors);
  assertEqual('norm.featured', normalized[0]?.featuredOfferPercentage, 99.89, errors);
  assertEqual('norm.sessions', normalized[0]?.sessions, 15147, errors);

  // Blank → null via delimited fixture
  const blankTsv = [
    'Date\tOrdered Product Sales\tOrdered Product Sales - B2B\tUnits Ordered\tUnits Ordered - B2B\tTotal Order Items\tTotal Order Items - B2B\tPage Views - Total\tPage Views - Total - B2B\tSessions - Total\tSessions - Total - B2B\tFeatured Offer Percentage\tFeatured Offer Percentage - B2B\tUnit Session Percentage\tUnit Session Percentage - B2B\tAverage Offer Count\tAverage Parent Items',
    '01/07/26\t\t\t0\t\t1\t\t\t\t\t\t\t\t\t\t\t'
  ].join('\n');
  const blankNorm = normalizeAmazonReport(parseAmazonBusinessReportDocument(blankTsv));
  assertEqual('blank.sales', blankNorm[0]?.orderedProductSales, null, errors);
  assertEqual('blank.unitsB2B', blankNorm[0]?.unitsOrderedB2B, null, errors);
  assertEqual('blank.units', blankNorm[0]?.unitsOrdered, 0, errors);
  assertEqual('blank.featured', blankNorm[0]?.featuredOfferPercentage, null, errors);

  // GZIP decode
  const gz = gzipSync(Buffer.from(sampleSalesAndTrafficJson(), 'utf8'));
  const decoded = decodeAmazonReportDocument(gz, 'GZIP');
  assert(decoded.includes('salesAndTrafficByDate'), 'gzip.decode missing payload', errors);

  // Currency / percentage through normalizer (Seller Central style)
  const currencyRows = parseAmazonBusinessReportDocument(
    [
      'Date,Ordered Product Sales,Ordered Product Sales - B2B,Units Ordered,Units Ordered - B2B,Total Order Items,Total Order Items - B2B,Page Views - Total,Page Views - Total - B2B,Sessions - Total,Sessions - Total - B2B,Featured Offer Percentage,Featured Offer Percentage - B2B,Unit Session Percentage,Unit Session Percentage - B2B,Average Offer Count,Average Parent Items',
      '01/07/26,"₹1,08,218.36",₹897.60,169,2,169,2,20200,318,15147,226,99.89%,100.00%,1.12%,0.88%,49,23'
    ].join('\n')
  );
  const currencyNorm = normalizeAmazonReport(currencyRows);
  assertEqual('currency.sales', currencyNorm[0]?.orderedProductSales, 108218.36, errors);
  assertEqual('currency.pct', currencyNorm[0]?.featuredOfferPercentage, 99.89, errors);

  // Missing credentials path
  const prevId = process.env.AMAZON_CLIENT_ID;
  const prevSecret = process.env.AMAZON_CLIENT_SECRET;
  const prevRefresh = process.env.AMAZON_REFRESH_TOKEN;
  delete process.env.AMAZON_CLIENT_ID;
  delete process.env.AMAZON_CLIENT_SECRET;
  delete process.env.AMAZON_REFRESH_TOKEN;
  assertEqual('missing.configured', isAmazonSpApiConfigured(), false, errors);
  const missing = await getAmazonPerformanceMetrics('2026-07-01', '2026-07-01');
  assertEqual('missing.status', missing.statusCode, 503, errors);
  if (prevId === undefined) delete process.env.AMAZON_CLIENT_ID;
  else process.env.AMAZON_CLIENT_ID = prevId;
  if (prevSecret === undefined) delete process.env.AMAZON_CLIENT_SECRET;
  else process.env.AMAZON_CLIENT_SECRET = prevSecret;
  if (prevRefresh === undefined) delete process.env.AMAZON_REFRESH_TOKEN;
  else process.env.AMAZON_REFRESH_TOKEN = prevRefresh;

  await withAmazonEnv(async () => {
    clearAmazonReportInflightForTests();

    // Full happy path with polling IN_QUEUE → DONE + GZIP document
    const { httpClient, calls } = buildMockHttpClient({
      statuses: ['IN_QUEUE', 'DONE'],
      documentGzip: true
    });
    const client = createAmazonApiClient({ httpClient });
    const result = await client.getReports({
      startDate: '2026-07-01',
      endDate: '2026-07-01',
      poll: { maxAttempts: 5, delayMs: 1, sleep: async () => undefined }
    });
    assertEqual('ingest.metrics', result.metrics.length, 1, errors);
    assertEqual('ingest.date', result.metrics[0]?.date, '2026-07-01', errors);
    assertEqual('ingest.sales', result.metrics[0]?.orderedProductSales, 108218.36, errors);
    assert(
      calls.some((c) => c.startsWith('POST ') && c.includes('/reports/2021-06-30/reports')),
      'createReport not called',
      errors
    );
    assert(
      calls.filter((c) => c.includes('/reports/2021-06-30/reports/REPORT_123')).length >= 2,
      'getReport not polled',
      errors
    );
    assert(
      !JSON.stringify(result).includes('ACCESS_TOKEN_VALUE'),
      'result leaked access token',
      errors
    );
    assert(
      !JSON.stringify(result).includes('example.invalid'),
      'result leaked document URL',
      errors
    );

    const perf = await getAmazonPerformanceMetrics(
      '2026-07-01',
      '2026-07-01',
      createAmazonApiClient({
        httpClient: buildMockHttpClient({ statuses: ['DONE'], documentGzip: false }).httpClient
      })
    );
    assertEqual('perf.status', perf.statusCode, 200, errors);
    if (perf.statusCode === 200 && 'metrics' in perf.body) {
      assertEqual('perf.metrics', perf.body.metrics.length, 1, errors);
      assertEqual('perf.platform', perf.body.platform, 'amazon', errors);
    }

    // FATAL status
    try {
      await createAmazonApiClient({
        httpClient: buildMockHttpClient({ statuses: ['FATAL'] }).httpClient
      }).getReports({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        poll: { maxAttempts: 3, delayMs: 1, sleep: async () => undefined }
      });
      errors.push('fatal: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'fatal: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('fatal.code', err.code, 'report_fatal', errors);
      }
    }

    // CANCELLED status
    try {
      await createAmazonApiClient({
        httpClient: buildMockHttpClient({ statuses: ['CANCELLED'] }).httpClient
      }).getReports({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        poll: { maxAttempts: 3, delayMs: 1, sleep: async () => undefined }
      });
      errors.push('cancelled: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'cancelled: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('cancelled.code', err.code, 'report_cancelled', errors);
      }
    }

    // Timeout while stuck IN_PROGRESS
    try {
      await createAmazonApiClient({
        httpClient: buildMockHttpClient({
          statuses: ['IN_PROGRESS', 'IN_PROGRESS', 'IN_PROGRESS']
        }).httpClient
      }).getReports({
        startDate: '2026-07-01',
        endDate: '2026-07-01',
        poll: { maxAttempts: 2, delayMs: 1, sleep: async () => undefined }
      });
      errors.push('timeout: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'timeout: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('timeout.code', err.code, 'report_timeout', errors);
      }
    }

    // Rate limit on document retrieval
    const rate = await getAmazonPerformanceMetrics(
      '2026-07-01',
      '2026-07-01',
      createAmazonApiClient({
        httpClient: buildMockHttpClient({
          statuses: ['DONE'],
          throttleDocument: true
        }).httpClient
      })
    );
    assertEqual('rate.status', rate.statusCode, 429, errors);
    if ('error' in rate.body) {
      assertEqual('rate.code', rate.body.error.code, 'rate_limited', errors);
      assertEqual('rate.retry', rate.body.error.retryAfterSeconds, 9, errors);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Amazon Phase 5C validation failed:\n- ${errors.join('\n- ')}`);
  }
}

void runAmazonPhase5cValidation()
  .then(() => {
    console.log('Amazon Phase 5C validation passed');
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
