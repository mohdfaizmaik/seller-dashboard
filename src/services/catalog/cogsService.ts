import { PRODUCTS_CATALOG } from '../../data/products';

export interface SkuCost {
  sku: string;
  productName: string;
  cogs: number;          // Manufacturing / procurement cost in INR
  packagingCost: number; // Packaging materials (boxes, tape, bubble wrap, labels) in INR
  taxRate: number;       // GST rate percentage (e.g. 18 for 18%)
  updatedAt: string;     // ISO timestamp
}

const DB_NAME = 'SellerCatalogDB';
const DB_VERSION = 1;
const STORE_COGS = 'cogs_catalog';

// In-memory fallback and synchronous cache
const memoryCogsMap = new Map<string, SkuCost>();
let isInitialized = false;

function getIndexedDBFactory(): any {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).indexedDB) {
      return (globalThis as any).indexedDB;
    }
  } catch {
    // Ignore
  }
  return null;
}

function openDatabase(): Promise<any> {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDBFactory();
    if (!idb) {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_COGS)) {
        db.createObjectStore(STORE_COGS, { keyPath: 'sku' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open catalog database'));
  });
}

/**
 * Initializes the default SKU costs catalog using PRODUCTS_CATALOG seed data.
 */
export function seedDefaultSkuCosts(): SkuCost[] {
  const defaults: SkuCost[] = PRODUCTS_CATALOG.map((p) => ({
    sku: p.sku,
    productName: p.name,
    cogs: p.costPrice,
    packagingCost: 25, // Standard eCommerce packaging cost in INR
    taxRate: 18,       // Standard GST rate
    updatedAt: new Date().toISOString()
  }));

  for (const item of defaults) {
    memoryCogsMap.set(item.sku.toLowerCase(), item);
  }
  isInitialized = true;
  return defaults;
}

/**
 * Returns synchronous in-memory cache of SKU costs.
 * Initializes default catalog if not already populated.
 */
export function getSkuCostsSync(): Map<string, SkuCost> {
  if (!isInitialized || memoryCogsMap.size === 0) {
    seedDefaultSkuCosts();
  }
  return memoryCogsMap;
}

/**
 * Retrieves all configured SKU costs from local persistence.
 */
export async function getAllSkuCosts(): Promise<SkuCost[]> {
  if (!getIndexedDBFactory()) {
    if (!isInitialized || memoryCogsMap.size === 0) {
      seedDefaultSkuCosts();
    }
    return Array.from(memoryCogsMap.values());
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_COGS, 'readonly');
      const store = transaction.objectStore(STORE_COGS);
      const request = store.getAll();

      request.onsuccess = async () => {
        let results: SkuCost[] = request.result || [];
        if (results.length === 0) {
          // Pre-seed default catalog
          const defaults = seedDefaultSkuCosts();
          await bulkSaveSkuCosts(defaults);
          results = defaults;
        } else {
          // Sync in-memory map
          for (const item of results) {
            memoryCogsMap.set(item.sku.toLowerCase(), item);
          }
          isInitialized = true;
        }
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    if (!isInitialized || memoryCogsMap.size === 0) {
      seedDefaultSkuCosts();
    }
    return Array.from(memoryCogsMap.values());
  }
}

/**
 * Retrieves a single SKU cost configuration by SKU.
 */
export async function getSkuCost(sku: string): Promise<SkuCost | undefined> {
  const normalizedSku = (sku || '').trim().toLowerCase();
  if (memoryCogsMap.has(normalizedSku)) {
    return memoryCogsMap.get(normalizedSku);
  }

  const all = await getAllSkuCosts();
  return all.find((item) => item.sku.toLowerCase() === normalizedSku);
}

/**
 * Saves or updates a single SKU cost record.
 */
export async function saveSkuCost(cost: SkuCost): Promise<void> {
  const record: SkuCost = {
    sku: cost.sku.trim(),
    productName: cost.productName.trim(),
    cogs: Math.max(0, Number(cost.cogs) || 0),
    packagingCost: Math.max(0, Number(cost.packagingCost) || 0),
    taxRate: Math.max(0, Math.min(100, Number(cost.taxRate) || 0)),
    updatedAt: new Date().toISOString()
  };

  memoryCogsMap.set(record.sku.toLowerCase(), record);

  if (!getIndexedDBFactory()) {
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_COGS, 'readwrite');
    const store = transaction.objectStore(STORE_COGS);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Bulk saves or updates multiple SKU cost records.
 */
export async function bulkSaveSkuCosts(costs: SkuCost[]): Promise<void> {
  const records = costs.map((c) => ({
    sku: c.sku.trim(),
    productName: c.productName.trim(),
    cogs: Math.max(0, Number(c.cogs) || 0),
    packagingCost: Math.max(0, Number(c.packagingCost) || 0),
    taxRate: Math.max(0, Math.min(100, Number(c.taxRate) || 0)),
    updatedAt: new Date().toISOString()
  }));

  for (const r of records) {
    memoryCogsMap.set(r.sku.toLowerCase(), r);
  }

  if (!getIndexedDBFactory()) {
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_COGS, 'readwrite');
    const store = transaction.objectStore(STORE_COGS);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    for (const record of records) {
      store.put(record);
    }
  });
}

/**
 * Clears all SKU costs from persistence and in-memory cache.
 */
export async function clearAllSkuCosts(): Promise<void> {
  memoryCogsMap.clear();
  isInitialized = false;

  if (!getIndexedDBFactory()) {
    return;
  }

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_COGS, 'readwrite');
    const store = transaction.objectStore(STORE_COGS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Parses raw CSV content for SKU COGS bulk upload.
 * Expected headers: sku, productName, cogs, packagingCost, taxRate
 */
export function parseCogsCsv(csvContent: string): { valid: SkuCost[]; errors: string[] } {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { valid: [], errors: ['CSV must contain a header row and at least one data row'] };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));

  const skuIdx = headers.findIndex((h) => h === 'sku');
  const nameIdx = headers.findIndex((h) => h === 'productname' || h === 'name' || h === 'product_name');
  const cogsIdx = headers.findIndex((h) => h === 'cogs' || h === 'cost' || h === 'costprice' || h === 'cost_price');
  const pkgIdx = headers.findIndex((h) => h === 'packagingcost' || h === 'packaging' || h === 'packaging_cost');
  const taxIdx = headers.findIndex((h) => h === 'taxrate' || h === 'tax' || h === 'gst' || h === 'tax_rate');

  if (skuIdx === -1 || cogsIdx === -1) {
    return {
      valid: [],
      errors: ['Missing required columns: "sku" and "cogs" (optional: "productName", "packagingCost", "taxRate")']
    };
  }

  const valid: SkuCost[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((cell) => cell.trim().replace(/^["']|["']$/g, ''));
    const sku = row[skuIdx];

    if (!sku) {
      errors.push(`Row ${i + 1}: SKU is empty`);
      continue;
    }

    const cogsVal = parseFloat(row[cogsIdx]);
    if (isNaN(cogsVal) || cogsVal < 0) {
      errors.push(`Row ${i + 1} (${sku}): Invalid COGS value "${row[cogsIdx]}"`);
      continue;
    }

    const name = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : sku;
    const packagingCost = pkgIdx !== -1 && !isNaN(parseFloat(row[pkgIdx])) ? parseFloat(row[pkgIdx]) : 25;
    const taxRate = taxIdx !== -1 && !isNaN(parseFloat(row[taxIdx])) ? parseFloat(row[taxIdx]) : 18;

    valid.push({
      sku,
      productName: name,
      cogs: cogsVal,
      packagingCost,
      taxRate,
      updatedAt: new Date().toISOString()
    });
  }

  return { valid, errors };
}

/**
 * Generates an exportable CSV string from SKU cost items.
 */
export function exportCogsCsv(costs: SkuCost[]): string {
  const headers = ['sku', 'productName', 'cogs', 'packagingCost', 'taxRate', 'updatedAt'];
  const rows = costs.map((c) => [
    `"${c.sku}"`,
    `"${c.productName.replace(/"/g, '""')}"`,
    c.cogs,
    c.packagingCost,
    c.taxRate,
    `"${c.updatedAt}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
