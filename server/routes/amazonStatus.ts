/**
 * GET /api/marketplaces/amazon/status
 *
 * Safe connection diagnostics only — never returns tokens or secrets.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { sendJson } from '../http/sendJson';
import { getAmazonConnectionStatus } from '../services/amazonStatusService';

export async function handleAmazonStatus(
  _req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const result = await getAmazonConnectionStatus();
  sendJson(res, result.statusCode, result.body);
}
