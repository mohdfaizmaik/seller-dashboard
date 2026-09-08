import React, { useState } from 'react';
import { useSellerData } from '../../hooks/useSellerData';
import { ReportUploadModal } from '../importer/ReportUploadModal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Database,
  UploadCloud,
  Layers,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

export const DataModeBanner: React.FC = () => {
  const {
    batches,
    orders,
    hasImportedData,
    useMockFallback,
    setUseMockFallback,
    reloadData
  } = useSellerData();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const amazonBatches = batches.filter((b) => b.marketplace === 'amazon').length;
  const flipkartBatches = batches.filter((b) => b.marketplace === 'flipkart').length;

  const isLiveActive = hasImportedData && !useMockFallback;

  return (
    <>
      <div
        className="w-full px-4 py-2 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 transition-colors"
        style={{
          backgroundColor: isLiveActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)',
          borderBottom: `1px solid ${isLiveActive ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.2)'}`
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          {isLiveActive ? (
            <>
              <Badge variant="success" size="sm" className="font-semibold flex items-center gap-1">
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-success)',
                    display: 'inline-block'
                  }}
                />
                LIVE DATA ACTIVE
              </Badge>

              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                • {batches.length} {batches.length === 1 ? 'Batch' : 'Batches'} (
                {amazonBatches > 0 && <span>{amazonBatches} Amazon</span>}
                {amazonBatches > 0 && flipkartBatches > 0 && <span>, </span>}
                {flipkartBatches > 0 && <span>{flipkartBatches} Flipkart</span>}
                ) • Total Orders: <strong>{orders.length.toLocaleString('en-IN')}</strong>
              </span>
            </>
          ) : (
            <>
              <Badge variant="info" size="sm" className="font-semibold flex items-center gap-1">
                <Database size={12} />
                DEMO MODE
              </Badge>

              <span style={{ color: 'var(--text-secondary)' }}>
                Viewing Demo Data — Upload your <strong style={{ color: 'var(--text-primary)' }}>Amazon MTR</strong> or{' '}
                <strong style={{ color: 'var(--text-primary)' }}>Flipkart Sales</strong> reports to activate live analytics.
              </span>
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {hasImportedData && (
            <button
              type="button"
              onClick={() => setUseMockFallback(!useMockFallback)}
              className="flex items-center gap-1.5 text-2xs font-medium py-1 px-2.5 rounded transition-colors"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
              title={useMockFallback ? 'Switch to live imported data' : 'Switch to demo sample dataset'}
            >
              {useMockFallback ? (
                <>
                  <ToggleLeft size={14} style={{ color: 'var(--text-muted)' }} />
                  <span>Viewing Demo (Click for Live)</span>
                </>
              ) : (
                <>
                  <ToggleRight size={14} style={{ color: 'var(--color-success)' }} />
                  <span>Live Dataset Active</span>
                </>
              )}
            </button>
          )}

          {isLiveActive ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
              >
                <Layers size={13} style={{ marginRight: '4px' }} />
                Manage Batches
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsModalOpen(true)}
                style={{ fontSize: '11px', padding: '3px 10px', height: '26px' }}
              >
                <UploadCloud size={13} style={{ marginRight: '4px' }} />
                Add Report
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              style={{ fontSize: '11px', padding: '3px 10px', height: '26px' }}
            >
              <UploadCloud size={13} style={{ marginRight: '4px' }} />
              Upload Reports
            </Button>
          )}
        </div>
      </div>

      <ReportUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImportSuccess={() => {
          reloadData();
        }}
      />
    </>
  );
};
