/**
 * Amazon report date-range helpers (Phase 5C).
 *
 * Dashboard uses YYYY-MM-DD; SP-API Reports expects ISO-8601 date-times.
 * Do not reuse or modify financial getDateRangeFromPreset() logic here.
 */

import { AmazonApiError } from '../types';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertYmd(label: string, value: string): string {
  const trimmed = value.trim();
  if (!YMD_RE.test(trimmed)) {
    throw new AmazonApiError(
      'invalid_date_range',
      `Invalid ${label}: expected YYYY-MM-DD`
    );
  }
  const [y, m, d] = trimmed.split('-').map((part) => Number.parseInt(part, 10));
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    throw new AmazonApiError('invalid_date_range', `Invalid ${label}: not a real calendar date`);
  }
  return trimmed;
}

export function assertAmazonReportDateRange(
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } {
  const start = assertYmd('startDate', startDate);
  const end = assertYmd('endDate', endDate);
  if (start > end) {
    throw new AmazonApiError(
      'invalid_date_range',
      'startDate must be on or before endDate'
    );
  }
  return { startDate: start, endDate: end };
}

/** Inclusive day start in UTC ISO-8601 for SP-API dataStartTime. */
export function ymdToAmazonDataStartTime(ymd: string): string {
  const day = assertYmd('startDate', ymd);
  return `${day}T00:00:00.000Z`;
}

/** Inclusive day end in UTC ISO-8601 for SP-API dataEndTime. */
export function ymdToAmazonDataEndTime(ymd: string): string {
  const day = assertYmd('endDate', ymd);
  return `${day}T23:59:59.999Z`;
}

/** Converts SP-API report date (YYYY-MM-DD) to Seller Central-style DD/MM/YY for the existing normalizer. */
export function ymdToAmazonRawDate(ymd: string): string {
  const day = assertYmd('date', ymd);
  const [yyyy, mm, dd] = day.split('-');
  return `${dd}/${mm}/${yyyy.slice(2)}`;
}
