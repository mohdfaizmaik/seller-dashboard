/**
 * Amazon Reports API client helpers (Phase 5C).
 *
 * Flow:
 *   createReport → getReport (poll) → getReportDocument → download
 *
 * Report type: GET_SALES_AND_TRAFFIC_REPORT (Sales and Traffic Business Report)
 */

import { AmazonApiError, type MarketplaceHttpClient } from '../types';
import { AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE } from './parseSalesAndTrafficReport';
import {
  amazonSpApiFetchJson,
  AMAZON_USER_AGENT,
  mapSpApiHttpError,
  parseRetryAfterSeconds,
  utcAmzDate
} from './amazonSpApiHttp';
import {
  ymdToAmazonDataEndTime,
  ymdToAmazonDataStartTime
} from './amazonDateRange';
import { sanitizeForLog } from '../../../config/env';

export type AmazonReportProcessingStatus =
  | 'IN_QUEUE'
  | 'IN_PROGRESS'
  | 'DONE'
  | 'FATAL'
  | 'CANCELLED'
  | string;

export interface CreateAmazonBusinessReportParams {
  spApiEndpoint: string;
  accessToken: string;
  marketplaceIds: string[];
  startDate: string;
  endDate: string;
}

export interface AmazonReportStatus {
  reportId: string;
  processingStatus: AmazonReportProcessingStatus;
  reportDocumentId?: string;
  reportType?: string;
}

export interface AmazonReportDocumentMeta {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: string;
}

export interface PollAmazonReportOptions {
  maxAttempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_MAX_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 2000;

export async function createSalesAndTrafficReport(
  httpClient: MarketplaceHttpClient,
  params: CreateAmazonBusinessReportParams
): Promise<{ reportId: string }> {
  if (params.marketplaceIds.length === 0) {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon marketplaceIds are required to create a Business Report'
    );
  }

  const body = {
    reportType: AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE,
    marketplaceIds: params.marketplaceIds,
    dataStartTime: ymdToAmazonDataStartTime(params.startDate),
    dataEndTime: ymdToAmazonDataEndTime(params.endDate),
    reportOptions: {
      dateGranularity: 'DAY',
      asinGranularity: 'PARENT'
    }
  };

  const payload = await amazonSpApiFetchJson(
    httpClient,
    `${params.spApiEndpoint}/reports/2021-06-30/reports`,
    params.accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  const reportId =
    payload &&
    typeof payload === 'object' &&
    typeof (payload as Record<string, unknown>).reportId === 'string'
      ? ((payload as Record<string, unknown>).reportId as string)
      : '';

  if (!reportId) {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon createReport response missing reportId'
    );
  }

  return { reportId };
}

export async function getReportStatus(
  httpClient: MarketplaceHttpClient,
  spApiEndpoint: string,
  accessToken: string,
  reportId: string
): Promise<AmazonReportStatus> {
  const payload = await amazonSpApiFetchJson(
    httpClient,
    `${spApiEndpoint}/reports/2021-06-30/reports/${encodeURIComponent(reportId)}`,
    accessToken,
    { method: 'GET' }
  );

  if (!payload || typeof payload !== 'object') {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon getReport response was invalid'
    );
  }

  const record = payload as Record<string, unknown>;
  const processingStatus =
    typeof record.processingStatus === 'string' ? record.processingStatus : '';
  if (!processingStatus) {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon getReport response missing processingStatus'
    );
  }

  return {
    reportId:
      typeof record.reportId === 'string' ? record.reportId : reportId,
    processingStatus,
    reportDocumentId:
      typeof record.reportDocumentId === 'string'
        ? record.reportDocumentId
        : undefined,
    reportType:
      typeof record.reportType === 'string' ? record.reportType : undefined
  };
}

export async function pollReportUntilDone(
  httpClient: MarketplaceHttpClient,
  spApiEndpoint: string,
  accessToken: string,
  reportId: string,
  options: PollAmazonReportOptions = {}
): Promise<AmazonReportStatus> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await getReportStatus(
      httpClient,
      spApiEndpoint,
      accessToken,
      reportId
    );

    if (status.processingStatus === 'DONE') {
      if (!status.reportDocumentId) {
        throw new AmazonApiError(
          'unexpected_response',
          'Amazon report DONE without reportDocumentId'
        );
      }
      return status;
    }

    if (status.processingStatus === 'FATAL') {
      throw new AmazonApiError(
        'report_fatal',
        'Amazon report processing ended with FATAL status'
      );
    }

    if (status.processingStatus === 'CANCELLED') {
      throw new AmazonApiError(
        'report_cancelled',
        'Amazon report processing was CANCELLED'
      );
    }

    // IN_QUEUE / IN_PROGRESS / unknown transitional — wait then poll again.
    if (attempt < maxAttempts) {
      await sleep(delayMs);
    }
  }

  throw new AmazonApiError(
    'report_timeout',
    `Amazon report polling timed out after ${maxAttempts} attempts`
  );
}

export async function getReportDocumentMeta(
  httpClient: MarketplaceHttpClient,
  spApiEndpoint: string,
  accessToken: string,
  reportDocumentId: string
): Promise<AmazonReportDocumentMeta> {
  const payload = await amazonSpApiFetchJson(
    httpClient,
    `${spApiEndpoint}/reports/2021-06-30/documents/${encodeURIComponent(reportDocumentId)}`,
    accessToken,
    { method: 'GET' }
  );

  if (!payload || typeof payload !== 'object') {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon getReportDocument response was invalid'
    );
  }

  const record = payload as Record<string, unknown>;
  const url = typeof record.url === 'string' ? record.url : '';
  if (!url) {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon getReportDocument response missing download url'
    );
  }

  return {
    reportDocumentId:
      typeof record.reportDocumentId === 'string'
        ? record.reportDocumentId
        : reportDocumentId,
    url,
    compressionAlgorithm:
      typeof record.compressionAlgorithm === 'string'
        ? record.compressionAlgorithm
        : undefined
  };
}

/**
 * Downloads report bytes from the pre-signed document URL.
 * Does not log the URL query string (may contain signed credentials).
 */
export async function downloadReportDocumentBytes(
  httpClient: MarketplaceHttpClient,
  documentUrl: string
): Promise<Uint8Array> {
  let response: Response;
  try {
    response = await httpClient(documentUrl, {
      method: 'GET',
      headers: {
        'user-agent': AMAZON_USER_AGENT,
        'x-amz-date': utcAmzDate()
      }
    });
  } catch (err) {
    const message = err instanceof Error ? sanitizeForLog(err.message) : 'network failure';
    throw new AmazonApiError(
      'network_error',
      `Amazon report download network error: ${message}`
    );
  }

  if (!response.ok) {
    console.error(
      '[amazon:sp-api] report download failed',
      sanitizeForLog(`status=${response.status}`)
    );
    try {
      await response.arrayBuffer();
    } catch {
      // ignore
    }
    throw mapSpApiHttpError(
      response.status,
      parseRetryAfterSeconds(response),
      'Amazon report document download failed'
    );
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength === 0) {
    throw new AmazonApiError('malformed_report', 'Amazon report download was empty');
  }
  return buffer;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
