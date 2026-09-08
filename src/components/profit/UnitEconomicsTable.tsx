import React, { useState, useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import type { Order } from '../../models/order';
import { type SkuCost, getSkuCostsSync } from '../../services/catalog/cogsService';
import { PRODUCTS_CATALOG } from '../../data/products';
import { MARKETPLACE_CONFIG } from '../../data/marketplaceConfig';
import { formatINR, formatPercent } from '../../services/analyticsService';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';

export interface UnitEconomicsTableProps {
  orders: Order[];
  skuCostsMap?: Map<string, SkuCost>;
}

export const UnitEconomicsTable: React.FC<UnitEconomicsTableProps> = ({ orders, skuCostsMap }) => {
  const [activeTab, setActiveTab] = useState<'unprofitable' | 'rto' | 'mvp'>('unprofitable');

  // Compute SKU unit economics
  const skuDiagnostics = useMemo(() => {
    const costCatalog = skuCostsMap || getSkuCostsSync();
    const aggMap = new Map<
      string,
      {
        sku: string;
        name: string;
        orders: number;
        units: number;
        revenue: number;
        cogs: number;
        packaging: number;
        fees: number;
        shipping: number;
        returns: number;
        returnValue: number;
        returnLoss: number;
        netProfit: number;
        currentAvgPrice: number;
      }
    >();

    for (const o of orders) {
      if (o.status === 'cancelled') continue;
      const sku = (o.sku || 'UNKNOWN').trim();
      const val = o.gross_amount || o.orderValue || 0;
      const qty = o.quantity || 1;

      const skuEntry = costCatalog.get(sku.toLowerCase());
      let cogsUnit = 0;
      let pkgUnit = 25;
      if (skuEntry) {
        cogsUnit = skuEntry.cogs;
        pkgUnit = skuEntry.packagingCost;
      } else {
        const prod = PRODUCTS_CATALOG.find((p) => p.sku.toLowerCase() === sku.toLowerCase() || p.id === o.productId);
        if (prod) cogsUnit = prod.costPrice;
      }

      const plat = (o.marketplace || o.platform) === 'amazon' ? 'amazon' : 'flipkart';
      const cfg = MARKETPLACE_CONFIG[plat];
      const fee = o.estimatedFees?.totalFees ?? ((val * cfg.referralFeeRate) + cfg.fixedClosingFee);
      const ship = o.shipping_fee ?? cfg.flatShippingRate;

      const existing = aggMap.get(sku) || {
        sku,
        name: o.product_name || o.productName || sku,
        orders: 0,
        units: 0,
        revenue: 0,
        cogs: 0,
        packaging: 0,
        fees: 0,
        shipping: 0,
        returns: 0,
        returnValue: 0,
        returnLoss: 0,
        netProfit: 0,
        currentAvgPrice: 0
      };

      existing.orders += 1;
      existing.units += qty;
      existing.revenue += val;
      existing.cogs += cogsUnit * qty;
      existing.packaging += pkgUnit * qty;
      existing.fees += fee;
      existing.shipping += ship;

      if (o.status === 'returned') {
        existing.returns += 1;
        existing.returnValue += val;
        const damageLoss = (cogsUnit * qty) * MARKETPLACE_CONFIG.returns.writeOffPercentage;
        existing.returnLoss += MARKETPLACE_CONFIG.returns.flatReturnShipping + MARKETPLACE_CONFIG.returns.reverseProcessingFee + damageLoss;
      }

      aggMap.set(sku, existing);
    }

    const results = Array.from(aggMap.values()).map((s) => {
      const netSales = s.revenue - s.returnValue;
      const totalCosts = s.cogs + s.packaging + s.fees + s.shipping + s.returnLoss;
      const netProfit = netSales - totalCosts;
      const margin = s.revenue > 0 ? (netProfit / s.revenue) * 100 : 0;
      const returnRate = s.orders > 0 ? (s.returns / s.orders) * 100 : 0;
      const currentAvgPrice = s.units > 0 ? s.revenue / s.units : 0;

      // MVP calculation for 15% target margin
      // MVP = (COGS + packaging + closingFee + shipping) / (1 - referralFeeRate - targetMargin)
      const unitCogs = s.units > 0 ? s.cogs / s.units : 0;
      const unitPackaging = s.units > 0 ? s.packaging / s.units : 25;
      const closingFee = 20; // Avg Amazon/Flipkart
      const shipping = 55;   // Avg shipping
      const referralRate = 0.14; // Blended 14%
      const targetMargin = 0.15; // 15% target
      const mvp = (unitCogs + unitPackaging + closingFee + shipping) / (1 - referralRate - targetMargin);

      return {
        ...s,
        netProfit,
        margin,
        returnRate,
        currentAvgPrice,
        unitCogs,
        unitPackaging,
        mvp: Math.ceil(mvp),
        isPricingViolation: currentAvgPrice > 0 && currentAvgPrice < mvp
      };
    });

    return results;
  }, [orders, skuCostsMap]);

  const unprofitableSkus = useMemo(() => {
    return skuDiagnostics.filter((s) => s.netProfit <= 0 || s.margin < 5);
  }, [skuDiagnostics]);

  const rtoDragSkus = useMemo(() => {
    return skuDiagnostics.filter((s) => s.returnRate >= 15 || s.returnLoss > 200);
  }, [skuDiagnostics]);

  const mvpViolations = useMemo(() => {
    return skuDiagnostics.filter((s) => s.isPricingViolation);
  }, [skuDiagnostics]);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Unit Economics & Profit-Killers Module</CardTitle>
          {unprofitableSkus.length > 0 && (
            <Badge variant="danger" size="sm">
              {unprofitableSkus.length} Unprofitable SKUs
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('unprofitable')}
            className={`px-3 py-1 rounded text-2xs font-semibold transition ${
              activeTab === 'unprofitable'
                ? 'bg-red-900/50 text-red-300 border border-red-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Profit-Killers ({unprofitableSkus.length})
          </button>
          <button
            onClick={() => setActiveTab('rto')}
            className={`px-3 py-1 rounded text-2xs font-semibold transition ${
              activeTab === 'rto'
                ? 'bg-amber-900/50 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            RTO Losses ({rtoDragSkus.length})
          </button>
          <button
            onClick={() => setActiveTab('mvp')}
            className={`px-3 py-1 rounded text-2xs font-semibold transition ${
              activeTab === 'mvp'
                ? 'bg-blue-900/50 text-blue-300 border border-blue-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Minimum Viable Price (MVP) ({mvpViolations.length})
          </button>
        </div>
      </CardHeader>

      <CardBody className="p-0">
        {activeTab === 'unprofitable' && (
          <div className="table-container">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Revenue</th>
                  <th>COGS + Packaging</th>
                  <th>Fees & Ship</th>
                  <th>Net Profit</th>
                  <th>Margin</th>
                  <th>Prescribed Action</th>
                </tr>
              </thead>
              <tbody>
                {unprofitableSkus.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-slate-400">
                      ✓ No unprofitable SKUs detected in current date range.
                    </td>
                  </tr>
                ) : (
                  unprofitableSkus.map((s) => (
                    <tr key={s.sku} style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                      <td className="font-semibold text-slate-200">{s.sku}</td>
                      <td className="truncate max-w-xs text-slate-300" title={s.name}>
                        {s.name}
                      </td>
                      <td>{formatINR(s.revenue)}</td>
                      <td className="text-slate-400">
                        {formatINR(s.cogs + s.packaging)}
                      </td>
                      <td className="text-slate-400">{formatINR(s.fees + s.shipping)}</td>
                      <td className="font-bold text-red-400">{formatINR(s.netProfit)}</td>
                      <td className="font-semibold text-red-400">{formatPercent(s.margin)}</td>
                      <td>
                        <span className="text-2xs text-amber-400 font-medium">
                          Raise price to {formatINR(s.mvp)} or pause ad spend
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'rto' && (
          <div className="table-container">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Name</th>
                  <th>Orders</th>
                  <th>Returns</th>
                  <th>Return Rate</th>
                  <th>Courier & Damage Loss</th>
                  <th>Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {rtoDragSkus.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-slate-400">
                      ✓ Return rates are within healthy thresholds (&lt;10%).
                    </td>
                  </tr>
                ) : (
                  rtoDragSkus.map((s) => (
                    <tr key={s.sku} style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                      <td className="font-semibold text-slate-200">{s.sku}</td>
                      <td className="truncate max-w-xs text-slate-300" title={s.name}>
                        {s.name}
                      </td>
                      <td>{s.orders}</td>
                      <td className="font-bold text-amber-400">{s.returns}</td>
                      <td className="font-bold text-amber-400">{formatPercent(s.returnRate)}</td>
                      <td className="font-bold text-red-400">{formatINR(s.returnLoss)}</td>
                      <td className="text-2xs text-slate-300">
                        High reverse logistics penalty. Audit packaging & disable COD on high-risk pin codes.
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'mvp' && (
          <div className="table-container">
            <table className="data-table text-xs">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Unit COGS</th>
                  <th>Packaging</th>
                  <th>Current Selling Price</th>
                  <th>Minimum Viable Price (MVP)</th>
                  <th>Pricing Floor Gap</th>
                  <th>Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {skuDiagnostics.map((s) => {
                  const gap = s.mvp - s.currentAvgPrice;
                  return (
                    <tr
                      key={s.sku}
                      style={{
                        backgroundColor: s.isPricingViolation ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                      }}
                    >
                      <td className="font-semibold text-slate-200">{s.sku}</td>
                      <td>{formatINR(s.unitCogs)}</td>
                      <td>{formatINR(s.unitPackaging)}</td>
                      <td className="font-semibold text-slate-200">{formatINR(s.currentAvgPrice)}</td>
                      <td className="font-bold text-blue-400">{formatINR(s.mvp)}</td>
                      <td>
                        {s.isPricingViolation ? (
                          <span className="text-red-400 font-bold">-{formatINR(gap)} Below Floor</span>
                        ) : (
                          <span className="text-green-400 font-semibold">+{formatINR(Math.abs(gap))} Buffer</span>
                        )}
                      </td>
                      <td>
                        {s.isPricingViolation ? (
                          <span className="text-2xs font-semibold text-amber-300 flex items-center gap-1">
                            <ArrowUpRight size={12} />
                            Increase price by +{formatINR(gap)} to clear 15% net margin
                          </span>
                        ) : (
                          <span className="text-2xs text-slate-500">Pricing healthy</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
};
