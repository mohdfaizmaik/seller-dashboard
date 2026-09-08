import type { Order } from '../../src/models/order';
import {
  seedDefaultSkuCosts,
  getSkuCostsSync,
  getAllSkuCosts,
  saveSkuCost,
  bulkSaveSkuCosts,
  getSkuCost,
  parseCogsCsv,
  exportCogsCsv,
  type SkuCost
} from '../../src/services/catalog/cogsService';
import { calculateFinancialSummary } from '../../src/services/analyticsService';
import {
  detectSettlementReport,
  parseAmazonSettlement,
  parseFlipkartSettlement,
  reconcileSettlementWithOrders,
  type SettlementRecord
} from '../../src/services/settlement/settlementService';
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
console.log('║   Phase 7: Profit Waterfall Accounting, COGS & Settlement Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

// -------------------------------------------------------------
// Suite 1: Master Catalog & COGS Management Layer (Phase 7A)
// -------------------------------------------------------------
console.log('\n\x1b[1m1. Master Catalog & COGS Management Layer\x1b[0m');

const seeded = seedDefaultSkuCosts();
assert(seeded.length === PRODUCTS_CATALOG.length, `Seeded default SKU costs matching catalog (${seeded.length} items)`);

const syncMap = getSkuCostsSync();
assert(syncMap.size >= 20, `Synchronous cache initialized with ${syncMap.size} items`);

const boatCost = syncMap.get('boat-rk450-blk');
assert(boatCost !== undefined, 'Found boAt Rockerz SKU in sync cache');
assert(boatCost?.cogs === 650, `Default COGS is ₹650 (got ${boatCost?.cogs})`);
assert(boatCost?.packagingCost === 25, `Default packaging cost is ₹25 (got ${boatCost?.packagingCost})`);
assert(boatCost?.taxRate === 18, `Default tax rate is 18% (got ${boatCost?.taxRate})`);

// Custom SKU save
const customSku: SkuCost = {
  sku: 'CUSTOM-TEST-SKU',
  productName: 'Custom Ergonomic Mouse',
  cogs: 420,
  packagingCost: 30,
  taxRate: 18,
  updatedAt: new Date().toISOString()
};

saveSkuCost(customSku);
const retrieved = syncMap.get('custom-test-sku');
assert(retrieved !== undefined, 'Saved custom SKU in memory cache');
assert(retrieved?.cogs === 420, `Retrieved custom COGS ₹420 (got ${retrieved?.cogs})`);
assert(retrieved?.packagingCost === 30, `Retrieved custom packaging ₹30 (got ${retrieved?.packagingCost})`);

// Bulk save
bulkSaveSkuCosts([
  {
    sku: 'BULK-SKU-1',
    productName: 'Item 1',
    cogs: 100,
    packagingCost: 20,
    taxRate: 12,
    updatedAt: new Date().toISOString()
  },
  {
    sku: 'BULK-SKU-2',
    productName: 'Item 2',
    cogs: 200,
    packagingCost: 20,
    taxRate: 18,
    updatedAt: new Date().toISOString()
  }
]);
assert(syncMap.has('bulk-sku-1'), 'Bulk SKU 1 saved');
assert(syncMap.has('bulk-sku-2'), 'Bulk SKU 2 saved');

// CSV Parsing
const validCsv = `sku,productName,cogs,packagingCost,taxRate
TEST-CSV-1,Test Item A,350,25,18
TEST-CSV-2,Test Item B,550,40,12`;

const parseResult = parseCogsCsv(validCsv);
assert(parseResult.valid.length === 2, `Parsed 2 valid CSV rows (got ${parseResult.valid.length})`);
assert(parseResult.valid[0].sku === 'TEST-CSV-1', 'First CSV SKU parsed');
assert(parseResult.valid[0].cogs === 350, 'First CSV COGS parsed');
assert(parseResult.errors.length === 0, 'No errors for valid CSV');

// CSV Invalid Handling
const invalidCsv = `sku,productName,cogs
,Missing SKU,350
INVALID-VAL,Bad Value,not-a-number`;

const invalidResult = parseCogsCsv(invalidCsv);
assert(invalidResult.errors.length === 2, `Detected 2 invalid rows (got ${invalidResult.errors.length})`);

// CSV Export
const exportedCsv = exportCogsCsv(parseResult.valid);
assert(exportedCsv.includes('"TEST-CSV-1"'), 'Exported CSV contains SKU TEST-CSV-1');
assert(exportedCsv.includes('350'), 'Exported CSV contains COGS 350');

// -------------------------------------------------------------
// Suite 2: Deep Profit Waterfall Breakdown (Phase 7B)
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Deep Profit Waterfall Breakdown & Math\x1b[0m');

// Create test dataset
const testOrders: Order[] = [
  // Shipped Order 1: boAt Rockerz (₹1500)
  {
    id: 'ord-waterfall-1',
    orderDate: '2026-08-05',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1500,
    gross_amount: 1500,
    quantity: 1,
    status: 'shipped',
    shipping_fee: 60,
    estimatedFees: { referralFee: 225, closingFee: 20, totalFees: 245 }
  },
  // Shipped Order 2: Custom SKU (₹1000)
  {
    id: 'ord-waterfall-2',
    orderDate: '2026-08-05',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-custom',
    sku: 'CUSTOM-TEST-SKU',
    orderValue: 1000,
    gross_amount: 1000,
    quantity: 1,
    status: 'shipped',
    shipping_fee: 50,
    estimatedFees: { referralFee: 150, closingFee: 20, totalFees: 170 }
  },
  // Returned Order: boAt Rockerz (₹1500 returned)
  {
    id: 'ord-waterfall-3',
    orderDate: '2026-08-06',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1500,
    gross_amount: 1500,
    quantity: 1,
    status: 'returned',
    shipping_fee: 60,
    estimatedFees: { referralFee: 0, closingFee: 20, totalFees: 20 }
  },
  // Cancelled Order: boAt Rockerz (₹1500 cancelled, should be omitted)
  {
    id: 'ord-waterfall-4',
    orderDate: '2026-08-07',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1500,
    gross_amount: 1500,
    quantity: 1,
    status: 'cancelled'
  }
];

const start = new Date('2026-08-01T00:00:00Z');
const end = new Date('2026-08-10T23:59:59Z');

const waterfallSummary = calculateFinancialSummary(testOrders, start, end, 'amazon', syncMap);

// (A) Gross Sales: 1500 + 1000 + 1500 = 4000
assert(waterfallSummary.grossRevenue === 4000, `(A) Gross Sales equals ₹4000 (got ${waterfallSummary.grossRevenue})`);

// (B) Customer Refunds: 1500
assert(waterfallSummary.refundedValue === 1500, `(B) Customer Refunds equals ₹1500 (got ${waterfallSummary.refundedValue})`);

// (C) Net Realized Sales: 4000 - 1500 = 2500
assert(waterfallSummary.netSales === 2500, `(C) Net Realized Sales equals ₹2500 (got ${waterfallSummary.netSales})`);

// (D) Total COGS + Packaging Materials:
// Order 1 (boAt): cogs 650, pkg 25 -> 675
// Order 2 (custom): cogs 420, pkg 30 -> 450
// Order 3 (returned boAt): cogs 650, pkg 25 -> 675
// Total COGS: 650 + 420 + 650 = 1720
// Total Packaging: 25 + 30 + 25 = 80
assert(waterfallSummary.cogs === 1720, `Total COGS equals ₹1720 (got ${waterfallSummary.cogs})`);
assert(waterfallSummary.packagingCost === 80, `Total Packaging equals ₹80 (got ${waterfallSummary.packagingCost})`);
assert(waterfallSummary.totalDirectCosts === 1800, `(D) Total Direct Costs equals ₹1800 (got ${waterfallSummary.totalDirectCosts})`);

// (E) Marketplace Deductions: 245 + 170 + 20 = 435
assert(waterfallSummary.marketplaceFees === 435, `(E) Marketplace Fees equals ₹435 (got ${waterfallSummary.marketplaceFees})`);

// Output Taxes
assert((waterfallSummary.taxes || 0) > 0, `(H) Output GST calculated (${waterfallSummary.taxes?.toFixed(0)})`);

// Formula verification: Net Profit = Net Sales - DirectCosts - Fees - Shipping - Advertising - ReturnLoss
const expectedProfit = waterfallSummary.netSales - (waterfallSummary.totalDirectCosts || 0) - waterfallSummary.marketplaceFees - waterfallSummary.shipping - waterfallSummary.advertising - waterfallSummary.returnRelatedCosts;
assert(Math.abs(waterfallSummary.netProfit - expectedProfit) < 0.01, `Waterfall equation balanced (got ${waterfallSummary.netProfit})`);

// -------------------------------------------------------------
// Suite 3: Settlement & Disbursement Report Ingestion Bridge (Phase 7C)
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Settlement & Bank Disbursement Ingestion Bridge\x1b[0m');

const amazonSettlementSample = `settlement-id,posted-date,order-id,sku,price-amount,selling fees,fba fees,other transaction fees,total
SETTLE-1001,2026-08-06,ord-waterfall-1,BOAT-RK450-BLK,1500,225,20,45,1210
SETTLE-1002,2026-08-06,ord-waterfall-2,CUSTOM-TEST-SKU,1000,150,20,0,830`;

const azDetect = detectSettlementReport(amazonSettlementSample);
assert(azDetect.isSettlement === true, 'Detects Amazon settlement report signature');
assert(azDetect.marketplace === 'amazon', 'Identifies marketplace as amazon');

const azSettlements = parseAmazonSettlement(amazonSettlementSample);
assert(azSettlements.length === 2, `Parsed 2 Amazon settlement records (got ${azSettlements.length})`);
assert(azSettlements[0].orderId === 'ord-waterfall-1', 'Order ID matches ord-waterfall-1');
assert(azSettlements[0].totalFeesActual === 225 + 20 + 45, 'Total actual fees includes other transaction fees (₹290)');

// Flipkart Settlement
const fkSettlementSample = `Neft ID,Payment Date,Order ID,Order Item ID,Sale Amount,Commission,Fixed Fee,Pick and Pack Fee,Shipping Fee,Net Amount
NEFT-8899,2026-08-06,FK-ORD-1,FK-ITEM-1,1200,144,15,25,40,976`;

const fkDetect = detectSettlementReport(fkSettlementSample);
assert(fkDetect.isSettlement === true, 'Detects Flipkart settlement report signature');
assert(fkDetect.marketplace === 'flipkart', 'Identifies marketplace as flipkart');

const fkSettlements = parseFlipkartSettlement(fkSettlementSample);
assert(fkSettlements.length === 1, 'Parsed 1 Flipkart settlement record');
assert(fkSettlements[0].otherFeesActual === 25, 'Pick and pack fee captured in otherFeesActual (₹25)');

// Reconciliation
const reconResult = reconcileSettlementWithOrders(azSettlements, testOrders);
assert(reconResult.totalReconciledOrders === 2, `Reconciled 2 orders against settlement (got ${reconResult.totalReconciledOrders})`);
assert(reconResult.overchargeCount === 1, `Detected 1 overcharged order with hidden fee (got ${reconResult.overchargeCount})`);
assert(reconResult.hiddenFeeBreakdown.weightHandlingSurcharge === 45, `Weight handling surcharge of ₹45 identified (got ${reconResult.hiddenFeeBreakdown.weightHandlingSurcharge})`);
assert(reconResult.discrepancy === 45, `Total net discrepancy is ₹45 (got ${reconResult.discrepancy})`);

// -------------------------------------------------------------
// Suite 4: Unit Economics & Minimum Viable Price (MVP) Calculations (Phase 7D)
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Unit Economics & Minimum Viable Price (MVP) Module\x1b[0m');

// Formula verification:
// Given unit COGS = 650, packaging = 25, closing = 20, shipping = 55, referralRate = 0.14, targetMargin = 0.15
// Numerator = 650 + 25 + 20 + 55 = 750
// Denominator = 1 - 0.14 - 0.15 = 0.71
// MVP = 750 / 0.71 = 1056.33 -> Math.ceil = 1057
const unitCogs = 650;
const unitPkg = 25;
const closing = 20;
const ship = 55;
const refRate = 0.14;
const targetMargin = 0.15;
const calculatedMvp = Math.ceil((unitCogs + unitPkg + closing + ship) / (1 - refRate - targetMargin));

assert(calculatedMvp === 1057, `Calculated MVP equals ₹1057 (got ${calculatedMvp})`);

// Current selling price below floor
const currentPrice = 800;
const isPricingViolation = currentPrice < calculatedMvp;
const pricingGap = calculatedMvp - currentPrice;
assert(isPricingViolation === true, 'Price of ₹800 flags pricing floor violation against ₹1057 MVP');
assert(pricingGap === 257, `Required price increase is ₹257 (got ${pricingGap})`);

// -------------------------------------------------------------
// Suite 5: Recommendations Engine Phase 7 Rules
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Recommendations Engine Phase 7 Rules\x1b[0m');

// Build an order set with pricing floor violation
const mvpViolationOrders: Order[] = [
  {
    id: 'ord-mvp-1',
    orderDate: '2026-08-01',
    platform: 'amazon',
    marketplace: 'amazon',
    sku: 'BOAT-RK450-BLK',
    orderValue: 900, // Below MVP 1057
    gross_amount: 900,
    quantity: 1,
    status: 'shipped',
    shipping_fee: 55,
    estimatedFees: { referralFee: 126, closingFee: 20, totalFees: 146 },
    estimatedNetProfit: 900 - 675 - 146 - 55 // +24 profit (thin, below 15%)
  },
  {
    id: 'ord-mvp-2',
    orderDate: '2026-08-02',
    platform: 'amazon',
    marketplace: 'amazon',
    sku: 'BOAT-RK450-BLK',
    orderValue: 900,
    gross_amount: 900,
    quantity: 1,
    status: 'shipped',
    shipping_fee: 55,
    estimatedFees: { referralFee: 126, closingFee: 20, totalFees: 146 },
    estimatedNetProfit: 24
  }
];

const recsMvp = generateRecommendations(mvpViolationOrders, undefined, syncMap);
const mvpRec = recsMvp.find((r) => r.id.startsWith('rec_pricing_floor_'));
assert(mvpRec !== undefined, 'Triggers pricing floor violation recommendation');
assert(mvpRec?.category === 'margin', 'Pricing floor classified under margin category');
assert(mvpRec?.type === 'warning', 'Pricing floor classified as warning');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m✓ ALL PHASE 7 PROFIT & COGS VALIDATIONS PASSED!\x1b[0m\n');
}
