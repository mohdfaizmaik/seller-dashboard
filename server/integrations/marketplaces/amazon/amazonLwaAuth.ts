/**
 * Amazon Login with Amazon (LWA) token exchange for SP-API (Phase 5B).
 *
 * Official flow:
 *   POST https://api.amazon.com/auth/o2/token
 *     grant_type=refresh_token
 *     refresh_token / client_id / client_secret
 *
 * Access tokens remain in server memory only — never log or return them.
 */

import type { AmazonSpApiCredentials } from '../../../config/env';
import { sanitizeForLog } from '../../../config/env';
import {
  AmazonApiError,
  type MarketplaceHttpClient
} from '../types';

export interface LwaAccessTokenResult {
  /** Opaque access token — keep server-side only. */
  accessToken: string;
  expiresInSeconds: number;
  tokenType: string;
}

interface LwaTokenJson {
  access_token?: unknown;
  expires_in?: unknown;
  token_type?: unknown;
  error?: unknown;
  error_description?: unknown;
}

function parseRetryAfterSeconds(res: Response): number | undefined {
  const raw = res.headers.get('retry-after');
  if (!raw) return undefined;
  const asNumber = Number.parseInt(raw, 10);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  return undefined;
}

function mapLwaHttpError(status: number, retryAfterSeconds?: number): AmazonApiError {
  if (status === 429) {
    return new AmazonApiError('rate_limited', 'Amazon LWA token endpoint rate limited', {
      httpStatus: status,
      retryAfterSeconds
    });
  }
  if (status === 400 || status === 401) {
    return new AmazonApiError(
      'invalid_authorization',
      'Amazon LWA rejected the authorization credentials',
      { httpStatus: status }
    );
  }
  if (status === 403) {
    return new AmazonApiError(
      'invalid_credentials',
      'Amazon LWA denied access for these credentials',
      { httpStatus: status }
    );
  }
  return new AmazonApiError('http_error', 'Amazon LWA token request failed', {
    httpStatus: status
  });
}

/**
 * Exchanges the seller refresh token for a short-lived LWA access token.
 * Does not log the request body or token values.
 */
export async function exchangeLwaRefreshToken(
  credentials: AmazonSpApiCredentials,
  httpClient: MarketplaceHttpClient = fetch
): Promise<LwaAccessTokenResult> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret
  });

  let response: Response;
  try {
    response = await httpClient(credentials.lwaTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json'
      },
      body: body.toString()
    });
  } catch (err) {
    const message = err instanceof Error ? sanitizeForLog(err.message) : 'network failure';
    throw new AmazonApiError('network_error', `Amazon LWA network error: ${message}`);
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  let json: LwaTokenJson | null = null;
  try {
    json = (await response.json()) as LwaTokenJson;
  } catch {
    json = null;
  }

  if (!response.ok) {
    // Do not log error_description if it might echo secrets; keep status only.
    console.error(
      '[amazon:lwa] token exchange failed',
      sanitizeForLog(`status=${response.status}`)
    );
    throw mapLwaHttpError(response.status, retryAfterSeconds);
  }

  const accessToken = typeof json?.access_token === 'string' ? json.access_token : '';
  const expiresIn =
    typeof json?.expires_in === 'number'
      ? json.expires_in
      : Number.parseInt(String(json?.expires_in ?? ''), 10);
  const tokenType = typeof json?.token_type === 'string' ? json.token_type : 'bearer';

  if (!accessToken || !Number.isFinite(expiresIn)) {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon LWA returned an unexpected token response'
    );
  }

  return {
    accessToken,
    expiresInSeconds: expiresIn,
    tokenType
  };
}
