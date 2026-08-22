/**
 * HTTP route registry (Phase 5A / 5B / 5C).
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { handleHealth } from './health';
import { handleAmazonStatus } from './amazonStatus';
import { handleAmazonPerformance } from './amazonPerformance';
import { sendJson } from '../http/sendJson';

function getPathname(req: IncomingMessage): string {
  try {
    return new URL(req.url ?? '/', 'http://localhost').pathname;
  } catch {
    return '/';
  }
}

export async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const method = req.method ?? 'GET';
  const pathname = getPathname(req);

  if (method === 'GET' && pathname === '/api/health') {
    handleHealth(req, res);
    return;
  }

  if (method === 'GET' && pathname === '/api/marketplaces/amazon/status') {
    await handleAmazonStatus(req, res);
    return;
  }

  if (method === 'GET' && pathname === '/api/marketplaces/amazon/performance') {
    await handleAmazonPerformance(req, res);
    return;
  }

  sendJson(res, 404, {
    error: 'Not Found',
    path: pathname
  });
}
