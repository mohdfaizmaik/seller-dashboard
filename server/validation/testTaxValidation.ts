import type { Order } from '../../src/models/order';
import {
  getGstStateInfo,
  getOrderShipToState,
  resolveSkuHsn,
  calculateTaxCompliance,
  exportGstr1B2csCsv,
  exportGstr1HsnCsv,
  exportSection52TcsCsv,
  exportGstr1Json
} from '../../src/services/tax/taxService';
import { buildStoreContext } from '../../src/services/ai/contextBuilder';
import { runMockAiEngine } from '../../src/services/ai/copilotService';
import { MOCK_ORDERS } from '../../src/data/orders';

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
console.log('║   Phase 11: Indian GST Tax & Compliance Command Center Validation              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Indian GST State Codes & Place of Supply (POS)
// -------------------------------------------------------------
console.log('\x1b[1m1. Indian GST State Codes & Place of Supply (POS)\x1b[0m');

assert(getGstStateInfo('Karnataka').code === '29', 'Karnataka state code is 29');
assert(getGstStateInfo('Karnataka').pos === '29-Karnataka', 'Karnataka POS is 29-Karnataka');
assert(getGstStateInfo('Maharashtra').code === '27', 'Maharashtra state code is 27');
assert(getGstStateInfo('Delhi').code === '07', 'Delhi state code is 07');
assert(getGstStateInfo('New Delhi').code === '07', 'New Delhi normalizes to code 07');
assert(getGstStateInfo('Tamil Nadu').code === '33', 'Tamil Nadu state code is 33');
assert(getGstStateInfo('Uttar Pradesh').code === '09', 'Uttar Pradesh state code is 09');
assert(getGstStateInfo('Gujarat').code === '24', 'Gujarat state code is 24');
assert(getGstStateInfo('West Bengal').code === '19', 'West Bengal state code is 19');
assert(getGstStateInfo('Telangana').code === '36', 'Telangana state code is 36');
assert(getGstStateInfo('Ladakh').code === '38', 'Ladakh state code is 38');
assert(getGstStateInfo('Unknown Land').code === '97', 'Unknown state falls back to code 97');
assert(getGstStateInfo('').code === '97', 'Empty state falls back to code 97');

// Deterministic shipToState fallback
const testOrder1: Order = {
  id: 'ORD-TEST-1',
  orderDate: '2026-08-01',
  platform: 'amazon',
  productId: 'prod-1',
  productName: 'boAt Rockerz 450',
  sku: 'BOAT-RK450-BLK',
  orderValue: 1499,
  quantity: 1,
  status: 'shipped',
  shipToState: 'Maharashtra'
};
assert(getOrderShipToState(testOrder1) === 'Maharashtra', 'getOrderShipToState preserves existing shipToState');

const testOrderWithoutState: Order = {
  id: 'ORD-TEST-DETERMINISTIC-1',
  orderDate: '2026-08-01',
  platform: 'amazon',
  productId: 'prod-1',
  productName: 'boAt Rockerz 450',
  sku: 'BOAT-RK450-BLK',
  orderValue: 1499,
  quantity: 1,
  status: 'shipped'
};
const fallbackState1 = getOrderShipToState(testOrderWithoutState);
const fallbackState2 = getOrderShipToState(testOrderWithoutState);
assert(typeof fallbackState1 === 'string' && fallbackState1.length > 0, 'Generates non-empty fallback state');
assert(fallbackState1 === fallbackState2, 'Fallback state is deterministic across calls');

// -------------------------------------------------------------
// Suite 2: Statutory HSN & GST Tax Brackets
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Statutory HSN & GST Tax Brackets\x1b[0m');

const hsnAudio = resolveSkuHsn('BOAT-RK450-BLK');
assert(hsnAudio.hsnCode === '8518', 'Audio SKU maps to HSN 8518');
assert(hsnAudio.taxRate === 18, 'Audio SKU has 18% GST rate');

const hsnWatch = resolveSkuHsn('NOISE-CFP3-SLV');
assert(hsnWatch.hsnCode === '9102', 'Smartwatch maps to HSN 9102');
assert(hsnWatch.taxRate === 18, 'Smartwatch has 18% GST rate');

const hsnBook = resolveSkuHsn('BOOK-ALCHEMIST');
assert(hsnBook.hsnCode === '4901', 'Book SKU maps to HSN 4901');
assert(hsnBook.taxRate === 0, 'Books are 0% statutory GST tax-exempt');

const hsnKurta = resolveSkuHsn('BIBA-ANARKALI-RED');
assert(hsnKurta.hsnCode === '6204', 'Kurta maps to HSN 6204');
assert(hsnKurta.taxRate === 5, 'Kurta has 5% GST rate');

const hsnPolo = resolveSkuHsn('AS-POLO-NAVY');
assert(hsnPolo.hsnCode === '6105', 'Polo shirt maps to HSN 6105');
assert(hsnPolo.taxRate === 12, 'Polo shirt has 12% GST rate');

// -------------------------------------------------------------
// Suite 3: Intra-State vs Inter-State Tax Segregation
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Intra-State vs Inter-State Tax Segregation\x1b[0m');

// Seller in Karnataka (code 29)
const sampleOrders: Order[] = [
  // Order 1: Intra-state (Karnataka to Karnataka), 18% GST, Gross ₹1180
  // Taxable: ₹1000, Tax: ₹180 -> CGST: ₹90, SGST: ₹90, IGST: ₹0
  {
    id: 'ORD-INTRA-1',
    orderDate: '2026-08-01',
    platform: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1180,
    quantity: 1,
    status: 'shipped',
    shipToState: 'Karnataka'
  },
  // Order 2: Inter-state (Karnataka to Maharashtra), 18% GST, Gross ₹1180
  // Taxable: ₹1000, Tax: ₹180 -> IGST: ₹180, CGST: ₹0, SGST: ₹0
  {
    id: 'ORD-INTER-1',
    orderDate: '2026-08-01',
    platform: 'flipkart',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1180,
    quantity: 1,
    status: 'shipped',
    shipToState: 'Maharashtra'
  },
  // Order 3: Inter-state Books (Karnataka to Delhi), 0% GST, Gross ₹500
  // Taxable: ₹500, Tax: ₹0
  {
    id: 'ORD-BOOK-1',
    orderDate: '2026-08-01',
    platform: 'meesho',
    productId: 'prod-14',
    productName: 'The Alchemist',
    sku: 'BOOK-ALCHEMIST',
    orderValue: 500,
    quantity: 1,
    status: 'shipped',
    shipToState: 'Delhi'
  },
  // Order 4: Cancelled order (should be excluded)
  {
    id: 'ORD-CANCEL-1',
    orderDate: '2026-08-01',
    platform: 'amazon',
    productId: 'prod-1',
    productName: 'Cancelled Item',
    sku: 'BOAT-RK450-BLK',
    orderValue: 1180,
    quantity: 1,
    status: 'cancelled',
    shipToState: 'Karnataka'
  }
];

const taxSummary1 = calculateTaxCompliance(sampleOrders, { sellerState: 'Karnataka' });

assert(taxSummary1.sellerState === 'Karnataka', 'Seller state is Karnataka');
assert(taxSummary1.sellerStateCode === '29', 'Seller state code is 29');
assert(taxSummary1.totalGrossSales === 2860, `Total gross sales is ₹2860 (got ${taxSummary1.totalGrossSales})`);
assert(taxSummary1.totalTaxableValue === 2500, `Total taxable value is ₹2500 (got ${taxSummary1.totalTaxableValue})`);
assert(taxSummary1.totalOutputTax === 360, `Total output tax is ₹360 (got ${taxSummary1.totalOutputTax})`);
assert(taxSummary1.totalIgst === 180, `Total IGST is ₹180 (got ${taxSummary1.totalIgst})`);
assert(taxSummary1.totalCgst === 90, `Total CGST is ₹90 (got ${taxSummary1.totalCgst})`);
assert(taxSummary1.totalSgst === 90, `Total SGST is ₹90 (got ${taxSummary1.totalSgst})`);

// Change seller state to Maharashtra (code 27) and recalculate
const taxSummary2 = calculateTaxCompliance(sampleOrders, { sellerState: 'Maharashtra' });
assert(taxSummary2.sellerState === 'Maharashtra', 'Recalculated with Maharashtra seller state');
assert(taxSummary2.sellerStateCode === '27', 'Seller code updated to 27');
// Now Order 2 (Maharashtra) is intra-state (CGST 90 + SGST 90) and Order 1 (Karnataka) is inter-state (IGST 180)
assert(taxSummary2.totalIgst === 180, 'Total IGST remains balanced across states');
assert(taxSummary2.totalCgst === 90, 'Total CGST accurately reflects new intra-state origin');

// -------------------------------------------------------------
// Suite 4: GSTR-1 B2CS Place of Supply (POS) Aggregation
// -------------------------------------------------------------
console.log('\n\x1b[1m4. GSTR-1 B2CS Place of Supply (POS) Aggregation\x1b[0m');

assert(taxSummary1.b2csSummary.length === 3, `3 distinct POS/Rate buckets created (got ${taxSummary1.b2csSummary.length})`);

const karnatakaB2cs = taxSummary1.b2csSummary.find((b) => b.pos === '29-Karnataka');
assert(Boolean(karnatakaB2cs), 'Karnataka B2CS entry exists');
assert(karnatakaB2cs?.supplyType === 'intra_state', 'Karnataka entry is intra_state');
assert(karnatakaB2cs?.cgst === 90, `Karnataka CGST is ₹90 (got ${karnatakaB2cs?.cgst})`);
assert(karnatakaB2cs?.sgst === 90, `Karnataka SGST is ₹90 (got ${karnatakaB2cs?.sgst})`);
assert(karnatakaB2cs?.igst === 0, `Karnataka IGST is ₹0 (got ${karnatakaB2cs?.igst})`);

const maharashtraB2cs = taxSummary1.b2csSummary.find((b) => b.pos === '27-Maharashtra');
assert(Boolean(maharashtraB2cs), 'Maharashtra B2CS entry exists');
assert(maharashtraB2cs?.supplyType === 'inter_state', 'Maharashtra entry is inter_state');
assert(maharashtraB2cs?.igst === 180, `Maharashtra IGST is ₹180 (got ${maharashtraB2cs?.igst})`);
assert(maharashtraB2cs?.cgst === 0, 'Maharashtra CGST is ₹0');

const delhiB2cs = taxSummary1.b2csSummary.find((b) => b.pos === '07-Delhi');
assert(Boolean(delhiB2cs), 'Delhi books B2CS entry exists');
assert(delhiB2cs?.taxRate === 0, 'Delhi books tax rate is 0%');
assert(delhiB2cs?.totalTax === 0, 'Delhi books total tax is ₹0');

// -------------------------------------------------------------
// Suite 5: HSN Table 12 Summary
// -------------------------------------------------------------
console.log('\n\x1b[1m5. HSN Table 12 Summary\x1b[0m');

assert(taxSummary1.hsnSummary.length === 2, `2 distinct HSN buckets (8518 & 4901, got ${taxSummary1.hsnSummary.length})`);

const hsn8518 = taxSummary1.hsnSummary.find((h) => h.hsnCode === '8518');
assert(Boolean(hsn8518), 'HSN 8518 entry exists');
assert(hsn8518?.totalQuantity === 2, `HSN 8518 quantity is 2 (got ${hsn8518?.totalQuantity})`);
assert(hsn8518?.taxableValue === 2000, `HSN 8518 taxable value is ₹2000 (got ${hsn8518?.taxableValue})`);
assert(hsn8518?.totalTax === 360, `HSN 8518 total tax is ₹360 (got ${hsn8518?.totalTax})`);

const hsn4901 = taxSummary1.hsnSummary.find((h) => h.hsnCode === '4901');
assert(Boolean(hsn4901), 'HSN 4901 books entry exists');
assert(hsn4901?.totalQuantity === 1, 'HSN 4901 quantity is 1');
assert(hsn4901?.taxableValue === 500, 'HSN 4901 taxable value is ₹500');
assert(hsn4901?.totalTax === 0, 'HSN 4901 total tax is ₹0');

// -------------------------------------------------------------
// Suite 6: Section 52 Marketplace TCS Reconciliation
// -------------------------------------------------------------
console.log('\n\x1b[1m6. Section 52 Marketplace TCS Reconciliation\x1b[0m');

// Sample with return to test net taxable deduction
const ordersWithReturn: Order[] = [
  ...sampleOrders,
  {
    id: 'ORD-RET-1',
    orderDate: '2026-08-02',
    platform: 'amazon',
    productId: 'prod-1',
    productName: 'boAt Rockerz 450',
    sku: 'BOAT-RK450-BLK',
    orderValue: 590, // Taxable: ₹500, Tax: ₹90
    quantity: 1,
    status: 'returned',
    shipToState: 'Karnataka'
  }
];

const taxSummaryWithRet = calculateTaxCompliance(ordersWithReturn, { sellerState: 'Karnataka' });

const tcsAz = taxSummaryWithRet.tcsSummary.amazon;
assert(tcsAz.grossTaxableValue === 1000, `Amazon gross taxable is ₹1000 (got ${tcsAz.grossTaxableValue})`);
assert(tcsAz.returnedTaxableValue === 500, `Amazon returned taxable is ₹500 (got ${tcsAz.returnedTaxableValue})`);
assert(tcsAz.netTaxableValue === 500, `Amazon net taxable value is ₹500 (got ${tcsAz.netTaxableValue})`);
assert(tcsAz.totalTcs === 5, `Amazon 1% TCS is ₹5.00 (got ${tcsAz.totalTcs})`);

const tcsFk = taxSummaryWithRet.tcsSummary.flipkart;
assert(tcsFk.grossTaxableValue === 1000, 'Flipkart gross taxable is ₹1000');
assert(tcsFk.netTaxableValue === 1000, 'Flipkart net taxable is ₹1000');
assert(tcsFk.totalTcs === 10, 'Flipkart 1% TCS is ₹10.00');

const tcsMs = taxSummaryWithRet.tcsSummary.meesho;
assert(tcsMs.grossTaxableValue === 500, 'Meesho gross taxable is ₹500');
assert(tcsMs.netTaxableValue === 500, 'Meesho net taxable is ₹500');
assert(tcsMs.totalTcs === 5, 'Meesho 1% TCS is ₹5.00');

const tcsTotal = taxSummaryWithRet.tcsSummary.blended;
assert(tcsTotal.netTaxableValue === 2000, `Blended net taxable is ₹2000 (got ${tcsTotal.netTaxableValue})`);
assert(tcsTotal.totalTcs === 20, `Blended total 1% TCS is ₹20.00 (got ${tcsTotal.totalTcs})`);

// -------------------------------------------------------------
// Suite 7: GSTR-3B Input Tax Credit (ITC) & Net Cash Liability
// -------------------------------------------------------------
console.log('\n\x1b[1m7. GSTR-3B Input Tax Credit (ITC) & Net Cash Liability\x1b[0m');

const gstr3b = taxSummaryWithRet.gstr3b;
assert(gstr3b.eligibleItc.totalAvailableItc > 0, `Total available ITC is positive (${gstr3b.eligibleItc.totalAvailableItc})`);
assert(gstr3b.eligibleItc.cogsProcurementItc > 0, `COGS procurement ITC is positive (${gstr3b.eligibleItc.cogsProcurementItc})`);
assert(gstr3b.eligibleItc.marketplaceServicesItc > 0, `Platform services ITC is positive (${gstr3b.eligibleItc.marketplaceServicesItc})`);
assert(gstr3b.tcsCreditAvailable === 20, `TCS credit available matches ₹20 (got ${gstr3b.tcsCreditAvailable})`);
assert(gstr3b.netTaxPayableInCash >= 0, 'Net tax payable in cash is non-negative');

// -------------------------------------------------------------
// Suite 8: One-Click CSV & JSON Exporters
// -------------------------------------------------------------
console.log('\n\x1b[1m8. One-Click CSV & JSON Exporters\x1b[0m');

const b2csCsv = exportGstr1B2csCsv(taxSummaryWithRet);
assert(b2csCsv.includes('Place Of Supply (POS)'), 'B2CS CSV contains POS header');
assert(b2csCsv.includes('29-Karnataka'), 'B2CS CSV contains Karnataka row');
assert(b2csCsv.includes('27-Maharashtra'), 'B2CS CSV contains Maharashtra row');

const hsnCsv = exportGstr1HsnCsv(taxSummaryWithRet);
assert(hsnCsv.includes('HSN Code'), 'HSN CSV contains HSN header');
assert(hsnCsv.includes('8518'), 'HSN CSV contains 8518 code');
assert(hsnCsv.includes('4901'), 'HSN CSV contains 4901 code');

const tcsCsv = exportSection52TcsCsv(taxSummaryWithRet);
assert(tcsCsv.includes('Marketplace / Platform'), 'TCS CSV contains header');
assert(tcsCsv.includes('Amazon India'), 'TCS CSV contains Amazon');
assert(tcsCsv.includes('Flipkart'), 'TCS CSV contains Flipkart');
assert(tcsCsv.includes('Meesho'), 'TCS CSV contains Meesho');

const jsonPayload = exportGstr1Json(taxSummaryWithRet);
const parsedJson = JSON.parse(jsonPayload);
assert(parsedJson.gstin === '29AAACH7409R1ZZ', 'JSON contains valid GSTIN');
assert(Array.isArray(parsedJson.b2cs) && parsedJson.b2cs.length > 0, 'JSON contains b2cs array');
assert(Array.isArray(parsedJson.hsn.data) && parsedJson.hsn.data.length > 0, 'JSON contains hsn data array');

// -------------------------------------------------------------
// Suite 9: AI Copilot Context Builder & Grounding
// -------------------------------------------------------------
console.log('\n\x1b[1m9. AI Copilot Context Builder & Grounding\x1b[0m');

const fullPayload = buildStoreContext({ orders: MOCK_ORDERS, preset: '30d', platform: 'all' });
assert(fullPayload.markdown.includes('Indian GST Tax, ITC & Section 52 TCS Compliance'), 'Markdown includes GST section');
assert(fullPayload.snapshot.taxSummary !== undefined, 'Snapshot contains taxSummary object');
assert((fullPayload.snapshot.taxSummary?.outputGst ?? 0) > 0, 'Snapshot taxSummary has positive output GST');
assert((fullPayload.snapshot.taxSummary?.eligibleItc ?? 0) > 0, 'Snapshot taxSummary has positive eligible ITC');

const taxResponse = runMockAiEngine('What is my GST tax liability and claimable ITC?', fullPayload);
assert(taxResponse.includes('Indian GST Tax & Compliance Audit'), 'Copilot answers GST query with Tax Audit title');
assert(taxResponse.includes('Total Output GST Liability'), 'Copilot response cites output GST liability');
assert(taxResponse.includes('COGS Procurement ITC'), 'Copilot response cites COGS ITC');
assert(taxResponse.includes('Section 52 Marketplace TCS'), 'Copilot response cites Section 52 TCS');
assert(taxResponse.includes('Net GST Cash Tax Outflow'), 'Copilot response cites net cash outflow');

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: \x1b[32m${passedCount} passed\x1b[0m, \x1b[31m${failedCount} failed\x1b[0m`);
if (failedCount === 0) {
  console.log('\x1b[32m✓ ALL GST TAX & COMPLIANCE VALIDATIONS PASSED!\x1b[0m\n');
} else {
  console.error('\x1b[31m✗ SOME TESTS FAILED!\x1b[0m\n');
  process.exit(1);
}
