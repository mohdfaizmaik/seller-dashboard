import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllInventory,
  saveInventoryItem,
  bulkSaveInventory,
  adjustStock,
  resetInventoryToDefaults,
  type InventoryItem
} from '../services/inventory/inventoryService';

export function useInventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllInventory();
      setInventory(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventory) {
      map.set(item.sku.toLowerCase(), item);
    }
    return map;
  }, [inventory]);

  const updateItem = useCallback(async (item: InventoryItem) => {
    await saveInventoryItem(item);
    await loadInventory();
  }, [loadInventory]);

  const adjustStockQuantity = useCallback(async (
    sku: string,
    currentStock: number,
    reservedStock?: number,
    leadTimeDays?: number,
    safetyStockDays?: number
  ) => {
    await adjustStock(sku, currentStock, reservedStock, leadTimeDays, safetyStockDays);
    await loadInventory();
  }, [loadInventory]);

  const bulkUpdate = useCallback(async (items: InventoryItem[]) => {
    await bulkSaveInventory(items);
    await loadInventory();
  }, [loadInventory]);

  const resetDefaults = useCallback(async () => {
    await resetInventoryToDefaults();
    await loadInventory();
  }, [loadInventory]);

  return {
    inventory,
    inventoryMap,
    loading,
    error,
    updateItem,
    adjustStockQuantity,
    bulkUpdate,
    resetDefaults,
    refresh: loadInventory
  };
}
