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

## src/ — Client-side React application source code
## src/main.tsx — Application bootstrap mounting the App component into the root DOM element with StrictMode.
## src/App.tsx — Root component defining React Router routes, application layout, and connected page views.
## src/index.css — Global stylesheet defining CSS custom properties, design tokens, utility classes, and reset rules.
## src/App.css — Application wrapper and container styles.

## src/components/common/ — Reusable application shell and structural layout components
## src/components/common/Layout.tsx — Main dashboard shell providing the responsive sidebar, topbar, ambient DataModeBanner, and outlet container.
## src/components/common/Sidebar.tsx — Collapsible navigation sidebar containing navigation links and mobile drawer backdrop.
## src/components/common/Topbar.tsx — Top navigation header housing global filters (platform, date preset, custom dates), report upload launcher, and menu toggle.
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

## src/pages/ — Primary dashboard page views
## src/pages/Overview.tsx — Executive dashboard displaying high-level KPI cards, tactical recommendations engine, revenue charts, recent orders, and category breakdowns.
## src/pages/Marketplace.tsx — Dual-marketplace comparison view featuring side-by-side Amazon vs Flipkart metrics, return rate benchmarks, fee comparisons, and SP-API performance toggle.
## src/pages/Sales.tsx — Multi-channel sales timeline with platform toggling ("All", "Amazon", "Flipkart"), daily transaction history, and 5-zone Indian regional demand distribution.
## src/pages/Products.tsx — Product catalog performance ranking SKUs by revenue, units, profit margins, and marketplace distribution.
## src/pages/Orders.tsx — Searchable and filterable transaction log supporting status, platform, pagination, customer location, and net profitability calculations.
## src/pages/Profit.tsx — Accounting waterfall P&L statement breaking down gross revenue, COGS, marketplace referral/closing fees, shipping expenses, and net take-home profit.
## src/pages/MarketplacePerformance.tsx — Marketplace analytics view comparing traffic, sessions, conversion, buy box, and unit metrics.

## src/hooks/ — Custom React state and lifecycle hooks
## src/hooks/useFilters.ts — Synchronizes platform and date preset filters with URL search parameters.
## src/hooks/useSellerData.ts — Reactive hook providing persisted seller orders or mock data fallback to dashboard components.

## src/models/ — TypeScript domain models and interface contracts
## src/models/analytics.ts — Data interfaces for KPI cards, daily sales aggregates, and platform financial summaries.
## src/models/marketplaceReport.ts — Data models for normalized daily marketplace metrics and raw report structures.
## src/models/order.ts — Domain interface representing customer order records and statuses.
## src/models/product.ts — Domain interface representing product catalog items and profitability metrics.

## src/services/ — Client business logic and data aggregation services
## src/services/analyticsService.ts — Computes financial summaries, margins, profit & loss, Indian regional distributions, marketplace comparison metrics, and timelines from live or mock orders with dynamic date anchoring.
## src/services/recommendations/recommendationEngine.ts — Pure tactical recommendation engine evaluating high return rates, margin erosion, unprofitable SKUs, cross-channel margin arbitrage, catalog revenue concentration, and fulfillment disparity.
## src/services/marketplaceReportService.ts — Coordinates retrieval of normalized performance metrics from backend API or local report fallbacks.
## src/services/marketplaceApiService.ts — Client API service fetching Amazon performance metrics with shape validation guards.
## src/services/marketplaceImportService.ts — Manages client-side report uploads, parsing, validation, and localStorage persistence.
## src/services/importer/index.ts — Public entry point re-exporting importer types, orchestrators, and normalizers.
## src/services/importer/types.ts — TypeScript interfaces for report parsing, errors, detected formats, and previews.
## src/services/importer/detectMarketplace.ts — Signature header matching and delimiter detection for uploaded reports.
## src/services/importer/parseReport.ts — Main orchestrator executing parsing, validation, normalization, and preview summaries.
## src/services/importer/normalizers/amazonMTRNormalizer.ts — Normalizes Amazon India Merchant Tax Reports (MTR) into unified Order records with fee estimations.
## src/services/importer/normalizers/flipkartNormalizer.ts — Normalizes Flipkart Sales Reports (GSTR-1 / Sales Transaction Reports) into unified Order records with fee estimations, quote cleaning, and Shopsy flags.
## src/services/storage/reportStorageService.ts — IndexedDB-backed local persistence layer with composite-key deduplication and batch isolation.

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
