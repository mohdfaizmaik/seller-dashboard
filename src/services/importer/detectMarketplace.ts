import type { MarketplaceDetectionResult, MarketplaceType, ReportFormat } from './types';

/** Strip UTF-8 Byte Order Mark (BOM) if present */
export function stripBOM(content: string): string {
  if (content.charCodeAt(0) === 0xfeff) {
    return content.slice(1);
  }
  return content;
}

/** Automatically detect CSV/TSV delimiter based on header line occurrence */
export function detectDelimiter(headerLine: string): string {
  const tabs = (headerLine.match(/\t/g) || []).length;
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
}

/** Normalize header token for resilient signature comparison */
export function normalizeHeaderKey(header: string): string {
  return header
    .replace(/^["']|["']$/g, '') // remove surrounding quotes
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, ' '); // normalize separators to single spaces
}

/** Signature definitions for marketplace report detection */
interface SignatureDef {
  marketplace: MarketplaceType;
  reportType: ReportFormat;
  requiredHeaders: string[]; // Normalized strings
  supplementalHeaders: string[];
}

const SIGNATURES: SignatureDef[] = [
  {
    marketplace: 'amazon',
    reportType: 'amazon_mtr',
    // Key Normalization Rule: presence of Seller Gstin, Invoice Number, Transaction Type, and Asin
    requiredHeaders: [
      'seller gstin',
      'invoice number',
      'transaction type',
      'asin'
    ],
    supplementalHeaders: [
      'order id',
      'shipment id',
      'order date',
      'shipment date',
      'item description',
      'sku',
      'invoice amount',
      'total tax amount',
      'shipping amount',
      'fulfillment channel',
      'payment method code',
      'credit note no'
    ]
  },
  {
    marketplace: 'amazon',
    reportType: 'amazon_business_report',
    requiredHeaders: [
      'date',
      'ordered product sales',
      'units ordered',
      'sessions total'
    ],
    supplementalHeaders: [
      'total order items',
      'featured offer percentage',
      'page views total'
    ]
  },
  {
    marketplace: 'flipkart',
    reportType: 'flipkart_sales',
    requiredHeaders: [
      'fsn',
      'order item id',
      'event type',
      'fulfilment type',
      'final invoice amount price after discount shipping charges'
    ],
    supplementalHeaders: [
      'order id',
      'product title description',
      'sku',
      'order date',
      'item quantity',
      'customer s delivery state',
      'is shopsy order'
    ]
  }
];

/** Extract and split header line into array of raw column names */
export function extractHeadersFromContent(content: string, delimiter?: string): { headers: string[]; delimiter: string } {
  const clean = stripBOM(content).trim();
  const firstLine = clean.split(/\r?\n/)[0] || '';
  const resolvedDelimiter = delimiter || detectDelimiter(firstLine);

  // Quote-aware line splitter for header row
  const rawTokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === resolvedDelimiter && !inQuotes) {
      rawTokens.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  rawTokens.push(current.trim());

  return {
    headers: rawTokens.filter((h) => h.length > 0),
    delimiter: resolvedDelimiter
  };
}

/**
 * Detects the marketplace and report type based on header signatures.
 * Supports passing either raw file string or extracted header array.
 */
export function detectMarketplace(
  input: string | string[],
  explicitDelimiter?: string
): MarketplaceDetectionResult {
  let headers: string[] = [];
  let delimiter = explicitDelimiter || ',';

  if (typeof input === 'string') {
    const extracted = extractHeadersFromContent(input, explicitDelimiter);
    headers = extracted.headers;
    delimiter = extracted.delimiter;
  } else {
    headers = input;
  }

  if (headers.length === 0) {
    return {
      marketplace: 'unknown',
      reportType: 'unknown',
      confidence: 0,
      matchedSignatures: [],
      delimiter
    };
  }

  const normalizedHeaders = new Set(headers.map(normalizeHeaderKey));

  for (const sig of SIGNATURES) {
    // Check if all required signature headers are present
    const matchedRequired = sig.requiredHeaders.filter((req) =>
      normalizedHeaders.has(req) ||
      Array.from(normalizedHeaders).some((h) => {
        const normH = h.replace(/[^a-z0-9]/g, '');
        const normReq = req.replace(/[^a-z0-9]/g, '');
        if (normH === normReq) return true;
        if (normReq === 'fulfilmenttype' && (normH === 'fulfillmenttype' || normH === 'fulfilmenttype')) return true;
        return false;
      })
    );

    if (matchedRequired.length === sig.requiredHeaders.length) {
      // Find matching supplemental headers to compute high confidence
      const matchedSupplemental = sig.supplementalHeaders.filter((supp) =>
        normalizedHeaders.has(supp) ||
        Array.from(normalizedHeaders).some((h) => h.replace(/[^a-z0-9]/g, '') === supp.replace(/[^a-z0-9]/g, ''))
      );

      const allMatched = [...matchedRequired, ...matchedSupplemental];
      const totalPossible = sig.requiredHeaders.length + sig.supplementalHeaders.length;
      const confidence = Math.min(1.0, 0.7 + 0.3 * (matchedSupplemental.length / (totalPossible - sig.requiredHeaders.length)));

      return {
        marketplace: sig.marketplace,
        reportType: sig.reportType,
        confidence: Number(confidence.toFixed(2)),
        matchedSignatures: allMatched,
        delimiter
      };
    }
  }

  return {
    marketplace: 'unknown',
    reportType: 'unknown',
    confidence: 0,
    matchedSignatures: [],
    delimiter
  };
}
