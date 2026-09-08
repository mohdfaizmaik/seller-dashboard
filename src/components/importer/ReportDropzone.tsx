import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { parseReport } from '../../services/importer';
import type { ParseReportResult } from '../../services/importer';
import { Button } from '../ui/Button';

interface ReportDropzoneProps {
  onFileParsed: (result: ParseReportResult, file: File) => void;
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
}

export const ReportDropzone: React.FC<ReportDropzoneProps> = ({
  onFileParsed,
  onError,
  disabled = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessFile = async (file: File) => {
    // Validate file extension
    const name = file.name.toLowerCase();
    const validExtensions = ['.csv', '.tsv', '.txt'];
    const hasValidExt = validExtensions.some((ext) => name.endsWith(ext));

    if (!hasValidExt) {
      const err = `Unsupported file type "${file.name}". Please upload a .csv, .tsv, or .txt flat file.`;
      setErrorMessage(err);
      onError?.(err);
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setProcessingStatus('Reading file contents...');

      // Small tick to allow UI rendering
      await new Promise((resolve) => setTimeout(resolve, 60));
      setProcessingStatus('Detecting marketplace signature & headers...');

      await new Promise((resolve) => setTimeout(resolve, 60));
      setProcessingStatus('Parsing rows & calculating marketplace fees...');

      const result = await parseReport(file);

      if (!result.success && result.orders.length === 0) {
        const firstError = result.errors[0]?.message || 'Failed to parse file.';
        setErrorMessage(firstError);
        onError?.(firstError);
      } else {
        onFileParsed(result, file);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while parsing the report.';
      setErrorMessage(msg);
      onError?.(msg);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isProcessing) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await handleProcessFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await handleProcessFile(file);
    }
    // Reset file input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!isProcessing && !disabled) {
            fileInputRef.current?.click();
          }
        }}
        style={{
          border: `2px dashed ${
            isDragOver
              ? 'var(--color-primary)'
              : errorMessage
              ? 'var(--color-danger)'
              : 'var(--border-color)'
          }`,
          borderRadius: 'var(--radius-lg)',
          backgroundColor: isDragOver ? 'var(--bg-hover)' : 'var(--bg-secondary)',
          padding: 'var(--spacing-xl) var(--spacing-lg)',
          textAlign: 'center',
          cursor: isProcessing || disabled ? 'not-allowed' : 'pointer',
          transition: 'all var(--transition-normal)',
          opacity: disabled ? 0.6 : 1
        }}
        className="flex flex-col items-center justify-center gap-3 select-none"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.txt"
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={disabled || isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2
              size={36}
              className="animate-spin"
              style={{ color: 'var(--color-primary)' }}
            />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {processingStatus}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Normalizing dataset into unified Order model...
            </span>
          </div>
        ) : (
          <>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isDragOver
                  ? 'var(--color-primary-light, rgba(59, 130, 246, 0.1))'
                  : 'var(--bg-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-primary)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <UploadCloud size={24} />
            </div>

            <div className="flex flex-col gap-1 items-center">
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                Drag & drop your seller report here
              </span>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Supports <span className="font-medium">Amazon MTR</span> & <span className="font-medium">Flipkart Sales Reports</span> (.csv, .tsv, .txt)
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              style={{ marginTop: 'var(--spacing-xs)' }}
            >
              <FileText size={14} style={{ marginRight: '6px' }} />
              Browse Files
            </Button>
          </>
        )}
      </div>

      {errorMessage && (
        <div
          className="flex items-start gap-2 p-3 text-xs"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)'
          }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Import Error: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
