/**
 * Shared server marketplace integration types (Phase 5A / 5B).
 *
 * HTTP/API layer → marketplace integration layer → (future) normalization.
 * Credentials must remain server-side only.
 */

export type ServerMarketplacePlatform = 'amazon' | 'flipkart' | 'meesho';

export class MarketplaceApiNotConfiguredError extends Error {
  readonly platform: ServerMarketplacePlatform;

  constructor(platform: ServerMarketplacePlatform, message?: string) {
    super(message ?? `${platform} API integration not configured`);
    this.name = 'MarketplaceApiNotConfiguredError';
    this.platform = platform;
  }
}

/** Controlled Amazon SP-API / LWA failures — never include secrets or raw bodies. */
export type AmazonApiErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'invalid_authorization'
  | 'http_error'
  | 'rate_limited'
  | 'network_error'
  | 'unexpected_response'
  | 'report_fatal'
  | 'report_cancelled'
  | 'report_timeout'
  | 'malformed_report'
  | 'invalid_date_range';

export class AmazonApiError extends Error {
  readonly platform = 'amazon' as const;
  readonly code: AmazonApiErrorCode;
  readonly httpStatus?: number;
  readonly retryAfterSeconds?: number;

  constructor(
    code: AmazonApiErrorCode,
    message: string,
    options?: { httpStatus?: number; retryAfterSeconds?: number }
  ) {
    super(message);
    this.name = 'AmazonApiError';
    this.code = code;
    this.httpStatus = options?.httpStatus;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}

/** Injectable fetch for tests — never logs request bodies that may contain secrets. */
export type MarketplaceHttpClient = (
  input: string | URL,
  init?: RequestInit
) => Promise<Response>;
