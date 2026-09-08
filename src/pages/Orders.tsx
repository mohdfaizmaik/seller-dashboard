import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import { getDateRangeFromPreset, formatINR } from '../services/analyticsService';
import type { Order } from '../models/order';

export const Orders: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformOverride, setPlatformOverride] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);

  const activePlatform = platformOverride !== 'all' ? platformOverride : platform;

  const filteredOrders = orders.filter((o) => {
    // 1. Platform filter
    const orderMkt = (o.marketplace || o.platform).toLowerCase();
    if (activePlatform !== 'all' && orderMkt !== activePlatform.toLowerCase()) {
      return false;
    }

    // 2. Date filter
    const rawDate = o.orderDate || o.date || '';
    if (rawDate) {
      const d = new Date(rawDate);
      if (d < start || d > end) return false;
    }

    // 3. Status filter
    if (statusFilter !== 'all' && o.status !== statusFilter) {
      return false;
    }

    // 4. Search query
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchId = (o.id || '').toLowerCase().includes(term);
      const matchSku = (o.sku || '').toLowerCase().includes(term);
      const matchFsn = (o.fsn || '').toLowerCase().includes(term);
      const matchTitle = (o.product_name || o.productName || '').toLowerCase().includes(term);
      const matchState = (o.shipToState || '').toLowerCase().includes(term);
      if (!matchId && !matchSku && !matchFsn && !matchTitle && !matchState) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadgeVariant = (status: Order['status']) => {
    switch (status) {
      case 'shipped':
      case 'delivered':
        return 'success' as const;
      case 'returned':
        return 'danger' as const;
      case 'cancelled':
        return 'neutral' as const;
      case 'pending':
        return 'warning' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Order Management & Transaction Logs"
        subtitle="Search, filter, and inspect customer transactions, status classifications, and net profitability"
      />

      {/* Filter and Search Bar */}
      <Card>
        <CardBody className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-80">
            <div className="relative w-full">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search Order ID, SKU, State, Title..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="filter-select w-full pl-8"
                style={{ height: '34px', fontSize: '12px' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            {/* Status Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ height: '34px', fontSize: '12px' }}
              >
                <option value="all">All Statuses</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="returned">Returned</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Platform Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: 'var(--text-secondary)' }}>Platform:</span>
              <select
                className="filter-select"
                value={platformOverride}
                onChange={(e) => {
                  setPlatformOverride(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ height: '34px', fontSize: '12px' }}
              >
                <option value="all">All Channels</option>
                <option value="amazon">Amazon Only</option>
                <option value="flipkart">Flipkart Only</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Orders List ({filteredOrders.length.toLocaleString('en-IN')} matches)</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded transition-colors disabled:opacity-40"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                aria-label="Previous Page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded transition-colors disabled:opacity-40"
                style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', cursor: 'pointer' }}
                aria-label="Next Page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Channel</th>
                  <th style={{ width: '28%' }}>Product & SKU</th>
                  <th>Channel Details</th>
                  <th style={{ textAlign: 'right' }}>Gross</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Fees</th>
                  <th style={{ textAlign: 'right' }}>Net Profit</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      No orders found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((o) => {
                    const plat = (o.marketplace || o.platform).toLowerCase();
                    const amount = o.gross_amount ?? o.orderValue ?? 0;
                    const fees = o.estimatedFees?.totalFees ?? 0;
                    const profit = o.estimatedNetProfit ?? 0;

                    return (
                      <tr key={`${o.id}__${o.sku}__${o.status}`}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                              {o.id}
                            </span>
                            {o.orderItemId && (
                              <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                                Item: {o.orderItemId}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
                          {(o.orderDate || o.date || '').slice(0, 10)}
                        </td>

                        <td>
                          <Badge variant={plat === 'amazon' ? 'amazon' : 'flipkart'} size="sm">
                            {plat === 'amazon' ? 'Amazon' : 'Flipkart'}
                          </Badge>
                        </td>

                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-xs truncate max-w-xs" style={{ color: 'var(--text-primary)' }} title={o.product_name || o.productName}>
                              {o.product_name || o.productName || 'Unknown Product'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <code className="text-2xs" style={{ color: 'var(--text-muted)' }}>{o.sku}</code>
                              {o.fsn && (
                                <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                                  • FSN: {o.fsn}
                                </span>
                              )}
                              {o.isShopsy && (
                                <Badge variant="warning" size="sm">Shopsy</Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="flex flex-col text-2xs" style={{ color: 'var(--text-secondary)' }}>
                            <div className="flex items-center gap-1">
                              <Badge variant="neutral" size="sm">
                                {o.fulfillmentChannel || 'MFN'}
                              </Badge>
                              <span>{o.paymentMethod || 'Prepaid'}</span>
                            </div>
                            {o.shipToState && (
                              <span className="text-muted flex items-center gap-0.5 mt-0.5">
                                <MapPin size={10} /> {o.shipToState}
                              </span>
                            )}
                          </div>
                        </td>

                        <td style={{ textAlign: 'right' }} className="font-semibold text-xs">
                          {formatINR(amount)}
                        </td>

                        <td>
                          <Badge variant={getStatusBadgeVariant(o.status)} size="sm">
                            {o.status}
                          </Badge>
                        </td>

                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }} className="text-xs">
                          {formatINR(fees)}
                        </td>

                        <td
                          style={{ textAlign: 'right' }}
                          className={`text-xs font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}`}
                        >
                          {formatINR(profit)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
export default Orders;
