import {
  calculateCashFlowForecast,
  exportCashFlowForecastCsv,
  exportDisbursementsCsv,
  exportPayablesScheduleCsv,
  DEFAULT_STARTING_CASH,
  DEFAULT_SAFE_BUFFER,
  DEFAULT_SIMULATION
} from '../../src/services/cashflow/cashflowService';
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
console.log('║   Phase 14: Cash Flow Runway & Liquidity Simulator Validation                  ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Mathematical Accuracy of Daily Cash Balance Transitions
// -------------------------------------------------------------
console.log('\x1b[1m1. Mathematical Accuracy of Daily Cash Transitions\x1b[0m');

const summary = calculateCashFlowForecast(MOCK_ORDERS);

assert(summary.startingCash === DEFAULT_STARTING_CASH, `Starting cash matches default (₹${summary.startingCash})`);
assert(summary.currentCash === DEFAULT_STARTING_CASH, `Current cash matches starting (₹${summary.currentCash})`);
assert(summary.dailyPoints.length === 90, `Generates exactly 90 daily forecast points (got ${summary.dailyPoints.length})`);

// Verify balance conservation: Closing = Opening + Inflows - Outflows for each day
let mathValid = true;
for (let i = 0; i < summary.dailyPoints.length; i++) {
  const p = summary.dailyPoints[i];
  const expectedClosing = p.openingBalance + p.totalInflows - p.totalOutflows;
  if (p.closingBalance !== expectedClosing) {
    mathValid = false;
    break;
  }
}
assert(mathValid, 'Closing balance equals Opening + Inflows - Outflows for all 90 days');

// Verify sequence: Day(i).opening equals Day(i-1).closing
let sequenceValid = true;
for (let i = 1; i < summary.dailyPoints.length; i++) {
  if (summary.dailyPoints[i].openingBalance !== summary.dailyPoints[i - 1].closingBalance) {
    sequenceValid = false;
    break;
  }
}
assert(sequenceValid, 'Daily opening cash seamlessly chains from previous day closing cash');

// -------------------------------------------------------------
// Suite 2: 30/60/90-Day Projected Balances & Metrics
// -------------------------------------------------------------
console.log('\n\x1b[1m2. 30/60/90-Day Horizon Balances & Cash Aggregations\x1b[0m');

assert(summary.inflows30d > 0, `Total 30-day inflows positive: ₹${summary.inflows30d}`);
assert(summary.outflows30d > 0, `Total 30-day outflows positive: ₹${summary.outflows30d}`);
assert(summary.netCash30d === summary.inflows30d - summary.outflows30d, `Net cash equals 30-day inflows minus outflows (₹${summary.netCash30d})`);

assert(summary.projectedBalance30d === summary.dailyPoints[29].closingBalance, `Day 30 projected balance matches Day 30 closing (₹${summary.projectedBalance30d})`);
assert(summary.projectedBalance60d === summary.dailyPoints[59].closingBalance, `Day 60 projected balance matches Day 60 closing (₹${summary.projectedBalance60d})`);
assert(summary.projectedBalance90d === summary.dailyPoints[89].closingBalance, `Day 90 projected balance matches Day 90 closing (₹${summary.projectedBalance90d})`);

// -------------------------------------------------------------
// Suite 3: Marketplace Disbursement Pipeline Modeling
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Marketplace Disbursement Pipeline & Escrow Holdbacks\x1b[0m');

assert(summary.disbursements.length >= 3, `Disbursement pipeline tracks multiple settlements (${summary.disbursements.length})`);

const azDisb = summary.disbursements.find((d) => d.platform === 'amazon')!;
assert(azDisb !== undefined, 'Amazon settlement item tracked in pipeline');
assert(azDisb.reserveWithheld > 0, `Amazon 7-day reserve holdback modeled (₹${azDisb.reserveWithheld})`);
assert(azDisb.netDisbursement === azDisb.grossSales - azDisb.marketplaceFees - azDisb.reserveWithheld, 'Amazon net disbursement equals Gross - Fees - Reserve');

const fkDisb = summary.disbursements.find((d) => d.platform === 'flipkart')!;
assert(fkDisb !== undefined, 'Flipkart weekly settlement item tracked');
assert(fkDisb.settlementCycle.includes('Weekly'), 'Flipkart settlement cycle designated weekly');

const msDisb = summary.disbursements.find((d) => d.platform === 'meesho')!;
assert(msDisb !== undefined, 'Meesho T+15 settlement item tracked');
assert(msDisb.settlementCycle.includes('T+15'), 'Meesho designated T+15 settlement cycle');

// -------------------------------------------------------------
// Suite 4: Scheduled Tax & Operational Outflow Deadlines
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Scheduled Tax & Operational Outflow Deadlines\x1b[0m');

assert(summary.scheduledOutflows.length >= 3, `Scheduled payables tracks multiple obligations (${summary.scheduledOutflows.length})`);

const gstPayable = summary.scheduledOutflows.find((o) => o.category === 'gst_tax')!;
assert(gstPayable !== undefined, 'GST tax payable tracked in liabilities schedule');
assert(gstPayable.urgency === 'critical', 'GST tax categorized as critical urgency');
assert(gstPayable.dueDate.endsWith('-20'), `GST challan scheduled on statutory 20th deadline (${gstPayable.dueDate})`);

const supplierPayable = summary.scheduledOutflows.find((o) => o.category === 'supplier_restock')!;
assert(supplierPayable !== undefined, 'Supplier restock PO tracked in schedule');
assert(supplierPayable.amount > 50000, `Supplier PO amount reflects inventory procurement (₹${supplierPayable.amount})`);

const rentPayable = summary.scheduledOutflows.find((o) => o.category === 'operating_expenses')!;
assert(rentPayable !== undefined, 'Warehouse lease/operating expense tracked');
assert(rentPayable.dueDate.endsWith('-01'), `Warehouse rent scheduled on 1st of month (${rentPayable.dueDate})`);

// -------------------------------------------------------------
// Suite 5: Minimum Liquidity Trough & Runway Days
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Minimum Liquidity Trough & Runway Days\x1b[0m');

// Check that minTroughBalance is indeed the minimum of all 90 days
const actualMin = Math.min(...summary.dailyPoints.map((p) => p.closingBalance));
assert(summary.minTroughBalance === actualMin, `Identifies exact minimum cash trough (₹${summary.minTroughBalance} === ₹${actualMin})`);

const troughPoint = summary.dailyPoints.find((p) => p.isTrough)!;
assert(troughPoint !== undefined, 'Flags the specific trough day point in timeline');
assert(troughPoint.dayIndex === summary.troughDayIndex, `Trough day index matches summary (${troughPoint.dayIndex})`);
assert(troughPoint.date === summary.troughDate, `Trough date matches summary (${troughPoint.date})`);

// Runway days status
assert(summary.runwayDays > 0, `Runway days calculated (${summary.runwayDays} days)`);
assert(['healthy', 'caution', 'critical_crunch'].includes(summary.runwayStatus), `Valid runway status: ${summary.runwayStatus}`);

// -------------------------------------------------------------
// Suite 6: "What-If" Scenario Simulation Engine
// -------------------------------------------------------------
console.log('\n\x1b[1m6. Dynamic "What-If" Scenario Simulation Sensitivity\x1b[0m');

// Test Capital Injection (+₹2,00,000)
const simWithCapital = calculateCashFlowForecast(MOCK_ORDERS, {}, {
  ...DEFAULT_SIMULATION,
  capitalInjection: 200000
});
assert(simWithCapital.currentCash === summary.currentCash + 200000, `Capital injection increases current cash by ₹2,00,000 (₹${simWithCapital.currentCash})`);
assert(simWithCapital.minTroughBalance > summary.minTroughBalance, `Capital injection raises minimum liquidity trough (₹${simWithCapital.minTroughBalance} > ₹${summary.minTroughBalance})`);

// Test Supplier Credit Extension (from 15 to 45 days)
const simExtendedCredit = calculateCashFlowForecast(MOCK_ORDERS, {}, {
  ...DEFAULT_SIMULATION,
  supplierCreditDays: 45
});
// Extending supplier credit delays the PO outlay, raising early cash balance
assert(simExtendedCredit.dailyPoints[26].closingBalance > summary.dailyPoints[26].closingBalance, 'Extending credit from 15 to 45 days defers PO payment and preserves cash');

// Test Ad Spend Cut (-50%)
const simAdCut = calculateCashFlowForecast(MOCK_ORDERS, {}, {
  ...DEFAULT_SIMULATION,
  adSpendChangePct: -50
});
assert(simAdCut.outflows30d < summary.outflows30d, `Cutting ad spend by 50% reduces 30-day outflows (₹${simAdCut.outflows30d} < ₹${summary.outflows30d})`);

// -------------------------------------------------------------
// Suite 7: Custom Starting Cash Reserve Persistence
// -------------------------------------------------------------
console.log('\n\x1b[1m7. Starting Cash Reserve & Safety Buffer Adaptation\x1b[0m');

const customCash = 150000;
const simCustom = calculateCashFlowForecast(MOCK_ORDERS, { startingCash: customCash, safeReserveBuffer: DEFAULT_SAFE_BUFFER });
assert(simCustom.startingCash === customCash, `Accepts custom starting cash (₹${simCustom.startingCash})`);
assert(simCustom.safeReserveBuffer === DEFAULT_SAFE_BUFFER, `Enforces safety buffer of ₹${DEFAULT_SAFE_BUFFER}`);

// -------------------------------------------------------------
// Suite 8: One-Click Cash Flow CSV Exporters
// -------------------------------------------------------------
console.log('\n\x1b[1m8. One-Click Cash Flow CSV Exporters\x1b[0m');

const forecastCsv = exportCashFlowForecastCsv(summary);
assert(forecastCsv.includes('Day Index,Date,Opening Cash (INR)'), 'Forecast CSV contains standard header');
assert(forecastCsv.includes('D1') || forecastCsv.includes('1,'), 'Forecast CSV contains day 1 row');

const disbCsv = exportDisbursementsCsv(summary);
assert(disbCsv.includes('Disbursement ID,Platform,Settlement Cycle'), 'Disbursements CSV contains header');
assert(disbCsv.includes('AMAZON'), 'Disbursements CSV contains Amazon settlement');
assert(disbCsv.includes('FLIPKART'), 'Disbursements CSV contains Flipkart settlement');

const payablesCsv = exportPayablesScheduleCsv(summary);
assert(payablesCsv.includes('Payable ID,Title,Category'), 'Payables CSV contains header');
assert(payablesCsv.includes('GSTR-3B'), 'Payables CSV contains GST tax challan');
assert(payablesCsv.includes('Restock Batch PO'), 'Payables CSV contains supplier PO');

// -------------------------------------------------------------
// Suite 9: AI Copilot Context Grounding & Semantic Intent Matching
// -------------------------------------------------------------
console.log('\n\x1b[1m9. AI Copilot Context Grounding & Semantic Matching\x1b[0m');

const context = buildStoreContext({ orders: MOCK_ORDERS });
assert(context.markdown.includes('Cash Flow Runway & Working Capital Liquidity'), 'Context includes Section 8 Cash Flow & Liquidity');
assert(context.snapshot.cashflowSummary !== undefined, 'Snapshot contains cashflowSummary');
assert(context.snapshot.cashflowSummary!.currentCash > 0, `Snapshot cashflowSummary current cash tracked (₹${context.snapshot.cashflowSummary!.currentCash})`);
assert(context.snapshot.cashflowSummary!.minTroughBalance !== undefined, 'Snapshot tracks minTroughBalance');

// Semantic query matching
const reply = runMockAiEngine('How many days of cash runway do we have and when is our lowest cash trough?', context);
assert(reply.includes('Cash Flow Runway & Working Capital Forecast'), 'Copilot identifies cash flow / runway query');
assert(reply.includes('Liquid Cash Reserve'), 'Copilot cites liquid cash reserve');
assert(reply.includes('90-Day Minimum Cash Trough'), 'Copilot cites minimum cash trough');
assert(reply.includes('Working Capital & Treasury Optimization Playbook'), 'Copilot delivers working capital optimization playbook');

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  console.error('\x1b[31m✗ SOME TESTS FAILED!\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✓ ALL CASH FLOW & RUNWAY VALIDATIONS PASSED!\x1b[0m\n');
}
