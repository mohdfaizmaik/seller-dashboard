/**
 * Marketplace adapter registry / factory (Phase 4E).
 *
 * Resolve adapters by platform instead of scattering switch statements
 * across the application. Amazon and Flipkart are local-report backed;
 * Meesho is registered but explicitly not implemented.
 */

import type { MarketplaceAdapter, MarketplaceIntegrationPlatform } from './types';
import { amazonAdapter } from './amazon/amazonAdapter';
import { flipkartAdapter } from './flipkart/flipkartAdapter';
import { meeshoAdapter } from './meesho/meeshoAdapter';

const MARKETPLACE_ADAPTERS: Record<MarketplaceIntegrationPlatform, MarketplaceAdapter> = {
  amazon: amazonAdapter,
  flipkart: flipkartAdapter,
  meesho: meeshoAdapter
};

/** Platforms that currently contribute local performance data to the dashboard. */
export const ACTIVE_LOCAL_REPORT_PLATFORMS: ReadonlyArray<'amazon' | 'flipkart'> = [
  'amazon',
  'flipkart'
];

/**
 * Resolves the marketplace adapter for a platform.
 * Always returns a registered adapter — Meesho is present but throws on use.
 */
export function getMarketplaceAdapter(
  platform: MarketplaceIntegrationPlatform
): MarketplaceAdapter {
  const adapter = MARKETPLACE_ADAPTERS[platform];
  if (!adapter) {
    throw new Error(`No marketplace adapter registered for platform: ${String(platform)}`);
  }
  return adapter;
}

/** Lists all registered integration platforms (including not-implemented). */
export function listRegisteredMarketplacePlatforms(): MarketplaceIntegrationPlatform[] {
  return Object.keys(MARKETPLACE_ADAPTERS) as MarketplaceIntegrationPlatform[];
}
