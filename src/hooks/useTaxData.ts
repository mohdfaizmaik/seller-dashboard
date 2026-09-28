import { useState, useMemo } from 'react';
import { useSellerData } from './useSellerData';
import { useSkuCosts } from './useSkuCosts';
import { useFilters } from './useFilters';
import { getDateRangeFromPreset } from '../services/analyticsService';
import {
  calculateTaxCompliance,
  INDIAN_GST_STATE_CODES,
  getGstStateInfo
} from '../services/tax/taxService';
import type { TaxComplianceSummary } from '../models/tax';

const STORAGE_KEY = 'seller_gst_state';

export function useTaxData() {
  const { orders } = useSellerData();
  const { skuCostsMap } = useSkuCosts();
  const { platform, preset, startDate, endDate } = useFilters();

  const [sellerState, setSellerStateInternal] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return saved;
    } catch {
      // Ignore
    }
    return 'Karnataka';
  });

  const setSellerState = (stateName: string) => {
    setSellerStateInternal(stateName);
    try {
      localStorage.setItem(STORAGE_KEY, stateName);
    } catch {
      // Ignore
    }
  };

  const { start, end } = useMemo(
    () => getDateRangeFromPreset(preset, startDate, endDate, orders),
    [preset, startDate, endDate, orders]
  );

  const summary: TaxComplianceSummary = useMemo(() => {
    return calculateTaxCompliance(orders, {
      sellerState,
      platform,
      start,
      end,
      skuCostsMap
    });
  }, [orders, sellerState, platform, start, end, skuCostsMap]);

  // Unique list of sorted states for dropdown selection
  const availableStates = useMemo(() => {
    const unique = new Map<string, { code: string; name: string; pos: string }>();
    for (const info of Object.values(INDIAN_GST_STATE_CODES)) {
      unique.set(info.code, info);
    }
    return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return {
    sellerState,
    setSellerState,
    sellerInfo: getGstStateInfo(sellerState),
    availableStates,
    summary,
    dateRange: { start, end }
  };
}
