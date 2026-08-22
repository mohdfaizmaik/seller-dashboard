/**
 * GET /api/health
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { getHealthStatus } from '../services/healthService';
import { sendJson } from '../http/sendJson';

export function handleHealth(_req: IncomingMessage, res: ServerResponse): void {
  sendJson(res, 200, getHealthStatus());
}
