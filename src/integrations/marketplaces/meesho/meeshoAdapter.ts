/**
 * Meesho marketplace adapter — placeholder for live REST/GraphQL API integration.
 *
 * NOTE: Offline report CSV/TSV ingestion and 0% commission analytics for Meesho
 * are fully implemented and supported in `src/services/importer/normalizers/meeshoNormalizer.ts`.
 * Live seller portal sync will be added if Meesho releases open developer APIs.
 */

import type { MarketplaceAdapter, MarketplaceRequestContext } from '../types';
import { MarketplaceNotImplementedError } from '../types';

export const meeshoAdapter: MarketplaceAdapter & { readonly source: 'not_implemented' } = {
  platform: 'meesho',
  source: 'not_implemented',

  async getPerformanceData(
    _startDate?: string,
    _endDate?: string,
    _context?: MarketplaceRequestContext
  ): Promise<never> {
    throw new MarketplaceNotImplementedError('meesho');
  }
};
