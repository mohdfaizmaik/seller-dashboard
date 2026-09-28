import {
  calculateAdvertisingSummary,
  exportCampaignsCsv,
  exportSkuAdEfficiencyCsv,
  saveCampaignOverride,
  getStoredCampaignOverrides,
  DEFAULT_AD_CAMPAIGNS
} from '../../src/services/advertising/advertisingService';
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
console.log('║   Phase 12: Advertising & Marketing ROI Engine (ROAS & TACoS) Validation       ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════╝\x1b[0m\n');

// -------------------------------------------------------------
// Suite 1: Mathematical Accuracy of Marketing Formulas
// -------------------------------------------------------------
console.log('\x1b[1m1. Mathematical Accuracy of Advertising & Marketing Formulas\x1b[0m');

const summary = calculateAdvertisingSummary(MOCK_ORDERS);

// Test individual campaign metrics in default catalog
const boatCampaign = DEFAULT_AD_CAMPAIGNS.find((c) => c.id === 'CAMP-AZ-SP-01')!;
assert(boatCampaign !== undefined, 'boAt Rockerz campaign exists in defaults');
const boatCalculatedAcos = Number(((boatCampaign.adSpend / boatCampaign.adSales) * 100).toFixed(2));
const boatCalculatedRoas = Number((boatCampaign.adSales / boatCampaign.adSpend).toFixed(2));
assert(boatCampaign.acos === boatCalculatedAcos, `boAt ACoS matches Spend/Sales: ${boatCampaign.acos}% === ${boatCalculatedAcos}%`);
assert(boatCampaign.roas === boatCalculatedRoas, `boAt ROAS matches Sales/Spend: ${boatCampaign.roas}x === ${boatCalculatedRoas}x`);

// Blended Portfolio KPIs
assert(summary.totalAdSpend > 0, `Total ad spend is positive (₹${summary.totalAdSpend})`);
assert(summary.totalAdSales > 0, `Total ad sales is positive (₹${summary.totalAdSales})`);
assert(summary.totalStoreRevenue >= summary.totalAdSales, 'Total store revenue is >= attributed ad sales');

const expectedBlendedAcos = Number(((summary.totalAdSpend / summary.totalAdSales) * 100).toFixed(2));
assert(summary.blendedAcos === expectedBlendedAcos, `Blended ACoS mathematically equals Total Ad Spend / Total Ad Sales (${summary.blendedAcos}%)`);

const expectedBlendedRoas = Number((summary.totalAdSales / summary.totalAdSpend).toFixed(2));
assert(summary.blendedRoas === expectedBlendedRoas, `Blended ROAS mathematically equals Total Ad Sales / Total Ad Spend (${summary.blendedRoas}x)`);

const expectedBlendedTacos = Number(((summary.totalAdSpend / summary.totalStoreRevenue) * 100).toFixed(2));
assert(summary.blendedTacos === expectedBlendedTacos, `Blended TACoS mathematically equals Total Ad Spend / Store Revenue (${summary.blendedTacos}%)`);

assert(summary.totalClicks > 0, 'Total clicks is positive');
assert(summary.totalImpressions > summary.totalClicks, 'Total impressions > total clicks');

const expectedBlendedCtr = Number(((summary.totalClicks / summary.totalImpressions) * 100).toFixed(2));
assert(summary.blendedCtr === expectedBlendedCtr, `Blended CTR matches Clicks / Impressions % (${summary.blendedCtr}%)`);

const expectedBlendedCpc = Number((summary.totalAdSpend / summary.totalClicks).toFixed(2));
assert(summary.blendedCpc === expectedBlendedCpc, `Blended CPC matches Total Spend / Clicks (₹${summary.blendedCpc})`);

const expectedBlendedCac = Number((summary.totalAdSpend / summary.totalStoreOrders).toFixed(2));
assert(summary.blendedCac === expectedBlendedCac, `Blended CAC matches Spend / Total Store Orders (₹${summary.blendedCac})`);

// -------------------------------------------------------------
// Suite 2: Organic vs. Paid Sales Split
// -------------------------------------------------------------
console.log('\n\x1b[1m2. Organic vs. Paid Sales Ratio & Attribution\x1b[0m');

const ratio = summary.organicVsPaidRatio;
assert(ratio.paidSales === summary.totalAdSales, 'Paid sales in ratio equals total ad sales');
assert(ratio.organicSales + ratio.paidSales === summary.totalStoreRevenue, 'Organic sales + Paid sales exactly equals total store revenue');
assert(Math.round(ratio.organicPct + ratio.paidPct) === 100, `Organic% (${ratio.organicPct}%) + Paid% (${ratio.paidPct}%) sum to 100%`);
assert(ratio.organicSales > 0, `Organic revenue is positive (₹${ratio.organicSales})`);
assert(ratio.paidPct > 0 && ratio.paidPct < 100, `Paid share is healthy: ${ratio.paidPct}%`);

// -------------------------------------------------------------
// Suite 3: Automated Ad Bleed Detection (ACoS > Gross Margin %)
// -------------------------------------------------------------
console.log('\n\x1b[1m3. Automated Ad Bleed Detection & SKU Attribution\x1b[0m');

assert(summary.skuEfficiencies.length === PRODUCTS_CATALOG.length, `SKU efficiency array covers all ${PRODUCTS_CATALOG.length} catalog products`);

// Verify Noise Smartwatch Ad Bleed
const noiseSku = summary.skuEfficiencies.find((s) => s.sku === 'NOISE-CFP3-SLV')!;
assert(noiseSku !== undefined, 'Noise ColorFit Pro 3 SKU analyzed');
assert(noiseSku.acos > noiseSku.grossMarginPct, `Noise ACoS (${noiseSku.acos}%) exceeds Gross Margin (${noiseSku.grossMarginPct}%)`);
assert(noiseSku.isAdBleed === true, 'Noise ColorFit Pro 3 correctly flagged as Ad Bleed');
assert(noiseSku.recommendation.includes('Ad Bleed!'), 'Noise SKU has actionable Ad Bleed recommendation');

// Verify Levi's Jeans Ad Bleed
const levisSku = summary.skuEfficiencies.find((s) => s.sku === 'LEVI-511-INDIGO')!;
assert(levisSku !== undefined, "Levi's 511 Denim SKU analyzed");
assert(levisSku.acos > levisSku.grossMarginPct, `Levi's ACoS (${levisSku.acos}%) exceeds Gross Margin (${levisSku.grossMarginPct}%)`);
assert(levisSku.isAdBleed === true, "Levi's 511 Denim correctly flagged as Ad Bleed");

// Verify Star Performers have NO Ad Bleed
const boatSku = summary.skuEfficiencies.find((s) => s.sku === 'BOAT-RK450-BLK')!;
assert(boatSku !== undefined, 'boAt Rockerz 450 SKU analyzed');
assert(boatSku.isAdBleed === false, 'boAt Rockerz 450 is not flagged as Ad Bleed');
assert(boatSku.roas >= 4.5, `boAt Rockerz 450 has high ROAS (${boatSku.roas}x)`);
assert(boatSku.recommendation.includes('Star Performer!'), 'boAt SKU classified as Star Performer');

const bibaSku = summary.skuEfficiencies.find((s) => s.sku === 'BIBA-ANARKALI-RED')!;
assert(bibaSku !== undefined, 'Biba Anarkali Kurta SKU analyzed');
assert(bibaSku.isAdBleed === false, 'Biba Kurta is not flagged as Ad Bleed');
assert(bibaSku.roas >= 5.0, `Biba Kurta has excellent ROAS (${bibaSku.roas}x)`);

assert(summary.adBleedCount >= 2, `Portfolio detected at least 2 ad bleed items (found ${summary.adBleedCount})`);

// -------------------------------------------------------------
// Suite 4: Money Pit Detection (Spend with Zero Sales)
// -------------------------------------------------------------
console.log('\n\x1b[1m4. Money Pit Campaign Identification\x1b[0m');

const moneyPitCamp = summary.campaigns.find((c) => c.efficiencyTier === 'money_pit')!;
assert(moneyPitCamp !== undefined, 'Money pit campaign identified in portfolio');
assert(moneyPitCamp.adSpend > 1000, `Money pit has substantial spend (₹${moneyPitCamp.adSpend})`);
assert(moneyPitCamp.adSales === 0, 'Money pit has exactly zero attributed ad sales');
assert(moneyPitCamp.orders === 0, 'Money pit has zero orders');
assert(summary.moneyPitSpend >= 4000, `Portfolio tracks total money pit spend (₹${summary.moneyPitSpend})`);

// -------------------------------------------------------------
// Suite 5: Multi-Channel Marketing Breakdown (Amazon vs Flipkart vs Meesho)
// -------------------------------------------------------------
console.log('\n\x1b[1m5. Multi-Channel Marketing Breakdown & Contrasts\x1b[0m');

const az = summary.platformBreakdown.amazon;
const fk = summary.platformBreakdown.flipkart;
const ms = summary.platformBreakdown.meesho;

assert(az.adSpend > 0, `Amazon ad spend is positive (₹${az.adSpend})`);
assert(az.adSales > 0, `Amazon ad sales is positive (₹${az.adSales})`);
assert(az.activeCampaignsCount > 0, 'Amazon has active campaigns');

assert(fk.adSpend > 0, `Flipkart ad spend is positive (₹${fk.adSpend})`);
assert(fk.adSales > 0, `Flipkart ad sales is positive (₹${fk.adSales})`);
assert(fk.activeCampaignsCount > 0, 'Flipkart has active campaigns');

assert(ms.adSpend > 0, `Meesho ad spend is positive (₹${ms.adSpend})`);
assert(ms.adSales > 0, `Meesho ad sales is positive (₹${ms.adSales})`);
assert(ms.activeCampaignsCount > 0, 'Meesho has active campaigns');

// Channel Efficiency Assertions
assert(ms.cpc < az.cpc, `Meesho CPC (₹${ms.cpc}) is lower than Amazon CPC (₹${az.cpc})`);
assert(ms.roas > az.roas, `Meesho ROAS (${ms.roas}x) is higher than Amazon ROAS (${az.roas}x)`);
assert(az.adSpend + fk.adSpend + ms.adSpend === summary.totalAdSpend, 'Sum of channel spend equals total portfolio spend');

// Platform Filter Isolation
const amazonOnlySummary = calculateAdvertisingSummary(MOCK_ORDERS, { platform: 'amazon' });
assert(amazonOnlySummary.campaigns.every((c) => c.platform === 'amazon'), 'Platform filter restricts campaigns to Amazon only');
assert(amazonOnlySummary.totalAdSpend === az.adSpend, 'Filtered Amazon spend matches breakdown spend');

// -------------------------------------------------------------
// Suite 6: Campaign Status Toggles & Persistence Overrides
// -------------------------------------------------------------
console.log('\n\x1b[1m6. Campaign Status Toggles & Local Storage Overrides\x1b[0m');

// Mock localStorage in Node environment
const mockStorage: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  length: 0
};

// Initial state: no overrides
assert(Object.keys(getStoredCampaignOverrides()).length === 0, 'Initially no campaign overrides');

// Pause a high-spend campaign
const testCampId = 'CAMP-AZ-SP-03'; // Noise Smartwatch campaign (ad spend ₹29,500)
const initialSpend = summary.totalAdSpend;
saveCampaignOverride(testCampId, 'paused');

assert(getStoredCampaignOverrides()[testCampId] === 'paused', 'Campaign override persisted in storage');

// Recalculate with override active
const summaryAfterPause = calculateAdvertisingSummary(MOCK_ORDERS);
const pausedCamp = summaryAfterPause.campaigns.find((c) => c.id === testCampId)!;
assert(pausedCamp.status === 'paused', 'Campaign status reflected as paused');
assert(summaryAfterPause.totalAdSpend < initialSpend, `Total ad spend reduced after pausing (₹${summaryAfterPause.totalAdSpend} < ₹${initialSpend})`);
assert(summaryAfterPause.totalAdSpend === initialSpend - 29500, `Spend reduced exactly by paused campaign spend`);

// Resume campaign
saveCampaignOverride(testCampId, 'active');
const summaryAfterResume = calculateAdvertisingSummary(MOCK_ORDERS);
assert(summaryAfterResume.totalAdSpend === initialSpend, 'Total ad spend restored after resuming campaign');

// Reset mock storage
(globalThis as unknown as { localStorage: Storage }).localStorage.clear();

// -------------------------------------------------------------
// Suite 7: One-Click CSV Export Formats
// -------------------------------------------------------------
console.log('\n\x1b[1m7. One-Click CSV Export Generators\x1b[0m');

const campaignsCsv = exportCampaignsCsv(summary);
assert(campaignsCsv.includes('Campaign ID,Campaign Name,Platform,Campaign Type,Targeting,Status'), 'Campaigns CSV contains correct header structure');
assert(campaignsCsv.includes('CAMP-AZ-SP-01'), 'Campaigns CSV contains boAt campaign ID');
assert(campaignsCsv.includes('CAMP-FK-PLA-01'), 'Campaigns CSV contains Prestige Flipkart campaign ID');
assert(campaignsCsv.includes('CAMP-MS-BOOST-01'), 'Campaigns CSV contains Meesho Boost campaign ID');
const campaignCsvLines = campaignsCsv.trim().split('\n');
assert(campaignCsvLines.length === DEFAULT_AD_CAMPAIGNS.length + 1, `CSV contains ${DEFAULT_AD_CAMPAIGNS.length} rows + 1 header`);

const skuCsv = exportSkuAdEfficiencyCsv(summary);
assert(skuCsv.includes('SKU,Product Name,Channel,Selling Price (INR),COGS (INR),Gross Margin (%)'), 'SKU CSV contains correct header structure');
assert(skuCsv.includes('BOAT-RK450-BLK'), 'SKU CSV contains boAt Rockerz SKU');
assert(skuCsv.includes('NOISE-CFP3-SLV'), 'SKU CSV contains Noise Smartwatch SKU');
assert(skuCsv.includes('LEVI-511-INDIGO'), 'SKU CSV contains Levi SKU');
assert(skuCsv.includes('YES'), 'SKU CSV marks YES for ad bleed items');
assert(skuCsv.includes('NO'), 'SKU CSV marks NO for non-bleed items');

// -------------------------------------------------------------
// Suite 8: AI Copilot Context Builder Grounding
// -------------------------------------------------------------
console.log('\n\x1b[1m8. Store Copilot Context Builder Grounding\x1b[0m');

const context = buildStoreContext({ orders: MOCK_ORDERS, preset: '30d', platform: 'all' });
assert(context.markdown.includes('### 6. Advertising ROI, TACoS & Marketing Performance'), 'Context includes Advertising markdown section');
assert(context.snapshot.advertisingSummary !== undefined, 'Snapshot includes advertisingSummary');
assert((context.snapshot.advertisingSummary?.totalAdSpend ?? 0) > 0, 'Snapshot advertisingSummary contains ad spend');
assert((context.snapshot.advertisingSummary?.blendedRoas ?? 0) > 0, 'Snapshot advertisingSummary contains blended ROAS');
assert((context.snapshot.advertisingSummary?.adBleedCount ?? 0) >= 2, 'Snapshot advertisingSummary contains ad bleed count');
assert((context.snapshot.advertisingSummary?.moneyPitSpend ?? 0) > 0, 'Snapshot advertisingSummary contains money pit spend');
assert(context.tokenEstimate < 3000, `Token estimate (${context.tokenEstimate}) stays comfortably within 3000 limit`);

// -------------------------------------------------------------
// Suite 9: AI Copilot Semantic Intent Matching & Playbooks
// -------------------------------------------------------------
console.log('\n\x1b[1m9. AI Copilot Semantic Intent Matching & Playbooks\x1b[0m');

// Query 1: ROAS & TACoS query
const roasReply = runMockAiEngine('What is my ROAS and TACoS across marketing campaigns?', context);
assert(roasReply.includes('Advertising ROI & Marketing Attribution'), 'Copilot identifies advertising query');
assert(roasReply.includes('Blended ROAS'), 'Copilot cites Blended ROAS');
assert(roasReply.includes('Blended TACoS'), 'Copilot cites Blended TACoS');
assert(roasReply.includes('Customer Acquisition Cost'), 'Copilot cites CAC');

// Query 2: Ad Bleed query
const bleedReply = runMockAiEngine('Tell me about ad bleed and which products are losing money on ads', context);
assert(bleedReply.includes('Ad Bleed Alert'), 'Copilot highlights Ad Bleed alert in response');
assert(bleedReply.includes('Cut target bids by 25%'), 'Copilot delivers actionable bid reduction playbook');

// Query 3: Money Pit query
const pitReply = runMockAiEngine('Which advertising campaigns are money pits?', context);
assert(pitReply.includes('Money Pit Elimination'), 'Copilot addresses money pit campaigns');
assert(pitReply.includes('Pause these non-performing campaigns'), 'Copilot advises pausing zero-conversion campaigns');

// Query 4: Multi-Channel Marketing contrast
const campReply = runMockAiEngine('How are my ad campaigns performing on Amazon vs Meesho?', context);
assert(campReply.includes('Scale Star Performers'), 'Copilot advises scaling high-performing channels');

console.log('\n──────────────────────────────────────────────────────────────');
console.log(`Results: \x1b[32m${passedCount} passed\x1b[0m, \x1b[31m${failedCount} failed\x1b[0m`);
if (failedCount === 0) {
  console.log('\x1b[32m✓ ALL ADVERTISING & MARKETING ROI ENGINE VALIDATIONS PASSED!\x1b[0m\n');
} else {
  console.error('\x1b[31m✗ SOME TESTS FAILED!\x1b[0m\n');
  process.exit(1);
}
