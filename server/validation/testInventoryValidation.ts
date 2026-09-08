import type { Order } from '../../src/models/order';
import {
  seedDefaultInventory,
  getInventorySync,
  getInventoryItem,
  bulkSaveInventory,
  adjustStock,
  parseInventoryCsv,
  exportInventoryCsv,
  resetInventoryToDefaults,
  type InventoryItem
} from '../../src/services/inventory/inventoryService';
import {
  computeSkuVelocity,
  computeRestockMetrics,
  computeWorkingCapitalSummary
} from '../../src/services/inventory/inventoryCalculations';
import { generateRecommendations } from '../../src/services/recommendations/recommendationEngine';
import { PRODUCTS_CATALOG } from '../../src/data/products';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string): void {
  if (condition) {
    console.log(`  \x1b[32m✓\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✗\x1b[0m ${testName}`);
    if (detail) console.error(`    \x1b[33m${detail}\x1b[0m`);
    failedCount++;
  }
}

console.log('\n\x1b[1m╔════════════════════════════════════════════════════════════════════════════════╗');
console.log('║   Phase 8: Inventory Intelligence, Velocity & Working Capital Validation       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

// -------------------------------------------------------------
// Suite 1: Inventory Ledger & Persistence Layer
// -------------------------------------------------------------
console.log('\n\x1b[1m1. Inventory Ledger & Persistence Service\x1b[0m');

const seeded = seedDefaultInventory();
assert(seeded.length === PRODUCTS_CATALOG.length, `Seeds ${PRODUCTS_CATALOG.length} inventory records from product catalog`);

const syncMap = getInventorySync();
assert(syncMap.size === PRODUCTS_CATALOG.length, 'getInventorySync returns populated Map');
assert(syncMap.has('boat-rk450-blk'), 'SKU lookup is case-insensitive normalized');

const boatItem = syncMap.get('boat-rk450-blk');
assert(boatItem !== undefined && boatItem.unitCost > 0, 'Inventory item includes positive unit cost');
assert(boatItem?.leadTimeDays === 14, 'Default lead time is set');
assert(boatItem?.safetyStockDays === 7, 'Default safety buffer is set');

// Adjust stock
await adjustStock('boat-rk450-blk', 25, 5, 12, 6);
const updatedBoat = await getInventoryItem('boat-rk450-blk');
assert(updatedBoat?.currentStock === 25, 'adjustStock updates currentStock to 25');
assert(updatedBoat?.reservedStock === 5, 'adjustStock updates reservedStock to 5');
assert(updatedBoat?.leadTimeDays === 12, 'adjustStock updates leadTimeDays to 12');
assert(updatedBoat?.safetyStockDays === 6, 'adjustStock updates safetyStockDays to 6');

// Bulk Save
const testCustomItem: InventoryItem = {
  sku: 'TEST-SKU-999',
  productName: 'Test Product 999',
  marketplace: 'all',
  currentStock: 100,
  reservedStock: 10,
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 250,
  updatedAt: new Date().toISOString()
};
await bulkSaveInventory([testCustomItem]);
const retrievedCustom = await getInventoryItem('test-sku-999');
assert(retrievedCustom?.currentStock === 100, 'bulkSaveInventory saves custom inventory record');

// CSV Parser validation
const validCsv = `SKU,Product Name,Marketplace,Current Stock,Reserved Stock,Lead Time (Days),Safety Stock (Days),Unit Cost (INR)
"BOAT-RK450-BLK","boAt Rockerz 450",all,50,5,10,5,650
"NEW-SKU-CSV","New CSV Product",amazon,120,10,14,7,300`;

const parsed = parseInventoryCsv(validCsv);
assert(parsed.valid.length === 2, 'parseInventoryCsv correctly parses valid CSV rows');
assert(parsed.valid[0].currentStock === 50, 'Parsed row 1 has correct currentStock');
assert(parsed.valid[1].unitCost === 300, 'Parsed row 2 has correct unitCost');
assert(parsed.errors.length === 0, 'No errors in valid CSV');

// CSV Parser Error Handling
const invalidCsv = `SKU,Product Name
"SKU1","Missing stock column"`;
const invalidParsed = parseInventoryCsv(invalidCsv);
assert(invalidParsed.valid.length === 0 && invalidParsed.errors.length > 0, 'parseInventoryCsv catches missing required columns');

// CSV Export validation
const exportedCsv = exportInventoryCsv([testCustomItem]);
assert(exportedCsv.includes('TEST-SKU-999'), 'exportInventoryCsv includes SKU');
assert(exportedCsv.includes('Lead Time (Days)'), 'exportInventoryCsv includes standard header');

// Reset to Defaults
await resetInventoryToDefaults();
const resetMap = getInventorySync();
assert(resetMap.get('boat-rk450-blk')?.currentStock === 18, 'resetInventoryToDefaults restores original seed stock');

// -------------------------------------------------------------
// Suite 2: Sales Velocity Engine (V7, V14, V30 & V_daily)
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Sales Velocity Engine (V7, V14, V30, V_daily)\x1b[0m');

const anchorDate = new Date('2026-08-10T12:00:00Z');

// Create mock orders with known timestamps:
// T - 2 days (within 7d, 14d, 30d): 14 units
// T - 10 days (within 14d, 30d): 14 units
// T - 20 days (within 30d only): 30 units
const velocityOrders: Order[] = [
  {
    id: 'ord-v1',
    sku: 'VEL-TEST-SKU',
    productId: 'p1',
    productName: 'Velocity Test Item',
    orderDate: '2026-08-08T10:00:00Z', // Day -2
    quantity: 14,
    orderValue: 1400,
    platform: 'amazon',
    status: 'delivered'
  },
  {
    id: 'ord-v2',
    sku: 'VEL-TEST-SKU',
    productId: 'p1',
    productName: 'Velocity Test Item',
    orderDate: '2026-07-31T10:00:00Z', // Day -10
    quantity: 14,
    orderValue: 1400,
    platform: 'flipkart',
    status: 'shipped'
  },
  {
    id: 'ord-v3',
    sku: 'VEL-TEST-SKU',
    productId: 'p1',
    productName: 'Velocity Test Item',
    orderDate: '2026-07-21T10:00:00Z', // Day -20
    quantity: 30,
    orderValue: 3000,
    platform: 'amazon',
    status: 'delivered'
  },
  {
    id: 'ord-v4-cancelled',
    sku: 'VEL-TEST-SKU',
    productId: 'p1',
    productName: 'Velocity Test Item',
    orderDate: '2026-08-08T11:00:00Z',
    quantity: 50,
    orderValue: 5000,
    platform: 'amazon',
    status: 'cancelled' // Must be excluded
  }
];

const vel = computeSkuVelocity(velocityOrders, 'VEL-TEST-SKU', anchorDate);
// units7 = 14 (day -2 only) -> v7 = 14 / 7 = 2.0
// units14 = 14 + 14 = 28 -> v14 = 28 / 14 = 2.0
// units30 = 14 + 14 + 30 = 58 -> v30 = 58 / 30 = 1.93
// vDaily = 0.5 * 2.0 + 0.3 * 2.0 + 0.2 * 1.93 = 1.0 + 0.6 + 0.386 = 1.99
assert(vel.units7 === 14, `Trailing 7d units is 14 (got ${vel.units7})`);
assert(vel.v7 === 2.0, `V7 velocity is 2.0 units/day (got ${vel.v7})`);
assert(vel.units14 === 28, `Trailing 14d units is 28 (got ${vel.units14})`);
assert(vel.v14 === 2.0, `V14 velocity is 2.0 units/day (got ${vel.v14})`);
assert(vel.units30 === 58, `Trailing 30d units is 58 (got ${vel.units30})`);
assert(Math.abs(vel.vDaily - 1.99) <= 0.05, `Weighted daily run rate is ~1.99 (got ${vel.vDaily})`);

// Excludes cancelled orders
assert(vel.units7 < 50, 'Excludes cancelled orders from velocity calculation');

// Zero orders case
const emptyVel = computeSkuVelocity([], 'NON-EXISTENT', anchorDate);
assert(emptyVel.vDaily === 0 && emptyVel.units30 === 0, 'Zero sales returns 0.0 velocity');

// -------------------------------------------------------------
// Suite 3: Days of Inventory (DOI), ROP & Urgency Classifications
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Days of Inventory (DOI), ROP & Urgency Tiers\x1b[0m');

// Case A: STOCKOUT (Available = 0)
const stockoutItem: InventoryItem = {
  sku: 'VEL-TEST-SKU',
  productName: 'Stockout Item',
  marketplace: 'all',
  currentStock: 5,
  reservedStock: 5, // Available = 0
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 100,
  updatedAt: new Date().toISOString()
};
const mStockout = computeRestockMetrics(stockoutItem, velocityOrders, anchorDate);
assert(mStockout.availableStock === 0, 'Available stock is 0 when current equals reserved');
assert(mStockout.urgency === 'STOCKOUT', 'Urgency is STOCKOUT when available stock is 0');
assert(mStockout.doi === 0, 'DOI is 0 when available stock is 0');
assert(mStockout.recommendedReorderQty > 0, 'Recommends positive reorder quantity for stockout');

// Case B: CRITICAL_STOCKOUT_RISK (DOI <= leadTimeDays)
// vDaily ~= 2.0, leadTime = 14 days -> DOI <= 14 means available <= 28
const criticalItem: InventoryItem = {
  sku: 'VEL-TEST-SKU',
  productName: 'Critical Item',
  marketplace: 'all',
  currentStock: 20,
  reservedStock: 2, // Available = 18 units -> DOI = 18 / 1.99 = ~9 days <= 14 lead time
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 100,
  updatedAt: new Date().toISOString()
};
const mCritical = computeRestockMetrics(criticalItem, velocityOrders, anchorDate);
assert(mCritical.availableStock === 18, 'Available stock is 18');
assert(mCritical.urgency === 'CRITICAL_STOCKOUT_RISK', `Urgency is CRITICAL_STOCKOUT_RISK when DOI (${mCritical.doi}d) <= leadTime (14d)`);

// Case C: REORDER_NOW (DOI <= leadTime + safetyStock)
// leadTime (14) + safetyStock (7) = 21 days buffer.
// Available = 35 units -> DOI = 35 / 1.99 = ~17.6 days (between 14 and 21)
const reorderItem: InventoryItem = {
  sku: 'VEL-TEST-SKU',
  productName: 'Reorder Item',
  marketplace: 'all',
  currentStock: 38,
  reservedStock: 3, // Available = 35 -> DOI = 17.6d
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 100,
  updatedAt: new Date().toISOString()
};
const mReorder = computeRestockMetrics(reorderItem, velocityOrders, anchorDate);
assert(mReorder.urgency === 'REORDER_NOW', `Urgency is REORDER_NOW when DOI (${mReorder.doi}d) breaches safety buffer`);
assert(mReorder.rop === Math.ceil(mReorder.velocity.vDaily * 21), 'ROP equals vDaily * (leadTime + safetyStock)');

// Case D: HEALTHY (21 < DOI <= 60)
// Available = 80 units -> DOI = 80 / 1.99 = ~40.2 days
const healthyItem: InventoryItem = {
  sku: 'VEL-TEST-SKU',
  productName: 'Healthy Item',
  marketplace: 'all',
  currentStock: 85,
  reservedStock: 5, // Available = 80 -> DOI = 40.2d
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 100,
  updatedAt: new Date().toISOString()
};
const mHealthy = computeRestockMetrics(healthyItem, velocityOrders, anchorDate);
assert(mHealthy.urgency === 'HEALTHY', `Urgency is HEALTHY when DOI is ${mHealthy.doi}d`);
assert(mHealthy.recommendedReorderQty === 0, 'No reorder recommended when stock is healthy');

// Case E: OVERSTOCKED (60 < DOI <= 120)
// Available = 180 units -> DOI = 180 / 1.99 = ~90.5 days
const overstockItem: InventoryItem = {
  sku: 'VEL-TEST-SKU',
  productName: 'Overstocked Item',
  marketplace: 'all',
  currentStock: 185,
  reservedStock: 5, // Available = 180 -> DOI = 90.5d
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 100,
  updatedAt: new Date().toISOString()
};
const mOverstocked = computeRestockMetrics(overstockItem, velocityOrders, anchorDate);
assert(mOverstocked.urgency === 'OVERSTOCKED', `Urgency is OVERSTOCKED when DOI is ${mOverstocked.doi}d`);

// Case F: DEAD_STOCK (Zero sales in 30d or DOI > 120)
const deadItem: InventoryItem = {
  sku: 'STAGNANT-SKU-1',
  productName: 'Dead Inventory Item',
  marketplace: 'all',
  currentStock: 100,
  reservedStock: 0,
  leadTimeDays: 14,
  safetyStockDays: 7,
  unitCost: 500,
  updatedAt: new Date().toISOString()
};
const mDead = computeRestockMetrics(deadItem, velocityOrders, anchorDate); // 0 sales for STAGNANT-SKU-1
assert(mDead.urgency === 'DEAD_STOCK', 'Urgency is DEAD_STOCK when 0 units sold in trailing 30d with inventory on hand');
assert(mDead.doi >= 999, 'DOI is 999 when sales run rate is 0');

// -------------------------------------------------------------
// Suite 4: Working Capital & Portfolio Diagnostics
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Working Capital & Portfolio Diagnostics\x1b[0m');

const portfolio: InventoryItem[] = [
  stockoutItem,   // Current 5, cost 100 = ₹500 (STOCKOUT)
  criticalItem,   // Current 20, cost 100 = ₹2,000 (CRITICAL)
  reorderItem,    // Current 38, cost 100 = ₹3,800 (REORDER_NOW)
  healthyItem,    // Current 85, cost 100 = ₹8,500 (HEALTHY)
  overstockItem,  // Current 185, cost 100 = ₹18,500 (OVERSTOCKED)
  deadItem        // Current 100, cost 500 = ₹50,000 (DEAD_STOCK)
];

const capSummary = computeWorkingCapitalSummary(portfolio, velocityOrders, anchorDate);

// Total Asset Value = 500 + 2000 + 3800 + 8500 + 18500 + 50000 = 83,300
assert(capSummary.totalAssetValue === 83300, `Total asset value is ₹83,300 (got ₹${capSummary.totalAssetValue})`);

// Active Capital = CRITICAL (2000) + REORDER_NOW (3800) + HEALTHY (8500) = 14,300
assert(capSummary.activeCapital === 14300, `Active working capital is ₹14,300 (got ₹${capSummary.activeCapital})`);

// Locked Dead Capital = OVERSTOCKED (18500) + DEAD_STOCK (50000) = 68,500
assert(capSummary.lockedDeadCapital === 68500, `Locked dead capital is ₹68,500 (got ₹${capSummary.lockedDeadCapital})`);

// Trapped ratio = 68,500 / 83,300 = ~82.2%
assert(Math.abs(capSummary.deadCapitalRatio - 82.2) <= 0.5, `Dead capital ratio is ~82.2% (got ${capSummary.deadCapitalRatio}%)`);

// Dead stock liquidation list is populated and sorted by locked value
assert(capSummary.deadStockList.length === 2, 'Dead stock list contains 2 stagnant items');
assert(capSummary.deadStockList[0].sku === 'STAGNANT-SKU-1', 'Highest value dead stock is ranked first');
assert(capSummary.deadStockList[0].recommendedLiquidationAction.includes('markdown') || capSummary.deadStockList[0].recommendedLiquidationAction.includes('discount'), 'Provides actionable liquidation playbook');

// -------------------------------------------------------------
// Suite 5: Seller Recommendations Engine Rules (Inventory Aware)
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Seller Recommendations Engine Rules (Inventory Aware)\x1b[0m');

// Rule 8: rec_stockout_critical
const recsWithStockout = generateRecommendations(velocityOrders, undefined, undefined, portfolio);
const stockoutRec = recsWithStockout.find((r) => r.id === 'rec_stockout_critical');
assert(stockoutRec !== undefined, 'Triggers rec_stockout_critical for high-velocity stockout items');
assert(stockoutRec?.type === 'danger', 'rec_stockout_critical is classified as danger alert');
assert(stockoutRec?.affectedSkus?.includes('VEL-TEST-SKU') === true, 'Identifies affected fast-moving SKU');

// Rule 9: rec_dead_capital
const deadCapitalRec = recsWithStockout.find((r) => r.id === 'rec_dead_capital');
assert(deadCapitalRec !== undefined, 'Triggers rec_dead_capital when trapped capital ratio > 20%');
assert(deadCapitalRec?.type === 'warning', 'rec_dead_capital is classified as warning alert');
assert(deadCapitalRec?.affectedSkus?.includes('STAGNANT-SKU-1') === true, 'Identifies dead stock SKU');

// Rule 10: rec_velocity_mismatch
// Create orders with severe marketplace imbalance (8 on Amazon, 0 on Flipkart)
const mismatchOrders: Order[] = [
  ...Array.from({ length: 8 }).map((_, i) => ({
    id: `ord-mis-${i}`,
    sku: 'BOAT-RK450-BLK',
    productId: 'p1',
    productName: 'boAt Rockerz 450',
    orderDate: '2026-08-05T10:00:00Z',
    quantity: 1,
    orderValue: 1499,
    platform: 'amazon',
    status: 'delivered' as const
  }))
];
const recsMismatch = generateRecommendations(mismatchOrders, undefined, undefined, seeded);
const mismatchRec = recsMismatch.find((r) => r.id === 'rec_velocity_mismatch');
assert(mismatchRec !== undefined, 'Triggers rec_velocity_mismatch when SKU active on one channel only');
assert(mismatchRec?.affectedSkus?.includes('BOAT-RK450-BLK') === true, 'Identifies cross-channel demand disparity SKU');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m✓ ALL PHASE 8 INVENTORY & RESTOCK VALIDATIONS PASSED!\x1b[0m\n');
}
