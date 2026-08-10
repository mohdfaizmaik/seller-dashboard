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
  getPlatformBreakdown 
} from '../services/analyticsService';

export const Overview: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();

  // Retrieve calculated metrics from the analytics service
  const kpis = getOverviewMetrics(platform, preset, startDate, endDate);
  const recentOrders = getRecentOrders(platform, preset, 3, startDate, endDate);
  const topProducts = getProductRankings(platform, preset, 3, startDate, endDate);
  const platformShares = getPlatformBreakdown(preset, startDate, endDate);

  // Formatting helpers
  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const getGrowthBadge = (growth: number) => {
    if (growth > 0) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <ArrowUpRight size={10} />
          {formatPercentage(growth)}
        </Badge>
      );
    } else if (growth < 0) {
      return (
        <Badge variant="danger" className="flex items-center gap-1">
          <ArrowDownRight size={10} />
          {formatPercentage(growth)}
        </Badge>
      );
    }
    return <Badge variant="neutral">{formatPercentage(growth)}</Badge>;
  };

  const getFilterSummary = () => {
    let summary = `Platform: ${platform.toUpperCase()} | Range: ${preset.toUpperCase()}`;
    if (preset === 'custom' && startDate && endDate) {
      summary += ` (${startDate} to ${endDate})`;
    }
    return summary;
  };

  // Find platform specific breakdown data
  const amazonShareData = platformShares.find(p => p.platform === 'amazon') || { revenue: 0, orders: 0 };
  const flipkartShareData = platformShares.find(p => p.platform === 'flipkart') || { revenue: 0, orders: 0 };
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
            <span className="text-xs" style={{ backgroundColor: 'var(--bg-surface)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              {getFilterSummary()}
            </span>
            <Button variant="primary" size="sm">
              Sync Data
            </Button>
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
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {formatINR(kpis.totalRevenue)}
              </span>
              {getGrowthBadge(kpis.revenueGrowth)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs. previous period</p>
          </CardBody>
        </Card>

        {/* Total Orders Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Total Orders</CardTitle>
            <ShoppingBag size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {kpis.totalOrders.toLocaleString('en-IN')}
              </span>
              {getGrowthBadge(kpis.ordersGrowth)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs. previous period</p>
          </CardBody>
        </Card>

        {/* Average Order Value Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Average Order Value</CardTitle>
            <TrendingUp size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
              <span style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {formatINR(kpis.avgOrderValue)}
              </span>
              {getGrowthBadge(kpis.aovGrowth)}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs. previous period</p>
          </CardBody>
        </Card>

        {/* Net Profit Margin Card */}
        <Card hoverable>
          <CardHeader>
            <CardTitle>Net Profit</CardTitle>
            <Percent size={16} style={{ color: 'var(--text-muted)' }} />
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
              <span style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                color: kpis.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' 
              }}>
                {formatINR(kpis.netProfit)}
              </span>
              <Badge variant={kpis.netProfit >= 0 ? 'success' : 'danger'}>
                {kpis.totalRevenue > 0 ? `${((kpis.netProfit / kpis.totalRevenue) * 100).toFixed(1)}% margin` : '0% margin'}
              </Badge>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>vs. previous period ({formatPercentage(kpis.profitGrowth)})</p>
          </CardBody>
        </Card>
      </div>

      {/* Main Charts area */}
      <div className="dashboard-row-grid">
        {/* Sales trends placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Sales & Revenue Trends</CardTitle>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Daily aggregation</span>
          </CardHeader>
          <CardBody>
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
              <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Sales Trend Chart Placeholder</span>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)', maxWidth: '280px' }}>
                Recharts interactive visualization will be integrated here during Phase 3.
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Platform Comparison details panel */}
        <Card>
          <CardHeader>
            <CardTitle>Platform Share</CardTitle>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Revenue Split</span>
          </CardHeader>
          <CardBody className="flex flex-col gap-6">
            {/* Amazon Progress bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Amazon</span>
                <span className="font-semibold" style={{ color: 'var(--color-amazon)' }}>
                  {amazonPercentage.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${amazonPercentage}%`, backgroundColor: 'var(--color-amazon)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{formatINR(amazonShareData.revenue)}</span>
                <span>{amazonShareData.orders} Orders</span>
              </div>
            </div>

            {/* Flipkart Progress bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Flipkart</span>
                <span className="font-semibold" style={{ color: 'var(--color-flipkart)' }}>
                  {flipkartPercentage.toFixed(0)}%
                </span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${flipkartPercentage}%`, backgroundColor: 'var(--color-flipkart)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>{formatINR(flipkartShareData.revenue)}</span>
                <span>{flipkartShareData.orders} Orders</span>
              </div>
            </div>
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
