import React from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import {
  getDateRangeFromPreset,
  calculateFinancialSummary,
  formatINR,
  formatPercent
} from '../services/analyticsService';

export const Profit: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();

  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);
  const summary = calculateFinancialSummary(orders, start, end, platform);
  const azSummary = calculateFinancialSummary(orders, start, end, 'amazon');
  const fkSummary = calculateFinancialSummary(orders, start, end, 'flipkart');

  const waterfallItems = [
    {
      label: 'Gross Sales Revenue',
      amount: summary.grossRevenue,
      type: 'positive' as const,
      description: 'Total value of all non-cancelled orders fulfilled'
    },
    {
      label: 'Less: Customer Returns (Refunds)',
      amount: -summary.refundedValue,
      type: 'negative' as const,
      description: `${summary.returnedOrderCount} returned units refunded to customers`
    },
    {
      label: 'Net Realized Sales',
      amount: summary.netSales,
      type: 'subtotal' as const,
      description: 'Gross Sales minus Customer Refunds'
    },
    {
      label: 'Less: Cost of Goods Sold (COGS)',
      amount: -summary.cogs,
      type: 'negative' as const,
      description: 'Direct manufacturing / acquisition costs of fulfilled items'
    },
    {
      label: 'Less: Marketplace Commissions & Closing Fees',
      amount: -summary.marketplaceFees,
      type: 'negative' as const,
      description: 'Referral fee % plus fixed per-order closing fees'
    },
    {
      label: 'Less: Forward Fulfillment Shipping',
      amount: -summary.shipping,
      type: 'negative' as const,
      description: 'Outbound courier and warehouse dispatch expenses'
    },
    {
      label: 'Less: Advertising / Sponsored Listings',
      amount: -summary.advertising,
      type: 'negative' as const,
      description: 'Allocated daily campaign spend across marketplaces'
    },
    {
      label: 'Less: Return Reverse Logistics & Damage',
      amount: -summary.returnRelatedCosts,
      type: 'negative' as const,
      description: 'Reverse courier shipping, warehouse restocking & inventory write-offs'
    },
    {
      label: 'Net Operating Profit',
      amount: summary.netProfit,
      type: 'total' as const,
      description: `Final realized bottom line (${formatPercent(summary.profitMargin)} margin)`
    }
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Profit & Loss Statement (P&L)"
        subtitle="Full operational waterfall breakdown from top-line gross revenue to bottom-line net profit"
      />

      {/* High-Level P&L Summary Cards */}
      <div className="dashboard-grid">
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Gross Revenue
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatINR(summary.grossRevenue)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Net Sales: {formatINR(summary.netSales)}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Marketplace Deductions
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--color-warning)' }}>
              {formatINR(summary.marketplaceFees + summary.shipping)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Fees: {formatINR(summary.marketplaceFees)} • Ship: {formatINR(summary.shipping)}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Total COGS & Logistics
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>
              {formatINR(summary.cogs + summary.returnRelatedCosts)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              COGS: {formatINR(summary.cogs)} • Returns: {formatINR(summary.returnRelatedCosts)}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Net Operating Profit
            </span>
            <span
              className={`text-xl font-bold ${summary.netProfit >= 0 ? 'text-success' : 'text-danger'}`}
            >
              {formatINR(summary.netProfit)}
            </span>
            <span
              className="text-2xs font-semibold"
              style={{
                color: summary.profitMargin >= 10 ? 'var(--color-success)' : 'var(--color-warning)'
              }}
            >
              {formatPercent(summary.profitMargin)} Net Margin
            </span>
          </CardBody>
        </Card>
      </div>

      {/* P&L Waterfall Card */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Accounting Waterfall Statement</CardTitle>
          <Badge variant="neutral" size="sm">
            {platform.toUpperCase()}
          </Badge>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '45%' }}>Line Item</th>
                  <th style={{ width: '35%' }}>Description</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                {waterfallItems.map((item) => {
                  const isSubtotal = item.type === 'subtotal';
                  const isTotal = item.type === 'total';

                  return (
                    <tr
                      key={item.label}
                      style={{
                        backgroundColor: isTotal
                          ? 'rgba(16, 185, 129, 0.08)'
                          : isSubtotal
                          ? 'var(--bg-secondary)'
                          : 'transparent',
                        fontWeight: isTotal || isSubtotal ? 600 : 400
                      }}
                    >
                      <td>
                        <span
                          className={`text-xs ${
                            isTotal
                              ? 'text-sm font-bold text-primary'
                              : isSubtotal
                              ? 'font-semibold'
                              : ''
                          }`}
                          style={{
                            paddingLeft: !isSubtotal && !isTotal && item.type === 'negative' ? '12px' : '0'
                          }}
                        >
                          {item.label}
                        </span>
                      </td>

                      <td className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                        {item.description}
                      </td>

                      <td
                        style={{ textAlign: 'right' }}
                        className={`text-xs font-semibold ${
                          isTotal
                            ? item.amount >= 0
                              ? 'text-success text-base font-bold'
                              : 'text-danger text-base font-bold'
                            : item.type === 'negative'
                            ? 'text-danger'
                            : isSubtotal
                            ? 'text-primary'
                            : ''
                        }`}
                      >
                        {formatINR(item.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Cross-Marketplace Fee Comparison */}
      <div className="dashboard-row-grid">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="amazon" size="sm">Amazon India</Badge>
              <CardTitle>Amazon Fee Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Referral Rate</span>
              <span className="font-semibold">15% of Order Value</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fixed Closing Fee</span>
              <span className="font-semibold">₹20 per fulfilled order</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Referral + Closing</span>
              <span className="font-semibold">{formatINR(azSummary.marketplaceFees)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Shipping</span>
              <span className="font-semibold">{formatINR(azSummary.shipping)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Amazon Net Profit</span>
              <span className={azSummary.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                {formatINR(azSummary.netProfit)} ({formatPercent(azSummary.profitMargin)})
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="flipkart" size="sm">Flipkart</Badge>
              <CardTitle>Flipkart Fee Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Commission Rate</span>
              <span className="font-semibold">12% of Order Value</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Fixed Closing Fee</span>
              <span className="font-semibold">₹15 per fulfilled order</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Total Commission + Closing</span>
              <span className="font-semibold">{formatINR(fkSummary.marketplaceFees)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Shipping</span>
              <span className="font-semibold">{formatINR(fkSummary.shipping)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Flipkart Net Profit</span>
              <span className={fkSummary.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                {formatINR(fkSummary.netProfit)} ({formatPercent(fkSummary.profitMargin)})
              </span>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
export default Profit;
