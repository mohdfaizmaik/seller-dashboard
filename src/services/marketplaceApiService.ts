/**
 * Frontend API client for Amazon marketplace performance backend (Phase 5D).
 *
 * Calls GET /api/marketplaces/amazon/performance?startDate=...&endDate=...
 * Returns normalized MarketplaceDailyMetric[] on success, or a controlled
 * error the caller can use to fall back to local data.
 *
 * No credentials, tokens, client secrets, or refresh tokens.
 * The backend handles all Amazon SP-API authentication server-side.
 */

import type { MarketplaceDailyMetric } from '../models/marketplaceReport';

/**
 * Discriminated result from the Amazon performance backend request.
 *
 *   ok: true  → backend responded with valid data (may be empty [])
 *   ok: false → caller should fall back to local Amazon adapter
 */
export type AmazonPerformanceResult =
  | { ok: true; data: MarketplaceDailyMetric[] }
  | { ok: false; reason: string };

/**
 * All fields that must be present on every MarketplaceDailyMetric
 * received from the backend. Each numeric field must be number | null.
 */
const NUMERIC_METRIC_KEYS: ReadonlyArray<keyof MarketplaceDailyMetric> = [
  'orderedProductSales',
  'orderedProductSalesB2B',
  'unitsOrdered',
  'unitsOrderedB2B',
  'totalOrderItems',
  'totalOrderItemsB2B',
  'pageViews',
  'pageViewsB2B',
  'sessions',
  'sessionsB2B',
  'featuredOfferPercentage',
  'featuredOfferPercentageB2B',
  'unitSessionPercentage',
  'unitSessionPercentageB2B',
  'averageOfferCount',
  'averageParentItems'
];

/**
 * Validates a single item from the backend response.
 * Returns true only if the item has all required fields with correct types.
 * Does NOT convert null to zero.
 */
function isValidMetric(item: unknown): item is MarketplaceDailyMetric {
  if (item === null || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;

  // date must be a non-empty string
  if (typeof obj['date'] !== 'string' || obj['date'] === '') return false;

  // platform must be 'amazon'
  if (obj['platform'] !== 'amazon') return false;

  // Every numeric field must exist and be number | null
  for (const key of NUMERIC_METRIC_KEYS) {
    if (!(key in obj)) return false;
    const val = obj[key];
    if (val !== null && typeof val !== 'number') return false;
  }

  return true;
}

/**
 * Validates an entire backend metrics array.
 * Exported for unit testing by the Phase 5D validation script.
 */
export function validateBackendMetrics(
  metrics: unknown[]
): metrics is MarketplaceDailyMetric[] {
  return metrics.every(isValidMetric);
}

/**
 * Fetches Amazon performance metrics from the backend.
 *
 * Returns { ok: true, data } on success (including empty []).
 * Returns { ok: false, reason } on any failure — caller uses local fallback.
 *
 * Does not throw. Does not expose raw backend error bodies to callers.
 */
export async function getAmazonPerformance(
  startDate: string,
  endDate: string
): Promise<AmazonPerformanceResult> {
  let response: Response;
  try {
    response = await fetch(
      `/api/marketplaces/amazon/performance?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
    );
  } catch {
    return { ok: false, reason: 'Network request failed' };
  }

  if (!response.ok) {
    switch (response.status) {
      case 400:
        return { ok: false, reason: 'Invalid date range' };
      case 401:
        return { ok: false, reason: 'Not authorized' };
      case 403:
        return { ok: false, reason: 'Access denied' };
      case 429:
        return { ok: false, reason: 'Rate limited' };
      case 503:
        return { ok: false, reason: 'Amazon API not configured' };
      default:
        return { ok: false, reason: 'Backend unavailable' };
    }
  }

  // Parse JSON safely
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, reason: 'Malformed response' };
  }

  // Expect envelope: { platform: 'amazon', metrics: [...] }
  if (body === null || typeof body !== 'object') {
    return { ok: false, reason: 'Malformed response' };
  }

  const envelope = body as Record<string, unknown>;
  if (!Array.isArray(envelope['metrics'])) {
    return { ok: false, reason: 'Malformed response' };
  }

  const metrics = envelope['metrics'] as unknown[];

  // Empty array is a valid success — not a fallback trigger
  if (metrics.length === 0) {
    return { ok: true, data: [] };
  }

  // Validate every item before accepting
  if (!validateBackendMetrics(metrics)) {
    return { ok: false, reason: 'Malformed data' };
  }

  return { ok: true, data: metrics };
}
