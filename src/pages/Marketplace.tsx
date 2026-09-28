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
  const { amazon, flipkart, meesho, blended } = comparison;

  type PlatformKey = 'amazon' | 'flipkart' | 'meesho';

  const getChannelLeader = (
    candidates: { key: PlatformKey; label: string; value: number }[],
    higherIsBetter = true
  ): { key: PlatformKey; label: string; value: number } | 'tie' => {
    const valid = candidates.filter((c) => c.value !== undefined && !isNaN(c.value));
    if (valid.length === 0) return 'tie';
    const sorted = [...valid].sort((a, b) =>
      higherIsBetter ? b.value - a.value : a.value - b.value
    );
    if (sorted.length > 1 && sorted[0].value === sorted[1].value) return 'tie';
    return sorted[0];
  };

  const revenueLeader = getChannelLeader([
    { key: 'amazon', label: 'Amazon', value: amazon.grossRevenue },
    { key: 'flipkart', label: 'Flipkart', value: flipkart.grossRevenue },
    { key: 'meesho', label: 'Meesho', value: meesho.grossRevenue }
  ]);

  const marginLeader = getChannelLeader([
    { key: 'amazon', label: 'Amazon', value: amazon.profitMargin },
    { key: 'flipkart', label: 'Flipkart', value: flipkart.profitMargin },
    { key: 'meesho', label: 'Meesho', value: meesho.profitMargin }
  ]);

  const returnLeader = getChannelLeader([
    { key: 'amazon', label: 'Amazon', value: amazon.returnRate },
    { key: 'flipkart', label: 'Flipkart', value: flipkart.returnRate },
    { key: 'meesho', label: 'Meesho', value: meesho.returnRate }
  ], false);

  const aovLeader = getChannelLeader([
    { key: 'amazon', label: 'Amazon', value: amazon.aov },
    { key: 'flipkart', label: 'Flipkart', value: flipkart.aov },
    { key: 'meesho', label: 'Meesho', value: meesho.aov }
  ]);

  const unitsLeader = getChannelLeader([
    { key: 'amazon', label: 'Amazon', value: amazon.unitsSold },
    { key: 'flipkart', label: 'Flipkart', value: flipkart.unitsSold },
    { key: 'meesho', label: 'Meesho', value: meesho.unitsSold }
  ]);

  return (
    <div className="flex flex-col gap-5">
      {/* Page Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          title="Marketplace Performance & Comparison"
          subtitle="Side-by-side contrast of sales, unit economics, fee structures, and return rates across Amazon, Flipkart & Meesho"
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
            Tri-Marketplace Contrast
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
          <div className="kpi-grid">
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

            {/* Meesho Summary Card */}
            <Card style={{ borderTop: '4px solid #F43397' }}>
              <CardHeader className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="meesho" size="sm">
                    Meesho
                  </Badge>
                  <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                    Orders Report / 0% Comm
                  </span>
                </div>
                <span className="font-semibold text-xs" style={{ color: '#F43397' }}>
                  {meesho.orderCount} Orders
                </span>
              </CardHeader>
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gross Revenue</span>
                  <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {formatINR(meesho.grossRevenue)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Profit</span>
                    <p className="font-semibold text-sm" style={{ color: meesho.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                      {formatINR(meesho.netProfit)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Net Margin</span>
                    <p className="font-semibold text-sm" style={{ color: meesho.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                      {formatPercent(meesho.profitMargin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Return Rate</span>
                    <p className="font-semibold text-sm" style={{ color: meesho.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                      {formatPercent(meesho.returnRate)} ({meesho.returnedCount})
                    </p>
                  </div>
                  <div>
                    <span className="text-2xs" style={{ color: 'var(--text-muted)' }}>Avg Order Value</span>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatINR(meesho.aov)}
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
                Comparing Amazon ({amazon.orderCount}), Flipkart ({flipkart.orderCount}), and Meesho ({meesho.orderCount}) orders
              </span>
            </CardHeader>
            <CardBody className="p-0">
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Metric</th>
                      <th style={{ width: '19%', color: '#FF9900' }}>Amazon India</th>
                      <th style={{ width: '19%', color: '#2874F0' }}>Flipkart</th>
                      <th style={{ width: '19%', color: '#F43397' }}>Meesho</th>
                      <th style={{ width: '21%', textAlign: 'center' }}>Advantage / Leader</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="font-medium text-sm">Gross Revenue</td>
                      <td className="font-semibold text-sm">{formatINR(amazon.grossRevenue)}</td>
                      <td className="font-semibold text-sm">{formatINR(flipkart.grossRevenue)}</td>
                      <td className="font-semibold text-sm">{formatINR(meesho.grossRevenue)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {revenueLeader !== 'tie' ? (
                          <Badge variant={revenueLeader.key} size="sm">
                            {revenueLeader.label} Leads ({formatINR(revenueLeader.value)})
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
                      <td className="text-sm">{meesho.unitsSold.toLocaleString('en-IN')} units</td>
                      <td style={{ textAlign: 'center' }}>
                        {unitsLeader !== 'tie' ? (
                          <Badge variant={unitsLeader.key} size="sm">
                            {unitsLeader.label} ({unitsLeader.value.toLocaleString('en-IN')} units)
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
                      <td className="text-sm">{formatINR(meesho.aov)}</td>
                      <td style={{ textAlign: 'center' }}>
                        {aovLeader !== 'tie' ? (
                          <Badge variant={aovLeader.key} size="sm">
                            {aovLeader.label} ({formatINR(aovLeader.value)})
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
                      <td className="text-sm font-semibold" style={{ color: meesho.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        {formatPercent(meesho.profitMargin)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {marginLeader !== 'tie' ? (
                          <Badge variant={marginLeader.key} size="sm">
                            {marginLeader.label} ({formatPercent(marginLeader.value)})
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Equal</Badge>
                        )}
                      </td>
                    </tr>

                    <tr>
                      <td className="font-medium text-sm">Customer Return Rate</td>
                      <td className="text-sm" style={{ color: amazon.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {formatPercent(amazon.returnRate)} ({amazon.returnedCount} ret)
                      </td>
                      <td className="text-sm" style={{ color: flipkart.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {formatPercent(flipkart.returnRate)} ({flipkart.returnedCount} ret)
                      </td>
                      <td className="text-sm" style={{ color: meesho.returnRate > 15 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        {formatPercent(meesho.returnRate)} ({meesho.returnedCount} ret)
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {returnLeader !== 'tie' ? (
                          <Badge variant={returnLeader.key} size="sm">
                            {returnLeader.label} ({formatPercent(returnLeader.value)} lowest)
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
                      <td className="text-sm">{meesho.cancelledCount} cancelled</td>
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
                      <td className="text-sm">{formatINR(meesho.marketplaceFees)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge variant="meesho" size="sm">
                          Meesho 0% Commission
                        </Badge>
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
