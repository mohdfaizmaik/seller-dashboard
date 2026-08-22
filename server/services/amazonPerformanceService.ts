/**
 * Amazon marketplace performance service (Phase 5C).
 *
 * Returns normalized MarketplaceDailyMetric[] only.
 * Never returns tokens, document URLs, or raw Amazon payloads.
 */

import { getServerConfig } from '../config/env';
import {
  AmazonApiError,
  MarketplaceApiNotConfiguredError
} from '../integrations/marketplaces/types';
import {
  createAmazonApiClient,
  type AmazonApiClient
} from '../integrations/marketplaces/amazon/amazonApiClient';
import type { MarketplaceDailyMetric } from '../../src/models/marketplaceReport';
import { AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE } from '../integrations/marketplaces/amazon/parseSalesAndTrafficReport';

export interface AmazonPerformanceResponse {
  platform: 'amazon';
  startDate: string;
  endDate: string;
  reportType: string;
  metrics: MarketplaceDailyMetric[];
}

export interface AmazonPerformanceErrorBody {
  platform: 'amazon';
  configured: boolean;
  error: {
    code: string;
    message: string;
    retryAfterSeconds?: number;
  };
}

export interface AmazonPerformanceResult {
  statusCode: number;
  body: AmazonPerformanceResponse | AmazonPerformanceErrorBody;
}

function toErrorBody(err: unknown): AmazonPerformanceErrorBody {
  const configured = getServerConfig().amazon.configured;
  if (err instanceof AmazonApiError) {
    return {
      platform: 'amazon',
      configured,
      error: {
        code: err.code,
        message: err.message,
        ...(err.retryAfterSeconds !== undefined
          ? { retryAfterSeconds: err.retryAfterSeconds }
          : {})
      }
    };
  }
  if (err instanceof MarketplaceApiNotConfiguredError) {
    return {
      platform: 'amazon',
      configured: false,
      error: { code: 'not_configured', message: err.message }
    };
  }
  return {
    platform: 'amazon',
    configured,
    error: {
      code: 'unexpected_response',
      message: 'Amazon performance request failed'
    }
  };
}

function statusCodeForError(err: unknown): number {
  if (err instanceof MarketplaceApiNotConfiguredError) return 503;
  if (err instanceof AmazonApiError) {
    if (err.code === 'not_configured') return 503;
    if (err.code === 'invalid_date_range') return 400;
    if (err.code === 'rate_limited') return 429;
    if (err.code === 'invalid_authorization' || err.code === 'invalid_credentials') {
      return 401;
    }
    if (err.code === 'report_timeout') return 504;
    if (
      err.code === 'report_fatal' ||
      err.code === 'report_cancelled' ||
      err.code === 'malformed_report'
    ) {
      return 502;
    }
    if (err.code === 'network_error' || err.code === 'http_error') return 502;
    return 502;
  }
  return 500;
}

export async function getAmazonPerformanceMetrics(
  startDate: string,
  endDate: string,
  client: AmazonApiClient = createAmazonApiClient()
): Promise<AmazonPerformanceResult> {
  if (!getServerConfig().amazon.configured || !client.isConfigured()) {
    return {
      statusCode: 503,
      body: {
        platform: 'amazon',
        configured: false,
        error: {
          code: 'not_configured',
          message: 'Amazon API integration not configured'
        }
      }
    };
  }

  try {
    // Tests can inject a fast poller via client http mocks; production uses defaults.
    const result = await client.getReports({
      startDate,
      endDate,
      poll: {
        maxAttempts: 30,
        delayMs: 2000
      }
    });

    return {
      statusCode: 200,
      body: {
        platform: 'amazon',
        startDate: result.startDate,
        endDate: result.endDate,
        reportType: result.reportType || AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE,
        metrics: result.metrics
      }
    };
  } catch (err) {
    return {
      statusCode: statusCodeForError(err),
      body: toErrorBody(err)
    };
  }
}
