import { PRODUCTS_CATALOG } from '../../data/products';
import { getSkuCostsSync } from '../catalog/cogsService';

export interface InventoryItem {
  sku: string;
  productName: string;
  marketplace: 'amazon' | 'flipkart' | 'all';
  currentStock: number;
  reservedStock: number;   // Customer orders pending fulfillment or reserved
  leadTimeDays: number;    // Supplier manufacturing & shipping transit days (default: 14)
  safetyStockDays: number; // Safety buffer days to absorb demand spikes (default: 7)
  unitCost: number;        // Purchase / COGS cost in INR
  updatedAt: string;       // ISO timestamp
}

const DB_NAME = 'SellerInventoryDB';
const DB_VERSION = 1;
const STORE_INVENTORY = 'inventory_items';

// In-memory fallback and synchronous cache
const memoryInventoryMap = new Map<string, InventoryItem>();
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
      if (!db.objectStoreNames.contains(STORE_INVENTORY)) {
        db.createObjectStore(STORE_INVENTORY, { keyPath: 'sku' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open inventory database'));
  });
}

/**
 * Seed stock amounts tailored per SKU to represent realistic fulfillment states:
 * Stockout, Critical Risk, Reorder Now, Healthy, Overstocked, Dead Stock.
 */
const SEED_STOCK_PROFILES: Record<string, { current: number; reserved: number; lead: number; safety: number }> = {
  'BOAT-RK450-BLK': { current: 18, reserved: 3, lead: 14, safety: 7 }, // Low stock vs velocity
  '1PLUS-NBUDS-BLU': { current: 0, reserved: 0, lead: 14, safety: 7 },  // Stockout
  'NOISE-CFP3-SLV': { current: 30, reserved: 5, lead: 12, safety: 5 },  // Reorder now
  'SANDISK-64GB-SD': { current: 150, reserved: 10, lead: 14, safety: 7 },// Healthy
  'PIGEON-AMZ-KET': { current: 80, reserved: 5, lead: 12, safety: 5 },  // Healthy
  'PRESTIGE-IRIS-MIX': { current: 50, reserved: 5, lead: 15, safety: 7 },// Healthy
  'ZEB-WAR-KEYB': { current: 65, reserved: 5, lead: 10, safety: 5 },    // Healthy
  'MI-10000-PB': { current: 22, reserved: 4, lead: 14, safety: 7 },     // Low stock / critical
  'REALME-TECH-BUDS': { current: 14, reserved: 2, lead: 14, safety: 7 },// Critical
  'WIPRO-16A-PLUG': { current: 90, reserved: 5, lead: 10, safety: 5 },  // Healthy
  'FIREBOLTT-NINJA-PRO': { current: 45, reserved: 5, lead: 14, safety: 7 }, // Healthy
  'BAJAJ-MAJESTY-TOAST': { current: 35, reserved: 3, lead: 12, safety: 5 }, // Healthy
  'PORT-KRONOS-SPK': { current: 32, reserved: 2, lead: 14, safety: 7 },  // Healthy
  'AMBRANE-20W-CHARG': { current: 110, reserved: 8, lead: 10, safety: 5 }, // Healthy
  'SYSKA-7W-BULB': { current: 180, reserved: 10, lead: 7, safety: 5 },   // Healthy
  'PHILIPS-HD6975-OVEN': { current: 20, reserved: 2, lead: 20, safety: 10 }, // Healthy
  'CROM-COLOSSUS-FAN': { current: 25, reserved: 2, lead: 15, safety: 7 }, // Healthy
  'BOULT-Z40-EARBUDS': { current: 320, reserved: 5, lead: 14, safety: 7 }, // Overstocked
  'LIFELONG-LLM72-MASS': { current: 175, reserved: 2, lead: 14, safety: 7 }, // Dead stock
  'KENT-16067-KETTLE': { current: 130, reserved: 2, lead: 14, safety: 7 }  // Dead stock
};

/**
 * Initializes the default inventory catalog using PRODUCTS_CATALOG and COGS seed data.
 */
export function seedDefaultInventory(): InventoryItem[] {
  const cogsMap = getSkuCostsSync();

  const defaults: InventoryItem[] = PRODUCTS_CATALOG.map((p) => {
    const costRec = cogsMap.get(p.sku.toLowerCase());
    const unitCost = costRec ? costRec.cogs : p.costPrice;
    const profile = SEED_STOCK_PROFILES[p.sku] || { current: 50, reserved: 5, lead: 14, safety: 7 };

    let marketplace: 'amazon' | 'flipkart' | 'all' = 'all';
    if (p.platform === 'amazon') marketplace = 'amazon';
    else if (p.platform === 'flipkart') marketplace = 'flipkart';

    return {
      sku: p.sku,
      productName: p.name,
      marketplace,
      currentStock: profile.current,
      reservedStock: profile.reserved,
      leadTimeDays: profile.lead,
      safetyStockDays: profile.safety,
      unitCost,
      updatedAt: new Date().toISOString()
    };
  });

  memoryInventoryMap.clear();
  for (const item of defaults) {
    memoryInventoryMap.set(item.sku.toLowerCase(), item);
  }
  isInitialized = true;
  return defaults;
}

/**
 * Returns synchronous in-memory cache of inventory items.
 * Initializes default inventory catalog if not already populated.
 */
export function getInventorySync(): Map<string, InventoryItem> {
  if (!isInitialized || memoryInventoryMap.size === 0) {
    seedDefaultInventory();
  }
  return memoryInventoryMap;
}

/**
 * Retrieves all inventory items from local persistence (IndexedDB).
 */
export async function getAllInventory(): Promise<InventoryItem[]> {
  if (!getIndexedDBFactory()) {
    if (!isInitialized || memoryInventoryMap.size === 0) {
      seedDefaultInventory();
    }
    return Array.from(memoryInventoryMap.values());
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_INVENTORY, 'readonly');
      const store = transaction.objectStore(STORE_INVENTORY);
      const request = store.getAll();

      request.onsuccess = async () => {
        let results: InventoryItem[] = request.result || [];
        if (results.length === 0) {
          const defaults = seedDefaultInventory();
          await bulkSaveInventory(defaults);
          results = defaults;
        } else {
          memoryInventoryMap.clear();
          for (const item of results) {
            memoryInventoryMap.set(item.sku.toLowerCase(), item);
          }
          isInitialized = true;
        }
        resolve(results);
      };

      request.onerror = () => reject(request.error);
    });
  } catch {
    if (!isInitialized || memoryInventoryMap.size === 0) {
      seedDefaultInventory();
    }
    return Array.from(memoryInventoryMap.values());
  }
}

/**
 * Retrieves an inventory item by SKU.
 */
export async function getInventoryItem(sku: string): Promise<InventoryItem | undefined> {
  const normalizedSku = (sku || '').trim().toLowerCase();
  if (memoryInventoryMap.has(normalizedSku)) {
    return memoryInventoryMap.get(normalizedSku);
  }

  const all = await getAllInventory();
  return all.find((item) => item.sku.toLowerCase() === normalizedSku);
}

/**
 * Saves or updates a single inventory item record.
 */
export async function saveInventoryItem(item: InventoryItem): Promise<void> {
  const record: InventoryItem = {
    sku: item.sku.trim(),
    productName: item.productName.trim(),
    marketplace: item.marketplace || 'all',
    currentStock: Math.max(0, Math.round(Number(item.currentStock) || 0)),
    reservedStock: Math.max(0, Math.round(Number(item.reservedStock) || 0)),
    leadTimeDays: Math.max(1, Math.round(Number(item.leadTimeDays) || 14)),
    safetyStockDays: Math.max(0, Math.round(Number(item.safetyStockDays) || 7)),
    unitCost: Math.max(0, Number(item.unitCost) || 0),
    updatedAt: new Date().toISOString()
  };

  memoryInventoryMap.set(record.sku.toLowerCase(), record);

  if (!getIndexedDBFactory()) {
    return;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_INVENTORY, 'readwrite');
      const store = transaction.objectStore(STORE_INVENTORY);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // In-memory fallback updated
  }
}

/**
 * Bulk updates multiple inventory records in a single transaction.
 */
export async function bulkSaveInventory(items: InventoryItem[]): Promise<void> {
  for (const item of items) {
    const record: InventoryItem = {
      sku: item.sku.trim(),
      productName: item.productName.trim(),
      marketplace: item.marketplace || 'all',
      currentStock: Math.max(0, Math.round(Number(item.currentStock) || 0)),
      reservedStock: Math.max(0, Math.round(Number(item.reservedStock) || 0)),
      leadTimeDays: Math.max(1, Math.round(Number(item.leadTimeDays) || 14)),
      safetyStockDays: Math.max(0, Math.round(Number(item.safetyStockDays) || 7)),
      unitCost: Math.max(0, Number(item.unitCost) || 0),
      updatedAt: new Date().toISOString()
    };
    memoryInventoryMap.set(record.sku.toLowerCase(), record);
  }
  isInitialized = true;

  if (!getIndexedDBFactory()) {
    return;
  }

  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_INVENTORY, 'readwrite');
      const store = transaction.objectStore(STORE_INVENTORY);

      for (const item of items) {
        store.put(memoryInventoryMap.get(item.sku.toLowerCase()));
      }

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    // In-memory fallback updated
  }
}

/**
 * Adjust stock levels, lead times, or safety buffers for an existing SKU.
 */
export async function adjustStock(
  sku: string,
  currentStock: number,
  reservedStock?: number,
  leadTimeDays?: number,
  safetyStockDays?: number
): Promise<void> {
  const existing = await getInventoryItem(sku);
  const catalogProduct = PRODUCTS_CATALOG.find((p) => p.sku.toLowerCase() === sku.toLowerCase());

  const record: InventoryItem = {
    sku: existing?.sku || sku,
    productName: existing?.productName || catalogProduct?.name || sku,
    marketplace: existing?.marketplace || 'all',
    currentStock: Math.max(0, Math.round(currentStock)),
    reservedStock: reservedStock !== undefined ? Math.max(0, Math.round(reservedStock)) : (existing?.reservedStock || 0),
    leadTimeDays: leadTimeDays !== undefined ? Math.max(1, Math.round(leadTimeDays)) : (existing?.leadTimeDays || 14),
    safetyStockDays: safetyStockDays !== undefined ? Math.max(0, Math.round(safetyStockDays)) : (existing?.safetyStockDays || 7),
    unitCost: existing?.unitCost || catalogProduct?.costPrice || 0,
    updatedAt: new Date().toISOString()
  };

  await saveInventoryItem(record);
}

/**
 * Parses an uploaded CSV string into validated InventoryItem records.
 * Expected headers: SKU, Product Name, Current Stock, Reserved Stock, Lead Time (Days), Safety Stock (Days), Unit Cost
 */
export function parseInventoryCsv(csv: string): { valid: InventoryItem[]; errors: string[] } {
  const valid: InventoryItem[] = [];
  const errors: string[] = [];

  if (!csv || typeof csv !== 'string') {
    return { valid, errors: ['CSV content is empty'] };
  }

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    return { valid, errors: ['CSV must contain at least a header row and one data row'] };
  }

  const rawHeader = lines[0].toLowerCase();
  const headerCols = rawHeader.split(',').map((c) => c.replace(/["']/g, '').trim());

  const findColIndex = (candidates: string[]): number => {
    return headerCols.findIndex((col) => candidates.some((c) => col.includes(c)));
  };

  const skuIdx = findColIndex(['sku', 'item code', 'product code']);
  const nameIdx = findColIndex(['product name', 'title', 'name', 'description']);
  const currentIdx = findColIndex(['current stock', 'stock', 'on hand', 'quantity', 'qty']);
  const reservedIdx = findColIndex(['reserved', 'reserved stock', 'pending']);
  const leadIdx = findColIndex(['lead time', 'lead', 'lead_time']);
  const safetyIdx = findColIndex(['safety stock', 'safety', 'buffer']);
  const costIdx = findColIndex(['unit cost', 'cogs', 'cost', 'unit_cost']);

  if (skuIdx === -1 || currentIdx === -1) {
    return {
      valid,
      errors: ['Missing required columns in CSV header. Must include "SKU" and "Current Stock".']
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = line.split(',').map((cell) => cell.replace(/^["']|["']$/g, '').trim());

    const sku = row[skuIdx];
    if (!sku) {
      errors.push(`Row ${i + 1}: SKU is required.`);
      continue;
    }

    const currentStock = Number(row[currentIdx]);
    if (isNaN(currentStock) || currentStock < 0) {
      errors.push(`Row ${i + 1} (${sku}): Current stock must be a non-negative number.`);
      continue;
    }

    const reservedStock = reservedIdx !== -1 && !isNaN(Number(row[reservedIdx])) ? Number(row[reservedIdx]) : 0;
    const leadTimeDays = leadIdx !== -1 && !isNaN(Number(row[leadIdx])) && Number(row[leadIdx]) > 0 ? Number(row[leadIdx]) : 14;
    const safetyStockDays = safetyIdx !== -1 && !isNaN(Number(row[safetyIdx])) ? Number(row[safetyIdx]) : 7;
    const unitCost = costIdx !== -1 && !isNaN(Number(row[costIdx])) ? Number(row[costIdx]) : 0;
    const productName = nameIdx !== -1 && row[nameIdx] ? row[nameIdx] : (PRODUCTS_CATALOG.find((p) => p.sku.toLowerCase() === sku.toLowerCase())?.name || sku);

    valid.push({
      sku,
      productName,
      marketplace: 'all',
      currentStock: Math.round(currentStock),
      reservedStock: Math.max(0, Math.round(reservedStock)),
      leadTimeDays: Math.max(1, Math.round(leadTimeDays)),
      safetyStockDays: Math.max(0, Math.round(safetyStockDays)),
      unitCost: Math.max(0, unitCost),
      updatedAt: new Date().toISOString()
    });
  }

  return { valid, errors };
}

/**
 * Exports current inventory list to standard CSV format.
 */
export function exportInventoryCsv(items: InventoryItem[]): string {
  const headers = [
    'SKU',
    'Product Name',
    'Marketplace',
    'Current Stock',
    'Reserved Stock',
    'Lead Time (Days)',
    'Safety Stock (Days)',
    'Unit Cost (INR)',
    'Last Updated'
  ];

  const rows = items.map((item) => [
    `"${item.sku.replace(/"/g, '""')}"`,
    `"${item.productName.replace(/"/g, '""')}"`,
    item.marketplace,
    item.currentStock,
    item.reservedStock,
    item.leadTimeDays,
    item.safetyStockDays,
    item.unitCost.toFixed(2),
    `"${item.updatedAt}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Resets inventory database and memory cache back to default seeds.
 */
export async function resetInventoryToDefaults(): Promise<InventoryItem[]> {
  const defaults = seedDefaultInventory();
  await bulkSaveInventory(defaults);
  return defaults;
}
