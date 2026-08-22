/**
 * GET /api/marketplaces/amazon/performance?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *
 * Normalized performance metrics only — never tokens or document URLs.
 * Frontend is NOT wired to this endpoint in Phase 5C.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../http/sendJson';
import { getAmazonPerformanceMetrics } from '../services/amazonPerformanceService';

export async function handleAmazonPerformance(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let startDate = '';
  let endDate = '';
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    startDate = url.searchParams.get('startDate') ?? '';
    endDate = url.searchParams.get('endDate') ?? '';
  } catch {
    sendJson(res, 400, {
      platform: 'amazon',
      configured: false,
      error: { code: 'invalid_date_range', message: 'Invalid request URL' }
    });
    return;
  }

  if (!startDate || !endDate) {
    sendJson(res, 400, {
      platform: 'amazon',
      configured: false,
      error: {
        code: 'invalid_date_range',
        message: 'Query parameters startDate and endDate (YYYY-MM-DD) are required'
      }
    });
    return;
  }

  const result = await getAmazonPerformanceMetrics(startDate, endDate);
  sendJson(res, result.statusCode, result.body);
}
