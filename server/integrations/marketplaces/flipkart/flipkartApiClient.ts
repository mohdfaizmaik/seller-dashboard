/**
 * Flipkart Seller API client boundary (Phase 5A placeholder).
 *
 * Not implemented. Do not invent Flipkart API responses in this phase.
 * Local Sales Report adapters on the frontend remain the active data source.
 */

import { MarketplaceApiNotConfiguredError } from '../types';

const NOT_CONFIGURED = 'Flipkart API integration not configured';

export class FlipkartApiClient {
  readonly platform = 'flipkart' as const;

  async authenticate(): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('flipkart', NOT_CONFIGURED);
  }

  async getReports(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('flipkart', NOT_CONFIGURED);
  }

  async getOrders(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('flipkart', NOT_CONFIGURED);
  }

  async getSettlements(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('flipkart', NOT_CONFIGURED);
  }

  async getReturns(_params?: { startDate?: string; endDate?: string }): Promise<never> {
    throw new MarketplaceApiNotConfiguredError('flipkart', NOT_CONFIGURED);
  }
}

export function createFlipkartApiClient(): FlipkartApiClient {
  return new FlipkartApiClient();
}
