export interface OrderEstimatedFees {
  referralFee: number;
  closingFee: number;
  totalFees: number;
}

export interface Order {
  // Primary identifier & timestamps
  id: string;
  orderDate: string; // ISO-8601 YYYY-MM-DD or ISO string
  date?: string; // Unified date alias (ISO-8601)

  // Marketplace & platform origin
  platform: 'amazon' | 'flipkart' | 'meesho' | string;
  marketplace?: 'amazon' | 'flipkart' | 'meesho' | string;

  // Product & catalog identifiers
  productId: string;
  productName: string;
  product_name?: string; // Unified product name alias
  sku: string;
  asin?: string;
  fsn?: string;
  orderItemId?: string;
  isShopsy?: boolean;

  // Financials & quantities
  orderValue: number; // Gross order value (INR)
  gross_amount?: number; // Unified gross amount alias (INR)
  quantity: number;
  tax_amount?: number;
  shipping_fee?: number;

  // Order lifecycle & fulfillment
  status: 'shipped' | 'delivered' | 'pending' | 'cancelled' | 'returned';
  fulfillmentChannel?: 'MFN' | 'AFN' | string;
  paymentMethod?: 'COD' | 'Prepaid' | string;
  shipToState?: string;

  // Estimated marketplace deductions and profit (Phase 4 assumption engine)
  estimatedFees?: OrderEstimatedFees;
  estimatedNetProfit?: number;
}
