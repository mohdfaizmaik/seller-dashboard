import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  Sliders,
  DollarSign,
  ShieldCheck,
  Building,
  CreditCard,
  Edit2,
  X
} from 'lucide-react';
import { Card, CardBody, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useCashFlowData } from '../hooks/useCashFlowData';
import { formatINR } from '../services/analyticsService';
import {
  exportCashFlowForecastCsv,
  exportDisbursementsCsv,
  exportPayablesScheduleCsv
} from '../services/cashflow/cashflowService';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

type CashFlowTab = 'forecast' | 'disbursements' | 'payables';

export const CashFlow: React.FC = () => {
  const {
    summary,
    startingCash,
    setStartingCash,
    simulation,
    updateSimulation,
    resetSimulation
  } = useCashFlowData();

  const [activeTab, setActiveTab] = useState<CashFlowTab>('forecast');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Edit Starting Cash Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempStartingCash, setTempStartingCash] = useState<string>(String(startingCash));

  const triggerDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(fileName);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  const handleSaveStartingCash = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(tempStartingCash);
    if (!isNaN(val) && val >= 0) {
      setStartingCash(val);
      setShowEditModal(false);
    }
  };

  // Prepare chart data (sample every 2-3 days or full 90 points)
  const chartData = summary.dailyPoints.map((p) => ({
    day: `D${p.dayIndex}`,
    date: p.date.slice(5), // MM-DD
    closingBalance: p.closingBalance,
    inflows: p.totalInflows,
    outflows: p.totalOutflows,
    isTrough: p.isTrough,
    isBelowBuffer: p.isUnderSafetyBuffer
  }));

  return (
    <div className="page-container" style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: '#10b981' }}>
              <Wallet size={24} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Cash Flow Runway & Working Capital Simulator
            </h1>
          </div>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Predictive 30/60/90-day liquidity forecasting, marketplace payout pipeline, scheduled liabilities, and dynamic stress-test scenarios
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTempStartingCash(String(startingCash));
              setShowEditModal(true);
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Edit2 size={14} />
            <span>Edit Starting Cash</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerDownload(exportDisbursementsCsv(summary), 'marketplace_disbursements.csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} />
            <span>Disbursements CSV</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => triggerDownload(exportPayablesScheduleCsv(summary), 'payables_schedule.csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} />
            <span>Payables CSV</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => triggerDownload(exportCashFlowForecastCsv(summary), 'cashflow_forecast_90d.csv')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} />
            <span>90-Day Forecast CSV</span>
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {downloadSuccess && (
        <div style={{
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={16} />
          <span>Successfully exported <strong>{downloadSuccess}</strong></span>
        </div>
      )}

      {/* Liquidity Alert Banner */}
      <Card style={{
        marginBottom: '1.5rem',
        borderLeft: summary.runwayStatus === 'critical_crunch' 
          ? '4px solid #ef4444' 
          : summary.runwayStatus === 'caution' 
            ? '4px solid #f59e0b' 
            : '4px solid #10b981',
        backgroundColor: summary.runwayStatus === 'critical_crunch'
          ? 'rgba(239, 68, 68, 0.04)'
          : summary.runwayStatus === 'caution'
            ? 'rgba(245, 158, 11, 0.04)'
            : 'rgba(16, 185, 129, 0.04)'
      }}>
        <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.9rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {summary.runwayStatus === 'critical_crunch' ? (
              <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
            ) : summary.runwayStatus === 'caution' ? (
              <AlertTriangle size={24} style={{ color: '#f59e0b', flexShrink: 0 }} />
            ) : (
              <ShieldCheck size={24} style={{ color: '#10b981', flexShrink: 0 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                {summary.runwayStatus === 'critical_crunch'
                  ? `Critical Liquidity Crunch Detected: Projected Cash Drops to ${formatINR(summary.minTroughBalance)} on ${summary.troughDate}`
                  : summary.runwayStatus === 'caution'
                    ? `Working Capital Caution: Minimum Cash Trough reaches ${formatINR(summary.minTroughBalance)} on ${summary.troughDate} (Near Safe Reserve)`
                    : `Self-Sustaining Cash Flow: Runway is Healthy (>90 Days) with Safe Trough of ${formatINR(summary.minTroughBalance)}`}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {summary.runwayStatus === 'critical_crunch'
                  ? `Projected bank balance will breach zero or exhaust your safety reserve in ${summary.runwayDays} days. Consider delaying supplier restock PO payments, extending credit terms, or injecting emergency working capital.`
                  : summary.runwayStatus === 'caution'
                    ? `Upcoming GST payments (due on the 20th) and supplier PO outlays coincide with marketplace payout escrow holds. Pacing marketing spend or negotiating 30-day supplier credit terms will keep balances above the ₹1,00,000 threshold.`
                    : `Projected marketplace settlement disbursements across Amazon, Flipkart, and Meesho consistently exceed scheduled GST liabilities, supplier POs, and ad burn across the next quarter.`}
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('payables')}
            style={{
              color: summary.runwayStatus === 'critical_crunch' ? '#ef4444' : summary.runwayStatus === 'caution' ? '#f59e0b' : '#10b981',
              borderColor: summary.runwayStatus === 'critical_crunch' ? '#ef4444' : summary.runwayStatus === 'caution' ? '#f59e0b' : '#10b981'
            }}
          >
            Review Payables Calendar
          </Button>
        </CardBody>
      </Card>

      {/* 5 Executive KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {/* Card 1: Current Liquid Reserve */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Liquid Cash
              </span>
              <DollarSign size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(summary.currentCash)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Bank reserve {simulation.capitalInjection > 0 ? `(+${formatINR(simulation.capitalInjection)} injected)` : 'in active accounts'}
            </div>
          </CardBody>
        </Card>

        {/* Card 2: 30-Day Net Cash Flow */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                30-Day Net Cash Flow
              </span>
              {summary.netCash30d >= 0 ? (
                <TrendingUp size={18} style={{ color: '#10b981' }} />
              ) : (
                <TrendingDown size={18} style={{ color: '#ef4444' }} />
              )}
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: summary.netCash30d >= 0 ? '#10b981' : '#ef4444',
              marginBottom: '0.25rem'
            }}>
              {summary.netCash30d >= 0 ? `+${formatINR(summary.netCash30d)}` : formatINR(summary.netCash30d)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Inflows: {formatINR(summary.inflows30d)} · Outflows: {formatINR(summary.outflows30d)}
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Liquid Cash Runway */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cash Runway Days
              </span>
              <Calendar size={18} style={{ color: summary.runwayStatus === 'healthy' ? '#10b981' : summary.runwayStatus === 'caution' ? '#f59e0b' : '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {summary.runwayDays >= 900 ? '>90 Days' : `${summary.runwayDays} Days`}
            </div>
            <div style={{ fontSize: '0.775rem' }}>
              <Badge
                variant={summary.runwayStatus === 'healthy' ? 'success' : summary.runwayStatus === 'caution' ? 'warning' : 'danger'}
                size="sm"
              >
                {summary.runwayStatus === 'healthy' ? 'Sustainable Runway' : summary.runwayStatus === 'caution' ? 'Caution (Buffer Watch)' : 'Critical Burn'}
              </Badge>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Minimum Liquidity Trough */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Min Trough (90-Day)
              </span>
              <AlertTriangle size={18} style={{ color: summary.minTroughBalance < summary.safeReserveBuffer ? '#f59e0b' : '#6366f1' }} />
            </div>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: summary.minTroughBalance < 0 ? '#ef4444' : summary.minTroughBalance < summary.safeReserveBuffer ? '#f59e0b' : 'var(--text-primary)',
              marginBottom: '0.25rem'
            }}>
              {formatINR(summary.minTroughBalance)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Lowest point on <strong>{summary.troughDate}</strong> (Day {summary.troughDayIndex})
            </div>
          </CardBody>
        </Card>

        {/* Card 5: Upcoming Committed Payables */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Upcoming 30D Payables
              </span>
              <CreditCard size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(summary.outflows30d)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              GST, Restock POs, Ad spend & Opex
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Dynamic "What-If" Liquidity Scenario Simulator Card */}
      <Card style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sliders size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <CardTitle style={{ fontSize: '1.05rem', margin: 0 }}>
                Dynamic "What-If" Working Capital Scenario Simulator
              </CardTitle>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Stress-test cash balances, ad spend pacing, supplier credit terms, and debt infusions in real-time
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={resetSimulation}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RotateCcw size={14} />
            <span>Reset Sliders</span>
          </Button>
        </CardHeader>

        <CardBody style={{ padding: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
            {/* Slider 1: Sales Growth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sales Growth / Decline</span>
                <span style={{ fontWeight: 700, color: simulation.salesGrowthPct >= 0 ? '#10b981' : '#ef4444' }}>
                  {simulation.salesGrowthPct > 0 ? `+${simulation.salesGrowthPct}%` : `${simulation.salesGrowthPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-40"
                max="60"
                step="5"
                value={simulation.salesGrowthPct}
                onChange={(e) => updateSimulation({ salesGrowthPct: Number(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                <span>-40% (Dip)</span>
                <span>Baseline (0%)</span>
                <span>+60% (Festive)</span>
              </div>
            </div>

            {/* Slider 2: Daily Ad Spend Burn */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Daily Ad Spend Burn</span>
                <span style={{ fontWeight: 700, color: simulation.adSpendChangePct <= 0 ? '#10b981' : '#f59e0b' }}>
                  {simulation.adSpendChangePct > 0 ? `+${simulation.adSpendChangePct}%` : `${simulation.adSpendChangePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="80"
                step="5"
                value={simulation.adSpendChangePct}
                onChange={(e) => updateSimulation({ adSpendChangePct: Number(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#f59e0b' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                <span>-50% (Cut)</span>
                <span>Current</span>
                <span>+80% (Aggressive)</span>
              </div>
            </div>

            {/* Slider 3: Supplier Credit Terms */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Supplier Credit Terms</span>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>
                  {simulation.supplierCreditDays === 0 ? 'Immediate (0d)' : `${simulation.supplierCreditDays} Days`}
                </span>
              </div>
              <select
                value={simulation.supplierCreditDays}
                onChange={(e) => updateSimulation({ supplierCreditDays: Number(e.target.value) })}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <option value={0}>0 Days (Immediate Pre-payment)</option>
                <option value={15}>15 Days (Current Standard)</option>
                <option value={30}>30 Days (Negotiated Terms)</option>
                <option value={45}>45 Days (Extended Factory Credit)</option>
                <option value={60}>60 Days (Enterprise PO Line)</option>
              </select>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Pushing PO payment dates extends liquid cash reserve
              </div>
            </div>

            {/* Slider 4: RTO Rate Improvement */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>RTO Rate Variation</span>
                <span style={{ fontWeight: 700, color: simulation.rtoRateChangePct <= 0 ? '#10b981' : '#ef4444' }}>
                  {simulation.rtoRateChangePct > 0 ? `+${simulation.rtoRateChangePct}%` : `${simulation.rtoRateChangePct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={simulation.rtoRateChangePct}
                onChange={(e) => updateSimulation({ rtoRateChangePct: Number(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#ef4444' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                <span>-50% (NDR Shield)</span>
                <span>Current</span>
                <span>+50% (Spike)</span>
              </div>
            </div>

            {/* Slider 5: Capital Injection */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Working Capital Injection</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>
                  {simulation.capitalInjection > 0 ? formatINR(simulation.capitalInjection) : '₹0 (None)'}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="25000"
                value={simulation.capitalInjection}
                onChange={(e) => updateSimulation({ capitalInjection: Number(e.target.value) })}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#10b981' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                <span>₹0</span>
                <span>₹2,50,000</span>
                <span>₹5,00,000</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('forecast')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'forecast' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'forecast' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'forecast' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <TrendingUp size={16} />
          <span>90-Day Liquidity Forecast</span>
        </button>

        <button
          onClick={() => setActiveTab('disbursements')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'disbursements' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'disbursements' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'disbursements' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <Building size={16} />
          <span>Marketplace Disbursement Pipeline ({summary.disbursements.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payables')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'payables' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'payables' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'payables' ? 600 : 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            whiteSpace: 'nowrap'
          }}
        >
          <CreditCard size={16} />
          <span>Scheduled Outflows Calendar ({summary.scheduledOutflows.length})</span>
        </button>
      </div>

      {/* Tab 1: 90-Day Liquidity Forecast */}
      {activeTab === 'forecast' && (
        <div>
          {/* Main Visual Forecast Chart */}
          <Card style={{ marginBottom: '1.5rem' }}>
            <CardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <CardTitle>90-Day Rolling Cash Balance Projection</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Simulated bank balance curve factoring in marketplace settlement cycles, GST deadlines, and supplier lead times
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '2px' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Projected Balance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <div style={{ width: '12px', height: '0', borderTop: '2px dashed #f59e0b' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Safe Buffer ({formatINR(summary.safeReserveBuffer)})</span>
                </div>
              </div>
            </CardHeader>

            <CardBody style={{ height: '340px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" opacity={0.6} />
                  <XAxis
                    dataKey="day"
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    interval={9}
                  />
                  <YAxis
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.75rem',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                          fontSize: '0.8rem',
                          minWidth: '180px'
                        }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                            {data.day} ({data.date}) {data.isTrough ? '⚠️ MIN TROUGH' : ''}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', marginBottom: '0.2rem' }}>
                            <span>Closing Cash:</span>
                            <strong>{formatINR(data.closingBalance)}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>
                            <span>Day Inflows:</span>
                            <span>+{formatINR(data.inflows)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                            <span>Day Outflows:</span>
                            <span>-{formatINR(data.outflows)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={summary.safeReserveBuffer}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                  />
                  <Area
                    type="monotone"
                    dataKey="closingBalance"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cashGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* 30/60/90 Day Horizon Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <Card>
              <CardBody style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day 30 Projected Balance</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.projectedBalance30d >= summary.safeReserveBuffer ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
                  {formatINR(summary.projectedBalance30d)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Net change: {summary.netCash30d >= 0 ? `+${formatINR(summary.netCash30d)}` : formatINR(summary.netCash30d)}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day 60 Projected Balance</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.projectedBalance60d >= summary.safeReserveBuffer ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
                  {formatINR(summary.projectedBalance60d)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Post-second GST & PO cycle
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Day 90 Projected Balance</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.projectedBalance90d >= summary.safeReserveBuffer ? '#10b981' : '#f59e0b', marginTop: '0.25rem' }}>
                  {formatINR(summary.projectedBalance90d)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Quarter-end projected bank balance
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Minimum Trough Point</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: summary.minTroughBalance < summary.safeReserveBuffer ? '#f59e0b' : '#10b981', marginTop: '0.25rem' }}>
                  {formatINR(summary.minTroughBalance)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  On {summary.troughDate} (Day {summary.troughDayIndex})
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Upcoming 14-Day Cash Flow Daily Table */}
          <Card>
            <CardHeader>
              <CardTitle>Next 14 Days Cash Inflow & Outflow Schedule</CardTitle>
            </CardHeader>
            <CardBody style={{ overflowX: 'auto', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Day</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Opening Cash</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Disbursements (In)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Liabilities (Out)</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Net Cash</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Closing Cash</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.dailyPoints.slice(0, 14).map((p) => (
                    <tr
                      key={p.dayIndex}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        backgroundColor: p.isTrough ? 'rgba(239, 68, 68, 0.05)' : undefined
                      }}
                    >
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Day {p.dayIndex}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{p.date}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{formatINR(p.openingBalance)}</td>
                      <td style={{ padding: '0.75rem 1rem', color: p.totalInflows > 0 ? '#10b981' : 'var(--text-secondary)', fontWeight: p.totalInflows > 0 ? 600 : 400 }}>
                        {p.totalInflows > 0 ? `+${formatINR(p.totalInflows)}` : '₹0'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: p.totalOutflows > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {p.totalOutflows > 0 ? `-${formatINR(p.totalOutflows)}` : '₹0'}
                      </td>
                      <td style={{
                        padding: '0.75rem 1rem',
                        fontWeight: 600,
                        color: p.netCash >= 0 ? '#10b981' : '#ef4444'
                      }}>
                        {p.netCash >= 0 ? `+${formatINR(p.netCash)}` : formatINR(p.netCash)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>
                        {formatINR(p.closingBalance)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {p.isTrough ? (
                          <Badge variant="danger" size="sm">Min Trough</Badge>
                        ) : p.isUnderSafetyBuffer ? (
                          <Badge variant="warning" size="sm">Under Buffer</Badge>
                        ) : (
                          <Badge variant="success" size="sm">Healthy</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Tab 2: Marketplace Disbursement Pipeline */}
      {activeTab === 'disbursements' && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Marketplace Settlements & Payout Pipeline</CardTitle>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Projected cash deposits across Amazon, Flipkart, and Meesho factoring in return escrow reserves and commission withholdings
            </div>
          </CardHeader>
          <CardBody style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Disbursement ID</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Platform</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Cycle</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Order Date Range</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Expected Deposit</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Gross Sales</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Marketplace Fees</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Reserve Held</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Net Payout (Cash)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {summary.disbursements.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace', fontWeight: 600 }}>{d.id}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge variant={d.platform as 'amazon' | 'flipkart' | 'meesho'} size="sm">
                        {d.platform.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{d.settlementCycle}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{d.orderDateRange}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{d.expectedDepositDate}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{formatINR(d.grossSales)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#ef4444' }}>-{formatINR(d.marketplaceFees)}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#f59e0b' }}>-{formatINR(d.reserveWithheld)}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#10b981' }}>
                      {formatINR(d.netDisbursement)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge variant={d.status === 'processing' ? 'info' : 'neutral'} size="sm">
                        {d.status === 'processing' ? 'Processing Bank Deposit' : 'Pending Escrow'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Tab 3: Scheduled Outflows Calendar */}
      {activeTab === 'payables' && (
        <Card>
          <CardHeader>
            <CardTitle>Scheduled Payables & Liabilities Calendar</CardTitle>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Statutory GST challans, supplier purchase order invoices, and operational commitments
            </div>
          </CardHeader>
          <CardBody style={{ overflowX: 'auto', padding: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Payable Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Payee / Beneficiary</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Urgency</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {summary.scheduledOutflows.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{o.title}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge variant={o.category === 'gst_tax' ? 'danger' : o.category === 'supplier_restock' ? 'primary' : 'neutral'} size="sm">
                        {o.category.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>{o.payee}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{o.dueDate}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: '#ef4444' }}>
                      {formatINR(o.amount)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <Badge variant={o.urgency === 'critical' ? 'danger' : 'warning'} size="sm">
                        {o.urgency.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                      {o.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {/* Edit Starting Cash Modal */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '440px',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Edit Starting Bank Cash</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStartingCash} style={{ padding: '1.25rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Current Liquid Bank Reserve (INR)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                    ₹
                  </span>
                  <input
                    type="number"
                    value={tempStartingCash}
                    onChange={(e) => setTempStartingCash(e.target.value)}
                    min="0"
                    step="5000"
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2rem',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                    required
                  />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                  This baseline is persisted locally to calculate your 90-day cash trough and runway days.
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <Button variant="secondary" type="button" onClick={() => setShowEditModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  Save Reserve
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
