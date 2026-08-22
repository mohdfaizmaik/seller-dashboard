/**
 * Future API adapter boundary (Phase 4E / 5A).
 *
 * Intended progression:
 *   MarketplaceAdapter (frontend contract)
 *     → LocalReportMarketplaceAdapter  (current Amazon / Flipkart reports)
 *     → FutureApiMarketplaceAdapter    (later — calls server, never SP-API from browser)
 *
 * Server foundation (Phase 5A) lives under `/server`:
 *   HTTP routes → server marketplace clients → (future) normalization
 *
 * When implementing FutureApiMarketplaceAdapter:
 * - Call this app's backend only — never marketplace APIs from the browser
 * - Keep credentials, OAuth tokens, and secrets off the client
 * - Still return MarketplaceDailyMetric[] into the existing dashboard
 * - Do not feed business-report sales into calculateFinancialSummary / profit
 *
 * This file intentionally exports types/docs only — no Express, DB, or secrets.
 */

export type { FutureApiMarketplaceAdapter } from './types';
