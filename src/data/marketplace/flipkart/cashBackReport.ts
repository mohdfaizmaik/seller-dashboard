/**
 * Flipkart Cash Back Report — documentation only (Phase 4A.2).
 *
 * Uploaded workbook sheet: "Cash Back Report".
 *
 * Architectural boundary:
 * - MarketplaceDailyMetric remains the performance plane (Sales Report only).
 * - Do NOT merge Cash Back Report into MarketplaceDailyMetric.
 * - Do NOT introduce financial calculations from this report here.
 *
 * Observed contents from the uploaded export:
 * - Credit Note
 * - Debit Note
 * - Sale
 * - Cancellation
 * - Invoice Amount
 * - Invoice Date
 *
 * Also present: Order ID, Order Item ID, Document Type, Document Sub Type
 * (Sale / Cancellation / Return / Return Cancellation), Credit Note ID/
 * Debit Note ID, Taxable Value, and tax/TCS breakdown fields.
 *
 * Future use: returns / refunds / cancellations / financial reconciliation
 * (separate from marketplace performance metrics).
 */

import type { FlipkartCashBackReportRow } from '../../../models/marketplaceReport';

/**
 * Placeholder corpus — intentionally empty.
 * Cash Back rows are not ingested into the performance normalizer yet.
 */
export const FLIPKART_CASH_BACK_REPORT_ROWS: FlipkartCashBackReportRow[] = [];
