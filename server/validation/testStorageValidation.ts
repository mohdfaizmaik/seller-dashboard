import {
  saveOrders,
  getAllOrders,
  getImportBatches,
  deleteBatch,
  clearAllData,
  getCompositeKey
} from '../../src/services/storage/reportStorageService';
import type { ImportBatch } from '../../src/services/storage/reportStorageService';
import type { Order } from '../../src/models/order';
import { parseReportSync } from '../../src/services/importer';
import { calculateFinancialSummary, getOverviewMetrics } from '../../src/services/analyticsService';

// Test runner setup
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

async function runStorageValidation() {
  console.log('\n\x1b[1m╔══════════════════════════════════════════════════════════════╗');
  console.log('║   Phase 6D Local Persistence & Storage Validation Suite      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\x1b[0m\n');

  // Start with clean state
  await clearAllData();

  // -------------------------------------------------------------
  // Test 1: Composite Key Deduplication Helper
  // -------------------------------------------------------------
  console.log('\x1b[1m1. Composite Key Deduplication\x1b[0m');

  const testOrder1: Order = {
    id: '402-1234567-0000001',
    orderDate: '2026-08-15T00:00:00.000Z',
    date: '2026-08-15T00:00:00.000Z',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450 Bluetooth Headset',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1499,
    quantity: 1,
    status: 'shipped'
  };

  const key1 = getCompositeKey(testOrder1);
  assert(key1 === '402-1234567-0000001__boat-rk450-blk__shipped', 'generates normalized composite key');

  // Same order but with different case/whitespace
  const testOrder1Variant: Order = {
    ...testOrder1,
    sku: '  Boat-Rk450-Blk  ',
    status: 'SHIPPED' as Order['status']
  };
  const key1Variant = getCompositeKey(testOrder1Variant);
  assert(key1 === key1Variant, 'composite key is resilient to case and whitespace');

  // -------------------------------------------------------------
  // Test 2: Saving Batch & Orders
  // -------------------------------------------------------------
  console.log('\n\x1b[1m2. Save Batch and Orders\x1b[0m');

  const batch1: ImportBatch = {
    batchId: 'batch_test_001',
    fileName: 'amazon_mtr_aug_week1.csv',
    marketplace: 'amazon',
    reportType: 'amazon_mtr',
    importedAt: '2026-08-10T10:00:00.000Z',
    recordCount: 2,
    dateRange: { start: '2026-08-01', end: '2026-08-07' }
  };

  const testOrder2: Order = {
    id: '402-1234567-0000002',
    orderDate: '2026-08-16T00:00:00.000Z',
    date: '2026-08-16T00:00:00.000Z',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-2',
    productName: 'OnePlus Nord Buds 2r Wireless Earbuds',
    sku: '1PLUS-NBUDS-BLU',
    orderValue: 2199,
    quantity: 1,
    status: 'shipped'
  };

  await saveOrders(batch1, [testOrder1, testOrder2]);

  const batchesAfter1 = await getImportBatches();
  assert(batchesAfter1.length === 1, 'batch saved successfully');
  assert(batchesAfter1[0].batchId === 'batch_test_001', 'retrieved batch matches saved batchId');

  const ordersAfter1 = await getAllOrders();
  assert(ordersAfter1.length === 2, `retrieved 2 orders (got ${ordersAfter1.length})`);
  assert(ordersAfter1.some((o) => o.id === testOrder1.id), 'order 1 present in storage');
  assert(ordersAfter1.some((o) => o.id === testOrder2.id), 'order 2 present in storage');

  // -------------------------------------------------------------
  // Test 3: Re-upload Deduplication
  // -------------------------------------------------------------
  console.log('\n\x1b[1m3. Deduplication Across Repeated / Overlapping Batches\x1b[0m');

  // Create Batch 2 with overlapping testOrder1, plus a new testOrder3
  const batch2: ImportBatch = {
    batchId: 'batch_test_002',
    fileName: 'amazon_mtr_aug_week2.csv',
    marketplace: 'amazon',
    reportType: 'amazon_mtr',
    importedAt: '2026-08-17T10:00:00.000Z',
    recordCount: 2,
    dateRange: { start: '2026-08-08', end: '2026-08-15' }
  };

  const testOrder3: Order = {
    id: '402-1234567-0000003',
    orderDate: '2026-08-17T00:00:00.000Z',
    date: '2026-08-17T00:00:00.000Z',
    platform: 'amazon',
    marketplace: 'amazon',
    productId: 'prod-3',
    productName: 'Noise ColorFit Pulse 3 Smartwatch',
    sku: 'NOISE-CFP3-SLV',
    orderValue: 1999,
    quantity: 1,
    status: 'shipped'
  };

  // Re-upload testOrder1 alongside testOrder3
  await saveOrders(batch2, [testOrder1, testOrder3]);

  const batchesAfter2 = await getImportBatches();
  assert(batchesAfter2.length === 2, `2 batches stored (got ${batchesAfter2.length})`);

  const ordersAfter2 = await getAllOrders();
  // Total unique orders must be 3 (testOrder1, testOrder2, testOrder3), NOT 4!
  assert(
    ordersAfter2.length === 3,
    `deduplicated orders to 3 distinct records (got ${ordersAfter2.length})`
  );

  // -------------------------------------------------------------
  // Test 4: Batch Deletion
  // -------------------------------------------------------------
  console.log('\n\x1b[1m4. Batch Deletion & Order Cascading\x1b[0m');

  // Delete batch 2
  await deleteBatch('batch_test_002');

  const batchesAfterDel = await getImportBatches();
  assert(batchesAfterDel.length === 1, `1 batch remaining after deleteBatch (got ${batchesAfterDel.length})`);
  assert(batchesAfterDel[0].batchId === 'batch_test_001', 'batch 1 remains active');

  const ordersAfterDel = await getAllOrders();
  // Orders associated with batch 2 should be deleted, orders belonging to batch 1 retained
  assert(!ordersAfterDel.some((o) => o.id === testOrder3.id), 'order 3 (from deleted batch) was removed');
  assert(ordersAfterDel.some((o) => o.id === testOrder2.id), 'order 2 (from batch 1) remains stored');

  // -------------------------------------------------------------
  // Test 5: Clear All Data
  // -------------------------------------------------------------
  console.log('\n\x1b[1m5. Clear All Data\x1b[0m');

  await clearAllData();

  const batchesCleared = await getImportBatches();
  const ordersCleared = await getAllOrders();
  assert(batchesCleared.length === 0, 'all batches cleared');
  assert(ordersCleared.length === 0, 'all orders cleared');

  // -------------------------------------------------------------
  // Test 6: Full Pipeline End-to-End Test
  // -------------------------------------------------------------
  console.log('\n\x1b[1m6. End-to-End Ingestion, Persistence & Analytics Pipeline\x1b[0m');

  const sampleCSV = `Seller Gstin,Invoice Number,Invoice Date,Transaction Type,Order Id,Shipment Id,Shipment Date,Order Date,Shipment Item Id,Quantity,Item Description,Asin,Hsn/sac,Sku,Product Tax Code,Ship To City,Ship To State,Invoice Amount,Tax Exclusive Gross,Total Tax Amount,Shipping Amount,Fulfillment Channel,Payment Method Code,Credit Note No
27AAAAA0000A1Z5,INV-101,15/08/2026,Shipment,402-9001-0001,SHP-1,15/08/2026,15/08/2026,ITEM-1,1,boAt Rockerz 450 Bluetooth Headset,B07XYZW123,8518,BOAT-RK450-BLK,Standard,Mumbai,Maharashtra,1499.00,1270.34,228.66,60.00,AFN,Prepaid,
27AAAAA0000A1Z5,INV-102,16/08/2026,Shipment,402-9001-0002,SHP-2,16/08/2026,16/08/2026,ITEM-2,2,OnePlus Nord Buds 2r Wireless Earbuds,B08ABC111,8517,1PLUS-NBUDS-BLU,Standard,Bengaluru,Karnataka,4398.00,3728.00,670.00,0.00,AFN,Prepaid,`;

  const parseResult = parseReportSync(sampleCSV);
  assert(parseResult.success, 'sample report parsed successfully');

  const e2eBatch: ImportBatch = {
    batchId: 'batch_e2e_aug',
    fileName: 'sample_mtr.csv',
    marketplace: parseResult.marketplace,
    reportType: parseResult.reportType,
    importedAt: new Date().toISOString(),
    recordCount: parseResult.orders.length,
    dateRange: parseResult.preview.dateRange || { start: '', end: '' }
  };

  await saveOrders(e2eBatch, parseResult.orders);

  const persistedOrders = await getAllOrders();
  assert(persistedOrders.length === 2, `persisted 2 orders via pipeline (got ${persistedOrders.length})`);

  // Compute analytics from persisted orders
  const financialSummary = calculateFinancialSummary(
    persistedOrders,
    new Date('2026-08-01T00:00:00Z'),
    new Date('2026-08-31T23:59:59Z'),
    'amazon'
  );

  assert(financialSummary.grossRevenue === 1499 + 4398, `aggregated gross revenue matches ₹${1499 + 4398}`);
  assert(financialSummary.unitsSold === 3, `aggregated units sold matches 3 (got ${financialSummary.unitsSold})`);

  const overviewKpis = getOverviewMetrics(
    'amazon',
    'custom',
    '2026-08-01',
    '2026-08-31',
    persistedOrders
  );
  assert(overviewKpis.totalRevenue === financialSummary.grossRevenue, 'overview KPIs totalRevenue matches financialSummary');

  // Clean up
  await clearAllData();

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('\x1b[32m\x1b[1m✓ ALL STORAGE VALIDATION TESTS PASSED!\x1b[0m\n');
  }
}

runStorageValidation().catch((err) => {
  console.error('Fatal storage test error:', err);
  process.exit(1);
});
