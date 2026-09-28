import { MOCK_ORDERS } from '../../src/data/orders';
import { seedDefaultInventory } from '../../src/services/inventory/inventoryService';
import { getSkuCostsSync } from '../../src/services/catalog/cogsService';
import { buildStoreContext } from '../../src/services/ai/contextBuilder';
import {
  runMockAiEngine,
  generateExecutiveNarrative,
  sendCopilotMessage,
  getStoredCopilotConfig,
  buildSystemPrompt,
  type ChatMessage
} from '../../src/services/ai/copilotService';

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
console.log('║   Phase 9: Conversational AI Store Copilot & Contextual Engine Validation      ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

// Setup inventory and COGS fixtures
const inventory = seedDefaultInventory();
const skuCostsMap = getSkuCostsSync();

// -------------------------------------------------------------
// Suite 1: Store State Context Builder (Phase 9A)
// -------------------------------------------------------------
console.log('\n\x1b[1m1. Store State Context Builder (contextBuilder.ts)\x1b[0m');

const contextPayload = buildStoreContext({
  orders: MOCK_ORDERS,
  inventory,
  skuCostsMap,
  preset: '30d',
  platform: 'all'
});

assert(Boolean(contextPayload.markdown), 'Generates non-empty Markdown context block');
assert(contextPayload.markdown.includes('## Store Grounding Context'), 'Includes standard context header');
assert(contextPayload.markdown.includes('Executive Financial Performance'), 'Includes executive financial performance section');
assert(contextPayload.markdown.includes('Amazon India'), 'Includes Amazon India marketplace section');
assert(contextPayload.markdown.includes('Flipkart'), 'Includes Flipkart marketplace section');
assert(contextPayload.markdown.includes('Inventory & Working Capital Health'), 'Includes inventory & working capital section');
assert(contextPayload.tokenEstimate > 100 && contextPayload.tokenEstimate < 3000, `Token estimate is within budget (${contextPayload.tokenEstimate} tokens)`);

// Snapshot assertions
const snap = contextPayload.snapshot;
assert(snap.totalRevenue > 0, `Snapshot totalRevenue is positive (${snap.totalRevenue})`);
assert(snap.orderCount > 0, `Snapshot orderCount is populated (${snap.orderCount})`);
assert(snap.unitsSold > 0, `Snapshot unitsSold is populated (${snap.unitsSold})`);
assert(snap.netProfit !== undefined, 'Snapshot netProfit is calculated');
assert(snap.profitMargin !== undefined, 'Snapshot profitMargin is calculated');
assert(snap.returnRate >= 0, `Snapshot returnRate is non-negative (${snap.returnRate}%)`);
assert(snap.marketplaceBreakdown.amazon.revenue > 0, 'Amazon breakdown has positive revenue');
assert(snap.marketplaceBreakdown.flipkart.revenue > 0, 'Flipkart breakdown has positive revenue');
assert(snap.inventorySummary.totalAssetValue > 0, `Inventory totalAssetValue is positive (${snap.inventorySummary.totalAssetValue})`);

// -------------------------------------------------------------
// Suite 2: Mock AI Semantic Pattern Matcher (Phase 9B)
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Mock AI Semantic Engine & Query Matchers (copilotService.ts)\x1b[0m');

// Intent 1: Profit Drop
const profitResponse = runMockAiEngine('Why did my profit drop this week?', contextPayload);
assert(profitResponse.includes('Profit & Margin Analysis'), 'Profit drop query triggers Profit & Margin Analysis');
assert(profitResponse.includes('Customer Returns & Refund Drag'), 'Includes returns and refund attribution');
assert(profitResponse.includes('Marketplace Deductions'), 'Includes marketplace fees deduction analysis');
assert(profitResponse.includes('Amazon India') && profitResponse.includes('Flipkart'), 'Includes channel contrast in profit analysis');

// Intent 2: Stockout / Inventory Risk
const stockoutResponse = runMockAiEngine('Which SKUs are at immediate risk of stocking out?', contextPayload);
assert(stockoutResponse.includes('Stockout') || stockoutResponse.includes('Inventory'), 'Stockout query triggers inventory risk analysis');
assert(stockoutResponse.includes('Capital Reorder Requirement') || stockoutResponse.includes('Working Capital'), 'Includes reorder capital requirement');

// Intent 3: Marketplace Comparison
const comparisonResponse = runMockAiEngine('Compare my Amazon vs. Flipkart net margins.', contextPayload);
assert(comparisonResponse.includes('Amazon India vs. Flipkart'), 'Triggers side-by-side marketplace contrast');
assert(comparisonResponse.includes('| Metric | Amazon India | Flipkart |'), 'Renders Markdown contrast table');
assert(comparisonResponse.includes('Margin Arbitrage') || comparisonResponse.includes('Strategic Takeaways'), 'Includes strategic channel advice');

// Intent 4: Supplier Restock Email Draft
const emailResponse = runMockAiEngine('Draft a supplier restock email for critical items.', contextPayload);
assert(emailResponse.includes('Ready-to-Send Supplier Restock Requisition Email'), 'Triggers supplier restock email generator');
assert(emailResponse.includes('Subject: URGENT / Purchase Order Restock Requisition'), 'Includes formal purchase order subject line');
assert(emailResponse.includes('```text'), 'Wraps email template in code block for easy copying');
assert(emailResponse.includes('Estimated PO Value'), 'Cites estimated purchase order capital');

// Intent 5: Dead Stock Audit
const deadStockResponse = runMockAiEngine('What is my trapped capital in dead stock?', contextPayload);
assert(deadStockResponse.includes('Dead Stock') || deadStockResponse.includes('Working Capital Liquidity'), 'Triggers dead stock audit');
assert(deadStockResponse.includes('Recommended Liquidation Strategy') || deadStockResponse.includes('Zero SKUs'), 'Provides liquidation guidance');

// Intent 6: Executive Brief
const execResponse = runMockAiEngine('Give me an executive summary of how my store is doing.', contextPayload);
assert(execResponse.includes('Executive Store Status Brief'), 'Triggers executive store status brief');
assert(execResponse.includes('Topline Revenue') && execResponse.includes('Bottomline Profit'), 'Covers topline and bottomline metrics');

// Intent 7: Default Fallback
const fallbackResponse = runMockAiEngine('Hello, what can you do for me?', contextPayload);
assert(fallbackResponse.includes('SellerVault Copilot'), 'Triggers friendly grounded fallback');
assert(fallbackResponse.includes('Gross Sales') && fallbackResponse.includes('Net Profit'), 'Grounds fallback in store metrics');

// -------------------------------------------------------------
// Suite 3: Executive Narrative Generator (Phase 9D)
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Executive Narrative Generator (ExecutiveSummaryCard.tsx)\x1b[0m');

const narrative = generateExecutiveNarrative(contextPayload);
assert(Boolean(narrative) && narrative.length > 50, 'Generates non-empty narrative text');
assert(narrative.includes('gross revenue'), 'Narrative references gross revenue');
assert(narrative.includes('Net operating profit'), 'Narrative references net operating profit');
assert(narrative.includes('operating margin'), 'Narrative references operating margin');

const sentences = narrative.split('. ').filter((s) => s.trim().length > 0);
assert(sentences.length >= 3, `Narrative consists of 3 distinct analytical sentences (got ${sentences.length})`);

// -------------------------------------------------------------
// Suite 4: Asynchronous Dispatch & BYOK Fallback
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Dispatcher & Prompt Grounding (copilotService.ts)\x1b[0m');

const systemPrompt = buildSystemPrompt(contextPayload.markdown);
assert(systemPrompt.includes('SellerVault Store Copilot'), 'System prompt defines role persona');
assert(systemPrompt.includes('Indian Rupees (₹)'), 'System prompt specifies INR formatting');
assert(systemPrompt.includes('Store Grounding Context'), 'System prompt contains grounded store context');

const messages: ChatMessage[] = [
  {
    id: 'u1',
    role: 'user',
    content: 'Why did my profit drop this week?',
    timestamp: '12:00 PM'
  }
];

const storedConfig = getStoredCopilotConfig();
assert(storedConfig.provider !== undefined, 'getStoredCopilotConfig returns valid default provider');

const dispatchResult = await sendCopilotMessage(messages, contextPayload, { provider: 'mock' });
assert(dispatchResult.role === 'assistant', 'sendCopilotMessage returns assistant role');
assert(dispatchResult.providerUsed === 'Mock AI Engine', 'Provider label is Mock AI Engine');
assert(dispatchResult.content.includes('Profit & Margin Analysis'), 'Dispatches to profit analysis correctly');

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  console.error('\x1b[31m✗ SOME COPILOT VALIDATIONS FAILED!\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m✓ ALL COPILOT VALIDATIONS PASSED!\x1b[0m\n');
}
