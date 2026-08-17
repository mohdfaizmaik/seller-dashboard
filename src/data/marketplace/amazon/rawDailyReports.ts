/**
 * Amazon Business Report sample rows for marketplace performance ingestion.
 *
 * Phase 4A.1: Row dated 01/07/26 matches the provided real Amazon Business
 * Report column structure and values used for normalization validation.
 *
 * These are static sample records for the marketplace-performance data layer.
 * They are NOT live Amazon SP-API feeds and must not drive financial profit.
 */

import type { AmazonRawDailyReport } from '../../../models/marketplaceReport';

export const MOCK_AMAZON_RAW_DAILY_REPORTS: AmazonRawDailyReport[] = [
  {
    Date: '01/07/26',
    'Ordered Product Sales': '₹1,08,218.36',
    'Ordered Product Sales - B2B': '₹897.60',
    'Units Ordered': 169,
    'Units Ordered - B2B': 2,
    'Total Order Items': 169,
    'Total Order Items - B2B': 2,
    'Page Views - Total': 20200,
    'Page Views - Total - B2B': 318,
    'Sessions - Total': 15147,
    'Sessions - Total - B2B': 226,
    'Featured Offer Percentage': '99.89%',
    'Featured Offer Percentage - B2B': '100.00%',
    'Unit Session Percentage': '1.12%',
    'Unit Session Percentage - B2B': '0.88%',
    'Average Offer Count': 49,
    'Average Parent Items': 23
  },
  {
    Date: '02/07/26',
    'Ordered Product Sales': '₹95,430.00',
    'Ordered Product Sales - B2B': '₹1,250.00',
    'Units Ordered': 148,
    'Units Ordered - B2B': 3,
    'Total Order Items': 148,
    'Total Order Items - B2B': 3,
    'Page Views - Total': 18750,
    'Page Views - Total - B2B': 290,
    'Sessions - Total': 14200,
    'Sessions - Total - B2B': 210,
    'Featured Offer Percentage': '99.50%',
    'Featured Offer Percentage - B2B': '100.00%',
    'Unit Session Percentage': '1.04%',
    'Unit Session Percentage - B2B': '1.43%',
    'Average Offer Count': 48,
    'Average Parent Items': 22
  },
  {
    Date: '03/07/26',
    'Ordered Product Sales': '₹1,12,890.75',
    'Ordered Product Sales - B2B': '₹640.00',
    'Units Ordered': 175,
    'Units Ordered - B2B': 1,
    'Total Order Items': 175,
    'Total Order Items - B2B': 1,
    'Page Views - Total': 21400,
    'Page Views - Total - B2B': 305,
    'Sessions - Total': 15890,
    'Sessions - Total - B2B': 198,
    'Featured Offer Percentage': '99.92%',
    'Featured Offer Percentage - B2B': '100.00%',
    'Unit Session Percentage': '1.10%',
    'Unit Session Percentage - B2B': '0.51%',
    'Average Offer Count': 50,
    'Average Parent Items': 24
  }
];
