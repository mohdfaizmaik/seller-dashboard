import type {
  ParseReportOptions,
  ParseReportResult,
  ParsePreview,
  RawRow,
  ImportError
} from './types';
import { detectMarketplace, stripBOM } from './detectMarketplace';
import { normalizeAmazonMTR } from './normalizers/amazonMTRNormalizer';
import { normalizeFlipkartSales } from './normalizers/flipkartNormalizer';

/**
 * Parses a single line respecting quotation marks and escaped quotes ("").
 */
export function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parses raw CSV/TSV text into an array of row objects keyed by header names.
 */
export function parseRawTable(
  content: string,
  delimiter: string
): { headers: string[]; rows: RawRow[]; rawLineCount: number } {
  const clean = stripBOM(content);
  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], rawLineCount: 0 };
  }

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map((h) =>
    h.replace(/^["']|["']$/g, '').trim()
  );

  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line, delimiter);
    const rowObj: RawRow = {};

    for (let hIdx = 0; hIdx < headers.length; hIdx++) {
      const header = headers[hIdx];
      const rawVal = values[hIdx] ?? '';
      rowObj[header] = rawVal.replace(/^["']|["']$/g, '').trim();
    }

    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    rawLineCount: lines.length - 1
  };
}

/**
 * Builds preview statistics from normalized orders and errors.
 */
function buildPreview(
  headers: string[],
  totalRows: number,
  orders: ParseReportResult['orders'],
  errors: ImportError[],
  maxPreviewRows = 5
): ParsePreview {
  let startDate: string | undefined;
  let endDate: string | undefined;
  let totalGrossAmount = 0;

  if (orders.length > 0) {
    const sortedByDate = [...orders].sort((a, b) =>
      a.orderDate.localeCompare(b.orderDate)
    );
    startDate = sortedByDate[0].orderDate.slice(0, 10);
    endDate = sortedByDate[sortedByDate.length - 1].orderDate.slice(0, 10);

    totalGrossAmount = orders.reduce((sum, o) => sum + (o.orderValue || 0), 0);
  }

  return {
    totalRows,
    validRows: orders.length,
    invalidRows: errors.length,
    sampleRows: orders.slice(0, maxPreviewRows),
    headers,
    dateRange:
      startDate && endDate ? { start: startDate, end: endDate } : undefined,
    totalGrossAmount: Number(totalGrossAmount.toFixed(2))
  };
}

/**
 * Synchronous core parser orchestrator accepting text content directly.
 */
export function parseReportSync(
  content: string,
  options?: ParseReportOptions
): ParseReportResult {
  const errors: ImportError[] = [];
  const warnings: ImportError[] = [];

  if (!content || !content.trim()) {
    const emptyPreview: ParsePreview = {
      totalRows: 0,
      validRows: 0,
      invalidRows: 1,
      sampleRows: [],
      headers: []
    };
    return {
      success: false,
      marketplace: 'unknown',
      reportType: 'unknown',
      orders: [],
      errors: [
        {
          message: 'The uploaded file is empty.',
          severity: 'error'
        }
      ],
      warnings: [],
      preview: emptyPreview
    };
  }

  // 1. Detect marketplace & format from content / headers
  const detection = detectMarketplace(content, options?.delimiter);
  const delimiter = options?.delimiter || detection.delimiter || ',';

  // 2. Parse raw table into rows
  const { headers, rows, rawLineCount } = parseRawTable(content, delimiter);

  if (headers.length === 0 || rows.length === 0) {
    const preview = buildPreview(headers, 0, [], errors, options?.maxPreviewRows);
    return {
      success: false,
      marketplace: detection.marketplace,
      reportType: detection.reportType,
      orders: [],
      errors: [
        {
          message: 'The file contains headers but no order data rows.',
          severity: 'error'
        }
      ],
      warnings: [],
      preview
    };
  }

  // 3. Validate marketplace match
  if (detection.marketplace === 'unknown') {
    errors.push({
      message:
        'Unable to detect marketplace format. Expected Amazon MTR (Seller Gstin, Invoice Number, Transaction Type, Asin) or Flipkart Sales (FSN, Order Item ID, Event Type, Fulfilment Type) signature headers.',
      severity: 'error'
    });

    const preview = buildPreview(headers, rawLineCount, [], errors, options?.maxPreviewRows);
    return {
      success: false,
      marketplace: 'unknown',
      reportType: 'unknown',
      orders: [],
      errors,
      warnings,
      preview
    };
  }

  // 4. Dispatch to appropriate normalizer
  let normalizedOrders: ParseReportResult['orders'] = [];

  if (detection.reportType === 'amazon_mtr') {
    const normResult = normalizeAmazonMTR(rows);
    normalizedOrders = normResult.orders;
    errors.push(...normResult.errors);
    warnings.push(...normResult.warnings);
  } else if (detection.reportType === 'flipkart_sales') {
    const normResult = normalizeFlipkartSales(rows);
    normalizedOrders = normResult.orders;
    errors.push(...normResult.errors);
    warnings.push(...normResult.warnings);
  } else {
    // Extensible for future report types (e.g. Meesho, etc.)
    errors.push({
      message: `Report type "${detection.reportType}" does not currently have an order normalizer implemented.`,
      severity: 'error'
    });
  }

  const success = normalizedOrders.length > 0 && errors.filter((e) => e.severity === 'error').length === 0;

  const preview = buildPreview(
    headers,
    rawLineCount,
    normalizedOrders,
    errors,
    options?.maxPreviewRows
  );

  return {
    success,
    marketplace: detection.marketplace,
    reportType: detection.reportType,
    orders: normalizedOrders,
    errors,
    warnings,
    preview
  };
}

/**
 * Main entry orchestrator for parsing reports. Accepts either a string or a File/Blob instance.
 */
export async function parseReport(
  input: string | File | Blob,
  options?: ParseReportOptions
): Promise<ParseReportResult> {
  let content = '';

  if (typeof input === 'string') {
    content = input;
  } else if (typeof (input as Blob).text === 'function') {
    content = await (input as Blob).text();
  } else {
    throw new Error('Unsupported input format for parseReport. Expected string or File/Blob.');
  }

  return parseReportSync(content, options);
}
