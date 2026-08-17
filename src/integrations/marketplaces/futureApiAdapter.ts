/**
 * Future API adapter boundary (Phase 4E documentation stub).
 *
 * Intended progression:
 *   MarketplaceAdapter
 *     → LocalReportMarketplaceAdapter  (current Amazon / Flipkart reports)
 *     → FutureApiMarketplaceAdapter    (later — server-side only)
 *
 * When implementing FutureApiMarketplaceAdapter:
 * - Call a backend / API integration layer — never marketplace APIs from the browser
 * - Keep credentials, OAuth tokens, and secrets off the client
 * - Still return MarketplaceDailyMetric[] into the existing dashboard
 * - Do not feed business-report sales into calculateFinancialSummary / profit
 *
 * This file intentionally exports types/docs only — no Express, DB, or secrets.
 */

export type { FutureApiMarketplaceAdapter } from './types';
