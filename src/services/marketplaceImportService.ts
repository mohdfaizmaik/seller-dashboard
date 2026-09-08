import type {
  MarketplaceDailyMetric,
  AmazonRawDailyReport,
  FlipkartRawSalesReportRow
} from '../models/marketplaceReport';
import { normalizeAmazonReport } from '../data/marketplace/amazon/normalizeAmazonReport';
import { normalizeFlipkartReport } from '../data/marketplace/flipkart/normalizeFlipkartReport';
import type { PlatformFilter } from '../hooks/useFilters';

export interface RowValidationError {
  rowNumber: number;
  message: string;
}

export interface ImportedReport {
  id: string;
  platform: 'amazon' | 'flipkart';
  reportType: string;
  fileName: string;
  importedAt: string; // ISO string
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  rowCount: number;
  metrics: MarketplaceDailyMetric[];
  active: boolean;
}

const STORAGE_KEY = 'seller-dashboard:marketplace-performance:v1';

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
  return null;
}

export function getImportedReports(): ImportedReport[] {
  const storage = getSafeStorage();
  if (!storage) return [];
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveImportedReport(
  platform: 'amazon' | 'flipkart',
  reportType: string,
  fileName: string,
  metrics: MarketplaceDailyMetric[]
): ImportedReport {
  const reports = getImportedReports();

  // Find start and end dates of the normalized metrics
  let startDate = '';
  let endDate = '';
  if (metrics.length > 0) {
    const sorted = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
    startDate = sorted[0].date;
    endDate = sorted[sorted.length - 1].date;
  }

  const newReport: ImportedReport = {
    id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    platform,
    reportType,
    fileName,
    importedAt: new Date().toISOString(),
    startDate,
    endDate,
    rowCount: metrics.length,
    metrics,
    active: true
  };

  reports.push(newReport);
  getSafeStorage()?.setItem(STORAGE_KEY, JSON.stringify(reports));
  return newReport;
}

export function removeImportedReport(id: string): void {
  const reports = getImportedReports();
  const updated = reports.filter((r) => r.id !== id);
  getSafeStorage()?.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function toggleReportActive(id: string): void {
  const reports = getImportedReports();
  const updated = reports.map((r) => {
    if (r.id === id) {
      return { ...r, active: !r.active };
    }
    return r;
  });
  getSafeStorage()?.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function clearImportedReports(): void {
  getSafeStorage()?.removeItem(STORAGE_KEY);
}

export function getImportedMetrics(
  platform?: PlatformFilter,
  startDate?: string,
  endDate?: string
): MarketplaceDailyMetric[] {
  const reports = getImportedReports().filter((r) => r.active);
  
  // Sort reports by importedAt ascending so that newer reports' metrics overwrite older ones in our map
  const sortedReports = [...reports].sort((a, b) => a.importedAt.localeCompare(b.importedAt));

  const metricMap = new Map<string, MarketplaceDailyMetric>();

  for (const report of sortedReports) {
    if (platform && platform !== 'all' && report.platform !== platform) {
      continue;
    }
    for (const metric of report.metrics) {
      if (startDate && metric.date < startDate) continue;
      if (endDate && metric.date > endDate) continue;
      
      const key = `${metric.platform}:${metric.date}`;
      metricMap.set(key, metric);
    }
  }

  return Array.from(metricMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Quote-aware line splitter for CSV/TSV */
function splitLine(line: string, delimiter: string): string[] {
  if (delimiter === '\t') {
    return line.split('\t');
  }

  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export function validateAmazonRow(row: Record<string, string>, _rowNumber: number): string | null {
  // Validate Date
  const dateVal = row['Date'];
  if (!dateVal || dateVal.trim() === '') {
    return 'Missing Date';
  }
  const dateParts = dateVal.trim().split('/');
  if (dateParts.length !== 3) {
    return `Invalid Date: ${dateVal}`;
  }
  const [dd, mm, yy] = dateParts;
  if (!dd || !mm || !yy || isNaN(Number(dd)) || isNaN(Number(mm)) || isNaN(Number(yy))) {
    return `Invalid Date: ${dateVal}`;
  }

  // Validate Ordered Product Sales if present
  const salesVal = row['Ordered Product Sales'];
  if (salesVal && salesVal.trim() !== '') {
    const cleaned = salesVal.replace(/[₹,\s]/g, '');
    if (isNaN(Number(cleaned))) {
      return `Invalid Ordered Product Sales: ${salesVal}`;
    }
  }

  // Validate Units Ordered if present
  const unitsVal = row['Units Ordered'];
  if (unitsVal && unitsVal.trim() !== '') {
    const cleaned = unitsVal.replace(/[,\s]/g, '');
    if (isNaN(Number(cleaned))) {
      return `Invalid Units Ordered: ${unitsVal}`;
    }
  }

  return null;
}

export function validateFlipkartRow(row: Record<string, string>, _rowNumber: number): string | null {
  // Validate Order Date
  const dateVal = row['Order Date'];
  if (!dateVal || dateVal.trim() === '') {
    return 'Missing Order Date';
  }
  const trimmed = dateVal.trim();
  const ymd = trimmed.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    return `Invalid Order Date: ${dateVal}`;
  }

  // Validate Item Quantity if present
  const qtyVal = row['Item Quantity'];
  if (qtyVal && qtyVal.trim() !== '') {
    const cleaned = qtyVal.replace(/[,\s]/g, '');
    if (isNaN(Number(cleaned))) {
      return `Invalid Item Quantity: ${qtyVal}`;
    }
  }

  // Validate Final Invoice Amount if present
  const amountVal = row['Final Invoice Amount (Price after discount+Shipping Charges)'];
  if (amountVal && amountVal.trim() !== '') {
    const cleaned = amountVal.replace(/[₹,\s]/g, '');
    if (isNaN(Number(cleaned))) {
      return `Invalid Final Invoice Amount: ${amountVal}`;
    }
  }

  return null;
}

export function parseAndValidateReport(
  platform: 'amazon' | 'flipkart',
  fileContent: string
): {
  validRows: any[];
  invalidRows: RowValidationError[];
  headers: string[];
} {
  const trimmed = fileContent.trim();
  if (trimmed === '') {
    throw new Error('File is empty');
  }

  // Detect delimiter
  const firstLine = trimmed.split(/\r?\n/)[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Split lines
  const allLines = trimmed.split(/\r?\n/).map((line) => line.trimEnd()).filter((line) => line !== '');
  if (allLines.length <= 1) {
    throw new Error('File has no data rows');
  }

  const rawHeaders = splitLine(allLines[0], delimiter).map((h) => h.trim());
  
  // Validate headers exist
  const missingHeaders: string[] = [];
  if (platform === 'amazon') {
    const amazonRequired = [
      'Date',
      'Ordered Product Sales',
      'Units Ordered',
      'Total Order Items',
      'Page Views - Total',
      'Sessions - Total',
      'Featured Offer Percentage'
    ];
    for (const req of amazonRequired) {
      if (!rawHeaders.includes(req)) {
        missingHeaders.push(req);
      }
    }
  } else if (platform === 'flipkart') {
    const flipkartRequired = [
      'Order Date',
      'Order ID',
      'Order Item ID',
      'Event Type',
      'Event Sub Type',
      'Item Quantity',
      'Final Invoice Amount (Price after discount+Shipping Charges)'
    ];
    for (const req of flipkartRequired) {
      if (!rawHeaders.includes(req)) {
        missingHeaders.push(req);
      }
    }
  }

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns:\n${missingHeaders.map((h) => `- ${h}`).join('\n')}`);
  }

  const validRows: any[] = [];
  const invalidRows: RowValidationError[] = [];

  for (let i = 1; i < allLines.length; i += 1) {
    const rowNum = i + 1; // 1-based spreadsheet row number
    const lineCells = splitLine(allLines[i], delimiter);
    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((header, idx) => {
      rowObj[header] = lineCells[idx] ?? '';
    });

    let rowError: string | null = null;
    if (platform === 'amazon') {
      rowError = validateAmazonRow(rowObj, rowNum);
    } else {
      rowError = validateFlipkartRow(rowObj, rowNum);
    }

    if (rowError) {
      invalidRows.push({ rowNumber: rowNum, message: rowError });
    } else {
      if (platform === 'amazon') {
        const rawRow: AmazonRawDailyReport = {
          Date: rowObj['Date'] || '',
          'Ordered Product Sales': rowObj['Ordered Product Sales'] || '',
          'Ordered Product Sales - B2B': rowObj['Ordered Product Sales - B2B'] || '',
          'Units Ordered': rowObj['Units Ordered'] || '',
          'Units Ordered - B2B': rowObj['Units Ordered - B2B'] || '',
          'Total Order Items': rowObj['Total Order Items'] || '',
          'Total Order Items - B2B': rowObj['Total Order Items - B2B'] || '',
          'Page Views - Total': rowObj['Page Views - Total'] || '',
          'Page Views - Total - B2B': rowObj['Page Views - Total - B2B'] || '',
          'Sessions - Total': rowObj['Sessions - Total'] || '',
          'Sessions - Total - B2B': rowObj['Sessions - Total - B2B'] || '',
          'Featured Offer Percentage': rowObj['Featured Offer Percentage'] || '',
          'Featured Offer Percentage - B2B': rowObj['Featured Offer Percentage - B2B'] || '',
          'Unit Session Percentage': rowObj['Unit Session Percentage'] || '',
          'Unit Session Percentage - B2B': rowObj['Unit Session Percentage - B2B'] || '',
          'Average Offer Count': rowObj['Average Offer Count'] || '',
          'Average Parent Items': rowObj['Average Parent Items'] || ''
        };
        validRows.push(rawRow);
      } else {
        const rawRow: FlipkartRawSalesReportRow = {
          'Order Date': rowObj['Order Date'] || '',
          'Order ID': rowObj['Order ID'] || '',
          'Order Item ID': rowObj['Order Item ID'] || '',
          'Product Title/Description': rowObj['Product Title/Description'] || null,
          FSN: rowObj['FSN'] || null,
          SKU: rowObj['SKU'] || null,
          'Event Type': rowObj['Event Type'] || '',
          'Event Sub Type': rowObj['Event Sub Type'] || '',
          'Order Type': rowObj['Order Type'] || null,
          'Fulfilment Type': rowObj['Fulfilment Type'] || null,
          'Item Quantity': rowObj['Item Quantity'] || null,
          'Price before discount': rowObj['Price before discount'] || null,
          'Total Discount': rowObj['Total Discount'] || null,
          'Seller Share': rowObj['Seller Share'] || null,
          'Bank Offer Share': rowObj['Bank Offer Share'] || null,
          'Price after discount (Price before discount-Total discount)': rowObj['Price after discount (Price before discount-Total discount)'] || null,
          'Shipping Charges': rowObj['Shipping Charges'] || null,
          'Final Invoice Amount (Price after discount+Shipping Charges)': rowObj['Final Invoice Amount (Price after discount+Shipping Charges)'] || null,
          'Taxable Value (Final Invoice Amount -Taxes)': rowObj['Taxable Value (Final Invoice Amount -Taxes)'] || null,
          'Total TCS Deducted': rowObj['Total TCS Deducted'] || null,
          'Buyer Invoice Date': rowObj['Buyer Invoice Date'] || null,
          'Buyer Invoice Amount': rowObj['Buyer Invoice Amount'] || null
        };
        validRows.push(rawRow);
      }
    }
  }

  return {
    validRows,
    invalidRows,
    headers: rawHeaders
  };
}

export function parseAndNormalizeReport(
  platform: 'amazon' | 'flipkart',
  fileContent: string
): {
  metrics: MarketplaceDailyMetric[];
  invalidRows: RowValidationError[];
} {
  const { validRows, invalidRows } = parseAndValidateReport(platform, fileContent);
  let metrics: MarketplaceDailyMetric[] = [];
  if (platform === 'amazon') {
    metrics = normalizeAmazonReport(validRows);
  } else {
    metrics = normalizeFlipkartReport(validRows);
  }
  return { metrics, invalidRows };
}
