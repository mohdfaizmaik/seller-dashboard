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
  netSales: number;
  netSalesGrowth: number;
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

export interface FinancialSummary {
  grossRevenue: number;
  refundedValue: number;      // Revenue refunded for returned orders
  netSales: number;           // Gross Revenue - Refunded Value
  orderCount: number;         // Count of active orders (status !== 'cancelled')
  returnedOrderCount: number; // Count of returned orders (status === 'returned')
  cancelledOrderCount: number;// Count of cancelled orders (status === 'cancelled')
  unitsSold: number;          // Total quantity of items sold in active orders
  cogs: number;               // Cost of Goods Sold for active orders
  marketplaceFees: number;    // Amazon referral or Flipkart commission + fixed closing fees
  shipping: number;           // Fulfilled shipping charges
  advertising: number;        // Advertising campaign spend
  returnRelatedCosts: number; // Reverse shipping + processing + restocking write-off losses
  netProfit: number;          // Net profit of the seller account
  profitMargin: number;       // netProfit / Gross Revenue * 100
  aov: number;                // grossRevenue / orderCount
  returnRate: number;         // returnedOrderCount / orderCount * 100
}

export interface DailyChartMetric {
  date: string; // YYYY-MM-DD
  grossRevenue: number;
  refundedValue: number;
  netSales: number;
  orderCount: number;
  unitsSold: number;
  netProfit: number;
}
