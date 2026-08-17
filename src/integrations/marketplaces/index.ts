/**
 * Marketplace integrations public entry (Phase 4E).
 *
 * Prefer getMarketplaceAdapter(platform) over marketplace-specific switches.
 */

export type {
  MarketplaceAdapter,
  MarketplaceIntegrationPlatform,
  MarketplaceRequestContext,
  SellerAccount,
  MarketplaceConnection,
  LocalReportMarketplaceAdapter,
  FutureApiMarketplaceAdapter
} from './types';

export {
  MarketplaceNotImplementedError,
  isLocalReportMarketplaceAdapter,
  filterMetricsByDateRange
} from './types';

export {
  getMarketplaceAdapter,
  listRegisteredMarketplacePlatforms,
  ACTIVE_LOCAL_REPORT_PLATFORMS
} from './marketplaceRegistry';
