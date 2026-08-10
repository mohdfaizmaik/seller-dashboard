export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitsSold: number;
  revenue: number;
  costOfGoods: number;
  marketplaceFees: number;
  shippingCharges: number;
  advertisingSpend: number;
  returnsCount: number;
  netProfit: number;
  profitMargin: number; // Percentage value, e.g. 24.5
}
