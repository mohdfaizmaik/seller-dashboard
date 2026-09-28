# Project Map

## Root Directory — Top-level repository configuration and application entry files
## package.json — Defines dependencies, npm scripts for Vite, tsx, linting, and server test suites.
## vite.config.ts — Configures the Vite development server, React plugin, and local /api proxy to port 3001.
## index.html — Single-page application HTML entry point hosting the root DOM mount node.
## tsconfig.json — Base TypeScript solution configuration referencing client and tooling configurations.
## tsconfig.app.json — TypeScript compilation configuration tailored for the client-side React application.
## tsconfig.node.json — TypeScript configuration for Vite and Node-based tooling files.
## README.md — Repository documentation covering project setup, React plugins, and Oxlint usage.

## public/ — Static web assets served directly by the web server
## public/favicon.svg — Application brand favicon in SVG format.
## public/icons.svg — Reusable SVG icon sprite sheet.

## server/ — Lightweight Node.js HTTP backend (no Express, no database)
## server/index.ts — Node HTTP server entry point listening on port 3001 and routing incoming requests.
## server/tsconfig.json — TypeScript compilation configuration tailored for the Node backend environment.

## server/config/ — Server environment and credential configuration
## server/config/env.ts — Loads .env files, resolves server port, and safely reads Amazon SP-API credentials without leaks.

## server/http/ — Server HTTP response utility helpers
## server/http/sendJson.ts — Helper utility that serializes and writes JSON responses with appropriate headers.

## server/routes/ — API route controllers for the backend HTTP server
## server/routes/index.ts — Central request router dispatching incoming HTTP requests to route controllers.
## server/routes/health.ts — Controller for GET /api/health returning server operational status.
## server/routes/amazonStatus.ts — Controller for GET /api/marketplaces/amazon/status returning safe connection diagnostics.
## server/routes/amazonPerformance.ts — Controller for GET /api/marketplaces/amazon/performance returning normalized metrics.

## server/services/ — Core backend business logic and service orchestration
## server/services/healthService.ts — Provides server health status diagnostics.
## server/services/amazonStatusService.ts — Probes Amazon SP-API configuration, LWA authentication, and seller participations.
## server/services/amazonPerformanceService.ts — Orchestrates Amazon Business Report retrieval and returns normalized metrics.

## server/integrations/marketplaces/ — Server marketplace integration clients and shared types
## server/integrations/marketplaces/types.ts — Defines server-side marketplace interfaces, platform types, and custom error classes.
## server/integrations/marketplaces/amazon/ — Amazon SP-API integration and report ingestion pipeline
## server/integrations/marketplaces/amazon/amazonApiClient.ts — Client encapsulating LWA auth, seller connection probes, and report fetching.
## server/integrations/marketplaces/amazon/amazonBusinessReportIngestion.ts — Orchestrates creating, polling, downloading, parsing, and normalizing Amazon reports.
## server/integrations/marketplaces/amazon/amazonDateRange.ts — Validates and converts YYYY-MM-DD date ranges to Amazon SP-API ISO-8601 timestamps.
## server/integrations/marketplaces/amazon/amazonLwaAuth.ts — Performs Login with Amazon (LWA) OAuth token exchanges to retrieve SP-API access tokens.
## server/integrations/marketplaces/amazon/amazonReportsApi.ts — Interacts with Amazon SP-API Reports API to create, poll status, and fetch documents.
## server/integrations/marketplaces/amazon/amazonSpApiHttp.ts — Shared SP-API HTTP fetch client handling headers, rate limits, and error mapping.
## server/integrations/marketplaces/amazon/parseSalesAndTrafficReport.ts — Decompresses, decodes, and parses Amazon Sales and Traffic report documents (JSON/TSV).
## server/integrations/marketplaces/flipkart/ — Flipkart backend integration boundary
## server/integrations/marketplaces/flipkart/flipkartApiClient.ts — Placeholder client establishing Flipkart Seller API method signatures.
## server/integrations/marketplaces/meesho/ — Meesho backend integration boundary
## server/integrations/marketplaces/meesho/meeshoApiClient.ts — Placeholder client establishing Meesho Seller API method signatures.

## server/validation/ — Automated test and validation suites for server logic
## server/validation/amazonPhase5bValidation.ts — Mocked test suite verifying Amazon LWA authentication and connection status logic.
## server/validation/amazonPhase5cValidation.ts — Mocked test suite validating Amazon Business Report ingestion and report parsing.
## server/validation/phase5dFrontendValidation.ts — Test suite verifying frontend integration with backend performance endpoints and data guards.
## server/validation/testImportValidation.ts — Automated test validation suite for Seller Report Importer, Amazon MTR, and Flipkart Sales normalizers.
## server/validation/testStorageValidation.ts — Automated test validation suite for IndexedDB report storage, deduplication, and batch management.
## server/validation/testPhase6EFValidation.ts — Automated test validation suite verifying Indian regional state mapping, dual-marketplace comparison metrics, dynamic date anchoring, and recommendation engine rules.
## server/validation/testProfitValidation.ts — Automated test validation suite for Master Catalog COGS persistence, CSV bulk import/export, 8-step waterfall statement accounting, bank settlement reconciliation, and Minimum Viable Price (MVP) floor pricing rules.
## server/validation/testInventoryValidation.ts — Automated test validation suite for Inventory Ledger persistence, multi-window sales velocity run rates (V7, V14, V30, V_daily), Days of Inventory (DOI), dynamic Reorder Points (ROP), urgency tier classifications, working capital analytics, and inventory recommendations.
## server/validation/testCopilotValidation.ts — Automated test validation suite for Store State Context serialization, Mock AI semantic pattern matcher, prompt grounding, BYOK dual-mode execution, and executive narrative generation.
## server/validation/testMeeshoValidation.ts — Automated test validation suite for Meesho Orders signature detection, multi-format date parsing, zero-commission fee calculation, tri-marketplace comparison analytics, and AI Copilot multi-channel grounding.
## server/validation/testTaxValidation.ts — Automated test validation suite for Indian GST State Codes (all 36 states/UTs), intra-state vs inter-state tax segregation, statutory HSN brackets, Section 52 marketplace TCS reconciliations, GSTR-3B Input Tax Credit (ITC) offsets, one-click CSV/JSON exports, and AI Copilot tax grounding.
## server/validation/testAdvertisingValidation.ts — Automated test validation suite for Advertising ROI, ROAS, TACoS, blended CAC, organic/paid split, SKU Ad Bleed detection, Money Pit campaign identification, local status toggles, CSV export generators, and AI Copilot marketing grounding.
## server/validation/testReturnsValidation.ts — Automated test validation suite for Customer Returns & RTO formulas, COD vs Prepaid risk disparity, 3PL courier benchmarking, regional state RTO rankings, SKU defect tracking, NDR queue management, one-click CSV exporters, and AI Copilot grounding.
## server/validation/testCashFlowValidation.ts — Automated test validation suite for 90-day cash flow transitions, marketplace disbursement pipeline (Amazon reserve, Flipkart weekly, Meesho T+15), scheduled tax/supplier outlays, liquidity troughs, What-If simulation sensitivity, CSV export generators, and AI Copilot grounding.

## src/ — Client-side React application source code
## src/main.tsx — Application bootstrap mounting the App component into the root DOM element with StrictMode.
## src/App.tsx — Root component defining React Router routes, application layout, and connected page views.
## src/index.css — Global stylesheet defining CSS custom properties, design tokens, utility classes, and reset rules.
## src/App.css — Application wrapper and container styles.

## src/components/common/ — Reusable application shell and structural layout components
## src/components/common/Layout.tsx — Main dashboard shell providing the responsive sidebar, topbar, ambient DataModeBanner, and outlet container.
## src/components/common/Sidebar.tsx — Collapsible navigation sidebar containing navigation links and mobile drawer backdrop.
## src/components/common/Topbar.tsx — Top navigation header housing global filters (platform, date preset, custom dates), COGS manager launcher, report upload launcher, and menu toggle.
## src/components/common/PageHeader.tsx — Standard page heading component displaying page title, subtitle, and action buttons.
## src/components/common/DataModeBanner.tsx — Ambient state banner indicating Demo Mode (with upload CTA) vs Live Mode (with batch counters, order counts, batch manager, and demo toggle).

## src/components/ui/ — Reusable atomic UI design system components
## src/components/ui/Card.tsx — Structured card component with header, title, and body subcomponents.
## src/components/ui/Button.tsx — Button component supporting multiple variants, sizes, and active states.
## src/components/ui/Badge.tsx — Status badge tag supporting theme, marketplace-specific, and primary color variants with size options.
## src/components/recommendations/RecommendationsCard.tsx — Tactical seller recommendations card featuring category filters, impact badges, quantified metrics, affected SKUs, and concrete operational action guides.
## src/components/importer/index.ts — Public entry point exporting report ingestion and preview components.
## src/components/importer/ReportDropzone.tsx — Drag-and-drop file ingestion zone with real-time parsing state.
## src/components/importer/ReportImportPreview.tsx — Diagnostic report preview displaying KPI strips, sample order rows, and warning accordions.
## src/components/importer/ReportUploadModal.tsx — Accessible modal dialog hosting report upload dropzone, preview, and batch management.
## src/components/catalog/CogsManagerModal.tsx — Modal dialog for managing SKU unit costs (manufacturing COGS, packaging, GST rate), inline editing, unconfigured SKU detection, and CSV bulk import/export.
## src/components/profit/SettlementReconciliationCard.tsx — Bank disbursement audit component reconciling estimated fees against actual debited settlement fees to identify hidden overcharges.
## src/components/profit/UnitEconomicsTable.tsx — Diagnostic module isolating unprofitable SKUs (profit-killers), severe RTO reverse logistics drag, and Minimum Viable Price (MVP) floor pricing.
## src/components/inventory/RestockRecommendationTable.tsx — Restock replenishment table filterable by urgency (Stockout, Critical Risk, Reorder Now, Healthy, Overstocked, Dead Stock), with live DOI indicators, estimated purchase order investment values, and quick stock adjustments.
## src/components/inventory/WorkingCapitalCard.tsx — Visual working capital audit component detailing active working capital vs. locked dead capital split, ratio progress bar, and dead inventory liquidation playbooks.
## src/components/inventory/StockAdjustModal.tsx — Modal dialog enabling immediate editing of physical warehouse stock, reserved/in-transit units, supplier lead times, and safety buffers.
## src/components/ai/StoreCopilotDrawer.tsx — Slide-over Conversational AI drawer featuring quick-prompt chips, real-time message stream, typing indicator, BYOK credential manager modal, and clear history.
## src/components/ai/ChatBubble.tsx — Semantic chat bubble supporting custom Markdown rendering (tables, syntax code/email blocks, blockquotes, bold text, inline tags) and one-click copy with feedback.
## src/components/ai/ExecutiveSummaryCard.tsx — Pulse KPI narrative card generating 3-sentence executive briefings with follow-up action chips deep-linking into Copilot.

## src/context/ — Global React Context providers
## src/context/CopilotContext.tsx — Global React Context providing openCopilot(query?), closeCopilot(), and drawer visibility state across topbar, cards, and floating triggers.

## src/pages/ — Primary dashboard page views
## src/pages/Overview.tsx — Executive dashboard displaying high-level KPI cards, tactical recommendations engine, revenue charts, recent orders, and category breakdowns.
## src/pages/Marketplace.tsx — Dual-marketplace comparison view featuring side-by-side Amazon vs Flipkart metrics, return rate benchmarks, fee comparisons, and SP-API performance toggle.
## src/pages/Sales.tsx — Multi-channel sales timeline with platform toggling ("All", "Amazon", "Flipkart"), daily transaction history, and 5-zone Indian regional demand distribution.
## src/pages/Products.tsx — Product catalog performance ranking SKUs by revenue, units, profit margins, and marketplace distribution.
## src/pages/Orders.tsx — Searchable and filterable transaction log supporting status, platform, pagination, customer location, and net profitability calculations.
## src/pages/Profit.tsx — Itemized 8-step financial waterfall accounting statement (Gross Sales -> Refunds -> Net Sales -> COGS/Packaging -> Commissions -> Logistics/RTO -> Taxes -> Net Operating Profit), CSV statement export, settlement audit, and unit economics.
## src/pages/Inventory.tsx — Inventory & Restock Command Center page view integrating portfolio KPIs, restock recommendation engine, working capital breakdown, CSV bulk upload/export, and stock adjustments.
## src/pages/TaxCompliance.tsx — Indian GST Tax & Compliance Command Center page view integrating Place of Supply (B2CS), statutory HSN Table 12 summaries, Section 52 marketplace TCS audit, GSTR-3B Input Tax Credit (ITC) offsets, and one-click CSV/JSON exports.
## src/pages/Advertising.tsx — Advertising ROI & Marketing Command Center page view integrating 5 executive KPI cards, active Ad Bleed alert banner, 3 tabbed ledgers (SKU Ad Bleed, Campaigns Performance, Cross-Channel Marketing Contrast), status toggles, and one-click CSV export generators.
## src/pages/Returns.tsx — Customer Returns & RTO Intelligence Command Center page view integrating 5 executive KPI cards, active RTO alert banner, WhatsApp outreach modal with prefilled Indian templates, and 5 tabbed audit ledgers (NDR Action Center, Courier Scorecard, State RTO Map, SKU Defect Ledger, Recent Returns Audit).
## src/pages/CashFlow.tsx — Cash Flow Runway & Working Capital Simulator page view integrating 5 executive KPI cards, liquidity health alert banner, dynamic "What-If" scenario sliders, Recharts 90-day forecast area curve, disbursement pipeline, scheduled payables calendar, and CSV export generators.
## src/pages/MarketplacePerformance.tsx — Marketplace analytics view comparing traffic, sessions, conversion, buy box, and unit metrics.

## src/hooks/ — Custom React state and lifecycle hooks
## src/hooks/useFilters.ts — Synchronizes platform and date preset filters with URL search parameters.
## src/hooks/useSellerData.ts — Reactive hook providing persisted seller orders or mock data fallback to dashboard components.
## src/hooks/useSkuCosts.ts — Reactive hook providing persisted SKU costs, sync lookup map, and bulk update functions.
## src/hooks/useInventory.ts — Reactive hook providing persisted inventory items, sync SKU lookup map, stock adjustment handler, bulk CSV updates, and default seed resets.
## src/hooks/useTaxData.ts — Reactive hook providing state of origin selection, automatic Place of Supply (POS) resolution, and live GST tax compliance summaries.
## src/hooks/useAdvertising.ts — Reactive hook providing filtered advertising portfolio metrics, active/paused campaign toggling, and localStorage persistence.
## src/hooks/useReturnsData.ts — Reactive hook providing filtered returns summary, active NDR case mutation, courier benchmarks, state RTO rankings, SKU defect analysis, and localStorage persistence.
## src/hooks/useCashFlowData.ts — Reactive hook managing custom starting bank cash, dynamic scenario simulation state, reactive order aggregations, and 90-day liquidity summary.

## src/models/ — TypeScript domain models and interface contracts
## src/models/analytics.ts — Data interfaces for KPI cards, daily sales aggregates, platform financial summaries, and itemized direct costs.
## src/models/marketplaceReport.ts — Data models for normalized daily marketplace metrics and raw report structures.
## src/models/order.ts — Domain interface representing customer order records and statuses.
## src/models/product.ts — Domain interface representing product catalog items and profitability metrics.
## src/models/tax.ts — Domain interface representing Indian GST Place of Supply (POS), B2CS summaries, statutory HSN Table 12 items, Section 52 marketplace TCS reconciliations, and GSTR-3B Input Tax Credit (ITC) data structures.
## src/models/advertising.ts — Domain interfaces for ad channels, campaign types, targeting types, efficiency tiers, ad campaigns, SKU-level ad efficiency, platform ad summaries, and portfolio metrics.
## src/models/returns.ts — Domain interfaces for customer returns, RTO events, payment types, return reasons, item conditions, NDR cases, courier benchmarks, state risks, and SKU return defects.
## src/models/cashflow.ts — Domain interfaces for cash flow categories, disbursement pipeline items, scheduled liabilities, daily cash flow points, scenario simulation parameters, and portfolio cash summary.

## src/services/ — Client business logic and data aggregation services
## src/services/cashflow/cashflowService.ts — Core cash flow forecasting calculation engine modeling marketplace settlement lags, monthly GST challan deadlines (20th), supplier restock credit terms, daily marketing burn, minimum cash trough, runway days, and CSV export generators.
## src/services/advertising/advertisingService.ts — Core advertising calculation engine calculating ROAS, ACoS, TACoS, blended CAC, organic/paid split, SKU-level Ad Bleed detection, campaign status overrides, and CSV export generators.
## src/services/returns/returnsService.ts — Core customer returns and RTO calculation engine calculating return/RTO rates, unrecoverable cash loss, COD vs Prepaid risk multipliers, 3PL courier performance metrics, regional state risk tiers, SKU defect diagnosis, NDR queue management, and one-click CSV export generators.
## src/services/tax/taxService.ts — Core Indian GST calculation engine resolving 36 state codes, intra-state vs inter-state supply splitting, statutory HSN tax rates, Section 52 marketplace TCS withholdings, GSTR-3B eligible Input Tax Credit (ITC) offsets, and CSV/JSON GST Portal exporters.
## src/services/analyticsService.ts — Computes financial summaries, margins, profit & loss, Indian regional distributions, marketplace comparison metrics, and timelines from live or mock orders with dynamic date anchoring and direct COGS/packaging deductions.
## src/services/recommendations/recommendationEngine.ts — Pure tactical recommendation engine evaluating high return rates, margin erosion, unprofitable SKUs, cross-channel margin arbitrage, catalog revenue concentration, fulfillment disparity, pricing floor violations, critical stockout risk, trapped dead capital, and cross-channel velocity mismatches.
## src/services/catalog/cogsService.ts — Master Catalog and COGS management service backed by IndexedDB and sync cache, with PRODUCTS_CATALOG seeding and CSV parsers.
## src/services/inventory/inventoryService.ts — Inventory Ledger and persistence service backed by IndexedDB (SellerInventoryDB) with synchronous in-memory cache, default eCommerce stock profile seeding, stock adjustment handlers, and CSV bulk import/export.
## src/services/inventory/inventoryCalculations.ts — Pure calculation engine computing multi-window sales velocities (V7, V14, V30, V_daily), Days of Inventory Remaining (DOI), dynamic Reorder Points (ROP), recommended reorder quantities, PO value requirements, urgency tier classification, and working capital summaries.
## src/services/settlement/settlementService.ts — Settlement report ingestion bridge for Amazon Date Range Financial files and Flipkart Settlement sheets, with discrepancy reconciliation.
## src/services/marketplaceReportService.ts — Coordinates retrieval of normalized performance metrics from backend API or local report fallbacks.
## src/services/marketplaceApiService.ts — Client API service fetching Amazon performance metrics with shape validation guards.
## src/services/marketplaceImportService.ts — Manages client-side report uploads, parsing, validation, and localStorage persistence.
## src/services/importer/index.ts — Public entry point re-exporting importer types, orchestrators, and normalizers.
## src/services/importer/types.ts — TypeScript interfaces for report parsing, errors, detected formats, and previews.
## src/services/importer/detectMarketplace.ts — Signature header matching and delimiter detection for uploaded reports.
## src/services/importer/parseReport.ts — Main orchestrator executing parsing, validation, normalization, and preview summaries.
## src/services/importer/normalizers/amazonMTRNormalizer.ts — Normalizes Amazon India Merchant Tax Reports (MTR) into unified Order records with fee estimations.
## src/services/importer/normalizers/flipkartNormalizer.ts — Normalizes Flipkart Sales Reports (GSTR-1 / Sales Transaction Reports) into unified Order records with fee estimations, quote cleaning, and Shopsy flags.
## src/services/importer/normalizers/meeshoNormalizer.ts — Normalizes Meesho Orders exports (Sub Order No, SKU, Supplier Discounted Price, COD/Prepaid, customer state) into unified Order records with 0% referral fee modeling.

## src/services/storage/reportStorageService.ts — IndexedDB-backed local persistence layer with composite-key deduplication and batch isolation.
## src/services/ai/contextBuilder.ts — Deterministic store state context builder serializing live orders, inventory velocity, DOI, and recommendations into compact Markdown and numerical snapshots.
## src/services/ai/copilotService.ts — Dual-mode Copilot orchestration engine supporting BYOK (Google Gemini, OpenAI, Anthropic, DeepSeek, Custom) and offline zero-config Mock AI semantic engine with supplier email and margin analysis generators.

## src/integrations/marketplaces/ — Client-side marketplace adapter architecture
## src/integrations/marketplaces/index.ts — Public entry point exporting marketplace adapter types, registry, and date filtering utilities.
## src/integrations/marketplaces/marketplaceRegistry.ts — Registry resolving marketplace platform identifiers to concrete adapter instances.
## src/integrations/marketplaces/types.ts — Defines adapter contracts, connection states, and report filtering functions.
## src/integrations/marketplaces/futureApiAdapter.ts — Architectural boundary specifications for future backend-connected marketplace adapters.
## src/integrations/marketplaces/amazon/amazonAdapter.ts — Local report adapter returning normalized static Amazon Business Report data.
## src/integrations/marketplaces/flipkart/flipkartAdapter.ts — Local report adapter aggregating static Flipkart Sales Report transactions.
## src/integrations/marketplaces/meesho/meeshoAdapter.ts — Placeholder adapter stub for future Meesho marketplace integration.

## src/data/ — Static catalogs, mock datasets, and report normalizers
## src/data/orders.ts — Generates 800 deterministic mock order records across Amazon and Flipkart using a seeded PRNG.
## src/data/products.ts — Product catalog defining SKUs, categories, selling prices, and cost of goods sold.
## src/data/marketplaceConfig.ts — Reference commission rates, closing fees, shipping charges, and daily ad spend settings.
## src/data/marketplace/amazon/normalizeAmazonReport.ts — Normalizes raw Amazon Business Report rows into canonical MarketplaceDailyMetric objects.
## src/data/marketplace/amazon/rawDailyReports.ts — Sample raw Amazon Business Report dataset for testing and local fallback.
## src/data/marketplace/amazon/amazonBusinessReportValidation.ts — Runtime assertions validating correctness of Amazon report normalization.
## src/data/marketplace/flipkart/normalizeFlipkartReport.ts — Aggregates raw Flipkart Sales Report transaction rows into daily normalized metrics.
## src/data/marketplace/flipkart/rawSalesReports.ts — Raw Flipkart Sales Report dataset containing order-item transaction records.
## src/data/marketplace/flipkart/cashBackReport.ts — Type definitions and documentation for Flipkart Cash Back credit and debit note sheets.
## src/data/marketplace/flipkart/flipkartSalesReportValidation.ts — Runtime assertions validating accuracy of Flipkart Sales Report aggregation.
## src/data/marketplace/marketplaceAdapterValidation.ts — Test assertions verifying marketplace adapter registry resolution and behavior.
## src/data/marketplace/marketplacePerformanceIntegrationValidation.ts — Test assertions verifying filter and date-range integration for performance metrics.
## src/data/marketplace/marketplacePerformanceLabels.ts — Label constants enforcing consistent semantic naming across performance views.

## Architecture Overview
The frontend React single-page application displays seller performance and financial analytics across Amazon and Flipkart channels, styled with custom design tokens and charts rendered using Recharts. Route views consume business metrics through `analyticsService` for financial/order metrics and `marketplaceReportService` for traffic and conversion performance. When querying performance metrics, `marketplaceReportService` first attempts to fetch live, normalized data from the backend via `marketplaceApiService`, seamlessly falling back to local report adapters (`amazonAdapter`, `flipkartAdapter`) if the backend is offline or unconfigured. The backend is a lightweight Node.js HTTP server on port 3001 that orchestrates Amazon SP-API authentication (via LWA OAuth) and Reports API ingestion server-side, decoding and normalizing raw report data into unified `MarketplaceDailyMetric` objects before returning them to the client without exposing API secrets.

For seller-uploaded files, `src/services/importer/` provides a decoupled report ingestion and normalization engine. Incoming flat files (CSV/TSV) undergo automatic delimiter detection, UTF-8 BOM stripping, and header signature detection via `detectMarketplace`. Format-specific normalizers (`amazonMTRNormalizer` and `flipkartNormalizer`) transform marketplace exports (e.g. Amazon India Merchant Tax Reports, Flipkart Sales Reports) into the unified `Order` model, standardizing dates, fulfillment channels, payment codes, and order statuses, while leveraging `MARKETPLACE_CONFIG` to estimate referral fees, closing fees, and net profit per order. The resulting records seamlessly feed into `analyticsService` for unified P&L, KPI, and cohort analysis across all sales channels.

To deliver persistent multi-report capabilities, Phase 6C & 6D introduces `src/services/storage/reportStorageService.ts` backed by browser `IndexedDB` with universal in-memory fallback. Uploaded reports are grouped into `ImportBatch` envelopes and individual orders are deduplicated by composite key (`orderId` + `sku` + `status`) to prevent revenue inflation upon re-uploading overlapping reports. In the user interface, `ReportUploadModal` coordinates `ReportDropzone` (drag-and-drop parsing) and `ReportImportPreview` (diagnostic KPI strips, sample orders table, and error/warning accordions), with `useSellerData` serving as the reactive bridge that dynamically feeds persisted orders into dashboard views (with transparent demo-data fallback).

Phase 6E and Phase 6F complete the analytics loop:
- **Phase 6E (Unified Dual-Marketplace Integration)**: Connects `useSellerData().orders` as the universal single data source across all dashboard views (`Overview`, `Marketplace`, `Sales`, `Products`, `Orders`, `Profit`). Implements ambient `DataModeBanner` (providing clear Demo Mode indicator with upload CTA vs Live Mode indicator with batch counts, order totals, and demo toggle). Upgrades `analyticsService.ts` with dynamic date anchoring (basing `7d`/`30d`/`ytd` on the latest order timestamp in uploaded datasets), side-by-side marketplace comparison metrics (`getMarketplaceComparison`), and Indian regional demand aggregation (`getRegionalDistribution`) mapping 28+ states and union territories into 5 geographical zones (North, South, West, East, Central).
- **Phase 6F (Tactical Seller Recommendations Engine)**: Introduces `src/services/recommendations/recommendationEngine.ts` and `src/components/recommendations/RecommendationsCard.tsx`, a pure-function diagnostic engine evaluating blended and platform metrics against marketplace commission structures. It flags critical return anomalies, thin margin warnings, unprofitable SKUs, cross-channel margin arbitrage opportunities, catalog revenue concentration risks, and marketplace fee drags, providing concrete operational guidance directly to sellers on the dashboard.

Phase 7 completes true bottom-line profitability accounting:
- **Phase 7A (Master Catalog & COGS Management Layer)**: Introduces `src/services/catalog/cogsService.ts`, `src/hooks/useSkuCosts.ts`, and `src/components/catalog/CogsManagerModal.tsx` storing SKU manufacturing COGS, packaging material expenses, and GST tax rates in IndexedDB (seeded from `PRODUCTS_CATALOG`). It features inline editing, unconfigured SKU auto-discovery from uploaded reports, and CSV bulk import/export.
- **Phase 7B (Deep Profit Waterfall Breakdown)**: Upgrades `src/services/analyticsService.ts` and transforms `src/pages/Profit.tsx` into an itemized 8-step financial accounting waterfall (Gross Customer Sales -> Customer Returns -> Net Realized Sales -> COGS & Packaging -> Marketplace Deductions -> Logistics & RTO Losses -> Output Taxes -> Real Net Operating Profit) with exportable CSV financial statements.
- **Phase 7C (Settlement & Disbursement Reconciliation)**: Introduces `src/services/settlement/settlementService.ts` and `src/components/profit/SettlementReconciliationCard.tsx` supporting Amazon Date Range Financial files and Flipkart Settlement sheets, auditing estimated order fees against actual bank disbursements to flag hidden overcharges (weight handling surcharges, return pick & pack penalties).
- **Phase 7D (Unit Economics & Profit-Killers Module)**: Introduces `src/components/profit/UnitEconomicsTable.tsx` isolating unprofitable SKUs (profit-killers), severe RTO reverse logistics drag, and a Minimum Viable Price ($MVP$) pricing floor calculator targeting a 15% net margin. Upgrades `src/services/recommendations/recommendationEngine.ts` with rules flagging negative unit economics, pricing floor violations, and severe RTO drag.

Phase 8 automates supply chain restock and working capital liquidity:
- **Phase 8A (Inventory Ledger & Local Storage Infrastructure)**: Introduces `src/services/inventory/inventoryService.ts`, `src/hooks/useInventory.ts`, and `src/components/inventory/StockAdjustModal.tsx` managing physical stock, in-transit units, lead times, and safety buffers in IndexedDB (`SellerInventoryDB`) with synchronous cache and CSV bulk import/export.
- **Phase 8B (Multi-Window Velocity, DOI & Dynamic Reorder Engine)**: Implements `src/services/inventory/inventoryCalculations.ts` calculating weighted sales velocities ($V_7, V_{14}, V_{30}, V_{\text{daily}}$), Days of Inventory Remaining (DOI), Reorder Points ($ROP = (V_{\text{daily}} \times LT) + SS$), recommended replenishment quantities, urgency tier classifications, and working capital splits (active vs. dead capital).
- **Phase 8C (Restock Command Center & Working Capital UI)**: Implements `src/pages/Inventory.tsx`, `src/components/inventory/RestockRecommendationTable.tsx`, and `src/components/inventory/WorkingCapitalCard.tsx` providing filterable urgency tabs, PO capital requirements, and dead stock liquidation playbooks.
- **Phase 8D (Cross-System Inventory Recommendations)**: Updates `src/services/recommendations/recommendationEngine.ts` with critical stockout warnings, dead stock alerts, and cross-channel velocity arbitrage rules.

Phase 9 introduces the Conversational AI Store Copilot & Contextual Commerce Analyst:
- **Phase 9A (Deterministic Store State Context Builder)**: `src/services/ai/contextBuilder.ts` serializes the active store state into a token-optimized Markdown context document (financial KPIs, growth vs prior comparative period, Amazon India vs Flipkart channel contrast, inventory velocity, DOI runway, critical stockouts, and trapped dead capital) and a typed numerical snapshot (`StoreContextSnapshot`).
- **Phase 9B (Dual-Mode Copilot Engine & Provider Interface)**: `src/services/ai/copilotService.ts` provides a hybrid execution architecture supporting Bring-Your-Own-Key (BYOK: Google Gemini, OpenAI, Anthropic, DeepSeek, Custom endpoints with zero backend forwarding and client-side key storage) alongside an offline, zero-configuration Mock AI semantic pattern matcher that accurately synthesizes profit drops, stockout risks, marketplace contrasts, supplier PO requisition emails, and executive summaries directly from grounded store data.
- **Phase 9C (Store Copilot Slide-Over Drawer & Chat Interface)**: `src/components/ai/StoreCopilotDrawer.tsx` and `src/components/ai/ChatBubble.tsx` offer a responsive slide-over drawer accessible globally via floating action button (FAB) in `Layout.tsx` and "AI Copilot" header button in `Topbar.tsx`. It features interactive quick-prompt chips, Markdown rendering (data tables, syntax-highlighted code blocks, blockquotes, bold text), and a BYOK settings configuration dialog.
- **Phase 9D (Automated Weekly Executive Narrative Generator)**: `src/components/ai/ExecutiveSummaryCard.tsx` is embedded on `Overview.tsx` to synthesize a concise 3-sentence executive briefing analyzing topline growth, bottomline profitability, channel spread, and working capital risks, with follow-up action chips that deep-dive directly into the Copilot drawer.
- **Phase 9E (Global Copilot Context & Navigation)**: `src/context/CopilotContext.tsx` provides a seamless React context (`useCopilot`) allowing any card, button, or recommendation to trigger the Copilot drawer pre-populated with relevant queries.

Phase 10 expands to multi-marketplace channel operations with Meesho ingestion and 3-way economics:
- **Phase 10A (Meesho Orders Detection & Ingestion Engine)**: Introduces `src/services/importer/normalizers/meeshoNormalizer.ts` and updates `detectMarketplace.ts` with signature detection for Meesho Orders exports (`sub order no`, `sku`, `product title`, `supplier discounted price`), multi-format Indian date parsing (DD-MM-YYYY, YYYY-MM-DD, slash format), order status mapping (`DELIVERED`, `CANCELLED`, `RETURNED`/`RTO`), and zero-commission fee structure modeling (0% referral rate, ₹0 closing fee, flat forward/reverse shipping rates).
- **Phase 10B (Tri-Marketplace Benchmark & Side-by-Side Economics)**: Upgrades `src/services/analyticsService.ts` and `src/pages/Marketplace.tsx` to a 3-way benchmark comparison (Amazon India vs. Flipkart vs. Meesho + Blended Total) featuring 4 executive KPI cards, 5-column metric comparisons, and dynamic leader badges highlighting Meesho's 0% commission advantage.
- **Phase 10C (Cross-Platform Filtering & Visual Tokens)**: Expands `useFilters.ts` to support `platform="meesho"`, adds Meesho to `Topbar.tsx` dropdown, introduces Meesho brand tokens (`#F43397`, `--color-meesho`, `--color-meesho-light`, `.badge-meesho`) in `src/index.css` and `Badge.tsx`, and updates `src/pages/Overview.tsx` to compute and display Meesho market share.
- **Phase 10D (Cross-Channel Arbitrage & RTO Mitigation Rules)**: Enhances `src/services/recommendations/recommendationEngine.ts` with Meesho channel tracking, high RTO return rate alerts (>25% RTO on COD-heavy channels), and cross-channel 0% commission margin arbitrage suggestions (>15% net profit margin).
- **Phase 10E (AI Copilot Multi-Channel Grounding)**: Updates `src/services/ai/contextBuilder.ts` and `src/services/ai/copilotService.ts` to serialize Meesho metrics into the token-optimized store context snapshot and AI system prompts, enabling automated 3-way channel performance contrasts and COD return mitigation strategies.

Phase 11 introduces the Indian GST Tax & Compliance Command Center (GSTR-1, GSTR-3B & Section 52 TCS Audit):
- **Phase 11A (Indian GST State Code & Place of Supply Engine)**: `src/services/tax/taxService.ts` maps all 36 Indian states & union territories to standard 2-digit GST state codes (`29-Karnataka`, `27-Maharashtra`, `07-Delhi`, etc.) and determines intra-state (`50% CGST + 50% SGST`) vs. inter-state (`100% IGST`) tax segregation relative to a selectable seller registered home state.
- **Phase 11B (Statutory HSN Table 12 & Multi-Bracket Tax Modeling)**: Maps catalog items to statutory HSN codes (e.g. `8518` Audio, `9102` Smartwatches, `8516` Appliances, `6105`/`6203` Apparel, `4901` Books [0% statutory exempt], `3304` Cosmetics) across 0%, 5%, 12%, and 18% tax brackets, computing reverse taxable values from gross invoiced amounts.
- **Phase 11C (Section 52 Marketplace TCS Reconciliation)**: Calculates the statutory 1% TCS (Tax Collected at Source) withheld by Amazon, Flipkart, and Meesho on net taxable supplies ($Gross - Returns$), enabling sellers to verify and claim electronic cash ledger credits on the GST portal under Form GSTR-8.
- **Phase 11D (GSTR-3B Input Tax Credit Offsets & Cash Outflow Calculator)**: Reconciles total output GST liability against claimable Input Tax Credit (ITC) from inventory procurement (COGS) and 18% GST charged on Amazon/Flipkart/Meesho fees and shipping invoices, deriving the exact net cash payable via PMT-06 challans or excess credit carried forward.
- **Phase 11E (One-Click Exporters, Compliance UI & AI Copilot Grounding)**: `src/pages/TaxCompliance.tsx` provides 4 tabbed compliance views (B2CS Place of Supply, HSN Table 12, Section 52 TCS Audit, GSTR-3B ITC Reconciliation) with one-click CSV and GST Portal JSON exports. Grounding in `src/services/ai/contextBuilder.ts` and `src/services/ai/copilotService.ts` enables the Conversational AI Store Copilot to analyze tax liabilities and recommend cash tax savings.

Phase 12 introduces the Advertising & Marketing ROI Engine (ROAS, TACoS, SKU-Level Attribution & Ad Bleed Detection):
- **Phase 12A (Multi-Channel Campaign Modeling & Calculations)**: `src/models/advertising.ts` and `src/services/advertising/advertisingService.ts` provide cross-channel ad attribution across Amazon India (Sponsored Products / Sponsored Brands), Flipkart (Product Listing Ads), and Meesho (Catalog Visibility Boost), computing mathematical ROAS ($\text{Ad Sales} / \text{Spend}$), ACoS ($\text{Spend} / \text{Ad Sales} \times 100\%$), TACoS ($\text{Spend} / \text{Total Store Sales} \times 100\%$), blended CAC ($\text{Spend} / \text{Total Orders}$), and organic vs. paid sales split.
- **Phase 12B (Automated SKU-Level Ad Bleed & Money Pit Detection)**: Compares SKU advertising cost of sales against individual product gross margins ($(\text{Selling Price} - \text{COGS}) / \text{Selling Price} \times 100\%$) to flag **Ad Bleed** SKUs where $\text{ACoS} > \text{Gross Margin \%}$, plus **Money Pit** detection for campaigns with $>₹1000$ spend and 0 attributed sales.
- **Phase 12C (Advertising Command Center UI & Local Overrides)**: `src/pages/Advertising.tsx` and `src/hooks/useAdvertising.ts` deliver a responsive interface with 5 KPI cards, active bleed alert strip, 3 tabbed views (`SKU Ad Bleed & Efficiency`, `Campaigns Performance Ledger` with active/paused status toggles persisted in `localStorage`, and `Cross-Channel Marketing Contrast`), search/filter controls, and one-click CSV downloads.
Phase 13 introduces the Customer Returns & RTO Intelligence Engine (NDR Shield, COD Risk & Profit Leak Diagnosis):
- **Phase 13A (Mathematical Modeling & Cash Drain Decomposition)**: `src/models/returns.ts` and `src/services/returns/returnsService.ts` provide exact mathematical segregation of courier door-rejections (RTO) from post-delivery customer-initiated returns (CIR), calculating return rate %, RTO rate %, CIR rate %, and itemized unrecoverable cash loss (forward logistics fee, reverse logistics fee, packaging material loss, and damaged inventory write-offs).
- **Phase 13B (Cash on Delivery vs. Prepaid Disparity Analysis)**: Quantifies the disproportionate cash drain of COD orders vs. prepaid orders, deriving return rates, net cash losses, and a dynamic COD risk multiplier ($COD\text{ Return Rate} / Prepaid\text{ Return Rate}$), isolating why COD orders trigger up to 3.6x higher return rates and over 75% of reverse logistics drain.
- **Phase 13C (3PL Courier Partner Benchmarking & Fake Attempt Detection)**: Benchmarks real-world performance for major Indian 3PL logistics carriers (Delhivery, Blue Dart, Xpressbees, Shadowfax, Amazon ATS, Ekart Logistics), measuring delivered success rates, RTO rates, average transit transit days, reverse freight cash losses, and tracking courier fake attempt rates (*"Premises closed / Customer unavailable"* reports without rider GPS proximity).
- **Phase 13D (High-RTO Regional Map & SKU Defect Analysis)**: Ranks top 10 Indian states by RTO rate, COD share %, and risk tiers (`high_risk`, `elevated`, `moderate`, `safe`), isolating high-risk delivery corridors (e.g. Bihar, UP, Assam). Decomposes catalog SKU return defects, diagnosing root causes (sizing mismatches, electronic pairing defects, transit packaging dents) and generating actionable merchandising interventions.
- **Phase 13E (NDR Action Center & 1-Click WhatsApp Verification Generator)**: Tracks non-delivery reports (NDR) with attempt histories and status workflows (`open`, `action_taken`, `escalated`, `resolved`, `rto_initiated`). Features an interactive modal generating prefilled, personalized WhatsApp/SMS customer outreach templates with 1-click clipboard copy and direct WhatsApp Web messaging to verify addresses and schedule re-attempts before couriers mark orders as RTO.
- **Phase 13F (Interactive Command Center UI, CSV Exporters & Copilot Grounding)**: `src/pages/Returns.tsx` offers 5 KPI cards, active RTO alert banner, 5 tabbed ledgers, status overrides persisted in localStorage, and one-click CSV export generators (Returns Audit, NDR Queue, Courier Benchmarks). Grounding in `src/services/ai/contextBuilder.ts` (Section 7) and `src/services/ai/copilotService.ts` (Intent 5.9) equips Store Copilot with automated COD fraud mitigation playbooks, courier penalty guidelines, and returns diagnostics.

Phase 14 introduces the Cash Flow Runway & Working Capital Liquidity Simulator (30/60/90-Day Forecast):
- **Phase 14A (Treasury Modeling & Balance Conservation)**: `src/models/cashflow.ts` and `src/services/cashflow/cashflowService.ts` model dynamic daily cash transitions ($Closing = Opening + Inflows - Outflows$) across a 90-day rolling horizon, factoring in platform revenue, starting bank reserves, and safe buffer thresholds (default ₹1,00,000).
- **Phase 14B (Marketplace Disbursement & Escrow Lag Pipeline)**: Models real-world platform settlement schedules: Amazon India bi-weekly payouts with 7-day reserve holdback (`Account Level Reserve`), Flipkart weekly settlements (Wednesdays), and Meesho T+15 settlements, forecasting net deposits after platform commission deductions.
- **Phase 14C (Statutory & Procurement Outflow Scheduling)**: Tracks hard deadlines for statutory GST PMT-06 challans (due on the 20th of every month), supplier purchase order restocking outlays (modulated by 15/30/45/60-day credit terms), recurring warehouse lease/utilities (due on 1st of month), and daily marketing burn.
- **Phase 14D (Minimum Trough Identification & Runway Days)**: Pinpoints the exact minimum liquidity trough across 90 days, date of maximum cash crunch, average daily burn rate, and liquid runway days, categorizing liquidity health into `healthy` (>90d), `caution` (30-90d / near buffer), or `critical_crunch` (<30d / negative).
- **Phase 14E (Dynamic "What-If" Working Capital Simulator)**: Interactive slider panel enabling sellers to stress-test their business under sales fluctuations (-40% to +60%), ad spend changes (-50% to +80%), supplier credit terms (Immediate to 60 days), RTO variations (-50% to +50%), and debt/equity capital injections (₹0 to ₹5,00,000) with instant recalculation of cash trough and runway.
- **Phase 14F (Interactive Command Center UI, CSV Exporters & Copilot Grounding)**: `src/pages/CashFlow.tsx` delivers 5 KPI cards, alert banner, Recharts 90-day area projection curve, 3 analytical tabs (Forecast, Disbursement Pipeline, Payables Calendar), editable starting cash modal, and 3 CSV exporters. Grounding in `src/services/ai/contextBuilder.ts` (Section 8) and `src/services/ai/copilotService.ts` (Intent 5.10) arms Store Copilot with treasury and working capital optimization playbooks.
