/**
 * Marketplace integration foundation types (Phase 4E).
 *
 * Architecture target:
 *   Amazon / Flipkart / Meesho / future APIs
 *     → MarketplaceAdapter (this boundary)
 *       → LocalReportAdapter (current mock/uploaded reports)
 *       → FutureApiAdapter (later — backend only)
 *         → Normalized MarketplaceDailyMetric[]
 *           → Existing React dashboard
 *
 * Credentials must NEVER live in React components, Vite public env,
 * localStorage, sessionStorage, or source-controlled files.
 * Backend/OAuth/secrets belong in a later phase.
 *
 * Performance metrics remain separate from financial truth
 * (analyticsService / MOCK_ORDERS / calculateFinancialSummary).
 */

import type { MarketplaceDailyMetric, MarketplacePlatform } from '../../models/marketplaceReport';

/** Supported marketplace platforms for the integration layer. */
export type MarketplaceIntegrationPlatform = MarketplacePlatform;

/**
 * Optional request context for multi-seller readiness.
 * Not fully implemented — extension point only.
 */
export interface SellerAccount {
  /** Stable seller identity within this app (future multi-tenancy). */
  sellerId: string;
  displayName?: string;
}

/**
 * Future marketplace connection metadata (no credentials here).
 * Connection secrets belong on a backend in a later phase.
 */
export interface MarketplaceConnection {
  sellerId: string;
  platform: MarketplaceIntegrationPlatform;
  /** Opaque connection id — never an API key or OAuth token. */
  connectionId: string;
  status: 'not_connected' | 'connected' | 'error';
}

export interface MarketplaceRequestContext {
  seller?: SellerAccount;
  connection?: MarketplaceConnection;
}

/**
 * Common marketplace adapter contract.
 *
 * Current implementations are local report-backed.
 * Future methods (getOrders, getReturns, getSettlements, getAds)
 * may be added without changing the dashboard's financial plane.
 */
export interface MarketplaceAdapter {
  readonly platform: MarketplaceIntegrationPlatform;

  /**
   * Normalized daily performance metrics for the optional date window.
   * Dates are inclusive YYYY-MM-DD when provided.
   */
  getPerformanceData(
    startDate?: string,
    endDate?: string,
    context?: MarketplaceRequestContext
  ): Promise<MarketplaceDailyMetric[]>;

  // Future (not implemented in Phase 4E):
  // getOrders(context?: MarketplaceRequestContext): Promise<unknown[]>;
  // getReturns(context?: MarketplaceRequestContext): Promise<unknown[]>;
  // getSettlements(context?: MarketplaceRequestContext): Promise<unknown[]>;
  // getAds(context?: MarketplaceRequestContext): Promise<unknown[]>;
}

/** How an adapter obtains data in this phase. */
export type MarketplaceAdapterSource = 'local_report' | 'not_implemented' | 'future_api';

/**
 * Local uploaded/mock report adapters used by the current dashboard.
 * Sync accessor supports the existing module-load corpus without changing UI.
 */
export interface LocalReportMarketplaceAdapter extends MarketplaceAdapter {
  readonly source: 'local_report';
  /** Full normalized corpus (unfiltered) for the current local report source. */
  getAllPerformanceDataSync(): MarketplaceDailyMetric[];
}

export function isLocalReportMarketplaceAdapter(
  adapter: MarketplaceAdapter
): adapter is LocalReportMarketplaceAdapter {
  return (
    'source' in adapter &&
    (adapter as LocalReportMarketplaceAdapter).source === 'local_report' &&
    typeof (adapter as LocalReportMarketplaceAdapter).getAllPerformanceDataSync === 'function'
  );
}

/**
 * Placeholder for a later backend-backed adapter.
 * Do not implement API calls, OAuth, or credential storage here.
 */
export interface FutureApiMarketplaceAdapter extends MarketplaceAdapter {
  readonly source: 'future_api';
}

/** Controlled error when a marketplace is registered but not yet integrated. */
export class MarketplaceNotImplementedError extends Error {
  readonly platform: MarketplaceIntegrationPlatform;

  constructor(platform: MarketplaceIntegrationPlatform, message?: string) {
    super(
      message ??
        `Marketplace integration for "${platform}" is not implemented yet. No API fields or mock columns have been invented.`
    );
    this.name = 'MarketplaceNotImplementedError';
    this.platform = platform;
  }
}

/** Inclusive YYYY-MM-DD filter helper shared by local adapters. */
export function filterMetricsByDateRange(
  rows: MarketplaceDailyMetric[],
  startDate?: string,
  endDate?: string
): MarketplaceDailyMetric[] {
  return rows.filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}
