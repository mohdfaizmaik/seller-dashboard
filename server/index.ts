/**
 * Seller dashboard backend entry (Phase 5A / 5B / 5C).
 *
 * Minimal Node http server. No Express. No database.
 *
 * Separation:
 *   HTTP/API layer (routes/)
 *     → services/
 *     → integrations/marketplaces/ (Amazon LWA + Reports ingestion)
 *
 * The React/Vite frontend continues to use local report adapters.
 * Amazon credentials stay server-side only.
 * Business Report data is PERFORMANCE only — not financial truth.
 */

import { createServer } from 'node:http';
import {
  getSafeConfigSummary,
  getServerConfig,
  loadEnvFile,
  sanitizeForLog
} from './config/env';
import { handleRequest } from './routes/index';

loadEnvFile();

const config = getServerConfig();

const server = createServer((req, res) => {
  void handleRequest(req, res).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('[server] request failed:', sanitizeForLog(message));
    if (!res.headersSent) {
      const payload = JSON.stringify({ error: 'Internal Server Error' });
      res.writeHead(500, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(payload)
      });
      res.end(payload);
    }
  });
});

server.listen(config.port, () => {
  console.log(
    `[server] listening on http://localhost:${config.port}`,
    getSafeConfigSummary(config)
  );
  console.log('[server] health: GET /api/health');
  console.log('[server] amazon status: GET /api/marketplaces/amazon/status');
  console.log(
    '[server] amazon performance: GET /api/marketplaces/amazon/performance?startDate=&endDate='
  );
});
