export type AdChannel = 'amazon_sp' | 'amazon_sb' | 'flipkart_pla' | 'meesho_boost';

export type CampaignType = 'sponsored_products' | 'sponsored_brands' | 'product_listing_ads' | 'catalog_boost';

export type TargetingType = 'keyword' | 'product' | 'auto';

export type EfficiencyTier = 'star_performer' | 'healthy' | 'ad_bleed' | 'money_pit';

export interface AdCampaign {
  id: string;
  name: string;
  platform: 'amazon' | 'flipkart' | 'meesho';
  campaignType: CampaignType;
  targetingType: TargetingType;
  status: 'active' | 'paused' | 'archived';
  dailyBudget: number;       // INR
  impressions: number;
  clicks: number;
  ctr: number;               // Click-Through Rate (clicks / impressions %)
  cpc: number;               // Cost Per Click (spend / clicks in INR)
  adSpend: number;           // Total spend in INR
  adSales: number;           // Attributed revenue in INR
  orders: number;            // Attributed orders
  acos: number;              // Advertising Cost of Sales (spend / sales %)
  roas: number;              // Return on Ad Spend (sales / spend)
  targetAcos: number;        // Target threshold (e.g. 20%)
  efficiencyTier: EfficiencyTier;
  skuTargeted?: string;
}

export interface SkuAdEfficiency {
  sku: string;
  productName: string;
  platform: 'amazon' | 'flipkart' | 'meesho' | 'blended';
  sellingPrice: number;      // INR
  cogs: number;              // INR
  grossMarginPct: number;    // ((sellingPrice - cogs) / sellingPrice) * 100
  totalRevenue: number;      // Total store sales for this SKU
  adSpend: number;           // Direct ad spend attributed
  adSales: number;           // Direct ad revenue attributed
  organicSales: number;      // totalRevenue - adSales
  organicSharePct: number;   // (organicSales / totalRevenue) * 100
  acos: number;              // adSpend / adSales %
  roas: number;              // adSales / adSpend
  tacos: number;             // adSpend / totalRevenue %
  isAdBleed: boolean;        // acos > grossMarginPct
  netMarginAfterAds: number; // grossMarginPct - tacos
  recommendation: string;
}

export interface PlatformAdSummary {
  platform: 'amazon' | 'flipkart' | 'meesho';
  displayName: string;
  adSpend: number;
  adSales: number;
  orders: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  acos: number;
  roas: number;
  tacos: number;
  activeCampaignsCount: number;
}

export interface AdvertisingPortfolioSummary {
  totalAdSpend: number;
  totalAdSales: number;
  totalStoreRevenue: number;
  blendedAcos: number;       // totalAdSpend / totalAdSales %
  blendedRoas: number;       // totalAdSales / totalAdSpend
  blendedTacos: number;      // totalAdSpend / totalStoreRevenue %
  blendedCpc: number;
  blendedCtr: number;
  totalImpressions: number;
  totalClicks: number;
  totalAdOrders: number;
  totalStoreOrders: number;
  blendedCac: number;        // totalAdSpend / totalStoreOrders
  organicVsPaidRatio: {
    organicSales: number;
    paidSales: number;
    organicPct: number;
    paidPct: number;
  };
  platformBreakdown: {
    amazon: PlatformAdSummary;
    flipkart: PlatformAdSummary;
    meesho: PlatformAdSummary;
  };
  adBleedCount: number;
  moneyPitSpend: number;
  campaigns: AdCampaign[];
  skuEfficiencies: SkuAdEfficiency[];
}
