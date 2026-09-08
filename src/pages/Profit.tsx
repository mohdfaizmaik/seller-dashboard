import React, { useState } from 'react';
import { Download, Sliders } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

import { useFilters } from '../hooks/useFilters';
import { useSellerData } from '../hooks/useSellerData';
import { useSkuCosts } from '../hooks/useSkuCosts';
import {
  getDateRangeFromPreset,
  calculateFinancialSummary,
  formatINR,
  formatPercent
} from '../services/analyticsService';
import { CogsManagerModal } from '../components/catalog/CogsManagerModal';
import { SettlementReconciliationCard } from '../components/profit/SettlementReconciliationCard';
import { UnitEconomicsTable } from '../components/profit/UnitEconomicsTable';

export const Profit: React.FC = () => {
  const { platform, preset, startDate, endDate } = useFilters();
  const { orders } = useSellerData();
  const { skuCostsMap } = useSkuCosts();
  const [isCogsModalOpen, setIsCogsModalOpen] = useState(false);

  const { start, end } = getDateRangeFromPreset(preset, startDate, endDate, orders);
  const summary = calculateFinancialSummary(orders, start, end, platform, skuCostsMap);
  const azSummary = calculateFinancialSummary(orders, start, end, 'amazon', skuCostsMap);
  const fkSummary = calculateFinancialSummary(orders, start, end, 'flipkart', skuCostsMap);

  const totalCogs = summary.cogs;
  const packaging = summary.packagingCost || 0;
  const taxes = summary.taxes || 0;
  const totalDirectMaterials = totalCogs + packaging;

  const waterfallItems = [
    {
      code: '(A)',
      label: 'Gross Customer Sales',
      amount: summary.grossRevenue,
      type: 'positive' as const,
      pctOfGross: 100,
      description: 'Total invoiced order value for non-cancelled transactions'
    },
    {
      code: '(B)',
      label: 'Less: Customer Returns & Refunds',
      amount: -summary.refundedValue,
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? (summary.refundedValue / summary.grossRevenue) * 100 : 0,
      description: `${summary.returnedOrderCount} returned units refunded to customers`
    },
    {
      code: '(C)',
      label: 'Net Realized Sales (A - B)',
      amount: summary.netSales,
      type: 'subtotal' as const,
      pctOfGross: summary.grossRevenue > 0 ? (summary.netSales / summary.grossRevenue) * 100 : 0,
      description: 'Gross Sales minus Customer Return credits'
    },
    {
      code: '(D)',
      label: 'Less: Total COGS & Direct Materials',
      amount: -totalDirectMaterials,
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? (totalDirectMaterials / summary.grossRevenue) * 100 : 0,
      description: `Manufacturing/procurement COGS (${formatINR(totalCogs)}) + Packaging materials (${formatINR(packaging)})`
    },
    {
      code: '(E)',
      label: 'Less: Marketplace Deductions',
      amount: -summary.marketplaceFees,
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? (summary.marketplaceFees / summary.grossRevenue) * 100 : 0,
      description: 'Platform referral commissions, fixed closing fees & payment collection fees'
    },
    {
      code: '(F)',
      label: 'Less: Logistics & RTO Shipping Loss',
      amount: -(summary.shipping + summary.returnRelatedCosts),
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? ((summary.shipping + summary.returnRelatedCosts) / summary.grossRevenue) * 100 : 0,
      description: `Forward shipping (${formatINR(summary.shipping)}) + reverse logistics & transit damage (${formatINR(summary.returnRelatedCosts)})`
    },
    {
      code: '(G)',
      label: 'Less: Advertising / Sponsored Listings',
      amount: -summary.advertising,
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? (summary.advertising / summary.grossRevenue) * 100 : 0,
      description: 'Allocated daily campaign spend across marketplaces'
    },
    {
      code: '(H)',
      label: 'Less: Output GST / Tax Deductions',
      amount: -taxes,
      type: 'negative' as const,
      pctOfGross: summary.grossRevenue > 0 ? (taxes / summary.grossRevenue) * 100 : 0,
      description: 'Output GST liability accrued on delivered orders'
    },
    {
      code: '(=)',
      label: 'Real Net Operating Profit',
      amount: summary.netProfit,
      type: 'total' as const,
      pctOfGross: summary.grossRevenue > 0 ? (summary.netProfit / summary.grossRevenue) * 100 : 0,
      description: `Final realized bottom line after direct costs, fees & logistics (${formatPercent(summary.profitMargin)} margin)`
    }
  ];

  const handleExportStatementCsv = () => {
    const headers = ['Code', 'Line Item', 'Description', 'Amount (INR)', '% of Gross Revenue'];
    const rows = waterfallItems.map((item) => [
      `"${item.code}"`,
      `"${item.label}"`,
      `"${item.description}"`,
      item.amount,
      `"${item.pctOfGross.toFixed(1)}%"`
    ]);

    const dateStr = `${start.toISOString().split('T')[0]}_to_${end.toISOString().split('T')[0]}`;
    const csvContent = [
      `"Financial Profit & Loss Statement"`,
      `"Platform: ${platform.toUpperCase()}"`,
      `"Period: ${dateStr}"`,
      '',
      headers.join(','),
      ...rows.map((r) => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `profit_loss_waterfall_${platform}_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalOperatingDeductions =
    totalDirectMaterials + summary.marketplaceFees + summary.shipping + summary.returnRelatedCosts + summary.advertising + taxes;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Profit & Loss Accounting Waterfall"
        subtitle="True bottom-line financial statement accounting for SKU manufacturing COGS, packaging, marketplace commissions, logistics, and taxes"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCogsModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Sliders size={14} />
              Manage SKU COGS
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleExportStatementCsv}
              className="flex items-center gap-1.5"
            >
              <Download size={14} />
              Export Statement (CSV)
            </Button>
          </div>
        }
      />

      {/* High-Level Financial Summary Cards */}
      <div className="dashboard-grid">
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Gross Customer Sales (A)
            </span>
            <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatINR(summary.grossRevenue)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              {summary.orderCount} fulfilled orders ({summary.unitsSold} units)
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Net Realized Sales (C)
            </span>
            <span className="text-xl font-bold text-blue-400">
              {formatINR(summary.netSales)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Less {formatINR(summary.refundedValue)} in refunds ({summary.returnedOrderCount} returns)
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Operating Deductions (D-H)
            </span>
            <span className="text-xl font-bold text-amber-400">
              -{formatINR(totalOperatingDeductions)}
            </span>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              COGS: {formatINR(totalDirectMaterials)} • Fees & Ship: {formatINR(summary.marketplaceFees + summary.shipping)}
            </span>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Real Net Operating Profit
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

      {/* Itemized 8-Step Waterfall Statement */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Accounting Waterfall Statement</CardTitle>
            <Badge variant="neutral" size="sm">
              {platform.toUpperCase()}
            </Badge>
          </div>
          <span className="text-2xs text-slate-400">
            Period: {start.toISOString().split('T')[0]} to {end.toISOString().split('T')[0]}
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>Code</th>
                  <th style={{ width: '36%' }}>Line Item</th>
                  <th style={{ width: '36%' }}>Description / Basis of Allocation</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>% of Gross</th>
                  <th style={{ width: '10%', textAlign: 'right' }}>Amount (INR)</th>
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
                      <td className="font-mono text-2xs text-slate-400">{item.code}</td>

                      <td>
                        <span
                          className={`text-xs ${
                            isTotal
                              ? 'text-sm font-bold text-primary'
                              : isSubtotal
                              ? 'font-semibold text-blue-400'
                              : ''
                          }`}
                          style={{
                            paddingLeft: !isSubtotal && !isTotal && item.type === 'negative' ? '10px' : '0'
                          }}
                        >
                          {item.label}
                        </span>
                      </td>

                      <td className="text-2xs" style={{ color: 'var(--text-muted)' }}>
                        {item.description}
                      </td>

                      <td style={{ textAlign: 'right' }} className="text-2xs font-mono text-slate-400">
                        {item.pctOfGross.toFixed(1)}%
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
                            ? 'text-primary font-bold'
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

      {/* Phase 7C: Settlement & Bank Disbursement Audit */}
      <SettlementReconciliationCard orders={orders} />

      {/* Phase 7D: Unit Economics & Profit-Killers Module */}
      <UnitEconomicsTable orders={orders} skuCostsMap={skuCostsMap} />

      {/* Cross-Marketplace Fee Comparison */}
      <div className="dashboard-row-grid">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="amazon" size="sm">Amazon India</Badge>
              <CardTitle>Amazon Economics Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gross Invoiced Sales</span>
              <span className="font-semibold">{formatINR(azSummary.grossRevenue)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>COGS & Direct Materials</span>
              <span className="font-semibold text-amber-400">-{formatINR((azSummary.cogs || 0) + (azSummary.packagingCost || 0))}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Referral (15%) + Closing (₹20)</span>
              <span className="font-semibold text-red-400">-{formatINR(azSummary.marketplaceFees)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Shipping & Logistics</span>
              <span className="font-semibold text-red-400">-{formatINR(azSummary.shipping + azSummary.returnRelatedCosts)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Amazon Real Net Profit</span>
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
              <CardTitle>Flipkart Economics Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col gap-2.5 text-xs">
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Gross Invoiced Sales</span>
              <span className="font-semibold">{formatINR(fkSummary.grossRevenue)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>COGS & Direct Materials</span>
              <span className="font-semibold text-amber-400">-{formatINR((fkSummary.cogs || 0) + (fkSummary.packagingCost || 0))}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Commission (12%) + Closing (₹15)</span>
              <span className="font-semibold text-red-400">-{formatINR(fkSummary.marketplaceFees)}</span>
            </div>
            <div className="flex justify-between py-1" style={{ borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Shipping & Logistics</span>
              <span className="font-semibold text-red-400">-{formatINR(fkSummary.shipping + fkSummary.returnRelatedCosts)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold">
              <span>Flipkart Real Net Profit</span>
              <span className={fkSummary.netProfit >= 0 ? 'text-success' : 'text-danger'}>
                {formatINR(fkSummary.netProfit)} ({formatPercent(fkSummary.profitMargin)})
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* COGS Manager Modal */}
      <CogsManagerModal
        isOpen={isCogsModalOpen}
        onClose={() => setIsCogsModalOpen(false)}
        orders={orders}
      />
    </div>
  );
};

export default Profit;
