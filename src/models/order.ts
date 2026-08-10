export interface Order {
  id: string;
  platform: 'amazon' | 'flipkart';
  productId: string;
  productName: string;
  sku: string;
  orderValue: number;
  quantity: number;
  status: 'shipped' | 'delivered' | 'pending' | 'cancelled' | 'returned';
  orderDate: string; // ISO-8601 YYYY-MM-DD string
}
