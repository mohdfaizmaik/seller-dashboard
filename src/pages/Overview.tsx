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

export const Overview: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();

  // Print current filters for visual confirmation in this skeleton phase
  const getFilterSummary = () => {
    let summary = `Platform: ${platform.toUpperCase()} | Range: ${preset.toUpperCase()}`;
    if (preset === 'custom' && startDate && endDate) {
      summary += ` (${startDate} to ${endDate})`;
    }
    return summary;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Page Title & Status actions */}
      <PageHeader 
        title="Overview" 
        subtitle="Unified view of your ecommerce platforms performance."
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
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>₹4,52,890.00</span>
              <Badge variant="success" className="flex items-center gap-1">
                <ArrowUpRight size={10} />
                +12.4%
              </Badge>
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
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>1,842</span>
              <Badge variant="success" className="flex items-center gap-1">
                <ArrowUpRight size={10} />
                +8.2%
              </Badge>
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
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>₹245.86</span>
              <Badge variant="danger" className="flex items-center gap-1">
                <ArrowDownRight size={10} />
                -1.5%
              </Badge>
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
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>₹98,400.00</span>
              <Badge variant="success" className="flex items-center gap-1">
                21.7% margin
              </Badge>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net profit margin this period</p>
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
                height: '300px', 
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
                <span className="font-semibold" style={{ color: 'var(--color-amazon)' }}>60%</span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '60%', backgroundColor: 'var(--color-amazon)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>₹2,71,734.00</span>
                <span>1,105 Orders</span>
              </div>
            </div>

            {/* Flipkart Progress bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium">Flipkart</span>
                <span className="font-semibold" style={{ color: 'var(--color-flipkart)' }}>40%</span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--border-color)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: '40%', backgroundColor: 'var(--color-flipkart)' }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>₹1,81,156.00</span>
                <span>737 Orders</span>
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
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product details</th>
                    <th style={{ textAlign: 'right' }}>Units sold</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">Wireless Noise-Cancelling Headphones</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: WH-1000XM4</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>245</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>₹4,90,000.00</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">Ergonomic Office Chair</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: CH-ERGO-01</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>182</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>₹3,27,600.00</td>
                  </tr>
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">Smart Fitness Band Pro</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>SKU: SM-FIT-BAND</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>156</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-success)' }}>₹2,34,000.00</td>
                  </tr>
                </tbody>
              </table>
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
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">OD9830217983</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2026-08-10</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant="amazon">Amazon</Badge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>₹2,499.00</td>
                    <td>
                      <Badge variant="success">Delivered</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">OD4829018742</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2026-08-10</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant="flipkart">Flipkart</Badge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>₹899.00</td>
                    <td>
                      <Badge variant="warning">Pending</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">OD7891230491</span>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2026-08-09</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant="amazon">Amazon</Badge>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 500 }}>₹12,450.00</td>
                    <td>
                      <Badge variant="danger">Returned</Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default Overview;
