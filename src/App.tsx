import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { Overview } from './pages/Overview';
import { MarketplacePerformance } from './pages/MarketplacePerformance';
import { PageHeader } from './components/common/PageHeader';
import { Card, CardBody } from './components/ui/Card';

// Placeholder views for other dashboard routes (deferred to later phases)
const SalesPlaceholder = () => (
  <div className="flex flex-col gap-4">
    <PageHeader 
      title="Sales Analytics" 
      subtitle="Track daily, weekly, and monthly sales trends." 
    />
    <Card>
      <CardBody className="flex flex-col items-center justify-center" style={{ height: '300px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', gap: '8px' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Sales Analytics Dashboard</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This section will display revenue charts and unit aggregates in Phase 3.</p>
      </CardBody>
    </Card>
  </div>
);

const ProductsPlaceholder = () => (
  <div className="flex flex-col gap-4">
    <PageHeader 
      title="Product Performance" 
      subtitle="Evaluate best and worst performing products by net margin." 
    />
    <Card>
      <CardBody className="flex flex-col items-center justify-center" style={{ height: '300px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', gap: '8px' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Product Performance Logs</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This section will display product margins and return rates in Phase 3.</p>
      </CardBody>
    </Card>
  </div>
);

const OrdersPlaceholder = () => (
  <div className="flex flex-col gap-4">
    <PageHeader 
      title="Order Management" 
      subtitle="Examine status, platforms, values, and identifiers of customer orders." 
    />
    <Card>
      <CardBody className="flex flex-col items-center justify-center" style={{ height: '300px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', gap: '8px' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Order Log Management</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This section will render search inputs and order tables in Phase 3.</p>
      </CardBody>
    </Card>
  </div>
);

const ProfitPlaceholder = () => (
  <div className="flex flex-col gap-4">
    <PageHeader 
      title="Profit & Expenses" 
      subtitle="Track commission fees, ad spend, and net profit margins." 
    />
    <Card>
      <CardBody className="flex flex-col items-center justify-center" style={{ height: '300px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', gap: '8px' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>P&L Breakdowns</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This section will display profit breakdowns and marketplace fee logs in Phase 3.</p>
      </CardBody>
    </Card>
  </div>
);

const ComparisonPlaceholder = () => (
  <div className="flex flex-col gap-4">
    <PageHeader 
      title="Platform Comparison" 
      subtitle="Contrast Amazon vs. Flipkart metrics side-by-side." 
    />
    <Card>
      <CardBody className="flex flex-col items-center justify-center" style={{ height: '300px', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', gap: '8px' }}>
        <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Market Contrast Panels</span>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This section will showcase side-by-side platform charts in Phase 3.</p>
      </CardBody>
    </Card>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="marketplace" element={<MarketplacePerformance />} />
          <Route path="sales" element={<SalesPlaceholder />} />
          <Route path="products" element={<ProductsPlaceholder />} />
          <Route path="orders" element={<OrdersPlaceholder />} />
          <Route path="profit" element={<ProfitPlaceholder />} />
          <Route path="comparison" element={<ComparisonPlaceholder />} />
          {/* Wildcard redirect to overview page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
