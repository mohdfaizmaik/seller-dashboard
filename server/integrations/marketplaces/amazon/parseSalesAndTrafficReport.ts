/**
 * Parse Amazon Sales and Traffic Business Report documents (Phase 5C).
 *
 * SP-API reportType GET_SALES_AND_TRAFFIC_REPORT returns JSON
 * (optionally GZIP-compressed). Rows are bridged into AmazonRawDailyReport
 * so the existing normalizeAmazonReport() can be reused unchanged.
 *
 * Also accepts Seller Central-style TSV/CSV with the Phase 4A column headers
 * for fixture/regression compatibility.
 */

import { gunzipSync } from 'node:zlib';
import type { AmazonRawDailyReport } from '../../../../src/models/marketplaceReport';
import { AmazonApiError } from '../types';
import { ymdToAmazonRawDate } from './amazonDateRange';

export const AMAZON_SALES_AND_TRAFFIC_REPORT_TYPE = 'GET_SALES_AND_TRAFFIC_REPORT';

/** Amazon Featured Offer % ≡ buyBoxPercentage in Sales & Traffic JSON. */
const COLUMN_ALIASES: Record<keyof AmazonRawDailyReport, string[]> = {
  Date: ['Date', 'date'],
  'Ordered Product Sales': ['Ordered Product Sales'],
  'Ordered Product Sales - B2B': ['Ordered Product Sales - B2B'],
  'Units Ordered': ['Units Ordered'],
  'Units Ordered - B2B': ['Units Ordered - B2B'],
  'Total Order Items': ['Total Order Items'],
  'Total Order Items - B2B': ['Total Order Items - B2B'],
  'Page Views - Total': ['Page Views - Total', 'Page Views'],
  'Page Views - Total - B2B': ['Page Views - Total - B2B', 'Page Views - B2B'],
  'Sessions - Total': ['Sessions - Total', 'Sessions'],
  'Sessions - Total - B2B': ['Sessions - Total - B2B', 'Sessions - B2B'],
  'Featured Offer Percentage': ['Featured Offer Percentage', 'Buy Box Percentage'],
  'Featured Offer Percentage - B2B': [
    'Featured Offer Percentage - B2B',
    'Buy Box Percentage - B2B'
  ],
  'Unit Session Percentage': ['Unit Session Percentage'],
  'Unit Session Percentage - B2B': ['Unit Session Percentage - B2B'],
  'Average Offer Count': ['Average Offer Count'],
  'Average Parent Items': ['Average Parent Items']
};

export function decodeAmazonReportDocument(
  bytes: Uint8Array,
  compressionAlgorithm?: string | null
): string {
  const algo = (compressionAlgorithm ?? '').trim().toUpperCase();
  try {
    if (algo === 'GZIP') {
      return gunzipSync(Buffer.from(bytes)).toString('utf8');
    }
    // Some documents omit compressionAlgorithm but are still gzip (1F 8B).
    if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      return gunzipSync(Buffer.from(bytes)).toString('utf8');
    }
    return Buffer.from(bytes).toString('utf8');
  } catch {
    throw new AmazonApiError(
      'malformed_report',
      'Failed to decode Amazon report document (compression/encoding)'
    );
  }
}

export function parseAmazonBusinessReportDocument(text: string): AmazonRawDailyReport[] {
  const trimmed = text.trim();
  if (trimmed === '') {
    throw new AmazonApiError('malformed_report', 'Amazon report document was empty');
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return parseSalesAndTrafficJson(trimmed);
  }

  return parseDelimitedSellerCentralReport(trimmed);
}

function parseSalesAndTrafficJson(text: string): AmazonRawDailyReport[] {
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new AmazonApiError('malformed_report', 'Amazon report JSON could not be parsed');
  }

  if (!payload || typeof payload !== 'object') {
    throw new AmazonApiError('malformed_report', 'Amazon report JSON root was invalid');
  }

  const root = payload as Record<string, unknown>;
  const byDate = root.salesAndTrafficByDate;
  if (!Array.isArray(byDate)) {
    throw new AmazonApiError(
      'malformed_report',
      'Amazon Sales and Traffic report missing salesAndTrafficByDate'
    );
  }

  return byDate.map((entry, index) => salesAndTrafficByDateToRaw(entry, index));
}

function salesAndTrafficByDateToRaw(entry: unknown, index: number): AmazonRawDailyReport {
  if (!entry || typeof entry !== 'object') {
    throw new AmazonApiError(
      'malformed_report',
      `Invalid salesAndTrafficByDate row at index ${index}`
    );
  }
  const row = entry as Record<string, unknown>;
  const dateRaw = row.date;
  if (typeof dateRaw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(dateRaw)) {
    throw new AmazonApiError(
      'malformed_report',
      `salesAndTrafficByDate[${index}] missing date`
    );
  }
  const ymd = dateRaw.slice(0, 10);
  const sales =
    row.salesByDate && typeof row.salesByDate === 'object'
      ? (row.salesByDate as Record<string, unknown>)
      : {};
  const traffic =
    row.trafficByDate && typeof row.trafficByDate === 'object'
      ? (row.trafficByDate as Record<string, unknown>)
      : {};

  // Bridge into Seller Central column names expected by normalizeAmazonReport().
  // buyBoxPercentage ≡ Featured Offer Percentage in the existing dashboard schema.
  return {
    Date: ymdToAmazonRawDate(ymd),
    'Ordered Product Sales': moneyAmount(sales.orderedProductSales),
    'Ordered Product Sales - B2B': moneyAmount(sales.orderedProductSalesB2B),
    'Units Ordered': countValue(sales.unitsOrdered),
    'Units Ordered - B2B': countValue(sales.unitsOrderedB2B),
    'Total Order Items': countValue(sales.totalOrderItems),
    'Total Order Items - B2B': countValue(sales.totalOrderItemsB2B),
    'Page Views - Total': countValue(traffic.pageViews),
    'Page Views - Total - B2B': countValue(traffic.pageViewsB2B),
    'Sessions - Total': countValue(traffic.sessions),
    'Sessions - Total - B2B': countValue(traffic.sessionsB2B),
    'Featured Offer Percentage': percentValue(traffic.buyBoxPercentage),
    'Featured Offer Percentage - B2B': percentValue(traffic.buyBoxPercentageB2B),
    'Unit Session Percentage': percentValue(traffic.unitSessionPercentage),
    'Unit Session Percentage - B2B': percentValue(traffic.unitSessionPercentageB2B),
    'Average Offer Count': countValue(traffic.averageOfferCount),
    'Average Parent Items': countValue(traffic.averageParentItems)
  };
}

function moneyAmount(value: unknown): string | number {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    const amount = (value as Record<string, unknown>).amount;
    if (typeof amount === 'number') return amount;
    if (typeof amount === 'string') return amount;
  }
  if (typeof value === 'string') return value;
  return '';
}

function countValue(value: unknown): number | string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return '';
}

function percentValue(value: unknown): number | string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  return '';
}

function parseDelimitedSellerCentralReport(text: string): AmazonRawDailyReport[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');
  if (lines.length < 2) {
    throw new AmazonApiError('malformed_report', 'Delimited Amazon report had no data rows');
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map((h) => h.trim());
  const rows: AmazonRawDailyReport[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitDelimitedLine(lines[i], delimiter);
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = cells[idx] ?? '';
    });
    rows.push(mapHeaderRecordToRaw(record));
  }

  return rows;
}

function splitDelimitedLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t');
  }

  // CSV with quoted fields (e.g. "₹1,08,218.36")
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function mapHeaderRecordToRaw(record: Record<string, string>): AmazonRawDailyReport {
  const pick = (key: keyof AmazonRawDailyReport): string | number => {
    for (const alias of COLUMN_ALIASES[key]) {
      if (Object.prototype.hasOwnProperty.call(record, alias)) {
        return record[alias];
      }
    }
    return '';
  };

  return {
    Date: String(pick('Date')),
    'Ordered Product Sales': pick('Ordered Product Sales'),
    'Ordered Product Sales - B2B': pick('Ordered Product Sales - B2B'),
    'Units Ordered': pick('Units Ordered'),
    'Units Ordered - B2B': pick('Units Ordered - B2B'),
    'Total Order Items': pick('Total Order Items'),
    'Total Order Items - B2B': pick('Total Order Items - B2B'),
    'Page Views - Total': pick('Page Views - Total'),
    'Page Views - Total - B2B': pick('Page Views - Total - B2B'),
    'Sessions - Total': pick('Sessions - Total'),
    'Sessions - Total - B2B': pick('Sessions - Total - B2B'),
    'Featured Offer Percentage': pick('Featured Offer Percentage'),
    'Featured Offer Percentage - B2B': pick('Featured Offer Percentage - B2B'),
    'Unit Session Percentage': pick('Unit Session Percentage'),
    'Unit Session Percentage - B2B': pick('Unit Session Percentage - B2B'),
    'Average Offer Count': pick('Average Offer Count'),
    'Average Parent Items': pick('Average Parent Items')
  };
}
