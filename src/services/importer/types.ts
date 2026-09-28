import type { Order } from '../../models/order';

export type MarketplaceType = 'amazon' | 'flipkart' | 'meesho' | 'unknown';

export type ReportFormat =
  | 'amazon_mtr'
  | 'amazon_business_report'
  | 'flipkart_sales'
  | 'flipkart_sales_report'
  | 'meesho_orders'
  | 'unknown'
  | string;

export interface MarketplaceDetectionResult {
  marketplace: MarketplaceType;
  reportType: ReportFormat;
  confidence: number; // Score between 0 and 1
  matchedSignatures: string[];
  delimiter: string; // Detected delimiter (e.g. ',' or '\t')
}

export type ImportErrorSeverity = 'error' | 'warning';

export interface ImportError {
  rowNumber?: number; // 1-based row number in report (header is row 1)
  column?: string;
  message: string;
  severity: ImportErrorSeverity;
  rawValue?: unknown;
}

export interface ParsePreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  sampleRows: Order[];
  headers: string[];
  dateRange?: {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
  };
  totalGrossAmount?: number;
}

export interface ParseReportResult {
  success: boolean;
  marketplace: MarketplaceType;
  reportType: ReportFormat;
  orders: Order[];
  errors: ImportError[];
  warnings: ImportError[];
  preview: ParsePreview;
}

export interface ParseReportOptions {
  expectedMarketplace?: MarketplaceType;
  expectedReportType?: ReportFormat;
  delimiter?: string;
  maxPreviewRows?: number;
}

export type RawRow = Record<string, string>;
