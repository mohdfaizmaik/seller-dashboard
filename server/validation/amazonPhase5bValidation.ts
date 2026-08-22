/**
 * Phase 5B — Amazon SP-API auth + connection validation (mocked HTTP).
 *
 * Does not require real Amazon credentials.
 * Run: npm run test:server:amazon
 */

import {
  getAmazonSpApiCredentials,
  isAmazonSpApiConfigured,
  sanitizeForLog
} from '../config/env';
import { createAmazonApiClient } from '../integrations/marketplaces/amazon/amazonApiClient';
import { getAmazonConnectionStatus } from '../services/amazonStatusService';
import {
  AmazonApiError,
  MarketplaceApiNotConfiguredError
} from '../integrations/marketplaces/types';

const SECRET_FRAGMENTS = [
  'CLIENT_SECRET_VALUE',
  'REFRESH_TOKEN_VALUE',
  'ACCESS_TOKEN_VALUE',
  'Atza|real',
  'Atzr|real'
];

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
    errors.push(`${field}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function jsonResponse(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers ?? {})
    }
  });
}

function withAmazonEnv(run: () => Promise<void>): Promise<void> {
  const previous = {
    AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN: process.env.AMAZON_REFRESH_TOKEN,
    AMAZON_SP_API_REGION: process.env.AMAZON_SP_API_REGION
  };

  process.env.AMAZON_CLIENT_ID = 'amzn1.application-oa2-client.test';
  process.env.AMAZON_CLIENT_SECRET = 'CLIENT_SECRET_VALUE';
  process.env.AMAZON_REFRESH_TOKEN = 'Atzr|REFRESH_TOKEN_VALUE';
  process.env.AMAZON_SP_API_REGION = 'eu';

  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function clearAmazonEnv(run: () => Promise<void>): Promise<void> {
  const previous = {
    AMAZON_CLIENT_ID: process.env.AMAZON_CLIENT_ID,
    AMAZON_CLIENT_SECRET: process.env.AMAZON_CLIENT_SECRET,
    AMAZON_REFRESH_TOKEN: process.env.AMAZON_REFRESH_TOKEN
  };
  delete process.env.AMAZON_CLIENT_ID;
  delete process.env.AMAZON_CLIENT_SECRET;
  delete process.env.AMAZON_REFRESH_TOKEN;

  return run().finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

function assertNoSecretLeakage(label: string, value: string, errors: string[]): void {
  for (const fragment of SECRET_FRAGMENTS) {
    if (value.includes(fragment)) {
      errors.push(`${label}: leaked secret fragment ${fragment}`);
    }
  }
  if (/Atza\|[A-Za-z0-9]/.test(value) && value.includes('ACCESS_TOKEN')) {
    errors.push(`${label}: leaked access token pattern`);
  }
}

export async function runAmazonPhase5bValidation(): Promise<void> {
  const errors: string[] = [];

  // 1. Missing Amazon configuration
  await clearAmazonEnv(async () => {
    assertEqual('missing.configured', isAmazonSpApiConfigured(), false, errors);
    const status = await getAmazonConnectionStatus();
    assertEqual('missing.statusCode', status.statusCode, 200, errors);
    assertEqual('missing.body.configured', status.body.configured, false, errors);
    assertEqual('missing.body.authenticated', status.body.authenticated, false, errors);
    assertEqual('missing.body.connected', status.body.connected, false, errors);
    assertNoSecretLeakage('missing.body', JSON.stringify(status.body), errors);

    const client = createAmazonApiClient();
    try {
      await client.authenticate();
      errors.push('missing.authenticate: expected MarketplaceApiNotConfiguredError');
    } catch (err) {
      assert(
        err instanceof MarketplaceApiNotConfiguredError,
        'missing.authenticate: wrong error type',
        errors
      );
    }
  });

  // 2–8. Configured paths with mocked HTTP
  await withAmazonEnv(async () => {
    assertEqual('env.configured', isAmazonSpApiConfigured(), true, errors);
    const creds = getAmazonSpApiCredentials();
    assertEqual('env.region', creds.region, 'eu', errors);
    assertEqual(
      'env.endpoint',
      creds.spApiEndpoint,
      'https://sellingpartnerapi-eu.amazon.com',
      errors
    );

    // Auth success + connectivity success
    const successClient = createAmazonApiClient({
      httpClient: async (input, init) => {
        const url = String(input);
        if (url.includes('/auth/o2/token')) {
          assertEqual('lwa.method', init?.method, 'POST', errors);
          const body = String(init?.body ?? '');
          assert(body.includes('grant_type=refresh_token'), 'lwa.grant_type missing', errors);
          // Ensure test itself uses secrets in request (expected) but responses stay clean.
          return jsonResponse(200, {
            access_token: 'Atza|ACCESS_TOKEN_VALUE',
            token_type: 'bearer',
            expires_in: 3600
          });
        }
        if (url.includes('/sellers/v1/marketplaceParticipations')) {
          const headers = init?.headers as Record<string, string>;
          assertEqual(
            'sp.accessHeader',
            headers?.['x-amz-access-token'],
            'Atza|ACCESS_TOKEN_VALUE',
            errors
          );
          return jsonResponse(200, {
            payload: [{ marketplace: { id: 'A21TJRUUN4KGV' } }, { marketplace: { id: 'ATVPDKIKX0DER' } }]
          });
        }
        return jsonResponse(404, { error: 'unexpected url' });
      }
    });

    const auth = await successClient.authenticate();
    assertEqual('auth.success.authenticated', auth.authenticated, true, errors);
    assertEqual('auth.success.expiresInSeconds', auth.expiresInSeconds, 3600, errors);
    assert(
      !('accessToken' in (auth as object)),
      'auth.success must not expose accessToken',
      errors
    );

    const probe = await successClient.verifySellerConnection();
    assertEqual('probe.connected', probe.connected, true, errors);
    assertEqual('probe.count', probe.marketplaceParticipationCount, 2, errors);

    const okStatus = await getAmazonConnectionStatus(successClient);
    assertEqual('status.ok.statusCode', okStatus.statusCode, 200, errors);
    assertEqual('status.ok.configured', okStatus.body.configured, true, errors);
    assertEqual('status.ok.authenticated', okStatus.body.authenticated, true, errors);
    assertEqual('status.ok.connected', okStatus.body.connected, true, errors);
    assertNoSecretLeakage('status.ok.body', JSON.stringify(okStatus.body), errors);

    // Auth failure path
    const authFailClient = createAmazonApiClient({
      httpClient: async () => jsonResponse(401, { error: 'invalid_client' })
    });
    try {
      await authFailClient.authenticate();
      errors.push('auth.fail: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'auth.fail: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('auth.fail.code', err.code, 'invalid_authorization', errors);
      }
    }
    const authFailStatus = await getAmazonConnectionStatus(authFailClient);
    assertEqual('status.authFail.authenticated', authFailStatus.body.authenticated, false, errors);
    assertEqual('status.authFail.connected', authFailStatus.body.connected, false, errors);
    assertEqual('status.authFail.statusCode', authFailStatus.statusCode, 401, errors);
    assertNoSecretLeakage('status.authFail', JSON.stringify(authFailStatus.body), errors);

    // SP-API error after successful auth
    let call = 0;
    const apiFailClient = createAmazonApiClient({
      httpClient: async (input) => {
        call += 1;
        if (String(input).includes('/auth/o2/token')) {
          return jsonResponse(200, {
            access_token: 'Atza|ACCESS_TOKEN_VALUE',
            token_type: 'bearer',
            expires_in: 3600
          });
        }
        return jsonResponse(500, { errors: [{ code: 'ServerError' }] });
      }
    });
    const apiFailStatus = await getAmazonConnectionStatus(apiFailClient);
    assertEqual('status.apiFail.authenticated', apiFailStatus.body.authenticated, true, errors);
    assertEqual('status.apiFail.connected', apiFailStatus.body.connected, false, errors);
    assertEqual('status.apiFail.statusCode', apiFailStatus.statusCode, 502, errors);
    assert(call >= 2, 'status.apiFail: expected LWA + SP-API calls', errors);

    // Rate-limit handling (no retry loop)
    let rateCalls = 0;
    const rateClient = createAmazonApiClient({
      httpClient: async (input) => {
        rateCalls += 1;
        if (String(input).includes('/auth/o2/token')) {
          return jsonResponse(200, {
            access_token: 'Atza|ACCESS_TOKEN_VALUE',
            token_type: 'bearer',
            expires_in: 3600
          });
        }
        return jsonResponse(
          429,
          { errors: [{ code: 'QuotaExceeded' }] },
          { 'retry-after': '12' }
        );
      }
    });
    try {
      await rateClient.authenticate();
      await rateClient.verifySellerConnection();
      errors.push('rate: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'rate: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('rate.code', err.code, 'rate_limited', errors);
        assertEqual('rate.retryAfter', err.retryAfterSeconds, 12, errors);
      }
    }
    assertEqual('rate.calls', rateCalls, 2, errors); // one LWA + one SP-API, no retries

    const rateStatus = await getAmazonConnectionStatus(
      createAmazonApiClient({
        httpClient: async (input) => {
          if (String(input).includes('/auth/o2/token')) {
            return jsonResponse(200, {
              access_token: 'Atza|ACCESS_TOKEN_VALUE',
              token_type: 'bearer',
              expires_in: 3600
            });
          }
          return jsonResponse(429, {}, { 'retry-after': '5' });
        }
      })
    );
    assertEqual('status.rate.statusCode', rateStatus.statusCode, 429, errors);
    assertEqual('status.rate.errorCode', rateStatus.body.error?.code, 'rate_limited', errors);
    assertEqual('status.rate.retry', rateStatus.body.error?.retryAfterSeconds, 5, errors);

    // Network failure
    const networkClient = createAmazonApiClient({
      httpClient: async () => {
        throw new Error('connect ECONNREFUSED');
      }
    });
    try {
      await networkClient.authenticate();
      errors.push('network: expected AmazonApiError');
    } catch (err) {
      assert(err instanceof AmazonApiError, 'network: wrong type', errors);
      if (err instanceof AmazonApiError) {
        assertEqual('network.code', err.code, 'network_error', errors);
      }
    }

    // Sanitize helper redacts tokens
    const scrubbed = sanitizeForLog(
      'token=Atza|abc123 refresh_token=Atzr|xyz client_secret=SECRET'
    );
    assert(!scrubbed.includes('Atza|abc123'), 'sanitize access token', errors);
    assert(!scrubbed.includes('Atzr|xyz'), 'sanitize refresh token', errors);
    assert(scrubbed.includes('[redacted]'), 'sanitize marker', errors);
  });

  if (errors.length > 0) {
    throw new Error(`Amazon Phase 5B validation failed:\n- ${errors.join('\n- ')}`);
  }
}

void runAmazonPhase5bValidation()
  .then(() => {
    console.log('Amazon Phase 5B validation passed');
  })
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
