import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import {
  Store,
  Scale
} from 'lucide-react';
import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import {
  getDateRangeFromPreset,
  getMarketplaceComparison,
  formatINR,
  formatPercent
} from '../services/analyticsService';
import { MarketplacePerformance } from './MarketplacePerformance';

export const Marketplace: React.FC = () => {
  const { preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();
  const [activeView, setActiveView] = useState<'comparison' | 'performance'>('comparison');

  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);
  const comparison = getMarketplaceComparison(orders, start, end);
  const { amazon, flipkart, blended } = comparison;

  const getWinner = (val1: number, val2: number, higherIsBetter = true) => {
    if (val1 === val2) return 'tie';
    if (higherIsBetter) return val1 > val2 ? 'amazon' : 'flipkart';
    return val1 < val2 ? 'amazon' : 'flipkart';
  };

  const revenueWinner = getWinner(amazon.grossRevenue, flipkart.grossRevenue);
  const marginWinner = getWinner(amazon.profitMargin, flipkart.profitMargin);
  const returnWinner = getWinner(amazon.returnRate, flipkart.returnRate, false);
  const aovWinner = getWinner(amazon.aov, flipkart.aov);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Marketplace Performance & Comparison"
          subtitle="Side-by-side contrast of sales, unit economics, fee structures, and return rates across Amazon & Flipkart"
        />

        <div className="flex items-center gap-1 p-1 rounded-lg self-start sm:self-auto" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setActiveView('comparison')}
            className="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: activeView === 'comparison' ? 'var(--bg-card)' : 'transparent',
              color: activeView === 'comparison' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: activeView === 'comparison' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Scale size={14} />
            Dual-Marketplace Contrast
          </button>

          <button
            type="button"
            onClick={() => setActiveView('performance')}
            className="text-xs font-semibold py-1.5 px-3 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: activeView === 'performance' ? 'var(--bg-card)' : 'transparent',
              color: activeView === 'performance' ? 'var(--color-primary)' : 'var(--text-secondary)',
              boxShadow: activeView === 'performance' ? 'var(--shadow-sm)' : 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <Store size={14} />
            SP-API Daily Reports
          </button>
        </div>
      </div>

      {activeView === 'performance' ? (
        <MarketplacePerformance />
      ) : (
        <>
          {/* Executive Comparison Summary Cards */}
          <div className="dashboard-grid">
            {/* Amazon Summary Card */}
            <Card style={{ borderTop: '4px solid #FF9900' }}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="amazon" size="sm">
                    Amazon India
                  </Badge>
                  <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                    Standard Flat File / MTR
                  </span>
                </div>
                <span className="font-semibold text-xs" style={{ color: '#FF9900' }}>
                  {amazon.orderCount} Orders
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gross Revenue</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatINR(amazon.grossRevenue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Profit</span>
                    <p className="font-semibold text-sm" style={{ color: amazon.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatINR(amazon.netProfit)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Margin</span>
                    <p className="font-semibold text-sm" style={{ color: amazon.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatPercent(amazon.profitMargin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Return Rate</span>
                    <p className="font-semibold text-sm" style={{ color: amazon.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                      {formatPercent(amazon.returnRate)} ({amazon.returnedCount})
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Avg Order Value</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatINR(amazon.aov)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Flipkart Summary Card */}
            <Card style={{ borderTop: '4px solid #2874F0' }}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="flipkart" size="sm">
                    Flipkart
                  </Badge>
                  <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                    GSTR-1 / Sales Report
                  </span>
                </div>
                <span className="font-semibold text-xs" style={{ color: '#2874F0' }}>
                  {flipkart.orderCount} Orders
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gross Revenue</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatINR(flipkart.grossRevenue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Profit</span>
                    <p className="font-semibold text-sm" style={{ color: flipkart.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatINR(flipkart.netProfit)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Margin</span>
                    <p className="font-semibold text-sm" style={{ color: flipkart.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatPercent(flipkart.profitMargin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Return Rate</span>
                    <p className="font-semibold text-sm" style={{ color: flipkart.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                      {formatPercent(flipkart.returnRate)} ({flipkart.returnedCount})
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Avg Order Value</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatINR(flipkart.aov)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Combined Blended Summary Card */}
            <Card style={{ borderTop: '4px solid var(--color-primary)' }}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="primary" size="sm">
                    Blended Total
                  </Badge>
                  <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                    Cross-Channel Aggregate
                  </span>
                </div>
                <span className="font-semibold text-xs" style={{ color: 'var(--color-primary)' }}>
                  {blended.orderCount} Orders
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Combined Revenue</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatINR(blended.grossRevenue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Total Net Profit</span>
                    <p className="font-semibold text-sm" style={{ color: blended.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatINR(blended.netProfit)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Blended Margin</span>
                    <p className="font-semibold text-sm" style={{ color: blended.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatPercent(blended.profitMargin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Blended Returns</span>
                    <p className="font-semibold text-sm" style={{ color: blended.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                      {formatPercent(blended.returnRate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Est. Total Fees</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatINR(blended.marketplaceFees)}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Side-by-Side Detailed Comparison Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Side-by-Side Operational Benchmarks</CardTitle>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Comparing {amazon.orderCount} Amazon vs {flipkart.orderCount} Flipkart orders
              </span>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Metric</th>
                      <th style={{ width: '25%', color: '#FF9900' }}>Amazon India</th>
                      <th style={{ width: '25%', color: '#2874F0' }}>Flipkart</th>
                      <th style={{ width: '20%', textAlign: 'center' }}>Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-sm">Gross Revenue</td>
                      <td className="font-semibold text-sm">{formatINR(amazon.grossRevenue)}</td>
                      <td className="font-semibold text-sm">{formatINR(flipkart.grossRevenue)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {revenueWinner !== 'tie' ? (
                          <Badge variant={revenueWinner === 'amazon' ? 'amazon' : 'flipkart'} size="sm">
                            {revenueWinner === 'amazon' ? 'Amazon + ' : 'Flipkart + '}
                            {formatINR(Math.abs(amazon.grossRevenue - flipkart.grossRevenue))}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Parity</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Units Sold</td>
                      <td className="text-sm">{amazon.unitsSold.toLocaleString('en-IN')} units</td>
                      <td className="text-sm">{flipkart.unitsSold.toLocaleString('en-IN')} units</td>
                      <td style={{ textAlign: 'center' }}>
                        {amazon.unitsSold !== flipkart.unitsSold ? (
                          <Badge variant={amazon.unitsSold > flipkart.unitsSold ? 'amazon' : 'flipkart'} size="sm">
                            {amazon.unitsSold > flipkart.unitsSold ? 'Amazon' : 'Flipkart'} Leads
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Equal</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Average Order Value (AOV)</td>
                      <td className="text-sm">{formatINR(amazon.aov)}</td>
                      <td className="text-sm">{formatINR(flipkart.aov)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {aovWinner !== 'tie' ? (
                          <Badge variant={aovWinner === 'amazon' ? 'amazon' : 'flipkart'} size="sm">
                            {aovWinner === 'amazon' ? 'Amazon (+ ' : 'Flipkart (+ '}
                            {formatINR(Math.abs(amazon.aov - flipkart.aov))})
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Equal</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Net Profit Margin</td>
                      <td className="text-sm font-semibold" style={{ color: amazon.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {formatPercent(amazon.profitMargin)}
                      </td>
                      <td className="text-sm font-semibold" style={{ color: flipkart.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {formatPercent(flipkart.profitMargin)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {marginWinner !== 'tie' ? (
                          <Badge variant={marginWinner === 'amazon' ? 'amazon' : 'flipkart'} size="sm">
                            {marginWinner === 'amazon' ? 'Amazon' : 'Flipkart'} (+{Math.abs(amazon.profitMargin - flipkart.profitMargin).toFixed(1)}%)
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Equal</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Customer Return Rate</td>
                      <td className="text-sm" style={{ color: amazon.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {formatPercent(amazon.returnRate)} ({amazon.returnedCount} returned)
                      </td>
                      <td className="text-sm" style={{ color: flipkart.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {formatPercent(flipkart.returnRate)} ({flipkart.returnedCount} returned)
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {returnWinner !== 'tie' ? (
                          <Badge variant={returnWinner === 'amazon' ? 'amazon' : 'flipkart'} size="sm">
                            {returnWinner === 'amazon' ? 'Amazon Lower Returns' : 'Flipkart Lower Returns'}
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Equal</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Cancellation Count</td>
                      <td className="text-sm">{amazon.cancelledCount} cancelled</td>
                      <td className="text-sm">{flipkart.cancelledCount} cancelled</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Excluded from revenue
                        </span>
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Estimated Marketplace Fees</td>
                      <td className="text-sm">{formatINR(amazon.marketplaceFees)}</td>
                      <td className="text-sm">{formatINR(flipkart.marketplaceFees)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          15% + ₹20 (Az) vs 12% + ₹15 (Fk)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
};
export default Marketplace;
