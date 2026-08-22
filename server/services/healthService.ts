/**
 * Health service — no database required (Phase 5A).
 */

export interface HealthStatus {
  status: 'ok';
}

export function getHealthStatus(): HealthStatus {
  return { status: 'ok' };
}
