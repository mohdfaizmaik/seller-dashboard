/**
 * Server-side environment configuration (Phase 5A / 5B).
 *
 * Marketplace credentials belong ONLY in process.env / a local .env file
 * that is never committed. Never send these values to the React/Vite client.
 *
 * Do not log access tokens, refresh tokens, client secrets, or seller credentials.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SECRET_ENV_SUFFIXES = [
  'SECRET',
  'TOKEN',
  'PASSWORD',
  'KEY',
  'CREDENTIAL',
  'REFRESH'
] as const;

export type AmazonSpApiRegion = 'na' | 'eu' | 'fe';

function looksSecret(name: string): boolean {
  const upper = name.toUpperCase();
  return SECRET_ENV_SUFFIXES.some((suffix) => upper.includes(suffix));
}

/**
 * Loads KEY=VALUE pairs from a local .env file into process.env when present.
 * Existing process.env values win (are not overwritten).
 * Does not log values.
 */
export function loadEnvFile(filePath = resolve(process.cwd(), '.env')): void {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readTrimmed(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function hasAll(keys: string[]): boolean {
  return keys.every((key) => readTrimmed(key) !== undefined);
}

function parseAmazonRegion(raw: string | undefined): AmazonSpApiRegion {
  const normalized = (raw ?? 'eu').trim().toLowerCase();
  if (normalized === 'na' || normalized === 'eu' || normalized === 'fe') {
    return normalized;
  }
  return 'eu';
}

export function getAmazonSpApiEndpoint(region: AmazonSpApiRegion): string {
  switch (region) {
    case 'na':
      return 'https://sellingpartnerapi-na.amazon.com';
    case 'fe':
      return 'https://sellingpartnerapi-fe.amazon.com';
    case 'eu':
    default:
      return 'https://sellingpartnerapi-eu.amazon.com';
  }
}

/**
 * Amazon SP-API credentials — server memory only.
 * Never serialize this object into HTTP responses or frontend bundles.
 */
export interface AmazonSpApiCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  region: AmazonSpApiRegion;
  marketplaceId?: string;
  lwaTokenUrl: string;
  spApiEndpoint: string;
}

export function isAmazonSpApiConfigured(): boolean {
  return hasAll(['AMAZON_CLIENT_ID', 'AMAZON_CLIENT_SECRET', 'AMAZON_REFRESH_TOKEN']);
}

/**
 * Reads Amazon credentials from env. Throws if incomplete.
 * Caller must not log or return the result over HTTP.
 */
export function getAmazonSpApiCredentials(): AmazonSpApiCredentials {
  const clientId = readTrimmed('AMAZON_CLIENT_ID');
  const clientSecret = readTrimmed('AMAZON_CLIENT_SECRET');
  const refreshToken = readTrimmed('AMAZON_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Amazon SP-API credentials are not configured');
  }

  const region = parseAmazonRegion(readTrimmed('AMAZON_SP_API_REGION'));
  const lwaTokenUrl =
    readTrimmed('AMAZON_LWA_TOKEN_URL') ?? 'https://api.amazon.com/auth/o2/token';

  return {
    clientId,
    clientSecret,
    refreshToken,
    region,
    marketplaceId: readTrimmed('AMAZON_MARKETPLACE_ID'),
    lwaTokenUrl,
    spApiEndpoint: getAmazonSpApiEndpoint(region)
  };
}

export interface ServerConfig {
  port: number;
  /** Present/absent flags only — never raw secret values. */
  amazon: {
    configured: boolean;
    region: AmazonSpApiRegion;
    spApiEndpoint: string;
  };
  flipkart: {
    configured: boolean;
  };
  meesho: {
    configured: boolean;
  };
}

/**
 * Reads server config. Secret material stays in process.env and is never
 * returned on this object.
 */
export function getServerConfig(): ServerConfig {
  const portRaw = process.env.PORT ?? '3001';
  const port = Number.parseInt(portRaw, 10);
  const region = parseAmazonRegion(readTrimmed('AMAZON_SP_API_REGION'));

  return {
    port: Number.isFinite(port) && port > 0 ? port : 3001,
    amazon: {
      configured: isAmazonSpApiConfigured(),
      region,
      spApiEndpoint: getAmazonSpApiEndpoint(region)
    },
    flipkart: {
      configured: hasAll(['FLIPKART_APP_ID', 'FLIPKART_APP_SECRET'])
    },
    meesho: {
      configured: hasAll(['MEESHO_API_KEY'])
    }
  };
}

/** Safe summary for logs — never includes secret values. */
export function getSafeConfigSummary(config: ServerConfig): Record<string, unknown> {
  return {
    port: config.port,
    amazonConfigured: config.amazon.configured,
    amazonRegion: config.amazon.region,
    flipkartConfigured: config.flipkart.configured,
    meeshoConfigured: config.meesho.configured
  };
}

/** Guard for accidental logging of secret-looking env names. */
export function assertSafeToLogEnvName(name: string): void {
  if (looksSecret(name)) {
    throw new Error(`Refusing to log environment variable that looks like a secret: ${name}`);
  }
}

/** Scrub strings before logging — strips token-like patterns. */
export function sanitizeForLog(value: string): string {
  return value
    .replace(/Atza\|[A-Za-z0-9._~+/-]+=*/g, '[redacted-access-token]')
    .replace(/Atzr\|[A-Za-z0-9._~+/-]+=*/g, '[redacted-refresh-token]')
    .replace(/client_secret=[^&\s]+/gi, 'client_secret=[redacted]')
    .replace(/refresh_token=[^&\s]+/gi, 'refresh_token=[redacted]')
    .replace(/access_token":\s*"[^"]+"/gi, 'access_token":"[redacted]"');
}
