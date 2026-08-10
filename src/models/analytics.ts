export interface KPICardData {
  title: string;
  value: string | number;
  change: number; // Percentage change (e.g., 12.5 for +12.5%, -3.2 for -3.2%)
  trend: 'up' | 'down' | 'neutral';
  subtitle: string;
}

export interface OverviewMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  totalOrders: number;
  ordersGrowth: number;
  unitsSold: number;
  unitsGrowth: number;
  netProfit: number;
  profitGrowth: number;
  avgOrderValue: number;
  aovGrowth: number;
  returnsCount: number;
  returnRate: number;
  returnRateGrowth: number;
}

export interface DailySalesMetric {
  date: string; // YYYY-MM-DD
  amazonRevenue: number;
  amazonOrders: number;
  amazonUnits: number;
  flipkartRevenue: number;
  flipkartOrders: number;
  flipkartUnits: number;
  totalRevenue: number;
  totalOrders: number;
}

export interface PlatformBreakdown {
  platform: 'amazon' | 'flipkart';
  revenue: number;
  orders: number;
  unitsSold: number;
  fees: number;
  returns: number;
  profit: number;
  margin: number; // e.g., 22.4 for 22.4%
}
