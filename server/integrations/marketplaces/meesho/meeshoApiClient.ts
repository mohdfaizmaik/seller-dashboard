/**
 * Meesho API client boundary (Phase 5A placeholder).
 *
 * Not implemented. Do not invent Meesho API fields or fake data.
 */

import { MarketplaceApiNotConfiguredError } from '../types';

const NOT_CONFIGURED = 'Meesho API integration not configured';

export class MeeshoApiClient {
  readonly platform = 'meesho' as const;

  async authenticate(): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('meesho', NOT_CONFIGURED);
  }

  async getReports(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('meesho', NOT_CONFIGURED);
  }

  async getOrders(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('meesho', NOT_CONFIGURED);
  }

  async getSettlements(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('meesho', NOT_CONFIGURED);
  }

  async getReturns(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('meesho', NOT_CONFIGURED);
  }
}

export function createMeeshoApiClient(): MeeshoApiClient {
  return new MeeshoApiClient();
}
