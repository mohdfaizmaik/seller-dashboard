import React, { useState, useEffect } from 'react';
import { X, Upload, Layers, Trash2, CheckCircle2 } from 'lucide-react';
import { ReportDropzone } from './ReportDropzone';
import { ReportImportPreview } from './ReportImportPreview';
import type { ParseReportResult } from '../../services/importer';
import type { ImportBatch } from '../../services/storage/reportStorageService';
import {
  saveOrders,
  getImportBatches,
  deleteBatch,
  clearAllData
} from '../../services/storage/reportStorageService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ReportUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export const ReportUploadModal: React.FC<ReportUploadModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'batches'>('upload');
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseReportResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadBatches = async () => {
    try {
      const list = await getImportBatches();
      setBatches(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBatches();
      setToastMessage(null);
    } else {
      // Reset staging state on modal close
      setStagedFile(null);
      setParseResult(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFileParsed = (result: ParseReportResult, file: File) => {
    setStagedFile(file);
    setParseResult(result);
  };

  const handleConfirmImport = async () => {
    if (!parseResult || !stagedFile) return;

    try {
      setIsSubmitting(true);
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const batch: ImportBatch = {
        batchId,
        fileName: stagedFile.name,
        fileSize: stagedFile.size,
        marketplace: parseResult.marketplace,
        reportType: parseResult.reportType,
        importedAt: new Date().toISOString(),
        recordCount: parseResult.orders.length,
        dateRange: parseResult.preview.dateRange || { start: '', end: '' }
      };

      await saveOrders(batch, parseResult.orders);
      await loadBatches();

      setToastMessage(`Successfully imported ${parseResult.orders.length} orders from ${stagedFile.name}!`);
      setStagedFile(null);
      setParseResult(null);

      onImportSuccess?.();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to commit orders to storage.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (window.confirm('Are you sure you want to remove this import batch? Its orders will be removed from your dashboard.')) {
      await deleteBatch(batchId);
      await loadBatches();
      onImportSuccess?.();
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear all imported seller reports? Dashboard will revert to default demo datasets.')) {
      await clearAllData();
      await loadBatches();
      onImportSuccess?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spacing-md)'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: parseResult ? '780px' : '560px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'max-width var(--transition-normal)'
        }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-4"
          style={{
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <div className="flex items-center gap-2">
            <Upload size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>
              Import Seller Reports
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          className="flex items-center px-4"
          style={{
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'upload' ? 'tab-active' : ''
            }`}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'upload' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'upload' ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Upload size={14} />
            Upload & Preview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('batches')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 ${
              activeTab === 'batches' ? 'tab-active' : ''
            }`}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'batches' ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: activeTab === 'batches' ? 'var(--color-primary)' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <Layers size={14} />
            Active Batches ({batches.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {toastMessage && (
            <div
              className="flex items-center gap-2 p-3 mb-4 text-xs font-medium"
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)'
              }}
            >
              <CheckCircle2 size={16} />
              <span>{toastMessage}</span>
            </div>
          )}

          {activeTab === 'upload' ? (
            parseResult && stagedFile ? (
              <ReportImportPreview
                fileName={stagedFile.name}
                fileSize={stagedFile.size}
                parseResult={parseResult}
                onConfirm={handleConfirmImport}
                onCancel={() => {
                  setStagedFile(null);
                  setParseResult(null);
                }}
                isSubmitting={isSubmitting}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <ReportDropzone onFileParsed={handleFileParsed} />

                <div
                  className="p-3.5 flex flex-col gap-1.5 text-2xs"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)'
                  }}
                >
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Supported Report Standards:
                  </span>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <span className="font-medium">Amazon India Merchant Tax Report (MTR / B2C Flat File)</span>:
                      Standard flat file containing Order Date, ASIN, SKU, Quantity, Invoice Amount, and Taxes.
                    </li>
                    <li>
                      <span className="font-medium">Flipkart Sales Report (GSTR-1 / Sales Transaction Flat File)</span>:
                      Standard CSV/TSV containing FSN, SKU, Order Item ID, Event Type (Sale/Return/Cancel), Fulfilment Type (FBF/NON_FBF), and Shopsy flags.
                    </li>
                    <li>
                      Marketplace fee deductions (Amazon 15% referral + ₹20 closing; Flipkart 12% referral + ₹15 closing) and return costs are estimated automatically using the Phase 4 assumption engine.
                    </li>
                  </ul>
                </div>
              </div>
            )
          ) : (
            /* Active Batches Manager */
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-secondary font-medium">
                  {batches.length} imported dataset{batches.length === 1 ? '' : 's'} stored in local browser IndexedDB.
                </span>
                {batches.length > 0 && (
                  <Button variant="danger" size="sm" onClick={handleClearAll}>
                    <Trash2 size={13} style={{ marginRight: '4px' }} />
                    Clear All Batches
                  </Button>
                )}
              </div>

              {batches.length === 0 ? (
                <div
                  className="p-8 text-center flex flex-col items-center justify-center gap-2"
                  style={{
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <Layers size={32} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-semibold text-secondary">
                    No custom reports imported yet
                  </span>
                  <p className="text-xs text-muted">
                    Upload an Amazon MTR file to populate your dashboard with real seller records.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {batches.map((b) => (
                    <div
                      key={b.batchId}
                      className="p-3.5 flex items-center justify-between gap-3"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)'
                      }}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-primary truncate">
                            {b.fileName}
                          </span>
                          <Badge variant="amazon">
                            {b.marketplace.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-2xs text-muted flex-wrap">
                          <span>{b.recordCount} orders</span>
                          <span>•</span>
                          <span>
                            {b.dateRange.start} → {b.dateRange.end}
                          </span>
                          <span>•</span>
                          <span>Imported {new Date(b.importedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDeleteBatch(b.batchId)}
                        title="Delete this batch and its orders"
                      >
                        <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
