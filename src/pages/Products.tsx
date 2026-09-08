import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Search,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import { getProductRankings, formatINR, formatPercent } from '../services/analyticsService';

export const Products: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'units' | 'revenue' | 'profit' | 'margin'>('revenue');

  const allProducts = getProductRankings(platform, preset, 50, startDate, endDate, orders);

  const categories = ['all', ...Array.from(new Set(allProducts.map((p) => p.category).filter(Boolean)))];

  const filtered = allProducts
    .filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sortBy === 'revenue') return b.revenue - a.revenue;
      if (sortBy === 'units') return b.unitsSold - a.unitsSold;
      if (sortBy === 'profit') return b.netProfit - a.netProfit;
      if (sortBy === 'margin') return b.profitMargin - a.profitMargin;
      return 0;
    });

  const getMarginBadge = (margin: number) => {
    if (margin >= 20) {
      return <Badge variant="success" size="sm">{formatPercent(margin)}</Badge>;
    }
    if (margin >= 10) {
      return <Badge variant="info" size="sm">{formatPercent(margin)}</Badge>;
    }
    if (margin >= 0) {
      return <Badge variant="warning" size="sm">{formatPercent(margin)}</Badge>;
    }
    return <Badge variant="danger" size="sm">{formatPercent(margin)}</Badge>;
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Product Performance & Catalog Economics"
        subtitle="Evaluate SKU profitability, units sold, fee deductions, and net margins across platforms"
      />

      {/* Filter and Search Controls */}
      <Card>
        <CardBody className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search SKU or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="filter-select w-full pl-8"
                style={{ height: '34px', fontSize: '12px' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1.5 text-xs">
              <Filter size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <select
                className="filter-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{ height: '34px', fontSize: '12px' }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'all' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown size={14} style={{ color: 'var(--text-muted)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Sort By:</span>
              <select
                className="filter-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                style={{ height: '34px', fontSize: '12px' }}
              >
                <option value="revenue">Gross Revenue</option>
                <option value="units">Units Fulfilled</option>
                <option value="profit">Net Profit</option>
                <option value="margin">Net Margin (%)</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Catalog Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Catalog SKU Economics ({filtered.length} Items)</CardTitle>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing active items in date scope
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Product & SKU</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Units</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>COGS</th>
                  <th style={{ textAlign: 'right' }}>Marketplace Fees</th>
                  <th style={{ textAlign: 'right' }}>Returns</th>
                  <th style={{ textAlign: 'right' }}>Net Profit</th>
                  <th style={{ textAlign: 'center' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No matching products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                            {p.name}
                          </span>
                          <code className="text-2xs" style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                            {p.sku}
                          </code>
                        </div>
                      </td>
                      <td>
                        <Badge variant="neutral" size="sm">{p.category || 'General'}</Badge>
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-medium text-xs">
                        {p.unitsSold.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-semibold text-xs">
                        {formatINR(p.revenue)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }} className="text-xs">
                        {formatINR(p.costOfGoods)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }} className="text-xs">
                        {formatINR(p.marketplaceFees)}
                      </td>
                      <td style={{ textAlign: 'right' }} className="text-xs">
                        <span style={{ color: p.returnsCount > 0 ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                          {p.returnsCount}
                        </span>
                      </td>
                      <td
                        style={{ textAlign: 'right' }}
                        className={`text-xs font-semibold ${p.netProfit >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {formatINR(p.netProfit)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {getMarginBadge(p.profitMargin)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
export default Products;
