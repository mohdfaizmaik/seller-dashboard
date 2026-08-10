import { PRODUCTS_CATALOG } from './products';
import type { Order } from '../models/order';

// Seeded Pseudo-Random Number Generator (Linear Congruential Generator)
// This guarantees the exact same dataset is generated on every run/load.
function createRandom(seed: number) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateOrders(): Order[] {
  const random = createRandom(1234567);
  const orders: Order[] = [];
  const baseDate = new Date(2026, 7, 10); // Aug 10, 2026 (current time in project context)

  const numOrders = 800; // Exactly 800 deterministic orders

  for (let i = 0; i < numOrders; i++) {
    // 1. Platform distribution: Amazon (60%), Flipkart (40%)
    const platform = random() < 0.6 ? 'amazon' : 'flipkart';

    // 2. Select product from catalog
    const productIdx = Math.floor(random() * PRODUCTS_CATALOG.length);
    const product = PRODUCTS_CATALOG[productIdx];

    // 3. Determine quantity: 1 (80%), 2 (15%), 3 (5%)
    const randQty = random();
    const quantity = randQty < 0.8 ? 1 : randQty < 0.95 ? 2 : 3;

    // 4. Calculate order value
    const orderValue = quantity * product.sellingPrice;

    // 5. Select status: Delivered (76%), Shipped (10%), Pending (4%), Cancelled (4%), Returned (6%)
    const randStatus = random();
    const status: Order['status'] = 
      randStatus < 0.76 ? 'delivered' :
      randStatus < 0.86 ? 'shipped' :
      randStatus < 0.90 ? 'pending' :
      randStatus < 0.94 ? 'cancelled' : 'returned';

    // 6. Generate order date distributed over the last 365 days
    let daysAgo = Math.floor(random() * 365);
    
    // Seasonality adjustment: add a festive peak (October-December, roughly 220-314 days ago relative to Aug 10, 2026)
    const testSeason = random();
    if (testSeason < 0.25) {
      daysAgo = 220 + Math.floor(random() * 94);
    }

    const orderDateObj = new Date(baseDate.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const orderDate = orderDateObj.toISOString().split('T')[0];

    // 7. Generate realistic order IDs
    let id = '';
    if (platform === 'amazon') {
      const p1 = Math.floor(random() * 900) + 100;
      const p2 = Math.floor(random() * 9000000) + 1000000;
      const p3 = Math.floor(random() * 9000000) + 1000000;
      id = `${p1}-${p2}-${p3}`;
    } else {
      const p1 = Math.floor(random() * 90000000000000) + 10000000000000;
      id = `OD${p1}`;
    }

    orders.push({
      id,
      platform,
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      orderValue,
      quantity,
      status,
      orderDate
    });
  }

  // Sort orders by date descending
  return orders.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
}

export const MOCK_ORDERS = generateOrders();
