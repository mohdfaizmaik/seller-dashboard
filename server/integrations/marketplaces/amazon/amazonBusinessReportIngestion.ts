/**
 * Amazon Business Report ingestion orchestration (Phase 5C).
 *
 * PERFORMANCE DATA ONLY — do not feed into financial profit calculations.
 */

import { normalizeAmazonReport } from '../../../../src/data/marketplace/amazon/normalizeAmazonReport';
import type { MarketplaceDailyMetric } from '../../../../src/models/marketplaceReport';
import {
  getAmazonSpApiCredentials,
  isAmazonSpApiConfigured
} from '../../../config/env';
import {
  AmazonApiError,
  MarketplaceApiNotConfiguredError,
  type MarketplaceHttpClient
} from '../types';
import { assertAmazonReportDateRange } from './amazonDateRange';
import {
  createSalesAndTrafficReport,
  downloadReportDocumentBytes,
  getReportDocumentMeta,
  pollReportUntilDone,
  type PollAmazonReportOptions
} from './amazonReportsApi';
import {
  AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE,
  decodeAmazonReportDocument,
  parseAmazonBusinessReportDocument
} from './parseSalesAndTrafficReport';
import { amazonSpApiFetchJson } from './amazonSpApiHttp';

const NOT_CONFIGURED = 'Amazon API integration not configured';

export interface AmazonBusinessReportIngestionParams {
  startDate: string;
  endDate: string;
  marketplaceIds?: string[];
  accessToken: string;
  httpClient: MarketplaceHttpClient;
  poll?: PollAmazonReportOptions;
}

export interface AmazonBusinessReportIngestionResult {
  platform: 'amazon';
  reportType: string;
  startDate: string;
  endDate: string;
  marketplaceIds: string[];
  metrics: MarketplaceDailyMetric[];
}

/** In-memory dedupe for concurrent identical report requests (no DB). */
const inflightReports = new Map<string, Promise<AmazonBusinessReportIngestionResult>>();

function reportDedupeKey(
  startDate: string,
  endDate: string,
  marketplaceIds: string[]
): string {
  return [
    AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE,
    startDate,
    endDate,
    [...marketplaceIds].sort().join(',')
  ].join('|');
}

function readMarketplaceIdFromEnv(): string | undefined {
  const value = process.env.AMAZON_MARKETPLACE_ID;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export async function resolveAmazonMarketplaceIds(
  httpClient: MarketplaceHttpClient,
  spApiEndpoint: string,
  accessToken: string
): Promise<string[]> {
  const envId = readMarketplaceIdFromEnv();
  if (envId) {
    return [envId];
  }

  const payload = await amazonSpApiFetchJson(
    httpClient,
    `${spApiEndpoint}/sellers/v1/marketplaceParticipations`,
    accessToken,
    { method: 'GET' }
  );

  const ids = extractMarketplaceIds(payload);
  if (ids.length === 0) {
    throw new AmazonApiError(
      'unexpected_response',
      'No Amazon marketplace participations available for report creation'
    );
  }
  return ids;
}

function extractMarketplaceIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const list = Array.isArray(root.payload)
    ? root.payload
    : Array.isArray(root.marketplaceParticipations)
      ? root.marketplaceParticipations
      : [];

  const ids: string[] = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const marketplace = (item as Record<string, unknown>).marketplace;
    if (marketplace && typeof marketplace === 'object') {
      const id = (marketplace as Record<string, unknown>).id;
      if (typeof id === 'string' && id.trim() !== '') {
        ids.push(id.trim());
      }
    }
  }
  return [...new Set(ids)];
}

export async function ingestAmazonBusinessReport(
  params: AmazonBusinessReportIngestionParams
): Promise<AmazonBusinessReportIngestionResult> {
  if (!isAmazonSpApiConfigured()) {
    throw new MarketplaceApiNotConfiguredError('amazon', NOT_CONFIGURED);
  }

  const { startDate, endDate } = assertAmazonReportDateRange(
    params.startDate,
    params.endDate
  );
  const credentials = getAmazonSpApiCredentials();

  const marketplaceIds =
    params.marketplaceIds && params.marketplaceIds.length > 0
      ? params.marketplaceIds
      : await resolveAmazonMarketplaceIds(
          params.httpClient,
          credentials.spApiEndpoint,
          params.accessToken
        );

  const key = reportDedupeKey(startDate, endDate, marketplaceIds);
  const existing = inflightReports.get(key);
  if (existing) {
    return existing;
  }

  const work = (async () => {
    const created = await createSalesAndTrafficReport(params.httpClient, {
      spApiEndpoint: credentials.spApiEndpoint,
      accessToken: params.accessToken,
      marketplaceIds,
      startDate,
      endDate
    });

    const done = await pollReportUntilDone(
      params.httpClient,
      credentials.spApiEndpoint,
      params.accessToken,
      created.reportId,
      params.poll
    );

    const documentMeta = await getReportDocumentMeta(
      params.httpClient,
      credentials.spApiEndpoint,
      params.accessToken,
      done.reportDocumentId!
    );

    const bytes = await downloadReportDocumentBytes(
      params.httpClient,
      documentMeta.url
    );

    const text = decodeAmazonReportDocument(
      bytes,
      documentMeta.compressionAlgorithm
    );
    // Never log report contents.
    const rawRows = parseAmazonBusinessReportDocument(text);
    const metrics = normalizeAmazonReport(rawRows).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    return {
      platform: 'amazon' as const,
      reportType: AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE,
      startDate,
      endDate,
      marketplaceIds,
      metrics
    };
  })();

  inflightReports.set(key, work);
  try {
    return await work;
  } finally {
    inflightReports.delete(key);
  }
}

/** Test helper — clears in-memory dedupe map. */
export function clearAmazonReportInflightForTests(): void {
  inflightReports.clear();
}
