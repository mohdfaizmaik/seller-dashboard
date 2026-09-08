import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  TrendingUp,
  MapPin
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import {
  getDateRangeFromPreset,
  getSalesTimeline,
  getRegionalDistribution,
  calculateFinancialSummary,
  formatINR,
  formatPercent
} from '../services/analyticsService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const Sales: React.FC = () => {
  const { preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();
  const [platformFilter, setPlatformFilter] = useState<'all' | 'amazon' | 'flipkart'>('all');

  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);
  const timelineData = getSalesTimeline(platformFilter, preset, startDate, endDate, orders);
  const regionalData = getRegionalDistribution(orders, start, end, platformFilter);
  const financialSummary = calculateFinancialSummary(orders, start, end, platformFilter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Sales & Revenue Analytics"
          subtitle="Blended timeline trends, channel toggling, and regional Indian demand distribution"
        />

        {/* Platform View Toggle */}
        <div
          className="flex items-center gap-1 p-1 rounded-lg self-start sm:self-auto"
          style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
        >
          <button
            type="button"
            onClick={() => setPlatformFilter('all')}
            className="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors"
            style={{
              backgroundColor: platformFilter === 'all' ? 'var(--bg-card)' : 'transparent',
              color: platformFilter === 'all' ? 'var(--color-primary)' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            All Platforms
          </button>
          <button
            type="button"
            onClick={() => setPlatformFilter('amazon')}
            className="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: platformFilter === 'amazon' ? 'var(--bg-card)' : 'transparent',
              color: platformFilter === 'amazon' ? '#FF9900' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Badge variant="amazon" size="sm">Amazon</Badge>
          </button>
          <button
            type="button"
            onClick={() => setPlatformFilter('flipkart')}
            className="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: platformFilter === 'flipkart' ? 'var(--bg-card)' : 'transparent',
              color: platformFilter === 'flipkart' ? '#2874F0' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Badge variant="flipkart" size="sm">Flipkart</Badge>
          </button>
        </div>
      </div>

      {/* Sales KPI Strip */}
      <div className="dashboard-grid">
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Gross Sales Revenue
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatINR(financialSummary.grossRevenue)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Across {financialSummary.orderCount} fulfilled orders
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Net Realized Sales
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {formatINR(financialSummary.netSales)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              After {formatINR(financialSummary.refundedValue)} in return refunds
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Units Fulfilled
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {financialSummary.unitsSold.toLocaleString('en-IN')}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Avg Order Value: {formatINR(financialSummary.aov)}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Customer Returns
            </span>
            <span
              className="text-xl font-bold"
              style={{
                color: financialSummary.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)'
              }}
            >
              {financialSummary.returnedOrderCount} ({formatPercent(financialSummary.returnRate)})
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              {financialSummary.cancelledOrderCount} buyer cancellations
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Main Revenue Timeline Chart */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Revenue Timeline</CardTitle>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Continuous daily sales curve for {platformFilter.toUpperCase()}
            </p>
          </div>
          <Badge variant="neutral" size="sm">
            {timelineData.length} Days
          </Badge>
        </CardHeader>
        <CardBody>
          {timelineData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp size={32} />
              <span>No orders found in the selected date window</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="salesNetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatINR(Number(val) || 0), '']}
                  labelFormatter={(lbl: unknown) =>
                    lbl
                      ? new Date(String(lbl)).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })
                      : ''
                  }
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="grossRevenue"
                  name="Gross Revenue"
                  stroke="var(--color-primary)"
                  fillOpacity={1}
                  fill="url(#salesRevGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="netSales"
                  name="Net Sales"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#salesNetGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      {/* Regional Indian Demand Distribution */}
      <div className="dashboard-row-grid">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
              <CardTitle>Regional Distribution (India Zones)</CardTitle>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Aggregated from delivery states
            </span>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionalData.filter((r) => r.orderCount > 0)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(val: number) => `₹${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: unknown) => [formatINR(Number(val) || 0), 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)'
                  }}
                />
                <Bar dataKey="revenue" name="Revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Regional breakdown list */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              {regionalData.map((r) => (
                <div key={r.region} className="p-2 rounded" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{r.region}</span>
                    <span className="text-2xs font-bold text-primary">{r.percentage}%</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>{r.orderCount} orders</span>
                    <span className="text-xs font-semibold">{formatINR(r.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Daily Breakdown Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Logged Sales</CardTitle>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Latest activity rows</span>
          </CardHeader>
          <CardBody className="p-0">
            <div className="table-container" style={{ maxHeight: '310px' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Orders</th>
                    <th style={{ textAlign: 'right' }}>Units</th>
                    <th style={{ textAlign: 'right' }}>Gross</th>
                    <th style={{ textAlign: 'right' }}>Net Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {timelineData.slice(-10).reverse().map((d) => (
                    <tr key={d.date}>
                      <td className="font-medium text-xs">{d.date}</td>
                      <td style={{ textAlign: 'right' }} className="text-xs">{d.orderCount}</td>
                      <td style={{ textAlign: 'right' }} className="text-xs">{d.unitsSold}</td>
                      <td style={{ textAlign: 'right' }} className="text-xs font-semibold">{formatINR(d.grossRevenue)}</td>
                      <td style={{ textAlign: 'right' }} className="text-xs font-semibold text-success">{formatINR(d.netSales)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default Sales;
