import {
  detectMarketplace,
  parseReportSync,
  normalizeMeeshoOrders,
  parseMeeshoDate,
  stripBOM
} from '../../src/services/importer';
import {
  getMarketplaceComparison
} from '../../src/services/analyticsService';
import { buildStoreContext } from '../../src/services/ai/contextBuilder';
import { runMockAiEngine } from '../../src/services/ai/copilotService';
import type { Order } from '../../src/models/order';

// Minimal test runner with colorful terminal reporting
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
console.log('║   Phase 10: Meesho Ingestion, 3-Way Economics & Arbitrage Validation           ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Header Signature & Marketplace Detection for Meesho
// -------------------------------------------------------------
console.log('\x1b[1m1. Meesho Signature Recognition & Detection\x1b[0m');

const MEESHO_STANDARD_CSV = `Sub Order No,Order Date,SKU,Product Title,Quantity,Supplier Discounted Price,Tax Amount,Shipping Fee,Status,Payment Mode,Customer State,Return Type
MEESH-1001,15/08/2026,BOAT-RK450-BLK,boAt Rockerz 450 Bluetooth Headset,1,1299.00,198.15,45.00,Delivered,Online,Uttar Pradesh,
MEESH-1002,16/08/2026,1PLUS-NBUDS-BLU,OnePlus Nord Buds 2r,2,1899.00,289.68,45.00,Delivered,COD,Bihar,
MEESH-1003,17/08/2026,FIRE-NINJA-BLK,Fire-Boltt Ninja Smartwatch,1,1499.00,228.66,45.00,Cancelled,COD,West Bengal,
MEESH-1004,18/08/2026,PIGEON-AMZ-KET,Pigeon Amaze 1.5L Electric Kettle,1,699.00,106.63,45.00,RTO,COD,Madhya Pradesh,Customer Return`;

const det1 = detectMarketplace(MEESHO_STANDARD_CSV);
assert(det1.marketplace === 'meesho', 'detects meesho marketplace for standard CSV');
assert(det1.reportType === 'meesho_orders', 'detects meesho_orders report format');
assert(det1.confidence >= 0.7, `confidence is high (${det1.confidence})`);
assert(det1.delimiter === ',', 'detects comma delimiter');

// Test Case-Insensitive & TSV detection
const MEESHO_TSV = `sub order no\torder date\tsku\tproduct title\tsupplier discounted price\tquantity\tstatus\nMEESH-2001\t2026-08-15\tBOAT-RK450-BLK\tboAt Rockerz 450\t1299\t1\tDelivered`;
const det2 = detectMarketplace(MEESHO_TSV);
assert(det2.marketplace === 'meesho', 'detects meesho for lowercased tab-separated file');
assert(det2.reportType === 'meesho_orders', 'detects meesho_orders for TSV format');
assert(det2.delimiter === '\t', 'detects tab delimiter');

// Test BOM stripping
const BOM_MEESHO = `\uFEFFSub Order No,SKU,Product Title,Supplier Discounted Price\nMEESH-3001,BOAT-RK450-BLK,boAt Rockerz 450,1299`;
assert(stripBOM(BOM_MEESHO).startsWith('Sub Order No'), 'stripBOM removes byte order mark on Meesho file');
const det3 = detectMarketplace(BOM_MEESHO);
assert(det3.marketplace === 'meesho', 'detects meesho with UTF-8 BOM present');

// -------------------------------------------------------------
// Suite 2: Meesho Date Parsing Resilience
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Meesho Date Parsing Resilience\x1b[0m');

assert(parseMeeshoDate('2026-08-15')?.startsWith('2026-08-15') === true, 'parses standard ISO date YYYY-MM-DD');
assert(parseMeeshoDate('15/08/2026')?.startsWith('2026-08-15') === true, 'parses Indian slash date DD/MM/YYYY');
assert(parseMeeshoDate('15-08-2026')?.startsWith('2026-08-15') === true, 'parses Indian hyphen date DD-MM-YYYY');
assert(parseMeeshoDate('15.08.2026')?.startsWith('2026-08-15') === true, 'parses Indian dot date DD.MM.YYYY');
assert(parseMeeshoDate('15-Aug-2026')?.startsWith('2026-08-15') === true, 'parses Indian alphanumeric DD-MMM-YYYY');
assert(parseMeeshoDate('invalid-date-string') === null, 'returns null for unparseable date strings');

// -------------------------------------------------------------
// Suite 3: Meesho Orders Normalizer Field Mapping
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Meesho Orders Normalizer Field Mapping\x1b[0m');

const normResult = normalizeMeeshoOrders([
  {
    'Sub Order No': 'MEESH-1001',
    'Order Date': '15/08/2026',
    'SKU': 'BOAT-RK450-BLK',
    'Product Title': 'boAt Rockerz 450 Bluetooth Headset',
    'Quantity': '1',
    'Supplier Discounted Price': '1299.00',
    'Tax Amount': '198.15',
    'Shipping Fee': '45.00',
    'Status': 'Delivered',
    'Payment Mode': 'Online',
    'Customer State': 'Uttar Pradesh',
    'Return Type': ''
  },
  {
    'Sub Order No': 'MEESH-1002',
    'Order Date': '16/08/2026',
    'SKU': '1PLUS-NBUDS-BLU',
    'Product Title': 'OnePlus Nord Buds 2r',
    'Quantity': '2',
    'Supplier Discounted Price': '1899.00',
    'Tax Amount': '289.68',
    'Shipping Fee': '45.00',
    'Status': 'Shipped',
    'Payment Mode': 'COD',
    'Customer State': 'Bihar',
    'Return Type': ''
  },
  {
    'Sub Order No': 'MEESH-1003',
    'Order Date': '17/08/2026',
    'SKU': 'FIRE-NINJA-BLK',
    'Product Title': 'Fire-Boltt Ninja Smartwatch',
    'Quantity': '1',
    'Supplier Discounted Price': '1499.00',
    'Tax Amount': '228.66',
    'Shipping Fee': '45.00',
    'Status': 'Cancelled by Customer',
    'Payment Mode': 'COD',
    'Customer State': 'West Bengal',
    'Return Type': ''
  },
  {
    'Sub Order No': 'MEESH-1004',
    'Order Date': '18/08/2026',
    'SKU': 'PIGEON-AMZ-KET',
    'Product Title': 'Pigeon Amaze 1.5L Electric Kettle',
    'Quantity': '1',
    'Supplier Discounted Price': '699.00',
    'Tax Amount': '106.63',
    'Shipping Fee': '45.00',
    'Status': 'RTO Delivered',
    'Payment Mode': 'COD',
    'Customer State': 'Madhya Pradesh',
    'Return Type': 'Customer Return'
  }
]);

assert(normResult.orders.length === 4, `normalized exactly 4 meesho orders (got ${normResult.orders.length})`);
assert(normResult.errors.length === 0, 'no row errors for valid meesho sample rows');

const [mDelivered, mShipped, mCancelled, mReturned] = normResult.orders;

// Delivered order assertions
assert(mDelivered.id === 'MEESH-1001', 'mDelivered.id matches Sub Order No');
assert(mDelivered.marketplace === 'meesho', 'mDelivered.marketplace is meesho');
assert(mDelivered.platform === 'meesho', 'mDelivered.platform is meesho');
assert(mDelivered.sku === 'BOAT-RK450-BLK', 'mDelivered.sku is preserved');
assert(mDelivered.product_name === 'boAt Rockerz 450 Bluetooth Headset', 'mDelivered.product_name is set');
assert(mDelivered.quantity === 1, 'mDelivered.quantity is 1');
assert(mDelivered.gross_amount === 1299, 'mDelivered.gross_amount is 1299');
assert(mDelivered.orderValue === 1299, 'mDelivered.orderValue alias is set');
assert(mDelivered.status === 'delivered', 'mDelivered status classified as delivered');
assert(mDelivered.fulfillmentChannel === 'Meesho Direct', 'mDelivered fulfillment channel is Meesho Direct');
assert(mDelivered.paymentMethod === 'Prepaid', 'mDelivered paymentMethod is Prepaid (Online)');
assert(mDelivered.shipToState === 'Uttar Pradesh', 'mDelivered customer state is Uttar Pradesh');

// Shipped order assertions (Multi-quantity COD)
assert(mShipped.status === 'shipped', 'mShipped status is shipped');
assert(mShipped.quantity === 2, 'mShipped quantity is 2');
assert(mShipped.gross_amount === 3798, 'mShipped gross amount is 3798 (1899 * 2)');
assert(mShipped.paymentMethod === 'COD', 'mShipped paymentMethod parsed as COD');

// Cancelled order assertions
assert(mCancelled.status === 'cancelled', 'mCancelled status classified as cancelled');

// Returned order assertions (RTO)
assert(mReturned.status === 'returned', 'mReturned status classified as returned (via RTO / Customer Return)');
assert(mReturned.paymentMethod === 'COD', 'mReturned paymentMethod is COD');
assert(mReturned.shipToState === 'Madhya Pradesh', 'mReturned customer state is Madhya Pradesh');

// -------------------------------------------------------------
// Suite 4: Meesho Zero-Commission Fee Engine Calculations
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Meesho Zero-Commission Fee Engine Calculations\x1b[0m');

// Delivered: 0% referral fee, ₹0 closing fee, ₹45 flat seller shipping
assert(mDelivered.estimatedFees?.referralFee === 0, 'meesho referral fee is ₹0 (0% commission)');
assert(mDelivered.estimatedFees?.closingFee === 0, 'meesho closing fee is ₹0');
assert(mDelivered.estimatedFees?.totalFees === 0, 'meesho total marketplace fees is ₹0');

// COGS of BOAT-RK450-BLK from catalog = 650. Gross = 1299. Shipping = 45. Profit = 1299 - 650 - 0 - 45 = 604
assert(mDelivered.estimatedNetProfit === 604, `meesho delivered net profit is ₹604 (got ${mDelivered.estimatedNetProfit})`);

// Cancelled: 0 fees, 0 profit
assert(mCancelled.estimatedFees?.totalFees === 0, 'cancelled order fees are 0');
assert(mCancelled.estimatedNetProfit === 0, 'cancelled order profit is 0');

// Returned / RTO: COGS of PIGEON-AMZ-KET = 320.
// Reverse shipping = 80, Reverse processing = 30, Damage loss = 320 * 0.50 = 160.
// Total loss = -(320 + 80 + 30 + 160) = -590.
assert(mReturned.estimatedFees?.totalFees === 0, 'returned order meesho commission fee is 0');
assert(mReturned.estimatedNetProfit === -590, `returned unit profit is -₹590 (got ${mReturned.estimatedNetProfit})`);

// -------------------------------------------------------------
// Suite 5: parseReport Orchestrator with Meesho Report
// -------------------------------------------------------------
console.log('\n\x1b[1m5. parseReport Orchestrator with Meesho Report\x1b[0m');

const syncRes = parseReportSync(MEESHO_STANDARD_CSV);
assert(syncRes.success === true, 'parseReportSync success is true for Meesho file');
assert(syncRes.marketplace === 'meesho', 'parseReportSync detected marketplace is meesho');
assert(syncRes.reportType === 'meesho_orders', 'parseReportSync detected reportType is meesho_orders');
assert(syncRes.orders.length === 4, `parsed 4 orders (got ${syncRes.orders.length})`);
assert(syncRes.preview.validRows === 4, 'preview validRows is 4');
assert(syncRes.preview.invalidRows === 0, 'preview invalidRows is 0');
assert(syncRes.preview.totalGrossAmount === 1299 + 3798 + 1499 + 699, 'preview totalGrossAmount matches sum of orders');

// -------------------------------------------------------------
// Suite 6: Tri-Marketplace Comparison Analytics (getMarketplaceComparison)
// -------------------------------------------------------------
console.log('\n\x1b[1m6. Tri-Marketplace Comparison Analytics\x1b[0m');

// Mix of Amazon, Flipkart, and Meesho orders
const testOrders: Order[] = [
  // Amazon order
  {
    id: 'AMZ-1',
    date: '2026-08-15T00:00:00Z',
    orderDate: '2026-08-15T00:00:00Z',
    marketplace: 'amazon',
    platform: 'amazon',
    productId: 'p1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1499,
    gross_amount: 1499,
    quantity: 1,
    status: 'delivered',
    paymentMethod: 'Prepaid',
    estimatedFees: { referralFee: 224.85, closingFee: 20, totalFees: 244.85 },
    estimatedNetProfit: 544.15
  },
  // Flipkart order
  {
    id: 'FK-1',
    date: '2026-08-15T00:00:00Z',
    orderDate: '2026-08-15T00:00:00Z',
    marketplace: 'flipkart',
    platform: 'flipkart',
    productId: 'p1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1399,
    gross_amount: 1399,
    quantity: 1,
    status: 'delivered',
    paymentMethod: 'Prepaid',
    estimatedFees: { referralFee: 167.88, closingFee: 15, totalFees: 182.88 },
    estimatedNetProfit: 531.12
  },
  // Meesho order
  {
    id: 'MEESH-1',
    date: '2026-08-15T00:00:00Z',
    orderDate: '2026-08-15T00:00:00Z',
    marketplace: 'meesho',
    platform: 'meesho',
    productId: 'p1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1299,
    gross_amount: 1299,
    quantity: 1,
    status: 'delivered',
    paymentMethod: 'COD',
    shipToState: 'Uttar Pradesh',
    estimatedFees: { referralFee: 0, closingFee: 0, totalFees: 0 },
    estimatedNetProfit: 604
  }
];

const start = new Date('2026-08-01T00:00:00Z');
const end = new Date('2026-08-31T23:59:59Z');

const comparison = getMarketplaceComparison(testOrders, start, end);

assert(comparison.amazon !== undefined, 'comparison contains amazon metric');
assert(comparison.flipkart !== undefined, 'comparison contains flipkart metric');
assert(comparison.meesho !== undefined, 'comparison contains meesho metric');
assert(comparison.blended !== undefined, 'comparison contains blended total metric');

assert(comparison.meesho.displayName === 'Meesho', 'meesho displayName is Meesho');
assert(comparison.meesho.grossRevenue === 1299, 'meesho gross revenue matches ₹1299');
assert(comparison.meesho.orderCount === 1, 'meesho order count is 1');
assert(comparison.meesho.marketplaceFees === 0, 'meesho marketplace fees is ₹0 (0% commission)');
assert(comparison.meesho.profitMargin > comparison.amazon.profitMargin, 'meesho net margin is higher than amazon due to 0% fee');
assert(comparison.blended.grossRevenue === 1499 + 1399 + 1299, 'blended gross revenue aggregates all 3 platforms');

// -------------------------------------------------------------
// Suite 7: AI Store Copilot Grounding & Mock Response
// -------------------------------------------------------------
console.log('\n\x1b[1m7. AI Store Copilot Grounding & Tri-Marketplace Response\x1b[0m');

const contextPayload = buildStoreContext({
  orders: testOrders,
  preset: '30d'
});

assert(contextPayload.snapshot.marketplaceBreakdown.meesho !== undefined, 'context snapshot includes meesho breakdown');
assert(contextPayload.snapshot.marketplaceBreakdown.meesho.revenue === 1299, 'context snapshot meesho revenue is 1299');
assert(contextPayload.markdown.includes('Meesho'), 'markdown context document mentions Meesho');
assert(contextPayload.markdown.includes('0% Referral Fee (Zero Comm)'), 'markdown context includes Meesho 0% referral fee notes');

// Test Mock Copilot Response for Tri-Marketplace comparison query
const mockResponse = runMockAiEngine('Compare Amazon, Flipkart, and Meesho channels', contextPayload);
assert(mockResponse.includes('Multi-Marketplace Contrast: Amazon India vs. Flipkart vs. Meesho'), 'mock response contains tri-channel header');
assert(mockResponse.includes('Meesho'), 'mock response references Meesho');
assert(mockResponse.includes('0% Referral Fee') || mockResponse.includes('0% + ₹0'), 'mock response highlights Meesho 0% commission');
assert(mockResponse.includes('COD Return & RTO Mitigation'), 'mock response includes strategic guidance on Meesho COD returns');

// -------------------------------------------------------------
// Final Results Summary
// -------------------------------------------------------------
console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: \x1b[32m${passedCount} passed\x1b[0m, \x1b[31m${failedCount} failed\x1b[0m`);

if (failedCount > 0) {
  console.error('\n\x1b[31m✗ SOME PHASE 10 MEESHO VALIDATIONS FAILED!\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32m✓ ALL PHASE 10 MEESHO & TRI-MARKETPLACE VALIDATIONS PASSED!\x1b[0m\n');
}
