/**
 * Amazon connection status service (Phase 5B).
 *
 * Returns safe flags only — never tokens or credentials.
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

export interface AmazonStatusError {
  code: string;
  message: string;
  retryAfterSeconds?: number;
}

export interface AmazonConnectionStatus {
  platform: 'amazon';
  configured: boolean;
  authenticated: boolean;
  connected: boolean;
  region?: string;
  marketplaceParticipationCount?: number;
  error?: AmazonStatusError;
}

export interface AmazonStatusResult {
  statusCode: number;
  body: AmazonConnectionStatus;
}

function toSafeError(err: unknown): AmazonStatusError {
  if (err instanceof AmazonApiError) {
    return {
      code: err.code,
      message: err.message,
      ...(err.retryAfterSeconds !== undefined
        ? { retryAfterSeconds: err.retryAfterSeconds }
        : {})
    };
  }
  if (err instanceof MarketplaceApiNotConfiguredError) {
    return { code: 'not_configured', message: err.message };
  }
  return {
    code: 'unexpected_response',
    message: 'Amazon connection check failed'
  };
}

function statusCodeForError(err: unknown): number {
  if (err instanceof MarketplaceApiNotConfiguredError) return 200;
  if (err instanceof AmazonApiError) {
    if (err.code === 'rate_limited') return 429;
    if (err.code === 'invalid_authorization' || err.code === 'invalid_credentials') {
      return 401;
    }
    if (err.code === 'network_error' || err.code === 'http_error') return 502;
    if (err.code === 'not_configured') return 200;
    return 502;
  }
  return 500;
}

/**
 * Probes Amazon configuration → LWA auth → Sellers API connectivity.
 */
export async function getAmazonConnectionStatus(
  client: AmazonApiClient = createAmazonApiClient()
): Promise<AmazonStatusResult> {
  const config = getServerConfig();

  if (!config.amazon.configured || !client.isConfigured()) {
    return {
      statusCode: 200,
      body: {
        platform: 'amazon',
        configured: false,
        authenticated: false,
        connected: false,
        region: config.amazon.region
      }
    };
  }

  try {
    await client.authenticate();
  } catch (err) {
    return {
      statusCode: statusCodeForError(err),
      body: {
        platform: 'amazon',
        configured: true,
        authenticated: false,
        connected: false,
        region: config.amazon.region,
        error: toSafeError(err)
      }
    };
  }

  try {
    const probe = await client.verifySellerConnection();
    return {
      statusCode: 200,
      body: {
        platform: 'amazon',
        configured: true,
        authenticated: true,
        connected: probe.connected,
        region: config.amazon.region,
        marketplaceParticipationCount: probe.marketplaceParticipationCount
      }
    };
  } catch (err) {
    return {
      statusCode: statusCodeForError(err),
      body: {
        platform: 'amazon',
        configured: true,
        authenticated: true,
        connected: false,
        region: config.amazon.region,
        error: toSafeError(err)
      }
    };
  }
}
