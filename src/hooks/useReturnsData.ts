import { useState, useMemo, useCallback } from 'react';
import { useSellerData } from './useSellerData';
import { useSkuCosts } from './useSkuCosts';
import { useFilters } from './useFilters';
import { getDateRangeFromPreset } from '../services/analyticsService';
import {
  calculateReturnsSummary,
  saveNdrAction
} from '../services/returns/returnsService';
import type { ReturnsPortfolioSummary, NdrStatus } from '../models/returns';

export function useReturnsData() {
  const { orders } = useSellerData();
  const { skuCostsMap } = useSkuCosts();
  const { platform, preset, startDate, endDate } = useFilters();

  const [version, setVersion] = useState(0);

  const { start, end } = useMemo(
    () => getDateRangeFromPreset(preset, startDate, endDate, orders),
    [preset, startDate, endDate, orders]
  );

  const summary: ReturnsPortfolioSummary = useMemo(() => {
    void version; // Ensure re-render on NDR state mutation
    return calculateReturnsSummary(orders, {
      platform,
      start,
      end,
      skuCostsMap
    });
  }, [orders, platform, start, end, skuCostsMap, version]);

  const resolveNdrCase = useCallback((caseId: string, status: NdrStatus, note?: string) => {
    saveNdrAction(caseId, status, note);
    setVersion((v) => v + 1);
  }, []);

  const resetNdrActions = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sellervault_ndr_actions');
      }
    } catch {
      // Ignore
    }
    setVersion((v) => v + 1);
  }, []);

  return {
    summary,
    resolveNdrCase,
    resetNdrActions,
    platform,
    dateRange: { start, end }
  };
}
