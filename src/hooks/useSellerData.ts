import { useState, useEffect, useCallback } from 'react';
import type { Order } from '../models/order';
import { MOCK_ORDERS } from '../data/orders';
import {
  getAllOrders,
  getImportBatches,
  deleteBatch,
  clearAllData,
  saveOrders
} from '../services/storage/reportStorageService';
import type { ImportBatch } from '../services/storage/reportStorageService';

export interface UseSellerDataResult {
  /** Effective active orders: either imported orders or fallback mock orders */
  orders: Order[];
  /** Stored import batches metadata */
  batches: ImportBatch[];
  /** Loading state while querying storage */
  isLoading: boolean;
  /** Whether user has any imported batches stored */
  hasImportedData: boolean;
  /** Whether the user has toggled to mock fallback view */
  useMockFallback: boolean;
  /** Toggle between imported dataset and fallback mock dataset */
  setUseMockFallback: (val: boolean) => void;
  /** Refetches batches and orders from local persistence */
  reloadData: () => Promise<void>;
  /** Deletes a specific batch and refreshes orders */
  removeBatch: (batchId: string) => Promise<void>;
  /** Clears all imported data */
  clearAll: () => Promise<void>;
  /** Directly saves a new batch and refreshes state */
  saveImportBatch: (batch: ImportBatch, orders: Order[]) => Promise<void>;
}

export function useSellerData(): UseSellerDataResult {
  const [importedOrders, setImportedOrders] = useState<Order[]>([]);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockFallback, setUseMockFallback] = useState(false);

  const reloadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [allBatches, allOrders] = await Promise.all([
        getImportBatches(),
        getAllOrders()
      ]);
      setBatches(allBatches);
      setImportedOrders(allOrders);
    } catch {
      // Fallback silently if storage unavailable
      setBatches([]);
      setImportedOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  const removeBatch = useCallback(
    async (batchId: string) => {
      await deleteBatch(batchId);
      await reloadData();
    },
    [reloadData]
  );

  const clearAll = useCallback(async () => {
    await clearAllData();
    await reloadData();
  }, [reloadData]);

  const saveImportBatch = useCallback(
    async (batch: ImportBatch, orders: Order[]) => {
      await saveOrders(batch, orders);
      await reloadData();
    },
    [reloadData]
  );

  const hasImportedData = batches.length > 0 && importedOrders.length > 0;
  const effectiveOrders = hasImportedData && !useMockFallback ? importedOrders : MOCK_ORDERS;

  return {
    orders: effectiveOrders,
    batches,
    isLoading,
    hasImportedData,
    useMockFallback,
    setUseMockFallback,
    reloadData,
    removeBatch,
    clearAll,
    saveImportBatch
  };
}
