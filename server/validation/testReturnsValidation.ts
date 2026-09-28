import {
  calculateReturnsSummary,
  exportReturnsAuditCsv,
  exportNdrQueueCsv,
  exportCourierBenchmarkCsv,
  saveNdrAction,
  getStoredNdrActions
} from '../../src/services/returns/returnsService';
import { buildStoreContext } from '../../src/services/ai/contextBuilder';
import { runMockAiEngine } from '../../src/services/ai/copilotService';
import { MOCK_ORDERS } from '../../src/data/orders';
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
console.log('║   Phase 13: Customer Returns & RTO Intelligence Engine Validation              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Mathematical Accuracy of Returns & RTO Formulas
// -------------------------------------------------------------
console.log('\x1b[1m1. Mathematical Accuracy of Returns & RTO Formulas\x1b[0m');

const summary = calculateReturnsSummary(MOCK_ORDERS);

assert(summary.totalOrders > 0, `Total orders evaluated: ${summary.totalOrders}`);
assert(summary.deliveredCount > 0, `Delivered orders count: ${summary.deliveredCount}`);
assert(summary.rtoCount > 0, `RTO count is positive: ${summary.rtoCount}`);
assert(summary.customerReturnCount > 0, `Customer return count is positive: ${summary.customerReturnCount}`);
assert(summary.totalReturnsCount === summary.rtoCount + summary.customerReturnCount, 'Total returns equals RTO + CIR');

const expectedBlendedRate = Number(((summary.totalReturnsCount / summary.totalOrders) * 100).toFixed(1));
assert(summary.blendedReturnRate === expectedBlendedRate, `Blended return rate mathematically equals Total Returns / Total Orders (${summary.blendedReturnRate}%)`);

const expectedRtoRate = Number(((summary.rtoCount / summary.totalOrders) * 100).toFixed(1));
assert(summary.rtoRate === expectedRtoRate, `RTO rate mathematically equals RTO Count / Total Orders (${summary.rtoRate}%)`);

const expectedCirRate = Number(((summary.customerReturnCount / summary.totalOrders) * 100).toFixed(1));
assert(summary.customerReturnRate === expectedCirRate, `Customer return rate mathematically equals CIR / Total Orders (${summary.customerReturnRate}%)`);

// Financial loss breakdown
assert(summary.totalReturnLoss > 0, `Total return cash loss is positive: ₹${summary.totalReturnLoss}`);
assert(summary.reverseLogisticsLoss > 0, `Reverse logistics freight loss is positive: ₹${summary.reverseLogisticsLoss}`);
assert(summary.damageWriteOffLoss > 0, `Damaged goods write-off loss is positive: ₹${summary.damageWriteOffLoss}`);
assert(summary.packagingLoss > 0, `Packaging loss is positive: ₹${summary.packagingLoss}`);
assert(
  summary.totalReturnLoss === summary.reverseLogisticsLoss + summary.damageWriteOffLoss + summary.packagingLoss,
  'Total return loss equals Freight + Damage + Packaging losses'
);

// -------------------------------------------------------------
// Suite 2: COD vs. Prepaid Disparity & Risk Multiplier
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Cash on Delivery (COD) vs. Prepaid Disparity Analysis\x1b[0m');

const cod = summary.codDisparity;
assert(cod.codOrders + cod.prepaidOrders === summary.totalOrders, 'COD orders + Prepaid orders equals total orders');
assert(cod.codReturns + cod.prepaidReturns === summary.totalReturnsCount, 'COD returns + Prepaid returns equals total returns');
assert(cod.codReturnRate > cod.prepaidReturnRate, `COD return rate (${cod.codReturnRate}%) is significantly higher than Prepaid (${cod.prepaidReturnRate}%)`);
assert(cod.codRiskMultiplier >= 2.0, `COD risk multiplier indicates elevated risk (${cod.codRiskMultiplier}x)`);

const calculatedMultiplier = Number((cod.codReturnRate / cod.prepaidReturnRate).toFixed(1));
assert(cod.codRiskMultiplier === calculatedMultiplier, `COD risk multiplier matches COD Rate / Prepaid Rate ratio (${cod.codRiskMultiplier}x === ${calculatedMultiplier}x)`);
assert(cod.codLoss > cod.prepaidLoss, `COD cash loss (₹${cod.codLoss}) exceeds Prepaid loss (₹${cod.prepaidLoss})`);

// -------------------------------------------------------------
// Suite 3: Courier Partner Delivery SLAs & Performance Benchmarks
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Courier & 3PL Logistics Partner Benchmarks\x1b[0m');

assert(summary.courierBenchmarks.length >= 6, `Benchmarks cover ${summary.courierBenchmarks.length} major Indian couriers`);

// Check Delhivery
const delhivery = summary.courierBenchmarks.find((c) => c.courier === 'Delhivery')!;
assert(delhivery !== undefined, 'Delhivery benchmark tracked');
assert(delhivery.deliverySuccessRate > 80, `Delhivery delivery success rate: ${delhivery.deliverySuccessRate}%`);
assert(delhivery.rtoRate > 0, `Delhivery RTO rate: ${delhivery.rtoRate}%`);
assert(delhivery.totalReverseLoss > 0, `Delhivery reverse freight loss: ₹${delhivery.totalReverseLoss}`);

// Check Blue Dart (Fast transit)
const blueDart = summary.courierBenchmarks.find((c) => c.courier === 'Blue Dart')!;
assert(blueDart !== undefined, 'Blue Dart benchmark tracked');
assert(blueDart.avgTransitDays <= 2.5, `Blue Dart has premium fast transit (${blueDart.avgTransitDays} days)`);
assert(blueDart.rating === 'excellent' || blueDart.rating === 'good', 'Blue Dart has healthy performance rating');

// Check Shadowfax (Elevated fake attempts)
const shadowfax = summary.courierBenchmarks.find((c) => c.courier === 'Shadowfax')!;
assert(shadowfax !== undefined, 'Shadowfax benchmark tracked');
assert(shadowfax.fakeAttemptRate > 5, `Shadowfax flags elevated fake attempt rate (${shadowfax.fakeAttemptRate}%)`);
assert(shadowfax.rating === 'poor' || shadowfax.rating === 'at_risk', 'Shadowfax flagged as at-risk carrier');

// Sorting
for (let i = 0; i < summary.courierBenchmarks.length - 1; i++) {
  assert(
    summary.courierBenchmarks[i].deliverySuccessRate >= summary.courierBenchmarks[i + 1].deliverySuccessRate,
    `Couriers sorted by delivery success rate descending (${summary.courierBenchmarks[i].deliverySuccessRate}% >= ${summary.courierBenchmarks[i + 1].deliverySuccessRate}%)`
  );
}

// -------------------------------------------------------------
// Suite 4: Regional State RTO Ranking & Risk Tiers
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Regional State RTO Ranking & Risk Tiers\x1b[0m');

assert(summary.stateRisks.length === 10, 'Top 10 Indian eCommerce states analyzed');

// Check High-Risk State (Bihar)
const bihar = summary.stateRisks.find((s) => s.state === 'Bihar')!;
assert(bihar !== undefined, 'Bihar state risk tracked');
assert(bihar.rtoRate >= 16, `Bihar flagged with high RTO rate (${bihar.rtoRate}%)`);
assert(bihar.riskTier === 'high_risk', 'Bihar classified as high_risk tier');
assert(bihar.codSharePct > 70, `Bihar has high COD share (${bihar.codSharePct}%)`);

// Check Low-Risk State (Karnataka)
const karnataka = summary.stateRisks.find((s) => s.state === 'Karnataka')!;
assert(karnataka !== undefined, 'Karnataka state risk tracked');
assert(karnataka.rtoRate < 10, `Karnataka has low RTO rate (${karnataka.rtoRate}%)`);
assert(karnataka.riskTier === 'safe', 'Karnataka classified as safe tier');

// Sorting
for (let i = 0; i < summary.stateRisks.length - 1; i++) {
  assert(
    summary.stateRisks[i].rtoRate >= summary.stateRisks[i + 1].rtoRate,
    `States sorted by RTO rate descending (${summary.stateRisks[i].rtoRate}% >= ${summary.stateRisks[i + 1].rtoRate}%)`
  );
}

// -------------------------------------------------------------
// Suite 5: SKU-Level Defect Analysis & Return Drag
// -------------------------------------------------------------
console.log('\n\x1b[1m5. SKU-Level Defect Analysis & Root Causes\x1b[0m');

assert(summary.skuDefects.length === PRODUCTS_CATALOG.length, `Defect analysis covers all ${PRODUCTS_CATALOG.length} catalog products`);

// Check Apparel SKU (Levi's Jeans sizing)
const levisDefect = summary.skuDefects.find((s) => s.sku === 'LEVI-511-INDIGO')!;
assert(levisDefect !== undefined, "Levi's 511 Denim defect tracked");
assert(levisDefect.returnRate > 15, `Levi's Jeans has high return rate (${levisDefect.returnRate}%)`);
assert(levisDefect.topReason.includes('Sizing') || levisDefect.topReason.includes('Size'), "Levi's return reason cites sizing mismatch");
assert(levisDefect.recommendation.includes('waistband') || levisDefect.recommendation.includes('sizing'), "Levi's recommendation suggests sizing clarity");

// Check Electronics SKU (Noise Smartwatch)
const noiseDefect = summary.skuDefects.find((s) => s.sku === 'NOISE-CFP3-SLV')!;
assert(noiseDefect !== undefined, 'Noise Smartwatch defect tracked');
assert(noiseDefect.topReason.includes('Bluetooth') || noiseDefect.topReason.includes('Defect'), 'Noise Smartwatch cites technical/pairing defect');
assert(noiseDefect.damageWriteOffCount > 0, 'Noise Smartwatch has damage write-offs');

// Sorting
for (let i = 0; i < summary.skuDefects.length - 1; i++) {
  assert(
    summary.skuDefects[i].totalNetLoss >= summary.skuDefects[i + 1].totalNetLoss,
    `SKU defects sorted by net cash loss descending (₹${summary.skuDefects[i].totalNetLoss} >= ₹${summary.skuDefects[i + 1].totalNetLoss})`
  );
}

// -------------------------------------------------------------
// Suite 6: Non-Delivery Report (NDR) & WhatsApp Workflow
// -------------------------------------------------------------
console.log('\n\x1b[1m6. NDR Queue Management & WhatsApp Generator\x1b[0m');

// Mock localStorage for Node environment
const mockStorage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  length: 0
};

assert(summary.ndrCases.length >= 3, `NDR queue has ${summary.ndrCases.length} cases`);
assert(summary.pendingNdrCount > 0, `Pending NDR count is positive (${summary.pendingNdrCount})`);

const firstNdr = summary.ndrCases[0];
assert(firstNdr.whatsappDraft.includes(firstNdr.customerName.split(' ')[0]), 'WhatsApp draft includes customer first name');
assert(firstNdr.whatsappDraft.includes(firstNdr.orderId), 'WhatsApp draft cites order ID');
assert(firstNdr.whatsappDraft.includes(firstNdr.courier), 'WhatsApp draft cites courier partner name');

// Test saving NDR action
saveNdrAction(firstNdr.id, 'action_taken', 'Escalated to courier desk');
assert(getStoredNdrActions()[firstNdr.id]?.status === 'action_taken', 'NDR action persisted in storage');

// Recalculate summary with action taken
const updatedSummary = calculateReturnsSummary(MOCK_ORDERS);
const updatedCase = updatedSummary.ndrCases.find((c) => c.id === firstNdr.id)!;
assert(updatedCase.status === 'action_taken', 'NDR case reflects action_taken status');
assert(updatedSummary.pendingNdrCount === summary.pendingNdrCount - 1, 'Pending NDR count decremented');

// Reset mock storage
(globalThis as unknown as { localStorage: Storage }).localStorage.clear();

// -------------------------------------------------------------
// Suite 7: One-Click CSV Export Formats
// -------------------------------------------------------------
console.log('\n\x1b[1m7. One-Click Returns & NDR CSV Exporters\x1b[0m');

const returnsCsv = exportReturnsAuditCsv(summary);
assert(returnsCsv.includes('Return ID,Order Date,Return Date,Platform,SKU,Product Name'), 'Returns CSV contains standard header');
assert(returnsCsv.includes('RET-AZ-001'), 'Returns CSV contains Amazon return transaction');
assert(returnsCsv.includes('RET-FK-002'), 'Returns CSV contains Flipkart return transaction');
assert(returnsCsv.includes('RET-MS-004'), 'Returns CSV contains Meesho return transaction');

const ndrCsv = exportNdrQueueCsv(summary);
assert(ndrCsv.includes('NDR ID,Order ID,Customer Name,Customer Phone,SKU'), 'NDR CSV contains header');
assert(ndrCsv.includes('NDR-CASE-101'), 'NDR CSV contains case 101');
assert(ndrCsv.includes('Rahul Verma'), 'NDR CSV contains customer name');

const courierCsv = exportCourierBenchmarkCsv(summary);
assert(courierCsv.includes('Courier Partner,Total Dispatched,Delivered,RTO Count'), 'Courier CSV contains header');
assert(courierCsv.includes('Delhivery'), 'Courier CSV contains Delhivery');
assert(courierCsv.includes('Blue Dart'), 'Courier CSV contains Blue Dart');
assert(courierCsv.includes('Amazon ATS'), 'Courier CSV contains Amazon ATS');

// -------------------------------------------------------------
// Suite 8: AI Copilot Context Builder Grounding
// -------------------------------------------------------------
console.log('\n\x1b[1m8. Store Copilot Context Builder Grounding\x1b[0m');

const context = buildStoreContext({ orders: MOCK_ORDERS, preset: '30d', platform: 'all' });
assert(context.markdown.includes('### 7. Customer Returns, RTO Drag & NDR Intelligence'), 'Context includes Returns & RTO markdown section');
assert(context.snapshot.returnsSummary !== undefined, 'Snapshot includes returnsSummary');
assert((context.snapshot.returnsSummary?.totalReturnLoss ?? 0) > 0, 'Snapshot returnsSummary contains total return loss');
assert((context.snapshot.returnsSummary?.rtoRate ?? 0) > 0, 'Snapshot returnsSummary contains RTO rate');
assert((context.snapshot.returnsSummary?.codRiskMultiplier ?? 0) > 0, 'Snapshot returnsSummary contains COD risk multiplier');
assert(context.tokenEstimate < 3000, `Token estimate (${context.tokenEstimate}) stays well within 3000 limit`);

// -------------------------------------------------------------
// Suite 9: AI Copilot Semantic Query Matching & Playbooks
// -------------------------------------------------------------
console.log('\n\x1b[1m9. AI Copilot Semantic Query Matching & Playbooks\x1b[0m');

// Query 1: RTO Rate & Returns audit
const rtoReply = runMockAiEngine('What is my RTO rate and customer return loss?', context);
assert(rtoReply.includes('Customer Returns, RTO Drag & NDR Intelligence'), 'Copilot identifies returns query');
assert(rtoReply.includes('Total Return Cash Loss'), 'Copilot cites total return cash loss');
assert(rtoReply.includes('RTO Door Rejections'), 'Copilot cites RTO door rejections');
assert(rtoReply.includes('COD vs. Prepaid Disparity'), 'Copilot cites COD vs Prepaid disparity');

// Query 2: COD Returns & Mitigation playbook
const codReply = runMockAiEngine('Why are my COD returns so high?', context);
assert(codReply.includes('Tame COD Fraud & Disparity'), 'Copilot offers COD fraud mitigation playbook');
assert(codReply.includes('pre-dispatch confirmation deposit'), 'Copilot suggests pre-dispatch deposit/OTP rule');

// Query 3: Courier Fake Attempt accountability
const courierReply = runMockAiEngine('Which courier has fake delivery attempts and high RTO?', context);
assert(courierReply.includes('Courier Accountability'), 'Copilot delivers courier accountability playbook');
assert(courierReply.includes('Pending NDR'), 'Copilot highlights pending NDR alerts');

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: \x1b[32m${passedCount} passed\x1b[0m, \x1b[31m${failedCount} failed\x1b[0m`);
if (failedCount === 0) {
  console.log('\x1b[32m✓ ALL CUSTOMER RETURNS & RTO INTELLIGENCE VALIDATIONS PASSED!\x1b[0m\n');
} else {
  console.error('\x1b[31m✗ SOME TESTS FAILED!\x1b[0m\n');
  process.exit(1);
}
