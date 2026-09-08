import React, { useState, useMemo } from 'react';
import { ShieldAlert, CheckCircle2, Upload, AlertTriangle } from 'lucide-react';
import type { Order } from '../../models/order';
import {
  type FeeReconciliationSummary,
  reconcileSettlementWithOrders,
  parseAmazonSettlement,
  parseFlipkartSettlement,
  detectSettlementReport,
  generateDemoSettlementAudit
} from '../../services/settlement/settlementService';
import { formatINR } from '../../services/analyticsService';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';

export interface SettlementReconciliationCardProps {
  orders: Order[];
}

export const SettlementReconciliationCard: React.FC<SettlementReconciliationCardProps> = ({ orders }) => {
  const [customSummary, setCustomSummary] = useState<FeeReconciliationSummary | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Default to synthetic audit if no custom settlement file is uploaded
  const summary = useMemo(() => {
    if (customSummary) return customSummary;
    return generateDemoSettlementAudit(orders);
  }, [customSummary, orders]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const detected = detectSettlementReport(content);

      let parsed = [];
      if (detected.marketplace === 'flipkart') {
        parsed = parseFlipkartSettlement(content);
      } else {
        parsed = parseAmazonSettlement(content);
      }

      const reconciled = reconcileSettlementWithOrders(parsed, orders);
      setCustomSummary(reconciled);
      setFileName(file.name);
    };
    reader.readAsText(file);
  };

  const hasOvercharge = summary.discrepancy > 0;

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <CardTitle>Bank Settlement & Fee Reconciliation</CardTitle>
          <Badge variant={hasOvercharge ? 'danger' : 'success'} size="sm">
            {hasOvercharge ? (
              <span className="flex items-center gap-1">
                <ShieldAlert size={12} />
                Overcharge Detected (+{formatINR(summary.discrepancy)})
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <CheckCircle2 size={12} />
                Reconciled / In Sync
              </span>
            )}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {fileName && (
            <span className="text-2xs text-slate-400 font-mono truncate max-w-xs" title={fileName}>
              {fileName}
            </span>
          )}
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
            <Upload size={13} />
            <span>Upload Settlement CSV</span>
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </CardHeader>

      <CardBody className="p-4 flex flex-col gap-4">
        {/* Metric Strips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
            <span className="text-2xs text-slate-400 font-medium uppercase">Audited Orders</span>
            <span className="text-base font-bold text-slate-200">{summary.totalReconciledOrders}</span>
            <span className="text-2xs text-slate-500">Settlement Transactions</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
            <span className="text-2xs text-slate-400 font-medium uppercase">Estimated Model Fees</span>
            <span className="text-base font-bold text-slate-200">{formatINR(summary.estimatedTotalFees)}</span>
            <span className="text-2xs text-slate-500">MTR & Catalog Rates</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
            <span className="text-2xs text-slate-400 font-medium uppercase">Actual Debited Fees</span>
            <span className="text-base font-bold text-amber-400">{formatINR(summary.actualTotalFees)}</span>
            <span className="text-2xs text-slate-500">Bank Disbursement Value</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex flex-col gap-1">
            <span className="text-2xs text-slate-400 font-medium uppercase">Hidden Fee Drag</span>
            <span className={`text-base font-bold ${hasOvercharge ? 'text-red-400' : 'text-green-400'}`}>
              +{formatINR(summary.discrepancy)}
            </span>
            <span className="text-2xs text-red-400/80 font-medium">
              {summary.overchargeCount} orders with surcharges
            </span>
          </div>
        </div>

        {/* Hidden Fee Leakage Breakdown */}
        {hasOvercharge && (
          <div className="p-3.5 rounded-lg bg-red-950/20 border border-red-900/40 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-300">
              <AlertTriangle size={15} />
              <span>Identified Sources of Hidden Fee Discrepancies:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex justify-between p-2 rounded bg-slate-900/40 border border-red-900/30">
                <span className="text-slate-400">Weight Surcharges:</span>
                <span className="font-bold text-slate-200">
                  {formatINR(summary.hiddenFeeBreakdown.weightHandlingSurcharge)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/40 border border-red-900/30">
                <span className="text-slate-400">Closing Fee Reclass:</span>
                <span className="font-bold text-slate-200">
                  {formatINR(summary.hiddenFeeBreakdown.closingFeeDiscrepancy)}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/40 border border-red-900/30">
                <span className="text-slate-400">Pick-Pack / Other Delta:</span>
                <span className="font-bold text-slate-200">
                  {formatINR(summary.hiddenFeeBreakdown.otherSurcharges)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Audit Sample Table */}
        {summary.discrepantOrders.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-300">
              Discrepant Orders Audit Sample (Top {Math.min(5, summary.discrepantOrders.length)})
            </span>
            <div className="table-container">
              <table className="data-table text-2xs">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Marketplace</th>
                    <th>SKU</th>
                    <th>Estimated Fee</th>
                    <th>Actual Debited</th>
                    <th>Discrepancy</th>
                    <th>Diagnosis / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.discrepantOrders.slice(0, 5).map((d) => (
                    <tr key={d.orderId}>
                      <td className="font-mono text-slate-300">{d.orderId}</td>
                      <td>
                        <Badge variant={d.marketplace} size="sm">
                          {d.marketplace}
                        </Badge>
                      </td>
                      <td className="font-semibold text-slate-300">{d.sku}</td>
                      <td>{formatINR(d.estimatedFee)}</td>
                      <td className="font-semibold text-amber-400">{formatINR(d.actualFee)}</td>
                      <td className="font-bold text-red-400">+{formatINR(d.discrepancy)}</td>
                      <td className="text-slate-400">{d.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
