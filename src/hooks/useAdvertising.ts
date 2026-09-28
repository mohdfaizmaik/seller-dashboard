import { useState, useMemo, useCallback } from 'react';
import { useSellerData } from './useSellerData';
import { useSkuCosts } from './useSkuCosts';
import { useFilters } from './useFilters';
import { getDateRangeFromPreset } from '../services/analyticsService';
import {
  calculateAdvertisingSummary,
  saveCampaignOverride
} from '../services/advertising/advertisingService';
import type { AdvertisingPortfolioSummary } from '../models/advertising';

export function useAdvertising() {
  const { orders } = useSellerData();
  const { skuCostsMap } = useSkuCosts();
  const { platform, preset, startDate, endDate } = useFilters();

  const [version, setVersion] = useState(0);

  const { start, end } = useMemo(
    () => getDateRangeFromPreset(preset, startDate, endDate, orders),
    [preset, startDate, endDate, orders]
  );

  const summary: AdvertisingPortfolioSummary = useMemo(() => {
    // depend on version to force recalculation on override toggle
    void version;
    return calculateAdvertisingSummary(orders, {
      platform,
      start,
      end,
      skuCostsMap
    });
  }, [orders, platform, start, end, skuCostsMap, version]);

  const toggleCampaign = useCallback((campaignId: string, currentStatus: 'active' | 'paused') => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    saveCampaignOverride(campaignId, newStatus);
    setVersion((v) => v + 1);
  }, []);

  const resetCampaigns = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sellervault_ad_campaign_overrides');
      }
    } catch {
      // Ignore
    }
    setVersion((v) => v + 1);
  }, []);

  return {
    summary,
    toggleCampaign,
    resetCampaigns,
    platform,
    dateRange: { start, end }
  };
}
