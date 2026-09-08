import type { Order } from '../../src/models/order';
import { generateRecommendations } from '../../src/services/recommendations/recommendationEngine';
import {
  getDateRangeFromPreset,
  getRegionalDistribution,
  getMarketplaceComparison,
  getRegionForState,
  formatINR,
  formatPercent
} from '../../src/services/analyticsService';
import { MOCK_ORDERS } from '../../src/data/orders';

// Minimal assertion runner
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
console.log('║   Phase 6E & 6F: Dual-Marketplace Integration & Recommendations Validation     ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Indian Regional Mapping & Distribution
// -------------------------------------------------------------
console.log('\x1b[1m1. Indian Regional State Mapping & Aggregations\x1b[0m');

assert(getRegionForState('Maharashtra') === 'West', 'Maharashtra maps to West');
assert(getRegionForState('Gujarat') === 'West', 'Gujarat maps to West');
assert(getRegionForState('Karnataka') === 'South', 'Karnataka maps to South');
assert(getRegionForState('Tamil Nadu') === 'South', 'Tamil Nadu maps to South');
assert(getRegionForState('Delhi') === 'North', 'Delhi maps to North');
assert(getRegionForState('Punjab') === 'North', 'Punjab maps to North');
assert(getRegionForState('West Bengal') === 'East', 'West Bengal maps to East');
assert(getRegionForState('Assam') === 'East', 'Assam maps to East');
assert(getRegionForState('Madhya Pradesh') === 'Central', 'Madhya Pradesh maps to Central');
assert(getRegionForState('Unknown Country') === 'Other', 'Unknown returns Other');
assert(getRegionForState('') === 'Other', 'Blank returns Other');

const sampleRegionalOrders: Order[] = [
  {
    id: 'ord-1',
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'Item 1',
    sku: 'SKU-1',
    orderValue: 1000,
    gross_amount: 1000,
    quantity: 1,
    status: 'shipped',
    shipToState: 'Maharashtra'
  },
  {
    id: 'ord-2',
    orderDate: '2026-08-02',
    platform: 'flipkart',
    marketplace: 'flipkart',
    productId: 'prod-2',
    productName: 'Item 2',
    sku: 'SKU-2',
    orderValue: 2000,
    gross_amount: 2000,
    quantity: 2,
    status: 'shipped',
    shipToState: 'Karnataka'
  },
  {
    id: 'ord-3',
    orderDate: '2026-08-03',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'Item 1',
    sku: 'SKU-1',
    orderValue: 500,
    gross_amount: 500,
    quantity: 1,
    status: 'cancelled', // Should be excluded from revenue
    shipToState: 'Delhi'
  }
];

const regionalBreakdown = getRegionalDistribution(sampleRegionalOrders);
const west = regionalBreakdown.find((r) => r.region === 'West');
const south = regionalBreakdown.find((r) => r.region === 'South');
const north = regionalBreakdown.find((r) => r.region === 'North');

assert(west?.orderCount === 1, 'West has 1 order');
assert(west?.revenue === 1000, 'West revenue is ₹1000');
assert(south?.orderCount === 1, 'South has 1 order');
assert(south?.revenue === 2000, 'South revenue is ₹2000');
assert(north?.orderCount === 0, 'North cancelled order excluded from counts');

// -------------------------------------------------------------
// Suite 2: Marketplace Comparison & Side-by-Side Calculations
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Dual-Marketplace Comparison Analytics\x1b[0m');

const comparisonOrders: Order[] = [
  // Amazon Order 1 (Shipped)
  {
    id: 'az-1',
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Headset',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1500,
    quantity: 1,
    status: 'shipped'
  },
  // Amazon Order 2 (Returned)
  {
    id: 'az-2',
    orderDate: '2026-08-02',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Headset',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1500,
    quantity: 1,
    status: 'returned'
  },
  // Flipkart Order 1 (Shipped)
  {
    id: 'fk-1',
    orderDate: '2026-08-01',
    platform: 'flipkart',
    marketplace: 'flipkart',
    productId: 'prod-2',
    productName: 'OnePlus Buds',
    sku: '1PLUS-NBUDS-BLU',
    orderValue: 2000,
    quantity: 1,
    status: 'shipped'
  }
];

const startD = new Date('2026-08-01T00:00:00Z');
const endD = new Date('2026-08-05T23:59:59Z');

const mktComp = getMarketplaceComparison(comparisonOrders, startD, endD);

assert(mktComp.amazon.grossRevenue === 3000, 'Amazon gross revenue is ₹3000');
assert(mktComp.amazon.orderCount === 2, 'Amazon fulfilled order count is 2');
assert(mktComp.amazon.returnedCount === 1, 'Amazon return count is 1');
assert(mktComp.amazon.returnRate === 50, 'Amazon return rate is 50%');
assert(mktComp.flipkart.grossRevenue === 2000, 'Flipkart gross revenue is ₹2000');
assert(mktComp.flipkart.orderCount === 1, 'Flipkart order count is 1');
assert(mktComp.flipkart.returnRate === 0, 'Flipkart return rate is 0%');

assert(
  mktComp.blended.grossRevenue === mktComp.amazon.grossRevenue + mktComp.flipkart.grossRevenue,
  'Blended revenue equals Amazon + Flipkart revenue'
);
assert(
  mktComp.blended.orderCount === mktComp.amazon.orderCount + mktComp.flipkart.orderCount,
  'Blended order count equals Amazon + Flipkart order count'
);

// -------------------------------------------------------------
// Suite 3: Date Range Dynamic Anchoring & Currency Formatting
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Date Range Dynamic Anchoring & Formatting\x1b[0m');

// When orders provided, anchors to latest order date
const julyOrders: Order[] = [
  {
    id: 'jul-1',
    orderDate: '2026-07-20T10:00:00Z',
    platform: 'flipkart',
    productId: 'p1',
    productName: 'P1',
    sku: 'SKU1',
    orderValue: 500,
    quantity: 1,
    status: 'shipped'
  }
];

const range7d = getDateRangeFromPreset('7d', undefined, undefined, julyOrders);
assert(range7d.end.getFullYear() === 2026 && range7d.end.getMonth() === 6 && range7d.end.getDate() === 20, 'Anchors 7d preset to July 20, 2026');
assert(range7d.start.getDate() === 14, 'Start date is 6 days prior (July 14)');

// When orders empty, falls back to Aug 10, 2026
const emptyRange = getDateRangeFromPreset('7d', undefined, undefined, []);
assert(emptyRange.end.getFullYear() === 2026 && emptyRange.end.getMonth() === 7 && emptyRange.end.getDate() === 10, 'Falls back to Aug 10, 2026');

// Formatting tests
assert(formatINR(1499).includes('1,499'), 'formatINR formats with Indian thousand comma');
assert(formatPercent(18.54) === '18.5%', 'formatPercent formats to 1 decimal place');

// -------------------------------------------------------------
// Suite 4: Seller Recommendations Engine (Rules Validation)
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Tactical Recommendations Engine Rules\x1b[0m');

// Rule 0: No data test
const recsEmpty = generateRecommendations([]);
assert(recsEmpty.length === 1 && recsEmpty[0].id === 'rec_no_data', 'Handles empty orders gracefully');

// Rule 1: High Return Rate Rule
const highReturnOrders: Order[] = [];
// 10 Flipkart orders, 4 returned -> 40% return rate
for (let i = 0; i < 10; i++) {
  highReturnOrders.push({
    id: `fk-ret-${i}`,
    orderDate: '2026-08-01',
    platform: 'flipkart',
    marketplace: 'flipkart',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1499,
    quantity: 1,
    status: i < 4 ? 'returned' : 'shipped'
  });
}

const recsHighReturn = generateRecommendations(highReturnOrders);
const fkReturnRec = recsHighReturn.find((r) => r.id === 'rec_returns_flipkart_high');
const skuReturnRec = recsHighReturn.find((r) => r.id === 'rec_returns_sku_boat-rk450-blk');

assert(fkReturnRec !== undefined, 'Triggers Flipkart high return rate recommendation');
assert(fkReturnRec?.type === 'danger', 'Flipkart high return is classified as danger');
assert(skuReturnRec !== undefined, 'Triggers SKU-level high return rate recommendation');
assert(skuReturnRec?.affectedSkus?.includes('BOAT-RK450-BLK') === true, 'Specifies affected SKU');

// Rule 3: Channel Arbitrage Opportunity
const arbitrageOrders: Order[] = [];
// Amazon: sells at ₹1999 (cost 650) -> very high profit
for (let i = 0; i < 3; i++) {
  arbitrageOrders.push({
    id: `az-arb-${i}`,
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1999,
    gross_amount: 1999,
    quantity: 1,
    status: 'shipped',
    estimatedFees: { referralFee: 200, closingFee: 20, totalFees: 220 },
    estimatedNetProfit: 1999 - 650 - 220 - 60 // 1069 net profit (53% margin)
  });
}
// Flipkart: sells at ₹800 (cost 650) -> thin/low margin
for (let i = 0; i < 3; i++) {
  arbitrageOrders.push({
    id: `fk-arb-${i}`,
    orderDate: '2026-08-01',
    platform: 'flipkart',
    marketplace: 'flipkart',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 800,
    gross_amount: 800,
    quantity: 1,
    status: 'shipped',
    estimatedFees: { referralFee: 96, closingFee: 15, totalFees: 111 },
    estimatedNetProfit: 800 - 650 - 111 - 50 // -11 net loss (-1.3% margin)
  });
}

const recsArbitrage = generateRecommendations(arbitrageOrders);
const arbRec = recsArbitrage.find((r) => r.category === 'channel_arbitrage');
assert(arbRec !== undefined, 'Detects cross-channel margin arbitrage opportunity');
assert(arbRec?.type === 'opportunity', 'Arbitrage classified as opportunity');

// Rule 4: Concentration Risk
const concentrationOrders: Order[] = [];
// SKU-DOMINANT drives ₹50,000 (90%)
for (let i = 0; i < 5; i++) {
  concentrationOrders.push({
    id: `conc-dom-${i}`,
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'Dominant Item',
    sku: 'DOMINANT-SKU',
    orderValue: 10000,
    gross_amount: 10000,
    quantity: 1,
    status: 'shipped'
  });
}
// SKU-MINOR drives ₹2,000 (10%)
concentrationOrders.push({
    id: `conc-min-1`,
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-4',
    productName: 'Minor Item',
    sku: 'MINOR-SKU',
    orderValue: 2000,
    gross_amount: 2000,
    quantity: 1,
    status: 'shipped'
});

const recsConc = generateRecommendations(concentrationOrders);
const concRec = recsConc.find((r) => r.category === 'concentration');
assert(concRec !== undefined, 'Detects catalog revenue concentration risk');
assert(concRec?.affectedSkus?.includes('DOMINANT-SKU') === true, 'Identifies dominant SKU');

// Full Mock Orders Integration
const mockRecs = generateRecommendations(MOCK_ORDERS);
assert(mockRecs.length > 0, `Generates recommendations from default mock catalog (${mockRecs.length} items found)`);
assert(mockRecs.some((r) => r.id === 'rec_healthy_return_rate'), 'Identifies healthy catalog status on default mock dataset');

// Catalog with detected anomalies produces high-impact tactical actions
const issueRecs = generateRecommendations(highReturnOrders);
const hasHighImpact = issueRecs.some((r) => r.impact === 'high');
assert(hasHighImpact, 'Includes high-impact tactical recommendations when catalog anomalies exist');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m✓ ALL PHASE 6E & 6F VALIDATIONS PASSED!\x1b[0m\n');
}
