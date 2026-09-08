import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/common/Layout';
import { Overview } from './pages/Overview';
import { Marketplace } from './pages/Marketplace';
import { Sales } from './pages/Sales';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { Profit } from './pages/Profit';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="marketplace" element={<Marketplace />} />
          <Route path="sales" element={<Sales />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="profit" element={<Profit />} />
          <Route path="comparison" element={<Marketplace />} />
          {/* Wildcard redirect to overview page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
