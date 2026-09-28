import type { StoreContextPayload, StoreContextSnapshot } from './contextBuilder';
import { formatINR, formatPercent } from '../analyticsService';

export type CopilotProvider = 'mock' | 'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'custom';

export interface CopilotConfig {
  provider: CopilotProvider;
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  rememberOnDevice?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  providerUsed?: string;
}

const STORAGE_KEY = 'sellervault_copilot_config';

/**
 * Retrieves stored Copilot configuration from sessionStorage or localStorage.
 */
export function getStoredCopilotConfig(): CopilotConfig {
  try {
    const sessionVal = sessionStorage.getItem(STORAGE_KEY);
    if (sessionVal) {
      const parsed = JSON.parse(sessionVal) as CopilotConfig;
      if (parsed.provider !== 'mock' && parsed.model?.toLowerCase().includes('mock')) {
        parsed.model =
          parsed.provider === 'gemini'
            ? 'gemini-1.5-flash'
            : parsed.provider === 'deepseek'
            ? 'deepseek-chat'
            : parsed.provider === 'anthropic'
            ? 'claude-3-5-sonnet-20241022'
            : 'gpt-4o-mini';
      }
      return parsed;
    }

    const localVal = localStorage.getItem(STORAGE_KEY);
    if (localVal) {
      const parsed = JSON.parse(localVal) as CopilotConfig;
      if (parsed.provider !== 'mock' && parsed.model?.toLowerCase().includes('mock')) {
        parsed.model =
          parsed.provider === 'gemini'
            ? 'gemini-1.5-flash'
            : parsed.provider === 'deepseek'
            ? 'deepseek-chat'
            : parsed.provider === 'anthropic'
            ? 'claude-3-5-sonnet-20241022'
            : 'gpt-4o-mini';
      }
      return parsed;
    }
  } catch {
    // Fallback silently if storage unavailable
  }

  return {
    provider: 'mock'
  };
}

/**
 * Saves Copilot configuration securely in browser storage.
 */
export function saveStoredCopilotConfig(config: CopilotConfig): void {
  try {
    // Sanitize model before persisting
    const sanitizedConfig = { ...config };
    if (sanitizedConfig.provider !== 'mock' && sanitizedConfig.model?.toLowerCase().includes('mock')) {
      sanitizedConfig.model =
        sanitizedConfig.provider === 'gemini'
          ? 'gemini-1.5-flash'
          : sanitizedConfig.provider === 'deepseek'
          ? 'deepseek-chat'
          : sanitizedConfig.provider === 'anthropic'
          ? 'claude-3-5-sonnet-20241022'
          : 'gpt-4o-mini';
    }

    const serialized = JSON.stringify(sanitizedConfig);
    if (config.rememberOnDevice) {
      localStorage.setItem(STORAGE_KEY, serialized);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, serialized);
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Fallback silently if storage unavailable
  }
}

/**
 * Clears stored Copilot configuration and any stored API keys.
 */
export function clearStoredCopilotConfig(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fallback silently
  }
}

// -------------------------------------------------------------
// System Grounding Prompt
// -------------------------------------------------------------
export function buildSystemPrompt(contextMarkdown: string): string {
  return `You are SellerVault Store Copilot — an expert e-commerce financial analyst and operations advisor specializing in Indian online retail (Amazon India, Flipkart, Meesho).

YOUR OBJECTIVE:
Assist the seller by answering operational, inventory, fee reconciliation, and profitability questions. Ground every answer in the store data provided below.

INSTRUCTIONS:
1. Always cite exact numbers, percentages, and SKU codes from the provided Store Context block.
2. Format currency in Indian Rupees (₹) using commas (e.g. ₹1,16,285).
3. Be analytical, actionable, and concise. Avoid fluff.
4. When suggesting operational steps, provide clear, prioritized playbooks (e.g. restock POs, liquidation markdowns, return audits).

${contextMarkdown}
`;
}

// -------------------------------------------------------------
// Mock AI Semantic Pattern Matcher
// -------------------------------------------------------------
export function runMockAiEngine(query: string, payload: StoreContextPayload): string {
  const q = query.toLowerCase().trim();
  const s: StoreContextSnapshot = payload.snapshot;

  // Intent 1: Supplier Restock Email Draft (Specific Action)
  if (
    q.includes('draft') ||
    q.includes('email') ||
    q.includes('supplier') ||
    q.includes('vendor') ||
    q.includes('po email')
  ) {
    const items = s.criticalSkus.length > 0 ? s.criticalSkus : [
      { sku: 'DEMO-SKU-01', name: 'Fast Moving Core Item', reorderQty: 100, reorderPoValue: 45000, doi: 5, available: 12, vDaily: 3.5, urgency: 'CRITICAL_STOCKOUT_RISK' }
    ];

    const skuLines = items.map(
      (item) => `| ${item.sku} | ${item.name} | ${item.reorderQty} units | Immediate Dispatch |`
    );

    return [
      `### ✉️ Ready-to-Send Supplier Restock Requisition Email`,
      `Copy and paste the template below to send to your contract manufacturer or distributor:`,
      ``,
      `\`\`\`text`,
      `Subject: URGENT / Purchase Order Restock Requisition - Priority Replenishment`,
      ``,
      `Dear Supplier / Fulfillment Partner,`,
      ``,
      `We are placing an expedited restock purchase order for our inventory fulfillment hubs. Due to elevated sales velocity, our available warehouse stock on the following SKUs is approaching critical thresholds:`,
      ``,
      `| SKU Code | Product Name | Order Quantity | Target Dispatch |`,
      `| :--- | :--- | :--- | :--- |`,
      ...skuLines,
      ``,
      `Total Estimated PO Value: ${formatINR(s.inventorySummary.totalReorderPoValue > 0 ? s.inventorySummary.totalReorderPoValue : 45000)}`,
      ``,
      `Dispatch Instructions:`,
      `- Please confirm inventory allocation and invoice within 24 business hours.`,
      `- Ensure all carton master labels include standard SKU barcodes.`,
      `- Deliveries should be routed directly to our designated hub.`,
      ``,
      `Thank you for your prompt confirmation.`,
      ``,
      `Best regards,`,
      `Operations & Inventory Command`,
      `SellerVault Store Merchant`,
      `\`\`\``
    ].join('\n');
  }

  // Intent 2: Amazon vs Flipkart vs Meesho Marketplace Comparison
  if (
    !q.includes('ad ') &&
    !q.includes('ads') &&
    !q.includes('advertising') &&
    !q.includes('campaign') &&
    !q.includes('roas') &&
    !q.includes('tacos') &&
    !q.includes('acos') &&
    (
      q.includes('amazon vs flipkart') ||
      q.includes('flipkart vs amazon') ||
      q.includes('meesho') ||
      q.includes('compare') ||
      q.includes('vs.') ||
      q.includes('vs ') ||
      q.includes('channels') ||
      q.includes('channel') ||
      q.includes('marketplace')
    )
  ) {
    const az = s.marketplaceBreakdown.amazon;
    const fk = s.marketplaceBreakdown.flipkart;
    const ms = s.marketplaceBreakdown.meesho;

    const channels = [
      { name: 'Amazon India', stats: az },
      { name: 'Flipkart', stats: fk },
      { name: 'Meesho', stats: ms }
    ];

    const revenueLeader = [...channels].sort((a, b) => b.stats.revenue - a.stats.revenue)[0].name;
    const marginLeader = [...channels].sort((a, b) => b.stats.margin - a.stats.margin)[0].name;

    return [
      `### ⚖️ Multi-Marketplace Contrast: Amazon India vs. Flipkart vs. Meesho`,
      `Here is a tri-channel performance contrast based on your active orders:`,
      ``,
      `| Metric | Amazon India | Flipkart | Meesho | Leading Channel |`,
      `| :--- | :--- | :--- | :--- | :--- |`,
      `| **Gross Revenue** | ${formatINR(az.revenue)} | ${formatINR(fk.revenue)} | ${formatINR(ms.revenue)} | ${revenueLeader} |`,
      `| **Net Realized Sales** | ${formatINR(az.netSales)} | ${formatINR(fk.netSales)} | ${formatINR(ms.netSales)} | - |`,
      `| **Net Operating Profit** | ${formatINR(az.netProfit)} | ${formatINR(fk.netProfit)} | ${formatINR(ms.netProfit)} | - |`,
      `| **Net Profit Margin** | **${formatPercent(az.margin)}** | **${formatPercent(fk.margin)}** | **${formatPercent(ms.margin)}** | **${marginLeader}** |`,
      `| **Fulfilled Orders** | ${az.orders} | ${fk.orders} | ${ms.orders} | - |`,
      `| **Customer Return Rate** | ${formatPercent(az.returnRate)} | ${formatPercent(fk.returnRate)} | ${formatPercent(ms.returnRate)} | - |`,
      `| **Cancellations** | ${formatPercent(az.cancellationRate)} | ${formatPercent(fk.cancellationRate)} | ${formatPercent(ms.cancellationRate)} | - |`,
      `| **Commission Structure** | 15% + ₹20 | 12% + ₹15 | **0% + ₹0** | Meesho 0% Fee |`,
      ``,
      `**Strategic Takeaways:**`,
      `1. **Meesho Zero-Commission Margin:** Meesho incurs ₹0 referral fees and ₹0 closing fees, providing superior unit economics on delivered orders.`,
      `2. **COD Return & RTO Mitigation:** Because Meesho volume is predominantly Cash on Delivery (COD), maintain strict RTO monitoring to prevent reverse logistics fees from eroding commission savings.`,
      `3. **Channel Allocation:** Prioritize fast-moving, high-margin SKUs on ${marginLeader} and scale tier-2/3 catalog distribution on Meesho.`
    ].join('\n');
  }

  // Intent 3: Dead Stock / Stagnant Capital
  if (
    q.includes('dead stock') ||
    q.includes('stagnant') ||
    q.includes('slow moving') ||
    q.includes('liquidation') ||
    q.includes('trapped') ||
    q.includes('excess')
  ) {
    if (s.deadStockSkus.length === 0) {
      return [
        `### 💎 Working Capital Liquidity Health`,
        `Outstanding! **You currently have zero SKUs classified as Dead Stock.**`,
        `- Total Working Capital: **${formatINR(s.inventorySummary.totalAssetValue)}**`,
        `- Active Capital (Healthy Turnover): **${formatINR(s.inventorySummary.activeCapital)}**`,
        `Your inventory turnover velocity is optimal with healthy capital circulation.`
      ].join('\n');
    }

    const deadRows = s.deadStockSkus.map(
      (item, idx) =>
        `${idx + 1}. **${item.sku}** (${item.name})\n   - Idle Units: **${item.stock} units** | Locked Capital: **${formatINR(item.lockedValue)}**\n   - Runway: **${item.doi > 120 ? '>120 days' : `${item.doi} days`}**\n   - Playbook Action: *${item.playbookAction}*`
    );

    return [
      `### 🧊 Trapped Capital Audit: ${formatINR(s.inventorySummary.lockedDeadCapital)} Locked in Dead Stock`,
      `We identified **${s.inventorySummary.deadStockCount} SKUs** that have had negligible sales velocity for over 60 days:`,
      ``,
      ...deadRows,
      ``,
      `**Recommended Liquidation Strategy:**`,
      `1. **Flash Markdown:** Apply a 30-40% discount or marketplace coupon to clear inventory without triggering long-term storage fees.`,
      `2. **Bundle with High Velocity SKUs:** Pair slow-moving accessories with top-selling anchor items to increase basket size.`,
      `3. **Reinvest Liberated Cash:** Re-deploy the recovered ${formatINR(s.inventorySummary.lockedDeadCapital)} into your top restock priorities.`
    ].join('\n');
  }

  // Intent 4: Executive Brief / General Store Status
  if (
    q.includes('executive') ||
    q.includes('summary') ||
    q.includes('brief') ||
    q.includes('how is my store') ||
    q.includes('how my store is doing') ||
    q.includes('overview') ||
    q.includes('overall')
  ) {
    return [
      `### 📋 Executive Store Status Brief (${s.periodLabel})`,
      `- **Topline Revenue:** **${formatINR(s.totalRevenue)}** across **${s.orderCount} fulfilled orders** (${s.growth.revenueGrowth >= 0 ? '+' : ''}${s.growth.revenueGrowth.toFixed(1)}% revenue growth). Average Order Value is **${formatINR(s.aov)}**.`,
      `- **Bottomline Profit:** Realized **${formatINR(s.netProfit)} net operating profit** with a **${formatPercent(s.profitMargin)} net margin**.`,
      `- **Channel Breakdown:** Amazon India generated **${formatINR(s.marketplaceBreakdown.amazon.revenue)}** (${formatPercent(s.marketplaceBreakdown.amazon.margin)} margin); Flipkart generated **${formatINR(s.marketplaceBreakdown.flipkart.revenue)}** (${formatPercent(s.marketplaceBreakdown.flipkart.margin)} margin).`,
      `- **Supply Chain & Capital:** **${formatINR(s.inventorySummary.totalAssetValue)}** total inventory assets, with **${formatINR(s.inventorySummary.lockedDeadCapital)}** trapped in dead stock and **${formatINR(s.inventorySummary.totalReorderPoValue)}** required for imminent restocks.`,
      `- **Top Operational Priority:** ${s.criticalSkus.length > 0 ? `Expedite purchase orders for ${s.criticalSkus.length} critical SKUs (${s.criticalSkus[0]?.sku}) to prevent stockouts.` : 'Audit marketplace returns and optimize listing advertising spend.'}`
    ].join('\n');
  }

  // Intent 5: Stockout / Inventory Reorder Risk
  if (
    q.includes('stockout') ||
    q.includes('out of stock') ||
    q.includes('reorder') ||
    q.includes('restock') ||
    (q.includes('runway') && !q.includes('cash')) ||
    q.includes('inventory risk') ||
    q.includes('critical') ||
    q.includes('immediate risk')
  ) {
    if (s.criticalSkus.length === 0) {
      return [
        `### 📦 Inventory Velocity & Stockout Audit`,
        `Good news! **None of your catalog items are currently at immediate stockout risk.**`,
        ``,
        `- Total Warehouse Asset Value: **${formatINR(s.inventorySummary.totalAssetValue)}**`,
        `- Active Working Capital: **${formatINR(s.inventorySummary.activeCapital)}**`,
        `- Reorder PO Requirement: **${formatINR(s.inventorySummary.totalReorderPoValue)}**`,
        ``,
        `All active SKUs have sufficient runway covering their supplier lead time and safety stock buffer.`
      ].join('\n');
    }

    const skuRows = s.criticalSkus.map(
      (item, idx) =>
        `${idx + 1}. **${item.sku}** (${item.name})\n   - Available Stock: **${item.available} units** (Runway: **${item.doi} days**)\n   - Sales Velocity: **${item.vDaily} units/day**\n   - Recommended Reorder: **+${item.reorderQty} units** (PO Cost: **${formatINR(item.reorderPoValue)}**)\n   - Urgency Status: \`${item.urgency}\``
    );

    return [
      `### ⚠️ Immediate Stockout Alert (${s.criticalSkus.length} SKUs Critical)`,
      `Our velocity-driven Days of Inventory (DOI) forecast has identified **${s.criticalSkus.length} items at imminent stockout risk** where current available stock will exhaust before replenishment can arrive:`,
      ``,
      ...skuRows,
      ``,
      `**Capital Reorder Requirement:**`,
      `You need **${formatINR(s.inventorySummary.totalReorderPoValue)} in Purchase Order capital** to replenish these items and preserve your search ranking on Amazon and Flipkart.`,
      ``,
      `*Tip: Type "Draft supplier restock email" to automatically generate a formal Purchase Order requisition for these SKUs.*`
    ].join('\n');
  }

  // Intent 5.5: Indian GST Tax & Compliance / TCS / ITC Audit
  if (
    q.includes('gst') ||
    q.includes('tax') ||
    q.includes('tcs') ||
    q.includes('itc') ||
    q.includes('input tax') ||
    q.includes('gstr') ||
    q.includes('compliance')
  ) {
    const t = s.taxSummary || {
      outputGst: 14250,
      igst: 11400,
      cgst: 1425,
      sgst: 1425,
      eligibleItc: 9800,
      cogsItc: 7200,
      platformServicesItc: 2600,
      tcsWithheld: 793,
      netCashTaxPayable: 3657,
      excessCredit: 0
    };

    return [
      `### 🏛️ Indian GST Tax & Compliance Audit (${s.periodLabel})`,
      `Here is your statutory GST liability, Input Tax Credit (ITC) offset, and Section 52 TCS reconciliation:`,
      ``,
      `| Compliance Item | Liability / Offset | Status | Statutory Classification |`,
      `| :--- | :--- | :--- | :--- |`,
      `| **Total Output GST Liability** | **${formatINR(t.outputGst)}** | Payable | GSTR-1 Outward Supplies (IGST: ${formatINR(t.igst)}, CGST+SGST: ${formatINR(t.cgst + t.sgst)}) |`,
      `| **Less: COGS Procurement ITC** | -${formatINR(t.cogsItc)} | Claimable Credit | GST paid to manufacturers / distributors |`,
      `| **Less: Platform Services & Logistics ITC** | -${formatINR(t.platformServicesItc)} | Claimable Credit | 18% GST charged on Amazon, Flipkart & Meesho invoices |`,
      `| **Less: Section 52 Marketplace TCS** | -${formatINR(t.tcsWithheld)} | Electronic Cash Ledger | 1% withheld by platforms on net sales |`,
      `| **Net GST Cash Tax Outflow** | **${formatINR(t.netCashTaxPayable)}** | **Net Payment Due** | **Payable via GST Challan PMT-06** |`,
      ``,
      `**Key Filing & Cash Flow Recommendations:**`,
      `1. **Claim Full Marketplace ITC:** Ensure your accountant claims the ${formatINR(t.platformServicesItc)} in marketplace service fee GST invoices. Amazon, Flipkart, and Meesho issue GST invoices every month under SAC 9983.`,
      `2. **Accept Section 52 TCS in Cash Ledger:** You have ${formatINR(t.tcsWithheld)} withheld in platform escrow. Accept these under *TDS and TCS Credit Received* on the GST portal to offset cash taxes.`,
      `3. **GSTR-1 Ready:** You can download one-click filing-ready CSVs for B2CS (Place of Supply) and HSN Table 12 directly from the **GST & Compliance** tab.`
    ].join('\n');
  }

  // Intent 5.8: Advertising, ROAS, TACoS & Ad Bleed Analysis
  if (
    q.includes('roas') ||
    q.includes('tacos') ||
    q.includes('acos') ||
    q.includes('ad bleed') ||
    q.includes('bleed') ||
    q.includes('ad ') ||
    q.includes('ads') ||
    q.includes('advertising') ||
    q.includes('marketing') ||
    q.includes('campaign') ||
    q.includes('cac')
  ) {
    const a = s.advertisingSummary || {
      totalAdSpend: 47279,
      totalAdSales: 198905,
      blendedRoas: 4.21,
      blendedAcos: 23.77,
      blendedTacos: 11.45,
      blendedCac: 42.50,
      adBleedCount: 2,
      moneyPitSpend: 4000
    };

    return [
      `### 🎯 Advertising ROI & Marketing Attribution (${s.periodLabel})`,
      `Here is your multi-channel marketing performance, ROAS/TACoS efficiency, and Ad Bleed diagnosis:`,
      ``,
      `| Marketing Metric | Performance | Health Status | Benchmark Target |`,
      `| :--- | :--- | :--- | :--- |`,
      `| **Total Ad Spend** | **${formatINR(a.totalAdSpend)}** | Active Investment | Allocated across Amazon, Flipkart & Meesho |`,
      `| **Attributed Ad Sales** | **${formatINR(a.totalAdSales)}** | Revenue Driven | Direct 7-day click attribution |`,
      `| **Blended ROAS** | **${a.blendedRoas}x** | ${a.blendedRoas >= 4.0 ? '✅ High Return' : '⚠️ Sub-optimal'} | Target: ≥ 4.0x |`,
      `| **Blended ACoS** | **${a.blendedAcos}%** | ${a.blendedAcos <= 25 ? '✅ Healthy Cost' : '⚠️ High Cost'} | Target: < 25.0% |`,
      `| **Blended TACoS** | **${a.blendedTacos}%** | ${a.blendedTacos <= 15 ? '✅ Safe Dependency' : '🚨 High Dependency'} | Target: < 15.0% |`,
      `| **Customer Acquisition Cost** | **${formatINR(a.blendedCac)}** / order | Paid Efficiency | Benchmark: < ₹60 / unit |`,
      ``,
      `**Critical Advertising Insights & Action Playbook:**`,
      `1. **Ad Bleed Alert (${a.adBleedCount} SKUs):** Detected ${a.adBleedCount} products where ACoS exceeds product gross margin. Cut target bids by 25% or pause non-converting broad keywords immediately.`,
      `2. **Money Pit Elimination:** Identified **${formatINR(a.moneyPitSpend)}** spent on campaigns with zero conversions. Pause these non-performing campaigns via the **Ad ROI & Marketing** command center.`,
      `3. **Scale Star Performers:** High-ROAS campaigns on Meesho (6.0x) and Amazon Exact Match (5.2x) have remaining search volume. Scale daily budgets by 20% to capture incremental top-of-search placements.`
    ].join('\n');
  }

  // Intent 5.9: Customer Returns, RTO Drag & NDR Intelligence
  if (
    q.includes('rto') ||
    q.includes('return') ||
    q.includes('returns') ||
    q.includes('ndr') ||
    q.includes('fake attempt') ||
    q.includes('courier') ||
    q.includes('delhivery') ||
    q.includes('cod return') ||
    q.includes('reverse')
  ) {
    const r = s.returnsSummary || {
      totalReturnLoss: 14250,
      blendedReturnRate: 13.0,
      rtoCount: 64,
      rtoRate: 8.0,
      customerReturnCount: 40,
      customerReturnRate: 5.0,
      codReturnRate: 18.5,
      prepaidReturnRate: 5.2,
      codRiskMultiplier: 3.6,
      pendingNdrCount: 3,
      topLossCourier: 'Delhivery'
    };

    return [
      `### 🔄 Customer Returns, RTO Drag & NDR Intelligence (${s.periodLabel})`,
      `Here is your root-cause return audit, reverse logistics drag, and courier delivery performance:`,
      ``,
      `| Returns & RTO Metric | Performance | Health Status | Benchmark Target |`,
      `| :--- | :--- | :--- | :--- |`,
      `| **Total Return Cash Loss** | **${formatINR(r.totalReturnLoss)}** | Unrecoverable Leak | Reverse freight + damaged goods write-offs |`,
      `| **Blended Return Rate** | **${r.blendedReturnRate}%** | ${r.blendedReturnRate <= 12 ? '✅ Healthy Velocity' : '⚠️ Elevated Returns'} | Target: < 12.0% |`,
      `| **RTO Door Rejections** | **${r.rtoCount} orders (${r.rtoRate}%)** | Courier Returns | Failed delivery before customer received |`,
      `| **Customer Returns (CIR)** | **${r.customerReturnCount} orders (${r.customerReturnRate}%)** | Delivered & Returned | Quality, sizing, or buyer remorse |`,
      `| **COD vs. Prepaid Disparity** | **${r.codRiskMultiplier}x Higher Risk** | 🚨 Critical Gap | COD: ${r.codReturnRate}% vs. Prepaid: ${r.prepaidReturnRate}% |`,
      `| **Pending NDR Action Items** | **${r.pendingNdrCount} Pending Cases** | Urgent Intervention | Orders stuck in failed delivery attempt |`,
      ``,
      `**Critical RTO Reduction & Profit Recovery Playbook:**`,
      `1. **Intervene on ${r.pendingNdrCount} Pending NDRs:** Initiate instant WhatsApp address confirmation before couriers trigger permanent RTO door rejections.`,
      `2. **Tame COD Fraud & Disparity:** Because COD returns run at ${r.codReturnRate}% (${r.codRiskMultiplier}x prepaid), mandate a ₹50 pre-dispatch confirmation deposit or phone OTP verification for COD orders above ₹1,500.`,
      `3. **Courier Accountability:** Audit carriers with high fake-attempt rates via the **Returns & RTO Shield** scorecard and demand freight credit waivers on unattempted deliveries.`
    ].join('\n');
  }

  // Intent 5.10: Cash Flow Runway, Working Capital & Liquidity Forecasting
  if (
    q.includes('cash flow') ||
    q.includes('cashflow') ||
    q.includes('runway') ||
    q.includes('liquidity') ||
    q.includes('disbursement') ||
    q.includes('payout') ||
    q.includes('burn rate') ||
    q.includes('burn') ||
    q.includes('trough') ||
    q.includes('working capital')
  ) {
    const c = s.cashflowSummary || {
      currentCash: 350000,
      inflows30d: 580000,
      outflows30d: 495000,
      netCash30d: 85000,
      projectedBalance90d: 510000,
      minTroughBalance: 245000,
      troughDate: '2026-08-25',
      runwayDays: 999,
      runwayStatus: 'healthy',
      upcomingPayables30d: 495000
    };

    return [
      `### 💰 Cash Flow Runway & Working Capital Forecast (${s.periodLabel})`,
      `Here is your 30/60/90-day liquidity status, marketplace payout pipeline, and working capital forecast:`,
      ``,
      `| Liquidity & Cash Flow Metric | Value | Status | Notes |`,
      `| :--- | :--- | :--- | :--- |`,
      `| **Current Liquid Cash Reserve** | **${formatINR(c.currentCash)}** | Bank Reserve | Active bank balance available for operations |`,
      `| **30-Day Net Cash Flow** | **${c.netCash30d >= 0 ? '+' : ''}${formatINR(c.netCash30d)}** | ${c.netCash30d >= 0 ? '✅ Cash Flow Positive' : '⚠️ Net Cash Burn'} | Inflows: ${formatINR(c.inflows30d)} vs Outflows: ${formatINR(c.outflows30d)} |`,
      `| **Liquid Cash Runway** | **${c.runwayDays >= 900 ? '>90 Days (Self-Sustaining)' : `${c.runwayDays} Days`}** | ${c.runwayStatus === 'healthy' ? '✅ Healthy Runway' : c.runwayStatus === 'caution' ? '⚠️ Caution (Buffer Watch)' : '🚨 Critical Crunch'} | Days until bank balance depletion |`,
      `| **90-Day Minimum Cash Trough** | **${formatINR(c.minTroughBalance)}** | ${c.minTroughBalance >= 100000 ? '✅ Above ₹1L Buffer' : '⚠️ Breaches Safety Buffer'} | Lowest point occurs on **${c.troughDate}** |`,
      `| **Upcoming 30D Payables** | **${formatINR(c.upcomingPayables30d)}** | Committed Outflows | Scheduled GST challans, supplier restock POs & ads |`,
      ``,
      `**Working Capital & Treasury Optimization Playbook:**`,
      `1. **Pacing Outflows Ahead of ${c.troughDate}:** Your lowest cash reserve occurs on **${c.troughDate}** due to overlapping supplier PO disbursements and the 20th GST challan deadline.`,
      `2. **Renegotiate Supplier Credit Terms:** Extending supplier credit terms from 15 to 30 days pushes restock outflows out, significantly raising your cash trough.`,
      `3. **Marketplace Escrow Optimization:** Monitor Amazon's 7-day reserve holdback and Flipkart weekly payouts in the **Cash Flow & Runway** command center to prevent cash flow timing bottlenecks.`
    ].join('\n');
  }

  // Intent 6: Profit Drop / Margin Analysis
  if (
    q.includes('profit') ||
    q.includes('margin') ||
    q.includes('drop') ||
    q.includes('loss') ||
    q.includes('fell') ||
    q.includes('down') ||
    q.includes('decrease')
  ) {
    const parts = [
      `### 📊 Profit & Margin Analysis (${s.periodLabel})`,
      `Your current **Net Operating Profit is ${formatINR(s.netProfit)}** at a **${formatPercent(s.profitMargin)} net margin** across ${s.orderCount} fulfilled orders (${s.growth.profitGrowth >= 0 ? '+' : ''}${s.growth.profitGrowth.toFixed(1)}% vs previous period).`,
      ``,
      `**Primary Drivers Influencing Your Bottom Line:**`,
      `1. **Customer Returns & Refund Drag:** You have incurred **${formatINR(s.refundedValue)}** in customer refunds across ${s.returnedCount} returned orders (${formatPercent(s.returnRate)} return rate). High return rates significantly erode net profit due to reverse shipping penalties and unrecoverable packing expenses.`,
      `2. **Marketplace Deductions:** Referral fees, closing fees, and logistics charges totaled **${formatINR(s.marketplaceFees)}** (${formatPercent(s.totalRevenue > 0 ? (s.marketplaceFees / s.totalRevenue) * 100 : 0)} of gross revenue).`,
      `3. **Cost of Goods Sold (COGS):** Total inventory production/procurement cost was **${formatINR(s.cogs)}** (${formatPercent(s.totalRevenue > 0 ? (s.cogs / s.totalRevenue) * 100 : 0)} of gross revenue).`,
      ``,
      `**Channel Contrast:**`,
      `- **Amazon India:** Revenue ${formatINR(s.marketplaceBreakdown.amazon.revenue)} with **${formatPercent(s.marketplaceBreakdown.amazon.margin)} net margin** and ${formatPercent(s.marketplaceBreakdown.amazon.returnRate)} return rate.`,
      `- **Flipkart:** Revenue ${formatINR(s.marketplaceBreakdown.flipkart.revenue)} with **${formatPercent(s.marketplaceBreakdown.flipkart.margin)} net margin** and ${formatPercent(s.marketplaceBreakdown.flipkart.returnRate)} return rate.`,
      ``,
      `**Recommended Actions to Recover Margin:**`,
      `- **Audit High-Return SKUs:** Check return reasons (size mismatch, transit damage, or RTO courier delays) on items with >15% return rate.`,
      `- **Enforce Minimum Viable Price (MVP):** Ensure all SKUs maintain at least a 15% net operating margin after referral and weight handling deductions.`,
      `- **Reconcile Marketplace Fees:** Verify actual bank settlements against estimated fees to dispute inaccurate weight handling or return pick-pack charges.`
    ];

    return parts.join('\n');
  }

  // Fallback: Context-Grounded Conversational Synthesis
  return [
    `### 🤖 SellerVault Copilot`,
    `Here is a summary of your active store metrics for **${s.periodLabel}**:`,
    ``,
    `- **Gross Sales:** **${formatINR(s.totalRevenue)}** (${s.orderCount} orders)`,
    `- **Net Profit:** **${formatINR(s.netProfit)}** (**${formatPercent(s.profitMargin)}** margin)`,
    `- **Customer Returns:** **${s.returnedCount} orders** (${formatPercent(s.returnRate)}) representing **${formatINR(s.refundedValue)}** in refunded value`,
    `- **Inventory Status:** **${s.inventorySummary.criticalStockoutCount} SKUs** at immediate stockout risk; **${formatINR(s.inventorySummary.lockedDeadCapital)}** trapped in dead stock`,
    ``,
    `**You can ask me to:**`,
    `- *"Why did my profit drop this week?"* to analyze margin leakages.`,
    `- *"Which SKUs are at immediate risk of stocking out?"* to review inventory replenishment priorities.`,
    `- *"Compare my Amazon vs. Flipkart net margins"* for multi-marketplace contrast.`,
    `- *"Draft a supplier restock email for critical items"* to generate a ready-to-send PO requisition.`
  ].join('\n');
}

// -------------------------------------------------------------
// Executive Narrative Generator (Phase 9D)
// -------------------------------------------------------------
export function generateExecutiveNarrative(contextPayload: StoreContextPayload): string {
  const s = contextPayload.snapshot;

  // Sentence 1: Topline Trajectory
  const revGrowthStr = s.growth.revenueGrowth >= 0
    ? `growing +${s.growth.revenueGrowth.toFixed(1)}%`
    : `down ${s.growth.revenueGrowth.toFixed(1)}%`;
  const s1 = `For ${s.periodLabel}, your store generated ${formatINR(s.totalRevenue)} in gross revenue across ${s.orderCount} orders (${revGrowthStr} vs the prior comparative period).`;

  // Sentence 2: Bottomline Profitability & Channel Contrast
  const marginStr = `${s.profitMargin.toFixed(1)}%`;
  const azMargin = s.marketplaceBreakdown.amazon.margin.toFixed(1);
  const fkMargin = s.marketplaceBreakdown.flipkart.margin.toFixed(1);
  const s2 = `Net operating profit reached ${formatINR(s.netProfit)} at a ${marginStr} operating margin, with Amazon yielding a ${azMargin}% margin and Flipkart operating at a ${fkMargin}% margin.`;

  // Sentence 3: Operational Risk & Working Capital Focus
  let s3 = '';
  if (s.inventorySummary.criticalStockoutCount > 0) {
    s3 = `Immediate attention is required on ${s.inventorySummary.criticalStockoutCount} critical SKUs at stockout risk requiring ${formatINR(s.inventorySummary.totalReorderPoValue)} in replenishment capital, while ${formatINR(s.inventorySummary.lockedDeadCapital)} remains trapped in dead stock.`;
  } else if (s.inventorySummary.lockedDeadCapital > 0) {
    s3 = `Inventory runway remains healthy across fast movers, but ${formatINR(s.inventorySummary.lockedDeadCapital)} is immobilized in slow-moving dead stock that should be liquidated via targeted promotional bundles.`;
  } else {
    s3 = `Supply chain velocity remains balanced with optimal stock coverage and healthy return rates of ${s.returnRate.toFixed(1)}% across both fulfillment networks.`;
  }

  return `${s1} ${s2} ${s3}`;
}

// -------------------------------------------------------------
// Main Dispatcher: BYOK LLM Fetch with Mock Fallback
// -------------------------------------------------------------
export async function sendCopilotMessage(
  messages: ChatMessage[],
  contextPayload: StoreContextPayload,
  config?: CopilotConfig
): Promise<ChatMessage> {
  const activeConfig = config || getStoredCopilotConfig();
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
  const query = lastUserMessage?.content || '';

  // If no BYOK key or provider is mock, run local semantic engine
  if (!activeConfig.apiKey || activeConfig.provider === 'mock') {
    const content = runMockAiEngine(query, contextPayload);

    return {
      id: `copilot_${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'Mock AI Engine'
    };
  }

  // Dual-Mode BYOK: Real LLM Invocation
  const systemPrompt = buildSystemPrompt(contextPayload.markdown);

  try {
    if (activeConfig.provider === 'openai' || activeConfig.provider === 'deepseek' || activeConfig.provider === 'custom') {
      const baseUrl =
        activeConfig.customBaseUrl ||
        (activeConfig.provider === 'deepseek'
          ? 'https://api.deepseek.com/v1'
          : 'https://api.openai.com/v1');
      const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

      const defaultModel = activeConfig.provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o-mini';
      const rawModel = activeConfig.model?.trim();
      const model = rawModel && !rawModel.toLowerCase().includes('mock') ? rawModel : defaultModel;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeConfig.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content }))
          ],
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(errorData?.error?.message || `API returned status ${response.status}`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content || 'No response generated.';

      return {
        id: `copilot_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: `${activeConfig.provider.toUpperCase()} (${model})`
      };
    }

    if (activeConfig.provider === 'anthropic') {
      const rawModel = activeConfig.model?.trim();
      const model = rawModel && !rawModel.toLowerCase().includes('mock') ? rawModel : 'claude-3-5-sonnet-20241022';
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeConfig.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
          })),
          max_tokens: 1500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(errorData?.error?.message || `Anthropic API status ${response.status}`);
      }

      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      const content = data.content?.[0]?.text || 'No response generated.';

      return {
        id: `copilot_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: `Anthropic (${model})`
      };
    }

    if (activeConfig.provider === 'gemini') {
      const defaultModel = 'gemini-1.5-flash';
      const rawModel = activeConfig.model?.trim();
      const model = rawModel && !rawModel.toLowerCase().includes('mock') ? rawModel : defaultModel;
      const apiKey = activeConfig.apiKey?.trim() || '';

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const formattedContents = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          contents: formattedContents,
          generationConfig: {
            temperature: 0.3
          }
        })
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(errorData?.error?.message || `Gemini API status ${response.status}`);
      }

      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const content =
        data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

      return {
        id: `copilot_${Date.now()}`,
        role: 'assistant',
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        providerUsed: `Google Gemini (${model})`
      };
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to communicate with LLM provider';
    console.warn('[Copilot] BYOK request failed, falling back to Mock AI:', errorMsg);

    const fallbackResponse = runMockAiEngine(query, contextPayload);
    return {
      id: `copilot_${Date.now()}`,
      role: 'assistant',
      content: `> ⚠️ **Provider Notice:** Unable to reach ${activeConfig.provider.toUpperCase()} (${errorMsg}). Showing local Mock AI analysis instead.\n\n${fallbackResponse}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      providerUsed: 'Mock AI (BYOK Fallback)'
    };
  }

  // Fallback
  return {
    id: `copilot_${Date.now()}`,
    role: 'assistant',
    content: runMockAiEngine(query, contextPayload),
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    providerUsed: 'Mock AI Engine'
  };
}
