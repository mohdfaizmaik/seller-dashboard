/**
 * Flipkart marketplace adapter — local Sales Report source (Phase 4E).
 *
 * Uses existing Flipkart Sales Report normalization. No Seller API calls.
 * No credentials. Cash Back Report remains excluded from performance metrics.
 */

import { FLIPKART_RAW_SALES_REPORT_ROWS } from '../../../data/marketplace/flipkart/rawSalesReports';
import { normalizeFlipkartReport } from '../../../data/marketplace/flipkart/normalizeFlipkartReport';
import type { MarketplaceDailyMetric } from '../../../models/marketplaceReport';
import type {
  LocalReportMarketplaceAdapter,
  MarketplaceRequestContext
} from '../types';
import { filterMetricsByDateRange } from '../types';

function loadFlipkartNormalized(): MarketplaceDailyMetric[] {
  return normalizeFlipkartReport(FLIPKART_RAW_SALES_REPORT_ROWS);
}

export const flipkartAdapter: LocalReportMarketplaceAdapter = {
  platform: 'flipkart',
  source: 'local_report',

  getAllPerformanceDataSync(): MarketplaceDailyMetric[] {
    return loadFlipkartNormalized();
  },

  async getPerformanceData(
    startDate?: string,
    endDate?: string,
    _context?: MarketplaceRequestContext
  ): Promise<MarketplaceDailyMetric[]> {
    // Multi-seller context reserved for a later phase; ignored for local reports.
    return filterMetricsByDateRange(loadFlipkartNormalized(), startDate, endDate);
  }
};
