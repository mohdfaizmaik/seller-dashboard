/**
 * Amazon marketplace adapter — local Business Report source (Phase 4E).
 *
 * Uses existing Amazon report normalization. No SP-API calls.
 * No credentials. Performance plane only — not financial truth.
 */

import { MOCK_AMAZON_RAW_DAILY_REPORTS } from '../../../data/marketplace/amazon/rawDailyReports';
import { normalizeAmazonReport } from '../../../data/marketplace/amazon/normalizeAmazonReport';
import type { MarketplaceDailyMetric } from '../../../models/marketplaceReport';
import type {
  LocalReportMarketplaceAdapter,
  MarketplaceRequestContext
} from '../types';
import { filterMetricsByDateRange } from '../types';

function loadAmazonNormalized(): MarketplaceDailyMetric[] {
  return normalizeAmazonReport(MOCK_AMAZON_RAW_DAILY_REPORTS);
}

export const amazonAdapter: LocalReportMarketplaceAdapter = {
  platform: 'amazon',
  source: 'local_report',

  getAllPerformanceDataSync(): MarketplaceDailyMetric[] {
    return loadAmazonNormalized();
  },

  async getPerformanceData(
    startDate?: string,
    endDate?: string,
    _context?: MarketplaceRequestContext
  ): Promise<MarketplaceDailyMetric[]> {
    // Multi-seller context reserved for a later phase; ignored for local reports.
    return filterMetricsByDateRange(loadAmazonNormalized(), startDate, endDate);
  }
};
