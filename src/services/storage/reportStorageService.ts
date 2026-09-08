import type { Order } from '../../models/order';

export interface ImportBatch {
  batchId: string;
  fileName: string;
  fileSize?: number;
  marketplace: 'amazon' | 'flipkart' | string;
  reportType: string;
  importedAt: string; // ISO-8601 string
  recordCount: number;
  dateRange: { start: string; end: string };
}

export interface StoredOrderRecord {
  compositeKey: string;
  batchId: string;
  order: Order;
  updatedAt: string;
}

const DB_NAME = 'SellerDashboardDB';
const DB_VERSION = 1;
const STORE_BATCHES = 'batches';
const STORE_ORDERS = 'orders';

/**
 * Builds composite key for order deduplication: orderId + sku + status.
 */
export function getCompositeKey(order: Order): string {
  const orderId = (order.id || '').trim();
  const sku = (order.sku || '').trim().toLowerCase();
  const status = (order.status || '').trim().toLowerCase();
  return `${orderId}__${sku}__${status}`;
}

// -------------------------------------------------------------
// Universal Storage Accessor (Browser IndexedDB + In-Memory Fallback)
// -------------------------------------------------------------
const memoryBatches = new Map<string, ImportBatch>();
const memoryOrders = new Map<string, StoredOrderRecord>();

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

function getIDBKeyRangeFactory(): any {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as any).IDBKeyRange) {
      return (globalThis as any).IDBKeyRange;
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

      if (!db.objectStoreNames.contains(STORE_BATCHES)) {
        db.createObjectStore(STORE_BATCHES, { keyPath: 'batchId' });
      }

      if (!db.objectStoreNames.contains(STORE_ORDERS)) {
        const orderStore = db.createObjectStore(STORE_ORDERS, { keyPath: 'compositeKey' });
        orderStore.createIndex('batchId', 'batchId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

// -------------------------------------------------------------
// Core Storage APIs
// -------------------------------------------------------------

/**
 * Saves a new import batch and its normalized orders.
 * Orders are deduplicated by compositeKey (orderId + sku + status).
 */
export async function saveOrders(batch: ImportBatch, orders: Order[]): Promise<void> {
  const now = new Date().toISOString();

  if (!getIndexedDBFactory()) {
    // In-memory fallback
    memoryBatches.set(batch.batchId, { ...batch });
    for (const order of orders) {
      const compositeKey = getCompositeKey(order);
      memoryOrders.set(compositeKey, {
        compositeKey,
        batchId: batch.batchId,
        order,
        updatedAt: now
      });
    }
    return;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_BATCHES, STORE_ORDERS], 'readwrite');
    const batchStore = transaction.objectStore(STORE_BATCHES);
    const orderStore = transaction.objectStore(STORE_ORDERS);

    transaction.onerror = () => reject(transaction.error || new Error('Transaction failed'));
    transaction.oncomplete = () => resolve();

    // 1. Save or update the batch record
    batchStore.put(batch);

    // 2. Put each order with its composite key (upsert prevents duplicates)
    for (const order of orders) {
      const compositeKey = getCompositeKey(order);
      const record: StoredOrderRecord = {
        compositeKey,
        batchId: batch.batchId,
        order,
        updatedAt: now
      };
      orderStore.put(record);
    }
  });
}

/**
 * Retrieves all stored orders across all active batches, sorted by orderDate descending.
 */
export async function getAllOrders(): Promise<Order[]> {
  if (!getIndexedDBFactory()) {
    const list = Array.from(memoryOrders.values()).map((r) => r.order);
    return list.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_ORDERS, 'readonly');
    const store = transaction.objectStore(STORE_ORDERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const records = (request.result as StoredOrderRecord[]) || [];
      const orders = records.map((r) => r.order);
      orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
      resolve(orders);
    };
  });
}

/**
 * Retrieves metadata for all stored import batches, sorted by importedAt descending.
 */
export async function getImportBatches(): Promise<ImportBatch[]> {
  if (!getIndexedDBFactory()) {
    const list = Array.from(memoryBatches.values());
    return list.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_BATCHES, 'readonly');
    const store = transaction.objectStore(STORE_BATCHES);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const batches = (request.result as ImportBatch[]) || [];
      batches.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
      resolve(batches);
    };
  });
}

/**
 * Deletes a single batch and all associated order records.
 */
export async function deleteBatch(batchId: string): Promise<void> {
  if (!getIndexedDBFactory()) {
    memoryBatches.delete(batchId);
    for (const [key, record] of Array.from(memoryOrders.entries())) {
      if (record.batchId === batchId) {
        memoryOrders.delete(key);
      }
    }
    return;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_BATCHES, STORE_ORDERS], 'readwrite');
    const batchStore = transaction.objectStore(STORE_BATCHES);
    const orderStore = transaction.objectStore(STORE_ORDERS);

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    // 1. Delete batch record
    batchStore.delete(batchId);

    // 2. Delete all orders associated with this batchId
    const keyRange = getIDBKeyRangeFactory();
    const index = orderStore.index('batchId');
    const cursorReq = keyRange ? index.openCursor(keyRange.only(batchId)) : index.openCursor();

    cursorReq.onsuccess = (event: any) => {
      const cursor = event?.target?.result;
      if (cursor) {
        if (!keyRange || cursor.value?.batchId === batchId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  });
}

/**
 * Clears all batches and orders from local persistence.
 */
export async function clearAllData(): Promise<void> {
  if (!getIndexedDBFactory()) {
    memoryBatches.clear();
    memoryOrders.clear();
    return;
  }

  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_BATCHES, STORE_ORDERS], 'readwrite');
    const batchStore = transaction.objectStore(STORE_BATCHES);
    const orderStore = transaction.objectStore(STORE_ORDERS);

    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    batchStore.clear();
    orderStore.clear();
  });
}
