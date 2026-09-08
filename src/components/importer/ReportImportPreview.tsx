import React, { useState } from 'react';
import type { ParseReportResult } from '../../services/importer';
import type { Order } from '../../models/order';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  FileText,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

interface ReportImportPreviewProps {
  fileName: string;
  fileSize?: number;
  parseResult: ParseReportResult;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ReportImportPreview: React.FC<ReportImportPreviewProps> = ({
  fileName,
  fileSize,
  parseResult,
  onConfirm,
  onCancel,
  isSubmitting = false
}) => {
  const [showWarnings, setShowWarnings] = useState(false);
  const { preview, orders, errors, warnings, marketplace, reportType } = parseResult;

  // Formatting helpers
  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Aggregated KPI numbers from normalized orders
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;
  const returnedCount = orders.filter((o) => o.status === 'returned').length;
  const totalFees = orders.reduce(
    (sum, o) => sum + (o.estimatedFees?.totalFees || 0),
    0
  );
  const totalNetProfit = orders.reduce(
    (sum, o) => sum + (o.estimatedNetProfit || 0),
    0
  );

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'shipped':
      case 'delivered':
        return <Badge variant="success">{status}</Badge>;
      case 'cancelled':
        return <Badge variant="danger">cancelled</Badge>;
      case 'returned':
        return <Badge variant="warning">returned</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const allAlerts = [...errors, ...warnings];

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Header Pill & Diagnostic Metadata */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-3.5"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--color-primary)'
            }}
          >
            <FileText size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-xs text-secondary truncate max-w-xs" title={fileName}>
              {fileName}
            </span>
            <span className="text-2xs text-muted">
              {formatFileSize(fileSize)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="amazon">
            {marketplace === 'amazon' ? 'Amazon India MTR' : marketplace.toUpperCase()}
          </Badge>
          <span
            className="text-2xs px-2 py-0.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)'
            }}
          >
            Format: {reportType}
          </span>
          {preview.dateRange && (
            <div className="flex items-center gap-1 text-2xs" style={{ color: 'var(--text-secondary)' }}>
              <Calendar size={12} />
              <span>
                {preview.dateRange.start} → {preview.dateRange.end}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <div
        className="grid grid-cols-2 sm:grid-cols-5 gap-2.5"
      >
        <div
          className="p-3 flex flex-col gap-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span className="text-2xs text-secondary font-medium">Total Rows</span>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {preview.totalRows}
          </span>
        </div>

        <div
          className="p-3 flex flex-col gap-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span className="text-2xs text-secondary font-medium">Valid Orders</span>
          <span className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>
            {preview.validRows}
          </span>
        </div>

        <div
          className="p-3 flex flex-col gap-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span className="text-2xs text-secondary font-medium">Cancelled / Ret.</span>
          <span className="text-lg font-bold" style={{ color: 'var(--color-warning)' }}>
            {cancelledCount + returnedCount}
          </span>
        </div>

        <div
          className="p-3 flex flex-col gap-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span className="text-2xs text-secondary font-medium">Gross Revenue</span>
          <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {formatINR(preview.totalGrossAmount || 0)}
          </span>
        </div>

        <div
          className="p-3 flex flex-col gap-0.5"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)'
          }}
        >
          <span className="text-2xs text-secondary font-medium">Est. Net Profit</span>
          <span className="text-lg font-bold" style={{ color: totalNetProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {formatINR(totalNetProfit)}
          </span>
        </div>
      </div>

      {/* 3. Sample Rows Preview Table */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Sample Order Rows Preview (Showing first {preview.sampleRows.length} of {orders.length})
          </span>
          <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
            Estimated Fees: {formatINR(totalFees)}
          </span>
        </div>

        <div
          className="overflow-x-auto"
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  textAlign: 'left'
                }}
              >
                <th className="p-2.5 font-medium">Date</th>
                <th className="p-2.5 font-medium">Order ID</th>
                <th className="p-2.5 font-medium">SKU</th>
                <th className="p-2.5 font-medium">Status</th>
                <th className="p-2.5 font-medium text-right">Amount</th>
                <th className="p-2.5 font-medium text-right">Tax</th>
                <th className="p-2.5 font-medium text-right">Est. Net</th>
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((order, idx) => (
                <tr
                  key={`${order.id}-${idx}`}
                  style={{
                    borderBottom:
                      idx < preview.sampleRows.length - 1
                        ? '1px solid var(--border-color)'
                        : 'none'
                  }}
                >
                  <td className="p-2.5 text-secondary whitespace-nowrap">
                    {order.orderDate.slice(0, 10)}
                  </td>
                  <td className="p-2.5 font-mono text-2xs text-primary whitespace-nowrap">
                    {order.id}
                  </td>
                  <td className="p-2.5 font-medium text-primary max-w-xs truncate" title={order.sku}>
                    {order.sku}
                  </td>
                  <td className="p-2.5 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="p-2.5 text-right font-medium text-primary whitespace-nowrap">
                    ₹{order.orderValue.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right text-secondary whitespace-nowrap">
                    ₹{(order.tax_amount || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right font-medium whitespace-nowrap" style={{ color: (order.estimatedNetProfit || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    ₹{(order.estimatedNetProfit || 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Warnings & Errors Accordion (If Any) */}
      {allAlerts.length > 0 && (
        <div
          style={{
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            overflow: 'hidden'
          }}
        >
          <button
            type="button"
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-left"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-warning)',
              cursor: 'pointer'
            }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>
                {errors.length > 0 ? `${errors.length} Errors, ` : ''}
                {warnings.length} Warnings / Diagnostics
              </span>
            </div>
            {showWarnings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showWarnings && (
            <div
              className="p-3 flex flex-col gap-1.5 text-2xs"
              style={{
                borderTop: '1px solid rgba(245, 158, 11, 0.2)',
                maxHeight: '160px',
                overflowY: 'auto'
              }}
            >
              {allAlerts.map((alt, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <span
                    className="font-bold shrink-0"
                    style={{
                      color:
                        alt.severity === 'error'
                          ? 'var(--color-danger)'
                          : 'var(--color-warning)'
                    }}
                  >
                    {alt.rowNumber ? `Row ${alt.rowNumber}:` : 'File:'}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {alt.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Action Bar */}
      <div
        className="flex items-center justify-end gap-3 pt-3"
        style={{ borderTop: '1px solid var(--border-color)' }}
      >
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <RotateCcw size={14} style={{ marginRight: '6px' }} />
          Discard & Upload Different File
        </Button>

        <Button
          type="button"
          variant="primary"
          onClick={onConfirm}
          disabled={isSubmitting || orders.length === 0}
        >
          <CheckCircle2 size={14} style={{ marginRight: '6px' }} />
          {isSubmitting ? 'Importing...' : `Confirm & Import ${orders.length} Orders`}
        </Button>
      </div>
    </div>
  );
};
