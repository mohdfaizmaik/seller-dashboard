import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  TrendingUp, 
  ShoppingBag, 
  IndianRupee, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { 
  getOverviewMetrics, 
  getRecentOrders, 
  getProductRankings, 
  getPlatformBreakdown,
  getSalesTimeline
} from '../services/analyticsService';
import { useSellerData } from '../hooks/useSellerData';
import { generateRecommendations } from '../services/recommendations/recommendationEngine';
import { RecommendationsCard } from '../components/recommendations/RecommendationsCard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

export const Overview: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();
  const { orders, hasImportedData, useMockFallback, setUseMockFallback, batches } = useSellerData();

  // Retrieve calculated metrics from the analytics service using active dataset
  const kpis = getOverviewMetrics(platform, preset, startDate, endDate, orders);
  const recentOrders = getRecentOrders(platform, preset, 3, startDate, endDate, orders);
  const topProducts = getProductRankings(platform, preset, 3, startDate, endDate, orders);
  const platformShares = getPlatformBreakdown(preset, startDate, endDate, orders);
  const timelineData = getSalesTimeline(platform, preset, startDate, endDate, orders);
  const recommendations = generateRecommendations(orders);

  // Formatting helpers
  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const getGrowthIndicator = (growth: number) => {
    const absLabel = `${Math.abs(growth).toFixed(1)}%`;

    if (growth > 0) {
      return (
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)', fontWeight: 500 }}>
          <ArrowUpRight size={14} />
          <span>{absLabel}</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs previous period</span>
        </div>
      );
    }

    if (growth < 0) {
      return (
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-danger)', fontWeight: 500 }}>
          <ArrowDownRight size={14} />
          <span>{absLabel}</span>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>vs previous period</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
        <span>{absLabel}</span>
        <span style={{ fontWeight: 400 }}>vs previous period</span>
      </div>
    );
  };

  const getFilterSummary = () => {
    let summary = `Platform: ${platform.toUpperCase()} | Range: ${preset.toUpperCase()}`;
    if (preset === 'custom' && startDate && endDate) {
      summary += ` (${startDate} to ${endDate})`;
    }
    return summary;
  };

  // Find platform specific breakdown data
  const emptyPlatform = {
    revenue: 0,
    orders: 0,
    unitsSold: 0,
    fees: 0,
    returns: 0,
    profit: 0,
    margin: 0
  };
  const amazonShareData = platformShares.find(p => p.platform === 'amazon') || emptyPlatform;
  const flipkartShareData = platformShares.find(p => p.platform === 'flipkart') || emptyPlatform;
  const totalSharesRevenue = amazonShareData.revenue + flipkartShareData.revenue;

  const amazonPercentage = totalSharesRevenue > 0 ? (amazonShareData.revenue / totalSharesRevenue) * 100 : 0;
  const flipkartPercentage = totalSharesRevenue > 0 ? (flipkartShareData.revenue / totalSharesRevenue) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Page Title & Status panel */}
      <PageHeader 
        title="Overview" 
        subtitle="Unified metrics driven from deterministic seller datasets."
        actions={
          <div className="flex items-center gap-2">
            {hasImportedData && (
              <Button
                variant={useMockFallback ? 'ghost' : 'secondary'}
                size="sm"
                onClick={() => setUseMockFallback(!useMockFallback)}
                style={{ fontSize: '11px', padding: '4px 10px' }}
                title="Toggle between imported data and demo data"
              >
                {useMockFallback
                  ? 'Switch to Imported Data'
                  : `Using Imported Reports (${batches.length})`}
              </Button>
            )}
            <span className="text-xs" style={{ backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              {getFilterSummary()}
            </span>
          </div>
        }
      />

      {/* KPI Stats Cards */}
      <div className="kpi-grid">
        {/* Total Revenue card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
            <IndianRupee size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {formatINR(kpis.totalRevenue)}
              </span>
              {getGrowthIndicator(kpis.revenueGrowth)}
            </div>
          </CardBody>
        </Card>

        {/* Total Orders Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
            <ShoppingBag size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {kpis.totalOrders.toLocaleString('en-IN')}
              </span>
              {getGrowthIndicator(kpis.ordersGrowth)}
            </div>
          </CardBody>
        </Card>

        {/* Average Order Value Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
            <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {formatINR(kpis.avgOrderValue)}
              </span>
              {getGrowthIndicator(kpis.aovGrowth)}
            </div>
          </CardBody>
        </Card>

        {/* Net Profit Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
            <Percent size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0' }}>
              <span style={{
                fontSize: '22px',
                fontWeight: '700',
                color: kpis.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
              }}>
                {formatINR(kpis.netProfit)}
              </span>
              {getGrowthIndicator(kpis.profitGrowth)}
              <span
                className="text-xs"
                style={{
                  color: kpis.profitMargin >= 0 ? 'var(--text-secondary)' : 'var(--color-danger)',
                  fontWeight: 500
                }}
              >
                {kpis.profitMargin.toFixed(1)}% margin
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Seller Recommendations & Tactical Insights – Phase 6F */}
      <RecommendationsCard recommendations={recommendations} />

      {/* Main Charts area */}
      <div className="dashboard-row-grid">
        {/* Sales Trend Chart – Phase 3A */}
        <Card>
          <CardHeader>
            <CardTitle>Sales &amp; Revenue Trends</CardTitle>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Daily aggregation</span>
          </CardHeader>
          <CardBody>
            {timelineData.length === 0 ? (
              <div
                style={{
                  height: '240px',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(31, 41, 55, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <TrendingUp size={32} style={{ color: 'var(--text-muted)' }} />
                <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>No sales data for this period</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={timelineData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border-color)' }}
                    tickFormatter={(value: string) => {
                      const d = new Date(value);
                      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(value: number) =>
                      new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0,
                        notation: 'compact'
                      }).format(value)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '12px'
                    }}
                    labelFormatter={(label) => {
                      const d = new Date(String(label));
                      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
                    }}
                    formatter={(value) => [
                      new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        maximumFractionDigits: 0
                      }).format(Number(value)),
                      'Net Sales'
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="netSales"
                    name="Net Sales"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Platform Performance comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Amazon vs Flipkart</span>
          </CardHeader>
          <CardBody>
            {totalSharesRevenue === 0 ? (
              <div
                className="flex items-center justify-center"
                style={{ height: '180px', color: 'var(--text-muted)' }}
              >
                No platform data for this period
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                {/* Amazon */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Amazon</span>
                    <span className="font-semibold" style={{ color: 'var(--color-amazon)' }}>
                      {amazonPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${amazonPercentage}%`, backgroundColor: 'var(--color-amazon)' }} />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px 12px',
                      fontSize: '12px'
                    }}
                  >
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Revenue</span>
                      <span className="font-medium">{formatINR(amazonShareData.revenue)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Orders</span>
                      <span className="font-medium">{amazonShareData.orders.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Units Sold</span>
                      <span className="font-medium">{amazonShareData.unitsSold.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Marketplace Fees</span>
                      <span className="font-medium">{formatINR(amazonShareData.fees)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Returns</span>
                      <span className="font-medium">{amazonShareData.returns.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Net Profit</span>
                      <span
                        className="font-medium"
                        style={{ color: amazonShareData.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                      >
                        {formatINR(amazonShareData.profit)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2" style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Profit Margin</span>
                      <span
                        className="font-medium"
                        style={{ color: amazonShareData.margin >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}
                      >
                        {amazonShareData.margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Flipkart */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium">Flipkart</span>
                    <span className="font-semibold" style={{ color: 'var(--color-flipkart)' }}>
                      {flipkartPercentage.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${flipkartPercentage}%`, backgroundColor: 'var(--color-flipkart)' }} />
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '6px 12px',
                      fontSize: '12px'
                    }}
                  >
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Revenue</span>
                      <span className="font-medium">{formatINR(flipkartShareData.revenue)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Orders</span>
                      <span className="font-medium">{flipkartShareData.orders.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Units Sold</span>
                      <span className="font-medium">{flipkartShareData.unitsSold.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Marketplace Fees</span>
                      <span className="font-medium">{formatINR(flipkartShareData.fees)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Returns</span>
                      <span className="font-medium">{flipkartShareData.returns.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span style={{ color: 'var(--text-secondary)' }}>Net Profit</span>
                      <span
                        className="font-medium"
                        style={{ color: flipkartShareData.profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                      >
                        {formatINR(flipkartShareData.profit)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2" style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Profit Margin</span>
                      <span
                        className="font-medium"
                        style={{ color: flipkartShareData.margin >= 0 ? 'var(--text-primary)' : 'var(--color-danger)' }}
                      >
                        {flipkartShareData.margin.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Detailed listing structures */}
      <div className="grid-equal-2col">
        {/* Top Product listings placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
            <Button variant="ghost" size="sm">View Products</Button>
          </CardHeader>
          <CardBody>
            <div className="table-container">
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: '180px', color: 'var(--text-muted)' }}>
                  No product data for this period
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product details</th>
                      <th style={{ textAlign: 'right' }}>Units sold</th>
                      <th style={{ textAlign: 'right' }}>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map(p => (
                      <tr key={p.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm" style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {p.name}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: {p.sku}</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.unitsSold}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>
                          {formatINR(p.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Recent orders logs placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <Button variant="ghost" size="sm">View Orders</Button>
          </CardHeader>
          <CardBody>
            <div className="table-container">
              {recentOrders.length === 0 ? (
                <div className="flex items-center justify-center" style={{ height: '180px', color: 'var(--text-muted)' }}>
                  No orders for this period
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Platform</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map(o => (
                      <tr key={o.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{o.id}</span>
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{o.orderDate}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={o.platform === 'amazon' ? 'amazon' : 'flipkart'}>
                            {o.platform}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatINR(o.orderValue)}</td>
                        <td>
                          <Badge 
                            variant={
                              o.status === 'delivered' ? 'success' :
                              o.status === 'shipped' ? 'info' :
                              o.status === 'pending' ? 'warning' : 'danger'
                            }
                          >
                            {o.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default Overview;
