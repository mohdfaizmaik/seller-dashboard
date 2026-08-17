/**
 * Meesho marketplace adapter — placeholder only (Phase 4E).
 *
 * Integration is NOT implemented.
 * Do NOT invent Meesho report columns, API fields, or fake performance data.
 * Real Meesho adapter work belongs in a later API-integration phase (backend).
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
