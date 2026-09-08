import {
  detectMarketplace,
  parseReportSync,
  normalizeAmazonMTR,
  normalizeFlipkartSales,
  parseAmazonDate,
  parseFlipkartDate,
  cleanString,
  cleanSku,
  parseAmount,
  stripBOM
} from '../../src/services/importer';
import { calculateFinancialSummary } from '../../src/services/analyticsService';
import { MARKETPLACE_CONFIG } from '../../src/data/marketplaceConfig';

// Minimal test runner with colorful reporting
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
console.log('║   Phase 6 Importer: Amazon MTR & Flipkart Sales Normalizer Validation          ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Header Signature & Marketplace Detection
// -------------------------------------------------------------
console.log('\x1b[1m1. Marketplace Detection & Signature Recognition\x1b[0m');

const MTR_STANDARD_CSV = `Seller Gstin,Invoice Number,Invoice Date,Transaction Type,Order Id,Shipment Id,Shipment Date,Order Date,Shipment Item Id,Quantity,Item Description,Asin,Hsn/sac,Sku,Product Tax Code,Ship To City,Ship To State,Invoice Amount,Tax Exclusive Gross,Total Tax Amount,Shipping Amount,Fulfillment Channel,Payment Method Code,Credit Note No
27AAAAA0000A1Z5,INV-2026-001,15/08/2026,Shipment,402-1234567-8901234,SHP-001,16/08/2026,15/08/2026,ITEM-1,1,boAt Rockerz 450 Bluetooth Headset,B07XYZW123,8518,BOAT-RK450-BLK,Standard,Mumbai,Maharashtra,1499.00,1270.34,228.66,60.00,AFN,Prepaid,`;

const det1 = detectMarketplace(MTR_STANDARD_CSV);
assert(det1.marketplace === 'amazon', 'detects amazon marketplace for standard CSV');
assert(det1.reportType === 'amazon_mtr', 'detects amazon_mtr report format');
assert(det1.confidence >= 0.7, `confidence is high (${det1.confidence})`);
assert(det1.delimiter === ',', 'detects comma delimiter');

// Test Case Insensitive & TSV detection
const MTR_TSV = `seller gstin\tinvoice number\ttransaction type\tasin\torder id\tinvoice amount\n27AAAAA0000A1Z5\tINV-002\tShipment\tB07XYZW123\t402-0000000-0000001\t2199.00`;
const det2 = detectMarketplace(MTR_TSV);
assert(det2.marketplace === 'amazon', 'detects amazon for lowercased tab-separated file');
assert(det2.reportType === 'amazon_mtr', 'detects amazon_mtr for lowercased tab-separated file');
assert(det2.delimiter === '\t', 'detects tab delimiter');

// Test BOM stripping
const BOM_CSV = `\uFEFFSeller Gstin,Invoice Number,Transaction Type,Asin,Order Id\n27A,INV1,Shipment,B01,ORD1`;
assert(stripBOM(BOM_CSV).startsWith('Seller Gstin'), 'stripBOM removes byte order mark');
const det3 = detectMarketplace(BOM_CSV);
assert(det3.marketplace === 'amazon', 'detects amazon with UTF-8 BOM present');

// Flipkart Detection Tests
const FLIPKART_STANDARD_CSV = `Seller GSTIN,Order ID,Order Item ID,Product Title/Description,FSN,SKU,HSN Code,Event Type,Event Sub Type,Order Type,Fulfilment Type,Order Date,Order Approval Date,Item Quantity,Order Shipped From (State),Warehouse ID,Price before discount,Total Discount,Seller Share,Bank Offer Share,Price after discount (Price before discount-Total discount),Shipping Charges,Final Invoice Amount (Price after discount+Shipping Charges),Type of tax,Taxable Value (Final Invoice Amount -Taxes),IGST Rate,IGST Amount,CGST Rate,CGST Amount,SGST Rate (or UTGST as applicable),SGST Amount,Customer's Delivery State,Is Shopsy Order?
27AAAAA0000A1Z5,OD4021234567,402123456701,"""boAt Rockerz 450 Bluetooth Headset""",FSN12345ABCDE,"""SKU:BOAT-RK450-BLK""",8518,Sale,Sale,Prepaid,FBF,2026-07-07 00:00:00.0,2026-07-07 01:00:00.0,1,Maharashtra,WH-01,1599.00,100.00,100.00,0.00,1499.00,40.00,1539.00,Inter-state,1304.24,18%,234.76,0%,0.00,0%,0.00,Karnataka,No`;

const detFk1 = detectMarketplace(FLIPKART_STANDARD_CSV);
assert(detFk1.marketplace === 'flipkart', 'detects flipkart marketplace for standard CSV');
assert(detFk1.reportType === 'flipkart_sales', 'detects flipkart_sales report format');
assert(detFk1.confidence >= 0.7, `flipkart confidence is high (${detFk1.confidence})`);
assert(detFk1.delimiter === ',', 'detects comma delimiter for flipkart');

// Test Case Insensitive & TSV detection for Flipkart
const FLIPKART_TSV = `seller gstin\torder id\torder item id\tfsn\tsku\tevent type\tfulfilment type\tfinal invoice amount (price after discount+shipping charges)\n27A\tOD123\tITEM1\tFSN1\tSKU1\tSale\tNON_FBF\t999.00`;
const detFk2 = detectMarketplace(FLIPKART_TSV);
assert(detFk2.marketplace === 'flipkart', 'detects flipkart for lowercased tab-separated file');
assert(detFk2.reportType === 'flipkart_sales', 'detects flipkart_sales for lowercased TSV');

// Test Unknown Header rejection
const UNKNOWN_CSV = `col_a,col_b,col_c,col_d\n1,2,3,4`;
const det4 = detectMarketplace(UNKNOWN_CSV);
assert(det4.marketplace === 'unknown', 'rejects unknown file headers');
assert(det4.reportType === 'unknown', 'reportType is unknown for non-matching headers');

// Test parseAmount utility
const parsedPos = parseAmount('₹ 1,499.50');
assert(parsedPos.amount === 1499.50 && !parsedPos.isNegative, 'parseAmount handles currency and commas');
const parsedNeg = parseAmount('- ₹499.00');
assert(parsedNeg.amount === 499.00 && parsedNeg.isNegative, 'parseAmount detects negative amount');

// -------------------------------------------------------------
// Suite 2: Date Parsing Logic
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Amazon Date Parsing Resilience\x1b[0m');

const d1 = parseAmazonDate('2026-08-15');
assert(d1 !== null && d1.startsWith('2026-08-15'), 'parses standard ISO date YYYY-MM-DD');

const d2 = parseAmazonDate('15/08/2026');
assert(d2 !== null && d2.startsWith('2026-08-15'), 'parses Indian slash date DD/MM/YYYY');

const d3 = parseAmazonDate('15-08-2026');
assert(d3 !== null && d3.startsWith('2026-08-15'), 'parses Indian hyphen date DD-MM-YYYY');

const d4 = parseAmazonDate('15.08.2026');
assert(d4 !== null && d4.startsWith('2026-08-15'), 'parses Indian dot date DD.MM.YYYY');

const d5 = parseAmazonDate('15-Aug-2026 14:30:00');
assert(d5 !== null && d5.startsWith('2026-08-15'), 'parses DD-MMM-YYYY timestamp format');

const d6 = parseAmazonDate('invalid-date-string');
assert(d6 === null, 'returns null for unparseable date strings');

// -------------------------------------------------------------
// Suite 3: Amazon MTR Normalization & Field Mapping
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Amazon MTR Normalizer Field Mapping\x1b[0m');

const sampleRows = [
  // 1. Regular Shipped Order
  {
    'Seller Gstin': '27AAAAA0000A1Z5',
    'Invoice Number': 'INV-2026-001',
    'Invoice Date': '15/08/2026',
    'Transaction Type': 'Shipment',
    'Order Id': '402-1234567-8901234',
    'Order Date': '15/08/2026',
    Quantity: '1',
    'Item Description': 'boAt Rockerz 450 Bluetooth Headset',
    Asin: 'B07XYZW123',
    Sku: 'BOAT-RK450-BLK',
    'Ship To State': 'Maharashtra',
    'Invoice Amount': '1,499.00',
    'Total Tax Amount': '228.66',
    'Shipping Amount': '60.00',
    'Fulfillment Channel': 'AFN',
    'Payment Method Code': 'Prepaid',
    'Credit Note No': ''
  },
  // 2. Cancelled Order
  {
    'Seller Gstin': '27AAAAA0000A1Z5',
    'Invoice Number': 'INV-2026-002',
    'Invoice Date': '16/08/2026',
    'Transaction Type': 'Cancel',
    'Order Id': '402-9999999-0000001',
    'Order Date': '16/08/2026',
    Quantity: '2',
    'Item Description': 'OnePlus Nord Buds 2r Wireless Earbuds',
    Asin: 'B08ABC111',
    Sku: '1PLUS-NBUDS-BLU',
    'Ship To State': 'Karnataka',
    'Invoice Amount': '4398.00',
    'Total Tax Amount': '670.00',
    'Shipping Amount': '0.00',
    'Fulfillment Channel': 'MFN',
    'Payment Method Code': 'COD',
    'Credit Note No': ''
  },
  // 3. Returned Order via Credit Note No
  {
    'Seller Gstin': '27AAAAA0000A1Z5',
    'Invoice Number': 'INV-2026-003',
    'Invoice Date': '17/08/2026',
    'Transaction Type': 'Refund',
    'Order Id': '402-8888888-0000002',
    'Order Date': '14/08/2026',
    Quantity: '1',
    'Item Description': 'Noise ColorFit Pulse 3 Smartwatch',
    Asin: 'B09DEF222',
    Sku: 'NOISE-CFP3-SLV',
    'Ship To State': 'Delhi',
    'Invoice Amount': '1999.00',
    'Total Tax Amount': '305.00',
    'Shipping Amount': '0.00',
    'Fulfillment Channel': 'AFN',
    'Payment Method Code': 'Prepaid',
    'Credit Note No': 'CN-2026-009'
  },
  // 4. Returned Order via Negative Invoice Amount
  {
    'Seller Gstin': '27AAAAA0000A1Z5',
    'Invoice Number': 'INV-2026-004',
    'Invoice Date': '18/08/2026',
    'Transaction Type': 'Return',
    'Order Id': '402-7777777-0000003',
    'Order Date': '12/08/2026',
    Quantity: '1',
    'Item Description': '',
    Asin: 'B01GHI333',
    Sku: 'PIGEON-AMZ-KET',
    'Ship To State': 'Tamil Nadu',
    'Invoice Amount': '-699.00',
    'Total Tax Amount': '-106.00',
    'Shipping Amount': '0.00',
    'Fulfillment Channel': 'MFN',
    'Payment Method Code': 'COD',
    'Credit Note No': ''
  }
];

const normResult = normalizeAmazonMTR(sampleRows);
assert(normResult.orders.length === 4, `normalized exactly 4 orders (got ${normResult.orders.length})`);
assert(normResult.errors.length === 0, 'no row errors for valid sample rows');

const [orderShipped, orderCancelled, orderReturnedCN, orderReturnedNeg] = normResult.orders;

// Check Shipped Order
assert(orderShipped.id === '402-1234567-8901234', 'orderShipped.id matches Order Id');
assert(orderShipped.marketplace === 'amazon', 'orderShipped.marketplace is amazon');
assert(orderShipped.platform === 'amazon', 'orderShipped.platform is amazon');
assert(orderShipped.sku === 'BOAT-RK450-BLK', 'orderShipped.sku matches Sku');
assert(orderShipped.asin === 'B07XYZW123', 'orderShipped.asin matches Asin');
assert(orderShipped.product_name === 'boAt Rockerz 450 Bluetooth Headset', 'orderShipped.product_name matches Item Description');
assert(orderShipped.productName === 'boAt Rockerz 450 Bluetooth Headset', 'orderShipped.productName alias is set');
assert(orderShipped.quantity === 1, 'orderShipped.quantity is 1');
assert(orderShipped.gross_amount === 1499.00, 'orderShipped.gross_amount is 1499');
assert(orderShipped.orderValue === 1499.00, 'orderShipped.orderValue is 1499');
assert(orderShipped.tax_amount === 228.66, 'orderShipped.tax_amount is 228.66');
assert(orderShipped.shipping_fee === 60.00, 'orderShipped.shipping_fee is 60.00');
assert(orderShipped.status === 'shipped', 'orderShipped.status is shipped');
assert(orderShipped.fulfillmentChannel === 'AFN', 'orderShipped.fulfillmentChannel is AFN');
assert(orderShipped.paymentMethod === 'Prepaid', 'orderShipped.paymentMethod is Prepaid');
assert(orderShipped.shipToState === 'Maharashtra', 'orderShipped.shipToState is Maharashtra');

// Check Cancelled Order
assert(orderCancelled.status === 'cancelled', 'orderCancelled.status is cancelled');
assert(orderCancelled.fulfillmentChannel === 'MFN', 'orderCancelled.fulfillmentChannel is MFN');
assert(orderCancelled.paymentMethod === 'COD', 'orderCancelled.paymentMethod is COD');
assert(orderCancelled.quantity === 2, 'orderCancelled.quantity is 2');

// Check Returned Orders
assert(orderReturnedCN.status === 'returned', 'orderReturnedCN.status classified as returned (via Credit Note No)');
assert(orderReturnedNeg.status === 'returned', 'orderReturnedNeg.status classified as returned (via negative amount)');
assert(orderReturnedNeg.gross_amount === 699.00, 'orderReturnedNeg.gross_amount absolute value is 699');
assert(orderReturnedNeg.product_name === 'PIGEON-AMZ-KET', 'orderReturnedNeg.product_name falls back to Sku when Item Description blank');

// -------------------------------------------------------------
// Suite 4: Fee Handling (Phase 4 Config Assumption Engine)
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Phase 4 Fee Engine Calculations\x1b[0m');

// Referral fee = 15% of 1499 = 224.85
// Closing fee = 20
// Total fees = 244.85
const expectedRef = Number((1499 * MARKETPLACE_CONFIG.amazon.referralFeeRate).toFixed(2));
const expectedClosing = MARKETPLACE_CONFIG.amazon.fixedClosingFee;
const expectedTotal = Number((expectedRef + expectedClosing).toFixed(2));

assert(orderShipped.estimatedFees?.referralFee === expectedRef, `shipped referral fee is ₹${expectedRef}`);
assert(orderShipped.estimatedFees?.closingFee === expectedClosing, `shipped closing fee is ₹${expectedClosing}`);
assert(orderShipped.estimatedFees?.totalFees === expectedTotal, `shipped total fees is ₹${expectedTotal}`);

// Cancelled orders have 0 fees
assert(orderCancelled.estimatedFees?.totalFees === 0, 'cancelled order estimatedFees is 0');
assert(orderCancelled.estimatedNetProfit === 0, 'cancelled order estimatedNetProfit is 0');

// Net profit for shipped order:
// gross (1499) - COGS (boAt costPrice 650) - totalFees (244.85) - shipping (60) = 544.15
assert(
  orderShipped.estimatedNetProfit !== undefined && Math.abs(orderShipped.estimatedNetProfit - 544.15) < 0.01,
  `shipped net profit correctly calculated (${orderShipped.estimatedNetProfit} vs expected 544.15)`
);

// -------------------------------------------------------------
// Suite 5: Integration with analyticsService.ts
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Unified Analytics Service Integration\x1b[0m');

const startDate = new Date('2026-08-01T00:00:00Z');
const endDate = new Date('2026-08-31T23:59:59Z');

const financialSummary = calculateFinancialSummary(
  normResult.orders,
  startDate,
  endDate,
  'amazon'
);

assert(financialSummary.grossRevenue > 0, `gross revenue aggregated (${financialSummary.grossRevenue})`);
assert(financialSummary.cancelledOrderCount === 1, 'cancelled order count tracked in summary');
assert(financialSummary.returnedOrderCount === 2, 'returned order count tracked in summary');
assert(financialSummary.marketplaceFees > 0, `marketplace fees computed (${financialSummary.marketplaceFees})`);
assert(typeof financialSummary.netProfit === 'number', `net profit computed (${financialSummary.netProfit})`);

// -------------------------------------------------------------
// Suite 6: Full Orchestrator parseReportSync & Previews
// -------------------------------------------------------------
console.log('\n\x1b[1m6. parseReport Orchestrator & Previews\x1b[0m');

const fullReportCSV = `${MTR_STANDARD_CSV}
27AAAAA0000A1Z5,INV-2026-002,16/08/2026,Shipment,402-2222222-2222222,SHP-002,17/08/2026,16/08/2026,ITEM-2,1,Noise ColorFit Pulse 3 Smartwatch,B09DEF222,8517,NOISE-CFP3-SLV,Standard,Bengaluru,Karnataka,1999.00,1694.07,304.93,0.00,AFN,Prepaid,`;

const parsedFull = parseReportSync(fullReportCSV);
assert(parsedFull.success === true, 'parseReportSync success is true');
assert(parsedFull.orders.length === 2, `parsed 2 orders (got ${parsedFull.orders.length})`);
assert(parsedFull.preview.totalRows === 2, 'preview totalRows is 2');
assert(parsedFull.preview.validRows === 2, 'preview validRows is 2');
assert(parsedFull.preview.invalidRows === 0, 'preview invalidRows is 0');
assert(parsedFull.preview.sampleRows.length === 2, 'preview sampleRows contains 2 rows');
assert(parsedFull.preview.totalGrossAmount === 1499.00 + 1999.00, 'preview totalGrossAmount matches sum of gross amounts');
assert(parsedFull.preview.dateRange?.start === '2026-08-15', 'preview start date detected');
assert(parsedFull.preview.dateRange?.end === '2026-08-16', 'preview end date detected');

// Test Empty File
const emptyResult = parseReportSync('');
assert(emptyResult.success === false, 'empty file returns success false');
assert(emptyResult.errors.length > 0, 'empty file reports error');

// Test Unrecognized format
const unrecogResult = parseReportSync('HeaderA,HeaderB\nValA,ValB');
assert(unrecogResult.success === false, 'unrecognized format returns success false');
assert(unrecogResult.marketplace === 'unknown', 'marketplace is unknown');

// -------------------------------------------------------------
// Suite 7: Flipkart Sanitization & Date Parsing Logic
// -------------------------------------------------------------
console.log('\n\x1b[1m7. Flipkart Sanitization & Date Parsing\x1b[0m');

// cleanString tests
assert(cleanString('"""boAt Rockerz 450"""') === 'boAt Rockerz 450', 'cleanString removes triple quotes');
assert(cleanString('"Standard Item"') === 'Standard Item', 'cleanString removes single surrounding quotes');
assert(cleanString('Unquoted Text') === 'Unquoted Text', 'cleanString leaves unquoted text unchanged');

// cleanSku tests
assert(cleanSku('"""SKU:BOAT-RK450-BLK"""') === 'BOAT-RK450-BLK', 'cleanSku strips triple quotes and SKU: prefix');
assert(cleanSku('sku: 1PLUS-NBUDS-BLU') === '1PLUS-NBUDS-BLU', 'cleanSku strips sku: prefix with space');
assert(cleanSku('NOISE-CFP3-SLV') === 'NOISE-CFP3-SLV', 'cleanSku leaves standard SKU unchanged');

// parseFlipkartDate tests
const fkD1 = parseFlipkartDate('2026-07-07 00:00:00.0');
assert(fkD1 !== null && fkD1.startsWith('2026-07-07'), 'parses Flipkart timestamp with decimal seconds');

const fkD2 = parseFlipkartDate('2026-07-07 14:30:15');
assert(fkD2 !== null && fkD2.startsWith('2026-07-07'), 'parses Flipkart timestamp YYYY-MM-DD HH:mm:ss');

const fkD3 = parseFlipkartDate('07/07/2026');
assert(fkD3 !== null && fkD3.startsWith('2026-07-07'), 'parses Indian DD/MM/YYYY date');

const fkD4 = parseFlipkartDate('invalid-date');
assert(fkD4 === null, 'returns null for invalid date string');

// -------------------------------------------------------------
// Suite 8: Flipkart Sales Normalization & Field Mapping
// -------------------------------------------------------------
console.log('\n\x1b[1m8. Flipkart Sales Normalizer Field Mapping\x1b[0m');

const fkSampleRows = [
  // 1. Regular Shipped Order (FBF, Prepaid, Shopsy No, with triple quotes)
  {
    'Order ID': 'OD4021234567',
    'Order Item ID': '402123456701',
    'Product Title/Description': '"""boAt Rockerz 450 Bluetooth Headset"""',
    'FSN': 'FSN12345ABCDE',
    'SKU': '"""SKU:BOAT-RK450-BLK"""',
    'Event Type': 'Sale',
    'Event Sub Type': 'Sale',
    'Order Type': 'Prepaid',
    'Fulfilment Type': 'FBF',
    'Order Date': '2026-07-07 00:00:00.0',
    'Item Quantity': '1',
    'Shipping Charges': '40.00',
    'Final Invoice Amount (Price after discount+Shipping Charges)': '1539.00',
    'IGST Amount': '234.76',
    'CGST Amount': '0.00',
    'SGST Amount (Or UTGST as applicable)': '0.00',
    "Customer's Delivery State": 'Karnataka',
    'Is Shopsy Order?': 'No'
  },
  // 2. Cancelled Order
  {
    'Order ID': 'OD4028888888',
    'Order Item ID': '402888888801',
    'Product Title/Description': 'OnePlus Nord Buds 2r Wireless Earbuds',
    'FSN': 'FSN99999KLMNO',
    'SKU': '1PLUS-NBUDS-BLU',
    'Event Type': 'Cancellation',
    'Event Sub Type': 'Buyer Cancellation',
    'Order Type': 'Prepaid',
    'Fulfilment Type': 'NON_FBF',
    'Order Date': '2026-07-08 10:00:00',
    'Item Quantity': '2',
    'Shipping Charges': '0.00',
    'Final Invoice Amount (Price after discount+Shipping Charges)': '0.00',
    'IGST Amount': '0.00',
    'CGST Amount': '0.00',
    'SGST Amount (Or UTGST as applicable)': '0.00',
    "Customer's Delivery State": 'Delhi',
    'Is Shopsy Order?': 'No'
  },
  // 3. Returned Order (via Event Type = Return)
  {
    'Order ID': 'OD4029999999',
    'Order Item ID': '402999999901',
    'Product Title/Description': 'boAt Rockerz 450 Bluetooth Headset',
    'FSN': 'FSN67890FGHIJ',
    'SKU': 'BOAT-RK450-BLK',
    'Event Type': 'Return',
    'Event Sub Type': 'Customer Return',
    'Order Type': 'COD',
    'Fulfilment Type': 'NON_FBF',
    'Order Date': '2026-07-09 14:00:00',
    'Item Quantity': '1',
    'Shipping Charges': '0.00',
    'Final Invoice Amount (Price after discount+Shipping Charges)': '1499.00',
    'IGST Amount': '0.00',
    'CGST Amount': '114.33',
    'SGST Amount (Or UTGST as applicable)': '114.33',
    "Customer's Delivery State": 'Maharashtra',
    'Is Shopsy Order?': 'Yes'
  },
  // 4. Returned Order (via Negative Invoice Amount)
  {
    'Order ID': 'OD4027777777',
    'Order Item ID': '402777777701',
    'Product Title/Description': 'Pigeon Amaze 1.5L Electric Kettle',
    'FSN': 'FSN55555PQRST',
    'SKU': 'PIGEON-AMZ-KET',
    'Event Type': 'Sale',
    'Event Sub Type': 'Adjustment',
    'Order Type': 'Prepaid',
    'Fulfilment Type': 'FBF',
    'Order Date': '2026-07-10 11:00:00',
    'Item Quantity': '1',
    'Shipping Charges': '0.00',
    'Final Invoice Amount (Price after discount+Shipping Charges)': '-699.00',
    'IGST Amount': '0.00',
    'CGST Amount': '0.00',
    'SGST Amount (Or UTGST as applicable)': '0.00',
    "Customer's Delivery State": 'Tamil Nadu',
    'Is Shopsy Order?': 'false'
  }
];

const fkNormResult = normalizeFlipkartSales(fkSampleRows);
assert(fkNormResult.orders.length === 4, `normalized exactly 4 flipkart orders (got ${fkNormResult.orders.length})`);
assert(fkNormResult.errors.length === 0, 'no row errors for valid flipkart sample rows');

const [fkShipped, fkCancelled, fkReturned, fkReturnedNeg] = fkNormResult.orders;

// Check Shipped Order
assert(fkShipped.id === 'OD4021234567', 'fkShipped.id matches Order ID');
assert(fkShipped.orderItemId === '402123456701', 'fkShipped.orderItemId matches Order Item ID');
assert(fkShipped.marketplace === 'flipkart', 'fkShipped.marketplace is flipkart');
assert(fkShipped.platform === 'flipkart', 'fkShipped.platform is flipkart');
assert(fkShipped.sku === 'BOAT-RK450-BLK', 'fkShipped.sku cleaned properly from quotes and prefix');
assert(fkShipped.fsn === 'FSN12345ABCDE', 'fkShipped.fsn captured');
assert(fkShipped.product_name === 'boAt Rockerz 450 Bluetooth Headset', 'fkShipped.product_name cleaned properly');
assert(fkShipped.isShopsy === false, 'fkShipped.isShopsy is false');
assert(fkShipped.status === 'shipped', 'fkShipped.status is shipped');
assert(fkShipped.fulfillmentChannel === 'FBF', 'fkShipped.fulfillmentChannel is FBF');
assert(fkShipped.paymentMethod === 'Prepaid', 'fkShipped.paymentMethod is Prepaid');
assert(fkShipped.shipToState === 'Karnataka', 'fkShipped.shipToState is Karnataka');
assert(fkShipped.gross_amount === 1539.00, 'fkShipped.gross_amount is 1539');
assert(fkShipped.shipping_fee === 40.00, 'fkShipped.shipping_fee is 40');
assert(fkShipped.tax_amount === 234.76, 'fkShipped.tax_amount is 234.76');

// Check Cancelled Order
assert(fkCancelled.status === 'cancelled', 'fkCancelled.status is cancelled');
assert(fkCancelled.fulfillmentChannel === 'NON_FBF', 'fkCancelled.fulfillmentChannel is NON_FBF');
assert(fkCancelled.quantity === 2, 'fkCancelled.quantity is 2');

// Check Returned Orders
assert(fkReturned.status === 'returned', 'fkReturned status is returned (via Event Type Return)');
assert(fkReturned.paymentMethod === 'COD', 'fkReturned paymentMethod is COD');
assert(fkReturned.isShopsy === true, 'fkReturned.isShopsy parsed from Yes');
assert(fkReturnedNeg.status === 'returned', 'fkReturnedNeg status is returned (via negative amount)');
assert(fkReturnedNeg.gross_amount === 699.00, 'fkReturnedNeg absolute gross amount is 699');

// -------------------------------------------------------------
// Suite 9: Flipkart Fee Engine Calculations
// -------------------------------------------------------------
console.log('\n\x1b[1m9. Flipkart Fee Engine Calculations\x1b[0m');

// Shipped fee calculation:
// gross = 1539
// referral fee = 1539 * 0.12 = 184.68
// closing fee = 15
// total fees = 199.68
// boAt costPrice = 650
// shipping fee = 40
// estimated net profit = 1539 - 650 - 199.68 - 40 = 649.32
const expectedFkRef = Number((1539 * MARKETPLACE_CONFIG.flipkart.referralFeeRate).toFixed(2));
const expectedFkClosing = MARKETPLACE_CONFIG.flipkart.fixedClosingFee;
const expectedFkTotal = Number((expectedFkRef + expectedFkClosing).toFixed(2));

assert(fkShipped.estimatedFees?.referralFee === expectedFkRef, `flipkart shipped referral fee is ₹${expectedFkRef}`);
assert(fkShipped.estimatedFees?.closingFee === expectedFkClosing, `flipkart shipped closing fee is ₹${expectedFkClosing}`);
assert(fkShipped.estimatedFees?.totalFees === expectedFkTotal, `flipkart shipped total fees is ₹${expectedFkTotal}`);
assert(
  fkShipped.estimatedNetProfit !== undefined && Math.abs(fkShipped.estimatedNetProfit - 649.32) < 0.01,
  `flipkart shipped net profit calculated (${fkShipped.estimatedNetProfit} vs 649.32)`
);

// Cancelled order fees = 0
assert(fkCancelled.estimatedFees?.totalFees === 0, 'flipkart cancelled fees are 0');
assert(fkCancelled.estimatedNetProfit === 0, 'flipkart cancelled net profit is 0');

// Returned fee calculation:
// closingFee = 15, referralFee = 0, totalFees = 15
// reverseShipping = 80, reverseProcessing = 30, damageLoss = 650 * 0.5 = 325
// returnCosts = 435, cogs = 650
// netProfit = -(650 + 15 + 435) = -1100
assert(fkReturned.estimatedFees?.totalFees === 15, 'flipkart returned total fees is ₹15 closing fee');
assert(fkReturned.estimatedNetProfit === -1100, `flipkart returned net profit is -₹1100 (got ${fkReturned.estimatedNetProfit})`);

// -------------------------------------------------------------
// Suite 10: Flipkart Full Orchestrator parseReportSync & Analytics
// -------------------------------------------------------------
console.log('\n\x1b[1m10. Flipkart Full Orchestrator & Analytics Integration\x1b[0m');

const fullFlipkartCSV = `${FLIPKART_STANDARD_CSV}
27AAAAA0000A1Z5,OD4021234568,402123456801,"""Noise ColorFit Pulse 3 Smartwatch""",FSN77777AAAAA,"""SKU:NOISE-CFP3-SLV""",8517,Sale,Sale,Prepaid,NON_FBF,2026-07-08 12:00:00.0,2026-07-08 13:00:00.0,1,Maharashtra,WH-01,1999.00,0.00,0.00,0.00,1999.00,50.00,2049.00,Inter-state,1736.44,18%,312.56,0%,0.00,0%,0.00,Tamil Nadu,No`;

const parsedFkFull = parseReportSync(fullFlipkartCSV);
assert(parsedFkFull.success === true, 'parseReportSync success is true for Flipkart report');
assert(parsedFkFull.marketplace === 'flipkart', 'parseReportSync marketplace is flipkart');
assert(parsedFkFull.reportType === 'flipkart_sales', 'parseReportSync reportType is flipkart_sales');
assert(parsedFkFull.orders.length === 2, `parsed 2 flipkart orders (got ${parsedFkFull.orders.length})`);
assert(parsedFkFull.preview.totalRows === 2, 'flipkart preview totalRows is 2');
assert(parsedFkFull.preview.validRows === 2, 'flipkart preview validRows is 2');
assert(parsedFkFull.preview.invalidRows === 0, 'flipkart preview invalidRows is 0');
assert(parsedFkFull.preview.sampleRows.length === 2, 'flipkart preview sampleRows contains 2 rows');
assert(parsedFkFull.preview.dateRange?.start === '2026-07-07', 'flipkart preview start date detected');
assert(parsedFkFull.preview.dateRange?.end === '2026-07-08', 'flipkart preview end date detected');

// Analytics integration with Flipkart
const fkAnalytics = calculateFinancialSummary(
  parsedFkFull.orders,
  new Date('2026-07-01T00:00:00Z'),
  new Date('2026-07-31T23:59:59Z'),
  'flipkart'
);
assert(fkAnalytics.grossRevenue > 0, `flipkart gross revenue aggregated (${fkAnalytics.grossRevenue})`);
assert(fkAnalytics.marketplaceFees > 0, `flipkart marketplace fees computed (${fkAnalytics.marketplaceFees})`);
assert(typeof fkAnalytics.netProfit === 'number', `flipkart net profit computed (${fkAnalytics.netProfit})`);

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m✓ ALL IMPORTER VALIDATIONS PASSED!\x1b[0m\n');
}
