import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllSkuCosts,
  saveSkuCost,
  bulkSaveSkuCosts,
  type SkuCost
} from '../services/catalog/cogsService';

export function useSkuCosts() {
  const [skuCosts, setSkuCosts] = useState<SkuCost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllSkuCosts();
      setSkuCosts(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load SKU costs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  const skuCostsMap = useMemo(() => {
    const map = new Map<string, SkuCost>();
    for (const item of skuCosts) {
      map.set(item.sku.toLowerCase(), item);
    }
    return map;
  }, [skuCosts]);

  const updateCost = useCallback(async (cost: SkuCost) => {
    await saveSkuCost(cost);
    await loadCosts();
  }, [loadCosts]);

  const bulkUpdateCosts = useCallback(async (costs: SkuCost[]) => {
    await bulkSaveSkuCosts(costs);
    await loadCosts();
  }, [loadCosts]);

  return {
    skuCosts,
    skuCostsMap,
    loading,
    error,
    updateCost,
    bulkUpdateCosts,
    refresh: loadCosts
  };
}
