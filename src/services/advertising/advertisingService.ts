import type { Order } from '../../models/order';
import type { SkuCost } from '../catalog/cogsService';
import type { PlatformFilter } from '../../hooks/useFilters';
import { PRODUCTS_CATALOG } from '../../data/products';
import type {
  AdCampaign,
  SkuAdEfficiency,
  PlatformAdSummary,
  AdvertisingPortfolioSummary
} from '../../models/advertising';

const CAMPAIGN_STORAGE_KEY = 'sellervault_ad_campaign_overrides';

// -------------------------------------------------------------
// 1. Default Catalog-Grounded Advertising Campaigns
// -------------------------------------------------------------
export const DEFAULT_AD_CAMPAIGNS: AdCampaign[] = [
  // Amazon India Campaigns
  {
    id: 'CAMP-AZ-SP-01',
    name: 'SP - boAt Rockerz 450 - Exact Keyword Match',
    platform: 'amazon',
    campaignType: 'sponsored_products',
    targetingType: 'keyword',
    status: 'active',
    dailyBudget: 400,
    impressions: 48500,
    clicks: 1420,
    ctr: 2.93,
    cpc: 8.45,
    adSpend: 12000,
    adSales: 62450,
    orders: 42,
    acos: 19.22,
    roas: 5.20,
    targetAcos: 25.0,
    efficiencyTier: 'star_performer',
    skuTargeted: 'BOAT-RK450-BLK'
  },
  {
    id: 'CAMP-AZ-SP-02',
    name: 'SP - OnePlus Nord Buds 2r - Auto Targeting',
    platform: 'amazon',
    campaignType: 'sponsored_products',
    targetingType: 'auto',
    status: 'active',
    dailyBudget: 350,
    impressions: 34200,
    clicks: 890,
    ctr: 2.60,
    cpc: 10.20,
    adSpend: 9078,
    adSales: 34500,
    orders: 16,
    acos: 26.31,
    roas: 3.80,
    targetAcos: 25.0,
    efficiencyTier: 'healthy',
    skuTargeted: '1PLUS-NBUDS-BLU'
  },
  {
    id: 'CAMP-AZ-SP-03',
    name: 'SP - Noise Smartwatch - Aggressive Conquesting',
    platform: 'amazon',
    campaignType: 'sponsored_products',
    targetingType: 'product',
    status: 'active',
    dailyBudget: 500,
    impressions: 62000,
    clicks: 1950,
    ctr: 3.15,
    cpc: 15.13,
    adSpend: 29500,
    adSales: 48900,
    orders: 24,
    acos: 60.33,
    roas: 1.66,
    targetAcos: 30.0,
    efficiencyTier: 'ad_bleed',
    skuTargeted: 'NOISE-CFP3-SLV'
  },
  {
    id: 'CAMP-AZ-SB-04',
    name: 'SB - Audio Storefront Video & Broad Search',
    platform: 'amazon',
    campaignType: 'sponsored_brands',
    targetingType: 'keyword',
    status: 'active',
    dailyBudget: 250,
    impressions: 18500,
    clicks: 410,
    ctr: 2.22,
    cpc: 9.75,
    adSpend: 4000,
    adSales: 0,
    orders: 0,
    acos: 0,
    roas: 0,
    targetAcos: 25.0,
    efficiencyTier: 'money_pit',
    skuTargeted: 'SANDISK-64GB-SD'
  },

  // Flipkart Campaigns (Product Listing Ads)
  {
    id: 'CAMP-FK-PLA-01',
    name: 'PLA - Prestige Iris Mixer Grinder - Category Push',
    platform: 'flipkart',
    campaignType: 'product_listing_ads',
    targetingType: 'keyword',
    status: 'active',
    dailyBudget: 300,
    impressions: 29400,
    clicks: 810,
    ctr: 2.76,
    cpc: 8.50,
    adSpend: 6885,
    adSales: 31491,
    orders: 9,
    acos: 21.86,
    roas: 4.57,
    targetAcos: 25.0,
    efficiencyTier: 'star_performer',
    skuTargeted: 'PRESTIGE-IRIS-MIX'
  },
  {
    id: 'CAMP-FK-PLA-02',
    name: 'PLA - Allen Solly Polo - Keyword Search',
    platform: 'flipkart',
    campaignType: 'product_listing_ads',
    targetingType: 'keyword',
    status: 'active',
    dailyBudget: 250,
    impressions: 22000,
    clicks: 650,
    ctr: 2.95,
    cpc: 7.20,
    adSpend: 4680,
    adSales: 16182,
    orders: 18,
    acos: 28.92,
    roas: 3.46,
    targetAcos: 30.0,
    efficiencyTier: 'healthy',
    skuTargeted: 'AS-POLO-NAVY'
  },
  {
    id: 'CAMP-FK-PLA-03',
    name: "PLA - Levi's 511 Denim - Generic Apparel Bid",
    platform: 'flipkart',
    campaignType: 'product_listing_ads',
    targetingType: 'keyword',
    status: 'active',
    dailyBudget: 350,
    impressions: 38000,
    clicks: 1250,
    ctr: 3.29,
    cpc: 12.32,
    adSpend: 15400,
    adSales: 24990,
    orders: 10,
    acos: 61.62,
    roas: 1.62,
    targetAcos: 30.0,
    efficiencyTier: 'ad_bleed',
    skuTargeted: 'LEVI-511-INDIGO'
  },

  // Meesho Campaigns (Catalog Visibility Boost)
  {
    id: 'CAMP-MS-BOOST-01',
    name: 'Meesho Price Discovery - Biba Cotton Kurta',
    platform: 'meesho',
    campaignType: 'catalog_boost',
    targetingType: 'auto',
    status: 'active',
    dailyBudget: 200,
    impressions: 41000,
    clicks: 1250,
    ctr: 3.05,
    cpc: 3.80,
    adSpend: 4750,
    adSales: 28485,
    orders: 15,
    acos: 16.68,
    roas: 6.00,
    targetAcos: 20.0,
    efficiencyTier: 'star_performer',
    skuTargeted: 'BIBA-ANARKALI-RED'
  },
  {
    id: 'CAMP-MS-BOOST-02',
    name: 'Meesho Visibility - Wipro Smart LED Bulb',
    platform: 'meesho',
    campaignType: 'catalog_boost',
    targetingType: 'auto',
    status: 'active',
    dailyBudget: 150,
    impressions: 19500,
    clicks: 680,
    ctr: 3.49,
    cpc: 4.20,
    adSpend: 2856,
    adSales: 10782,
    orders: 18,
    acos: 26.49,
    roas: 3.78,
    targetAcos: 25.0,
    efficiencyTier: 'healthy',
    skuTargeted: 'WIPRO-12W-SMART'
  }
];

// -------------------------------------------------------------
// 2. Campaign Status Persistence
// -------------------------------------------------------------
export function getStoredCampaignOverrides(): Record<string, 'active' | 'paused'> {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(CAMPAIGN_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return {};
}

export function saveCampaignOverride(campaignId: string, status: 'active' | 'paused'): void {
  try {
    const current = getStoredCampaignOverrides();
    current[campaignId] = status;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(current));
    }
  } catch {
    // Ignore
  }
}

// -------------------------------------------------------------
// 3. Advertising Calculation Engine
// -------------------------------------------------------------
export interface CalculateAdvertisingOptions {
  platform?: PlatformFilter;
  start?: Date;
  end?: Date;
  skuCostsMap?: Map<string, SkuCost>;
}

export function calculateAdvertisingSummary(
  orders: Order[],
  options: CalculateAdvertisingOptions = {}
): AdvertisingPortfolioSummary {
  const {
    platform = 'all',
    start,
    end,
    skuCostsMap
  } = options;

  // Read stored campaign overrides
  const overrides = getStoredCampaignOverrides();

  // Apply overrides and platform filter to campaigns
  const activeCampaigns = DEFAULT_AD_CAMPAIGNS.map((c) => ({
    ...c,
    status: overrides[c.id] || c.status
  })).filter((c) => {
    if (platform !== 'all' && c.platform !== platform) return false;
    return true;
  });

  // Filter valid non-cancelled orders for overall store revenue comparison
  const validOrders = orders.filter((o) => {
    if (o.status === 'cancelled') return false;
    if (platform !== 'all' && o.platform !== platform) return false;
    if (start || end) {
      const d = new Date(o.orderDate || o.date || '');
      if (start && d < start) return false;
      if (end && d > end) return false;
    }
    return true;
  });

  const totalStoreRevenue = validOrders.reduce((sum, o) => sum + (o.orderValue || o.gross_amount || 0), 0);
  const totalStoreOrders = validOrders.length;

  // Platform aggregations
  const platformTotals: Record<'amazon' | 'flipkart' | 'meesho', PlatformAdSummary> = {
    amazon: {
      platform: 'amazon',
      displayName: 'Amazon India Ads',
      adSpend: 0,
      adSales: 0,
      orders: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      acos: 0,
      roas: 0,
      tacos: 0,
      activeCampaignsCount: 0
    },
    flipkart: {
      platform: 'flipkart',
      displayName: 'Flipkart PLA',
      adSpend: 0,
      adSales: 0,
      orders: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      acos: 0,
      roas: 0,
      tacos: 0,
      activeCampaignsCount: 0
    },
    meesho: {
      platform: 'meesho',
      displayName: 'Meesho Promotions',
      adSpend: 0,
      adSales: 0,
      orders: 0,
      impressions: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      acos: 0,
      roas: 0,
      tacos: 0,
      activeCampaignsCount: 0
    }
  };

  let totalAdSpend = 0;
  let totalAdSales = 0;
  let totalImpressions = 0;
  let totalClicks = 0;
  let totalAdOrders = 0;
  let moneyPitSpend = 0;

  for (const c of activeCampaigns) {
    // Only count active campaigns for spend
    const isPaused = c.status === 'paused';
    const spend = isPaused ? 0 : c.adSpend;
    const sales = isPaused ? 0 : c.adSales;
    const ordersCount = isPaused ? 0 : c.orders;
    const clicks = isPaused ? 0 : c.clicks;
    const impressions = isPaused ? 0 : c.impressions;

    totalAdSpend += spend;
    totalAdSales += sales;
    totalAdOrders += ordersCount;
    totalClicks += clicks;
    totalImpressions += impressions;

    if (!isPaused && c.efficiencyTier === 'money_pit') {
      moneyPitSpend += spend;
    }

    const targetPlat = platformTotals[c.platform];
    if (targetPlat) {
      targetPlat.adSpend += spend;
      targetPlat.adSales += sales;
      targetPlat.orders += ordersCount;
      targetPlat.clicks += clicks;
      targetPlat.impressions += impressions;
      if (c.status === 'active') {
        targetPlat.activeCampaignsCount += 1;
      }
    }
  }

  // Finalize platform summary rates
  for (const key of ['amazon', 'flipkart', 'meesho'] as const) {
    const p = platformTotals[key];
    p.ctr = p.impressions > 0 ? Number(((p.clicks / p.impressions) * 100).toFixed(2)) : 0;
    p.cpc = p.clicks > 0 ? Number((p.adSpend / p.clicks).toFixed(2)) : 0;
    p.acos = p.adSales > 0 ? Number(((p.adSpend / p.adSales) * 100).toFixed(2)) : 0;
    p.roas = p.adSpend > 0 ? Number((p.adSales / p.adSpend).toFixed(2)) : 0;
    // Platform-specific TACoS relative to platform store revenue
    const platStoreRevenue = validOrders
      .filter((o) => o.platform === key)
      .reduce((sum, o) => sum + (o.orderValue || o.gross_amount || 0), 0);
    p.tacos = platStoreRevenue > 0 ? Number(((p.adSpend / platStoreRevenue) * 100).toFixed(2)) : 0;
  }

  // 4. SKU-Level Ad Efficiency & Ad Bleed Analysis
  const skuEfficiencies: SkuAdEfficiency[] = [];
  let adBleedCount = 0;

  // Build map of orders revenue per SKU
  const skuRevenueMap = new Map<string, number>();
  for (const o of validOrders) {
    const skuKey = (o.sku || '').toUpperCase();
    const cur = skuRevenueMap.get(skuKey) || 0;
    skuRevenueMap.set(skuKey, cur + (o.orderValue || o.gross_amount || 0));
  }

  for (const p of PRODUCTS_CATALOG) {
    const skuKey = p.sku.toUpperCase();
    const storeRevenue = skuRevenueMap.get(skuKey) || 0;

    // Direct campaigns targeting this SKU
    const matchedCamps = activeCampaigns.filter(
      (c) => c.skuTargeted && c.skuTargeted.toUpperCase() === skuKey && c.status === 'active'
    );

    const skuAdSpend = matchedCamps.reduce((sum, c) => sum + c.adSpend, 0);
    const skuAdSales = matchedCamps.reduce((sum, c) => sum + c.adSales, 0);

    // Calculate gross margin %: (Selling Price - COGS) / Selling Price
    const costPrice = skuCostsMap?.get(p.sku.toLowerCase())?.cogs ?? p.costPrice;
    const grossMarginPct = p.sellingPrice > 0 ? Number((((p.sellingPrice - costPrice) / p.sellingPrice) * 100).toFixed(1)) : 0;

    const acos = skuAdSales > 0 ? Number(((skuAdSpend / skuAdSales) * 100).toFixed(1)) : 0;
    const roas = skuAdSpend > 0 ? Number((skuAdSales / skuAdSpend).toFixed(2)) : 0;
    const effectiveTotalRev = Math.max(storeRevenue, skuAdSales);
    const tacos = effectiveTotalRev > 0 ? Number(((skuAdSpend / effectiveTotalRev) * 100).toFixed(1)) : 0;

    const organicSales = Math.max(0, effectiveTotalRev - skuAdSales);
    const organicSharePct = effectiveTotalRev > 0 ? Number(((organicSales / effectiveTotalRev) * 100).toFixed(1)) : 100;

    // AD BLEED CONDITION: ACoS exceeds Product Gross Margin % with material ad spend (> ₹500)
    const isAdBleed = acos > grossMarginPct && skuAdSpend > 500;
    if (isAdBleed) {
      adBleedCount += 1;
    }

    const netMarginAfterAds = Number((grossMarginPct - tacos).toFixed(1));

    // Operational recommendation
    let recommendation = 'Maintain current bids and monitor conversion rates.';
    if (isAdBleed) {
      recommendation = `Ad Bleed! ACoS (${acos}%) exceeds Gross Margin (${grossMarginPct}%). Cut bids by 25% or pause non-converting keywords.`;
    } else if (roas >= 4.5) {
      recommendation = `Star Performer! High ROAS (${roas}x). Scale daily campaign budget by 20% to capture more search volume.`;
    } else if (skuAdSpend > 1000 && skuAdSales === 0) {
      recommendation = 'Money Pit! Zero attributed sales. Pause campaign or negative-match irrelevant search queries.';
    } else if (organicSharePct > 80 && skuAdSpend > 0) {
      recommendation = `Strong organic velocity (${organicSharePct}%). Avoid over-bidding on branded terms to preserve margins.`;
    } else if (skuAdSpend === 0) {
      recommendation = '100% Organic demand. Consider testing Sponsored Products to capture incremental search volume.';
    }

    skuEfficiencies.push({
      sku: p.sku,
      productName: p.name,
      platform: matchedCamps[0]?.platform || 'blended',
      sellingPrice: p.sellingPrice,
      cogs: costPrice,
      grossMarginPct,
      totalRevenue: effectiveTotalRev,
      adSpend: skuAdSpend,
      adSales: skuAdSales,
      organicSales,
      organicSharePct,
      acos,
      roas,
      tacos,
      isAdBleed,
      netMarginAfterAds,
      recommendation
    });
  }

  // Sort SKU efficiencies by ad spend descending
  skuEfficiencies.sort((a, b) => b.adSpend - a.adSpend);

  // Blended Portfolio KPI Calculations
  const blendedAcos = totalAdSales > 0 ? Number(((totalAdSpend / totalAdSales) * 100).toFixed(2)) : 0;
  const blendedRoas = totalAdSpend > 0 ? Number((totalAdSales / totalAdSpend).toFixed(2)) : 0;
  const effectiveTotalRev = Math.max(totalStoreRevenue, totalAdSales);
  const blendedTacos = effectiveTotalRev > 0 ? Number(((totalAdSpend / effectiveTotalRev) * 100).toFixed(2)) : 0;
  const blendedCpc = totalClicks > 0 ? Number((totalAdSpend / totalClicks).toFixed(2)) : 0;
  const blendedCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const blendedCac = totalStoreOrders > 0 ? Number((totalAdSpend / totalStoreOrders).toFixed(2)) : 0;

  const organicSales = Math.max(0, effectiveTotalRev - totalAdSales);
  const organicPct = effectiveTotalRev > 0 ? Number(((organicSales / effectiveTotalRev) * 100).toFixed(1)) : 100;
  const paidPct = Number((100 - organicPct).toFixed(1));

  return {
    totalAdSpend,
    totalAdSales,
    totalStoreRevenue: effectiveTotalRev,
    blendedAcos,
    blendedRoas,
    blendedTacos,
    blendedCpc,
    blendedCtr,
    totalImpressions,
    totalClicks,
    totalAdOrders,
    totalStoreOrders,
    blendedCac,
    organicVsPaidRatio: {
      organicSales,
      paidSales: totalAdSales,
      organicPct,
      paidPct
    },
    platformBreakdown: platformTotals,
    adBleedCount,
    moneyPitSpend,
    campaigns: activeCampaigns,
    skuEfficiencies
  };
}

// -------------------------------------------------------------
// 4. One-Click Exporters (CSV)
// -------------------------------------------------------------
export function exportCampaignsCsv(summary: AdvertisingPortfolioSummary): string {
  const headers = [
    'Campaign ID',
    'Campaign Name',
    'Platform',
    'Campaign Type',
    'Targeting',
    'Status',
    'Daily Budget (INR)',
    'Impressions',
    'Clicks',
    'CTR (%)',
    'CPC (INR)',
    'Ad Spend (INR)',
    'Ad Sales (INR)',
    'Orders',
    'ACoS (%)',
    'ROAS',
    'Efficiency Tier'
  ];

  const rows = summary.campaigns.map((c) => [
    c.id,
    `"${c.name.replace(/"/g, '""')}"`,
    c.platform,
    c.campaignType,
    c.targetingType,
    c.status,
    c.dailyBudget,
    c.impressions,
    c.clicks,
    `${c.ctr}%`,
    c.cpc,
    c.adSpend,
    c.adSales,
    c.orders,
    `${c.acos}%`,
    c.roas,
    c.efficiencyTier
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportSkuAdEfficiencyCsv(summary: AdvertisingPortfolioSummary): string {
  const headers = [
    'SKU',
    'Product Name',
    'Channel',
    'Selling Price (INR)',
    'COGS (INR)',
    'Gross Margin (%)',
    'Total Revenue (INR)',
    'Ad Spend (INR)',
    'Ad Sales (INR)',
    'Organic Sales (INR)',
    'Organic Share (%)',
    'ACoS (%)',
    'ROAS',
    'TACoS (%)',
    'Ad Bleed?',
    'Net Margin After Ads (%)',
    'Recommendation'
  ];

  const rows = summary.skuEfficiencies.map((s) => [
    s.sku,
    `"${s.productName.replace(/"/g, '""')}"`,
    s.platform,
    s.sellingPrice,
    s.cogs,
    `${s.grossMarginPct}%`,
    s.totalRevenue,
    s.adSpend,
    s.adSales,
    s.organicSales,
    `${s.organicSharePct}%`,
    `${s.acos}%`,
    s.roas,
    `${s.tacos}%`,
    s.isAdBleed ? 'YES' : 'NO',
    `${s.netMarginAfterAds}%`,
    `"${s.recommendation.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
