/**
 * Amazon SP-API client (Phase 5B auth + Phase 5C Business Report ingestion).
 *
 * Surface:
 *   AmazonApiClient
 *     ├── authentication (LWA refresh → access token)
 *     ├── connection probe (Sellers API marketplaceParticipations)
 *     ├── reports (GET_SALES_AND_TRAFFIC_REPORT → normalizeAmazonReport)
 *     ├── orders / settlements / returns (later)
 *
 * Never log or return access tokens, refresh tokens, or client secrets.
 * Business Report output is PERFORMANCE data only — not financial truth.
 */

import {
  getAmazonSpApiCredentials,
  isAmazonSpApiConfigured,
  sanitizeForLog
} from '../../../config/env';
import {
  AmazonApiError,
  MarketplaceApiNotConfiguredError,
  type MarketplaceHttpClient
} from '../types';
import { exchangeLwaRefreshToken } from './amazonLwaAuth';
import {
  ingestAmazonBusinessReport,
  type AmazonBusinessReportIngestionResult
} from './amazonBusinessReportIngestion';
import {
  AMAZON_USER_AGENT,
  mapSpApiHttpError,
  parseRetryAfterSeconds,
  utcAmzDate
} from './amazonSpApiHttp';
import type { PollAmazonReportOptions } from './amazonReportsApi';

const NOT_CONFIGURED = 'Amazon API integration not configured';

export interface AmazonAuthSuccess {
  authenticated: true;
  expiresInSeconds: number;
}

export interface AmazonConnectionProbeSuccess {
  connected: true;
  /** Safe aggregate only — not the raw Amazon payload. */
  marketplaceParticipationCount: number;
}

export interface AmazonApiClientOptions {
  httpClient?: MarketplaceHttpClient;
}

export class AmazonApiClient {
  readonly platform = 'amazon' as const;
  private readonly httpClient: MarketplaceHttpClient;

  /** In-memory access token cache — never persisted or exposed. */
  private cachedAccessToken: string | null = null;
  private accessTokenExpiresAtMs = 0;

  constructor(options: AmazonApiClientOptions = {}) {
    this.httpClient = options.httpClient ?? fetch;
  }

  isConfigured(): boolean {
    return isAmazonSpApiConfigured();
  }

  /**
   * Exchanges the LWA refresh token for an access token (server-side only).
   * Result intentionally omits the token value.
   */
  async authenticate(): Promise<AmazonAuthSuccess> {
    if (!this.isConfigured()) {
      throw new MarketplaceApiNotConfiguredError('amazon', NOT_CONFIGURED);
    }

    const credentials = getAmazonSpApiCredentials();
    const token = await exchangeLwaRefreshToken(credentials, this.httpClient);

    this.cachedAccessToken = token.accessToken;
    this.accessTokenExpiresAtMs =
      Date.now() + Math.max(0, token.expiresInSeconds - 60) * 1000;

    return {
      authenticated: true,
      expiresInSeconds: token.expiresInSeconds
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.accessTokenExpiresAtMs) {
      return this.cachedAccessToken;
    }
    await this.authenticate();
    if (!this.cachedAccessToken) {
      throw new AmazonApiError(
        'unexpected_response',
        'Amazon authentication did not produce an access token'
      );
    }
    return this.cachedAccessToken;
  }

  /**
   * Lightweight read-only SP-API call to prove seller connectivity:
   * GET /sellers/v1/marketplaceParticipations
   */
  async verifySellerConnection(): Promise<AmazonConnectionProbeSuccess> {
    if (!this.isConfigured()) {
      throw new MarketplaceApiNotConfiguredError('amazon', NOT_CONFIGURED);
    }

    const credentials = getAmazonSpApiCredentials();
    const accessToken = await this.getAccessToken();
    const url = `${credentials.spApiEndpoint}/sellers/v1/marketplaceParticipations`;

    let response: Response;
    try {
      response = await this.httpClient(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'user-agent': AMAZON_USER_AGENT,
          'x-amz-access-token': accessToken,
          'x-amz-date': utcAmzDate()
        }
      });
    } catch (err) {
      const message = err instanceof Error ? sanitizeForLog(err.message) : 'network failure';
      throw new AmazonApiError('network_error', `Amazon SP-API network error: ${message}`);
    }

    const retryAfterSeconds = parseRetryAfterSeconds(response);

    if (!response.ok) {
      console.error(
        '[amazon:sp-api] connection probe failed',
        sanitizeForLog(`status=${response.status} path=/sellers/v1/marketplaceParticipations`)
      );
      try {
        await response.text();
      } catch {
        // ignore
      }
      throw mapSpApiHttpError(response.status, retryAfterSeconds);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AmazonApiError(
        'unexpected_response',
        'Amazon SP-API returned a non-JSON connection response'
      );
    }

    const participations = extractParticipationCount(payload);
    if (participations === null) {
      throw new AmazonApiError(
        'unexpected_response',
        'Amazon SP-API connection response was missing marketplaceParticipations'
      );
    }

    return {
      connected: true,
      marketplaceParticipationCount: participations
    };
  }

  /**
   * Creates, polls, downloads, parses, and normalizes the Sales and Traffic
   * Business Report for the given inclusive YYYY-MM-DD range.
   */
  async getReports(params: {
    startDate: string;
    endDate: string;
    marketplaceIds?: string[];
    poll?: PollAmazonReportOptions;
  }): Promise<AmazonBusinessReportIngestionResult> {
    if (!this.isConfigured()) {
      throw new MarketplaceApiNotConfiguredError('amazon', NOT_CONFIGURED);
    }

    const accessToken = await this.getAccessToken();
    return ingestAmazonBusinessReport({
      startDate: params.startDate,
      endDate: params.endDate,
      marketplaceIds: params.marketplaceIds,
      accessToken,
      httpClient: this.httpClient,
      poll: params.poll
    });
  }

  async getOrders(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new AmazonApiError(
      'not_configured',
      'Amazon Orders API is not implemented yet'
    );
  }

  async getSettlements(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new AmazonApiError(
      'not_configured',
      'Amazon Settlements API is not implemented yet'
    );
  }

  async getReturns(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new AmazonApiError(
      'not_configured',
      'Amazon Returns API is not implemented yet'
    );
  }
}

function extractParticipationCount(payload: unknown): number | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const payloadNode = record.payload;
  if (Array.isArray(payloadNode)) {
    return payloadNode.length;
  }
  if (Array.isArray(record.marketplaceParticipations)) {
    return record.marketplaceParticipations.length;
  }
  return null;
}

export function createAmazonApiClient(
  options?: AmazonApiClientOptions
): AmazonApiClient {
  return new AmazonApiClient(options);
}
