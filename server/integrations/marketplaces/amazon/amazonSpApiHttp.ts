/**
 * Shared Amazon SP-API HTTP helpers (Phase 5B / 5C).
 */

import { sanitizeForLog } from '../../../config/env';
import { AmazonApiError, type MarketplaceHttpClient } from '../types';

export const AMAZON_USER_AGENT =
  'SellerDashboard/0.0.0 (Phase5C; Language=TypeScript)';

export function parseRetryAfterSeconds(res: Response): number | undefined {
  const raw = res.headers.get('retry-after');
  if (!raw) return undefined;
  const asNumber = Number.parseInt(raw, 10);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;
  return undefined;
}

export function utcAmzDate(date = new Date()): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function mapSpApiHttpError(
  status: number,
  retryAfterSeconds?: number,
  context = 'Amazon SP-API request failed'
): AmazonApiError {
  if (status === 429) {
    return new AmazonApiError('rate_limited', 'Amazon SP-API rate limited the request', {
      httpStatus: status,
      retryAfterSeconds
    });
  }
  if (status === 401) {
    return new AmazonApiError(
      'invalid_authorization',
      'Amazon SP-API rejected the access token',
      { httpStatus: status }
    );
  }
  if (status === 403) {
    return new AmazonApiError(
      'invalid_credentials',
      'Amazon SP-API denied access for this seller application',
      { httpStatus: status }
    );
  }
  return new AmazonApiError('http_error', context, {
    httpStatus: status,
    retryAfterSeconds
  });
}

export async function amazonSpApiFetchJson(
  httpClient: MarketplaceHttpClient,
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<unknown> {
  let response: Response;
  try {
    response = await httpClient(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        'user-agent': AMAZON_USER_AGENT,
        'x-amz-access-token': accessToken,
        'x-amz-date': utcAmzDate(),
        ...(init.headers ?? {})
      }
    });
  } catch (err) {
    const message = err instanceof Error ? sanitizeForLog(err.message) : 'network failure';
    throw new AmazonApiError('network_error', `Amazon SP-API network error: ${message}`);
  }

  const retryAfterSeconds = parseRetryAfterSeconds(response);
  if (!response.ok) {
    console.error(
      '[amazon:sp-api] request failed',
      sanitizeForLog(`status=${response.status} url=${safeUrlPath(url)}`)
    );
    try {
      await response.text();
    } catch {
      // ignore
    }
    throw mapSpApiHttpError(response.status, retryAfterSeconds);
  }

  try {
    return await response.json();
  } catch {
    throw new AmazonApiError(
      'unexpected_response',
      'Amazon SP-API returned a non-JSON response'
    );
  }
}

function safeUrlPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[unparseable-url]';
  }
}
