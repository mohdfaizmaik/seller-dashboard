import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Download,
  AlertTriangle,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Truck,
  MapPin,
  TrendingDown,
  Layers,
  Copy,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useReturnsData } from '../hooks/useReturnsData';
import { formatINR } from '../services/analyticsService';
import {
  exportReturnsAuditCsv,
  exportNdrQueueCsv,
  exportCourierBenchmarkCsv
} from '../services/returns/returnsService';
import type { NdrCase } from '../models/returns';

type ReturnsTab = 'ndr' | 'couriers' | 'states' | 'skus' | 'recent';

export const Returns: React.FC = () => {
  const {
    summary,
    resolveNdrCase,
    resetNdrActions
  } = useReturnsData();

  const [activeTab, setActiveTab] = useState<ReturnsTab>('ndr');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // NDR WhatsApp Modal state
  const [activeNdrModal, setActiveNdrModal] = useState<NdrCase | null>(null);
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false);

  // SKU filter states
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [skuFilterCategory, setSkuFilterCategory] = useState<'all' | 'high_returns' | 'apparel' | 'electronics'>('all');

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

  const handleCopyWhatsApp = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedWhatsApp(true);
    setTimeout(() => setCopiedWhatsApp(false), 2500);
  };

  // Filtered SKU Defects
  const filteredSkuDefects = useMemo(() => {
    return summary.skuDefects.filter((item) => {
      if (skuFilterCategory === 'high_returns' && item.returnRate < 10) return false;
      if (skuFilterCategory === 'apparel' && !item.topReason.toLowerCase().includes('size') && !item.sku.includes('POLO') && !item.sku.includes('LEVI') && !item.sku.includes('BIBA')) return false;
      if (skuFilterCategory === 'electronics' && !item.sku.includes('NOISE') && !item.sku.includes('BOAT') && !item.sku.includes('1PLUS') && !item.sku.includes('SANDISK')) return false;
      if (skuSearchTerm) {
        const q = skuSearchTerm.toLowerCase();
        return item.sku.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [summary.skuDefects, skuFilterCategory, skuSearchTerm]);

  return (
    <div className="page-container">
      <PageHeader
        title="Customer Returns & RTO Intelligence Shield"
        subtitle="Root-cause return diagnosis, courier performance benchmarking, NDR customer verification workflow, and COD risk control across Amazon, Flipkart, and Meesho"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const csv = exportNdrQueueCsv(summary);
                triggerDownload(csv, `ndr_queue_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              NDR Queue CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const csv = exportCourierBenchmarkCsv(summary);
                triggerDownload(csv, `courier_benchmark_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              Courier Benchmark CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const csv = exportReturnsAuditCsv(summary);
                triggerDownload(csv, `returns_audit_${new Date().toISOString().split('T')[0]}.csv`);
              }}
            >
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              Full Returns Audit CSV
            </Button>
          </div>
        }
      />

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

      {/* Critical Returns & RTO Alert Banner */}
      <Card style={{
        marginBottom: '1.5rem',
        borderLeft: '4px solid #ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.04)'
      }}>
        <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.9rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Elevated COD Return Drag: {summary.codDisparity.codRiskMultiplier}x Higher Return Rate on COD vs. Prepaid
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Cash on Delivery orders suffer a <strong>{summary.codDisparity.codReturnRate}% return rate</strong> (causing {formatINR(summary.codDisparity.codLoss)} in cash loss) compared to just <strong>{summary.codDisparity.prepaidReturnRate}% on Prepaid</strong>. There are currently <strong>{summary.pendingNdrCount} pending NDR delivery attempts</strong> requiring customer outreach.
              </div>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setActiveTab('ndr')}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            Review {summary.pendingNdrCount} Pending NDRs
          </Button>
        </CardBody>
      </Card>

      {/* 5 Executive KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {/* Card 1: Total Return Loss */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Return Cash Loss
              </span>
              <TrendingDown size={18} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', marginBottom: '0.25rem' }}>
              {formatINR(summary.totalReturnLoss)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Freight: {formatINR(summary.reverseLogisticsLoss)} · Damage: {formatINR(summary.damageWriteOffLoss)}
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Blended Return & RTO Rate */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blended Return Rate
              </span>
              <RotateCcw size={18} style={{ color: summary.blendedReturnRate <= 12 ? '#10b981' : '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {summary.blendedReturnRate}%
            </div>
            <div style={{ fontSize: '0.775rem', color: summary.blendedReturnRate <= 12 ? '#10b981' : '#f59e0b' }}>
              {summary.totalReturnsCount} total returns ({summary.totalOrders} total orders)
            </div>
          </CardBody>
        </Card>

        {/* Card 3: RTO vs Customer Return Split */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                RTO vs. Customer Return
              </span>
              <Truck size={18} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {summary.rtoCount} RTO <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-secondary)' }}>({summary.customerReturnCount} CIR)</span>
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              RTO Rate: <strong>{summary.rtoRate}%</strong> · Customer Return: <strong>{summary.customerReturnRate}%</strong>
            </div>
          </CardBody>
        </Card>

        {/* Card 4: COD Disparity Multiplier */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                COD Risk Disparity
              </span>
              <Layers size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {summary.codDisparity.codRiskMultiplier}x <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-secondary)' }}>higher risk</span>
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              COD: <strong>{summary.codDisparity.codReturnRate}%</strong> vs. Prepaid: <strong>{summary.codDisparity.prepaidReturnRate}%</strong>
            </div>
          </CardBody>
        </Card>

        {/* Card 5: Pending NDR Actions */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pending NDR Items
              </span>
              <PhoneCall size={18} style={{ color: summary.pendingNdrCount > 0 ? '#ef4444' : '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.pendingNdrCount > 0 ? '#ef4444' : '#10b981', marginBottom: '0.25rem' }}>
              {summary.pendingNdrCount} Cases
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Actionable non-delivery attempts
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Sticky Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.25rem',
        overflowX: 'auto',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--bg-app)',
        paddingTop: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('ndr')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'ndr' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'ndr' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'ndr' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          NDR Action Center ({summary.pendingNdrCount} Pending)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('couriers')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'couriers' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'couriers' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'couriers' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          Courier Performance Scorecard ({summary.courierBenchmarks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('states')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'states' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'states' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'states' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          High-RTO Regional Map & States ({summary.stateRisks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('skus')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'skus' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'skus' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'skus' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          SKU Defect & Return Drag ({summary.skuDefects.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('recent')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'recent' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'recent' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'recent' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          Recent Returns Audit Log ({summary.recentReturns.length})
        </button>
      </div>

      {/* Tab 1: NDR Action Center */}
      {activeTab === 'ndr' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <CardTitle>Non-Delivery Report (NDR) Management & Re-Attempt Queue</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Orders where first delivery attempt failed. Intervene via automated WhatsApp confirmation before courier triggers unrecoverable RTO.
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={resetNdrActions}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
              >
                Reset NDR State
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Order & Customer</th>
                    <th>Product & Value</th>
                    <th>Courier & Tracking</th>
                    <th>NDR Failure Reason</th>
                    <th style={{ textAlign: 'center' }}>Attempts</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.ndrCases.map((c) => (
                    <tr key={c.id} style={{ backgroundColor: c.status === 'open' ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.orderId}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {c.customerName} ({c.customerPhone}) · {c.customerState}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{c.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {c.sku} · <strong>{formatINR(c.orderValue)}</strong> ({c.paymentMethod})
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{c.courier}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {c.trackingNumber}
                        </div>
                      </td>
                      <td style={{ maxWidth: '260px' }}>
                        <div style={{ color: c.ndrReason.includes('Fake') ? '#ef4444' : 'var(--text-primary)', fontWeight: c.ndrReason.includes('Fake') ? 600 : 400 }}>
                          {c.ndrReason}
                        </div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          Last attempted: {c.lastAttemptDate}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: c.attemptCount >= 2 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: c.attemptCount >= 2 ? '#ef4444' : '#f59e0b'
                        }}>
                          {c.attemptCount} / 3
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge
                          variant={
                            c.status === 'open' ? 'danger' :
                            c.status === 'resolved_delivered' ? 'success' :
                            c.status === 'action_taken' ? 'warning' : 'neutral'
                          }
                          size="sm"
                        >
                          {c.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setActiveNdrModal(c)}
                            style={{
                              fontSize: '0.75rem',
                              padding: '0.25rem 0.5rem',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <MessageSquare size={13} style={{ marginRight: '0.25rem' }} />
                            WhatsApp
                          </Button>
                          {c.status === 'open' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => resolveNdrCase(c.id, 'action_taken', 'Escalated to courier hub')}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Escalate
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => resolveNdrCase(c.id, 'resolved_delivered', 'Delivered successfully')}
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 2: Courier Performance Scorecard */}
      {activeTab === 'couriers' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>Courier & 3PL Logistics Partner Benchmarks</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Audits delivery SLAs, RTO percentages, fake delivery attempts, and reverse logistics costs across Indian carrier networks.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Courier Partner</th>
                    <th style={{ textAlign: 'right' }}>Dispatched</th>
                    <th style={{ textAlign: 'right' }}>Delivered</th>
                    <th style={{ textAlign: 'center' }}>Delivery Success %</th>
                    <th style={{ textAlign: 'center' }}>RTO Rate %</th>
                    <th style={{ textAlign: 'center' }}>Fake Attempt %</th>
                    <th style={{ textAlign: 'center' }}>Avg Transit</th>
                    <th style={{ textAlign: 'right' }}>Reverse Freight Loss</th>
                    <th style={{ textAlign: 'center' }}>Performance Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.courierBenchmarks.map((b) => (
                    <tr key={b.courier}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Truck size={15} style={{ color: 'var(--color-primary)' }} />
                          {b.courier}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{b.totalDispatched}</td>
                      <td style={{ textAlign: 'right' }}>{b.delivered}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: b.deliverySuccessRate >= 88 ? '#10b981' : '#f59e0b' }}>
                        {b.deliverySuccessRate}%
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: b.rtoRate > 12 ? '#ef4444' : 'var(--text-primary)' }}>
                        {b.rtoRate}%
                      </td>
                      <td style={{ textAlign: 'center', color: b.fakeAttemptRate > 4 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {b.fakeAttemptRate}%
                      </td>
                      <td style={{ textAlign: 'center' }}>{b.avgTransitDays} days</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                        {formatINR(b.totalReverseLoss)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge
                          variant={
                            b.rating === 'excellent' ? 'success' :
                            b.rating === 'good' ? 'primary' :
                            b.rating === 'at_risk' ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {b.rating.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Strategic Logistics Takeaways */}
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              fontSize: '0.825rem'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                🚚 Logistics Optimization Playbook:
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <li><strong>Amazon ATS & Blue Dart</strong> boast the highest delivery success rates (&gt;90%) with sub-2.5 day transit. Route high-ticket prepaid orders through these carriers.</li>
                <li><strong>Shadowfax & Xpressbees</strong> exhibit elevated RTO rates (&gt;13%) and higher fake attempt reports on COD shipments. Require OTP delivery verification on door deliveries.</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 3: High-RTO Regional Map & States */}
      {activeTab === 'states' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>Regional State RTO & Fraud Risk Ranking</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Identifies geographical zones with high COD reliance and frequent doorstep return rejections across India.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Indian State / UT</th>
                    <th style={{ textAlign: 'right' }}>Total Orders</th>
                    <th style={{ textAlign: 'right' }}>RTO Count</th>
                    <th style={{ textAlign: 'center' }}>RTO Rate %</th>
                    <th style={{ textAlign: 'center' }}>Customer Return %</th>
                    <th style={{ textAlign: 'center' }}>COD Share %</th>
                    <th style={{ textAlign: 'right' }}>Reverse Cash Loss</th>
                    <th style={{ textAlign: 'center' }}>Risk Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.stateRisks.map((s) => (
                    <tr key={s.state} style={{ backgroundColor: s.riskTier === 'high_risk' ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MapPin size={15} style={{ color: s.riskTier === 'high_risk' ? '#ef4444' : 'var(--color-primary)' }} />
                          {s.state}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{s.totalOrders}</td>
                      <td style={{ textAlign: 'right' }}>{s.rtoCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: s.riskTier === 'high_risk' ? '#ef4444' : '#10b981' }}>
                        {s.rtoRate}%
                      </td>
                      <td style={{ textAlign: 'center' }}>{s.customerReturnRate}%</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ color: s.codSharePct > 65 ? '#ef4444' : 'var(--text-primary)' }}>
                          {s.codSharePct}%
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#ef4444' }}>
                        {formatINR(s.totalLoss)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge
                          variant={
                            s.riskTier === 'high_risk' ? 'danger' :
                            s.riskTier === 'moderate' ? 'warning' : 'success'
                          }
                          size="sm"
                        >
                          {s.riskTier.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Regional Policy Advice */}
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)',
              fontSize: '0.825rem'
            }}>
              <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                🛡️ Fraud Shield Recommendation:
              </div>
              <div style={{ color: 'var(--text-secondary)' }}>
                <strong>Bihar & Uttar Pradesh</strong> show RTO rates exceeding 20% fueled by &gt;75% COD orders. Implement a <strong>₹50 COD verification deposit</strong> or disable COD for order values &gt;₹2,500 in these states to prevent substantial freight bleed.
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 4: SKU Defect & Return Drag */}
      {activeTab === 'skus' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <CardTitle>SKU-Level Return Causes & Reverse Profit Leaks</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Isolates products with excessive customer dissatisfaction, garment sizing mismatches, and transit damage write-offs.
                </div>
              </div>
            </div>

            {/* Filter Pills and Search Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', minWidth: '220px', flex: 1 }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search SKU or product name..."
                  value={skuSearchTerm}
                  onChange={(e) => setSkuSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-input, var(--bg-card))',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <Button
                  variant={skuFilterCategory === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilterCategory('all')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  All ({summary.skuDefects.length})
                </Button>
                <Button
                  variant={skuFilterCategory === 'high_returns' ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilterCategory('high_returns')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  High Returns &gt;10% ({summary.skuDefects.filter(s => s.returnRate > 10).length})
                </Button>
                <Button
                  variant={skuFilterCategory === 'apparel' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilterCategory('apparel')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Apparel Sizing
                </Button>
                <Button
                  variant={skuFilterCategory === 'electronics' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilterCategory('electronics')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Electronics Defects
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>SKU & Product</th>
                    <th style={{ textAlign: 'center' }}>Return Rate %</th>
                    <th style={{ textAlign: 'center' }}>RTO Rate %</th>
                    <th>Primary Return Reason</th>
                    <th style={{ textAlign: 'center' }}>Damaged Write-offs</th>
                    <th style={{ textAlign: 'right' }}>Total Cash Drag</th>
                    <th>Actionable Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkuDefects.map((item) => (
                    <tr key={item.sku} style={{ backgroundColor: item.returnRate > 15 ? 'rgba(239, 68, 68, 0.04)' : undefined }}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{item.sku}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                          {item.productName}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: item.returnRate > 15 ? '#ef4444' : '#10b981' }}>
                        {item.returnRate}%
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.rtoRate}%</td>
                      <td>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: item.topReason.includes('Size') ? 'rgba(99, 102, 241, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: item.topReason.includes('Size') ? '#6366f1' : '#f59e0b',
                          fontSize: '0.75rem',
                          fontWeight: 500
                        }}>
                          {item.topReason}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: item.damageWriteOffCount > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {item.damageWriteOffCount} units
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                        {formatINR(item.totalNetLoss)}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {item.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 5: Recent Returns Audit Log */}
      {activeTab === 'recent' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>Itemized Returns & RTO Transaction Ledger</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Detailed itemized accounting of individual returned packages, courier tracking numbers, and reverse shipping fees.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Return ID</th>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Product & SKU</th>
                    <th>Payment</th>
                    <th>Return Type</th>
                    <th>Courier & Tracking</th>
                    <th style={{ textAlign: 'right' }}>Loss Breakdown</th>
                    <th style={{ textAlign: 'center' }}>Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentReturns.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.id}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{r.returnDate}</td>
                      <td>
                        <Badge
                          variant={
                            r.platform === 'amazon' ? 'warning' :
                            r.platform === 'flipkart' ? 'primary' : 'meesho'
                          }
                          size="sm"
                        >
                          {r.platform.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.productName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.sku}</div>
                      </td>
                      <td>
                        <Badge variant={r.paymentMethod === 'COD' ? 'warning' : 'neutral'} size="sm">
                          {r.paymentMethod}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={r.returnType === 'rto' ? 'danger' : 'neutral'} size="sm">
                          {r.returnType.toUpperCase()}
                        </Badge>
                      </td>
                      <td>
                        <div>{r.courier}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {r.trackingNumber}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#ef4444' }}>
                          -{formatINR(r.netLoss)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                          Fwd: ₹{r.forwardShippingFee} · Rev: ₹{r.reverseShippingFee}
                          {r.damageLoss > 0 && ` · Dmg: ₹${r.damageLoss}`}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Badge
                          variant={r.condition === 'sealed_restockable' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {r.condition.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* WhatsApp NDR Modal */}
      {activeNdrModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            maxWidth: '520px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  💬 WhatsApp NDR Delivery Re-Attempt Template
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Send directly to customer {activeNdrModal.customerName} ({activeNdrModal.customerPhone}) to prevent RTO.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveNdrModal(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              marginBottom: '1.25rem',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              {activeNdrModal.whatsappDraft}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Courier: <strong>{activeNdrModal.courier}</strong> ({activeNdrModal.trackingNumber})
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleCopyWhatsApp(activeNdrModal.whatsappDraft)}
                >
                  {copiedWhatsApp ? <Check size={14} style={{ marginRight: '0.25rem', color: '#10b981' }} /> : <Copy size={14} style={{ marginRight: '0.25rem' }} />}
                  {copiedWhatsApp ? 'Copied!' : 'Copy Text'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    const phone = activeNdrModal.customerPhone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(activeNdrModal.whatsappDraft)}`, '_blank');
                    resolveNdrCase(activeNdrModal.id, 'action_taken', 'WhatsApp outreach initiated');
                    setActiveNdrModal(null);
                  }}
                  style={{ backgroundColor: '#25D366', borderColor: '#25D366', color: '#ffffff' }}
                >
                  <ExternalLink size={14} style={{ marginRight: '0.25rem' }} />
                  Open WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
