import React, { useState } from 'react';
import { 
  Download, 
  Building2, 
  ShieldCheck, 
  HelpCircle, 
  AlertCircle, 
  CheckCircle2, 
  Percent, 
  Coins, 
  FileSpreadsheet, 
  Scale
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useTaxData } from '../hooks/useTaxData';
import { formatINR } from '../services/analyticsService';
import {
  exportGstr1B2csCsv,
  exportGstr1HsnCsv,
  exportSection52TcsCsv,
  exportGstr1Json
} from '../services/tax/taxService';

type ComplianceTab = 'b2cs' | 'hsn' | 'tcs' | 'gstr3b';

export const TaxCompliance: React.FC = () => {
  const {
    sellerState,
    setSellerState,
    sellerInfo,
    availableStates,
    summary
  } = useTaxData();

  const [activeTab, setActiveTab] = useState<ComplianceTab>('b2cs');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Trigger file download helper
  const triggerDownload = (content: string, fileName: string, mimeType = 'text/csv;charset=utf-8;') => {
    const blob = new Blob([content], { type: mimeType });
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

  const handleDownloadB2cs = () => {
    const csv = exportGstr1B2csCsv(summary);
    triggerDownload(csv, `GSTR1_B2CS_${sellerInfo.code}_${summary.dateRange.end}.csv`);
  };

  const handleDownloadHsn = () => {
    const csv = exportGstr1HsnCsv(summary);
    triggerDownload(csv, `GSTR1_Table12_HSN_${summary.dateRange.end}.csv`);
  };

  const handleDownloadTcs = () => {
    const csv = exportSection52TcsCsv(summary);
    triggerDownload(csv, `Section52_Marketplace_TCS_${summary.dateRange.end}.csv`);
  };

  const handleDownloadJson = () => {
    const json = exportGstr1Json(summary);
    triggerDownload(json, `GSTR1_Offline_Payload_${summary.dateRange.end}.json`, 'application/json');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="GST Tax & Compliance Command Center"
        subtitle={`GSTR-1, GSTR-3B & Section 52 Marketplace TCS reconciliation for Indian eCommerce operations (${summary.dateRange.start} to ${summary.dateRange.end})`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handleDownloadB2cs}>
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              B2CS CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadHsn}>
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              HSN CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={handleDownloadTcs}>
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              TCS CSV
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownloadJson}>
              <FileSpreadsheet size={15} style={{ marginRight: '0.35rem' }} />
              GSTR-1 JSON
            </Button>
          </div>
        }
      />

      {/* Success Download Banner */}
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
          <span>Successfully exported <strong>{downloadSuccess}</strong> for filing reconciliation.</span>
        </div>
      )}

      {/* Seller Origin State Selector Bar */}
      <Card style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
        <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Building2 size={22} style={{ color: 'var(--color-primary)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Registered Business Origin State (Place of Business)
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Intra-State (<span style={{ color: '#10b981', fontWeight: 500 }}>CGST 50% + SGST 50%</span>) applies to orders delivered within this state. All cross-border shipments trigger <span style={{ color: '#6366f1', fontWeight: 500 }}>100% IGST</span>.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Seller State:</span>
            <select
              value={sellerState}
              onChange={(e) => setSellerState(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: '0.875rem',
                fontWeight: 500,
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {availableStates.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.pos}
                </option>
              ))}
            </select>
            <Badge variant="primary" size="sm">
              Code {sellerInfo.code}
            </Badge>
          </div>
        </CardBody>
      </Card>

      {/* 4 Executive KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
        {/* Card 1: Output GST Liability */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Output GST
              </span>
              <Percent size={18} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(summary.totalOutputTax)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              IGST: <strong>{formatINR(summary.totalIgst)}</strong> · CGST+SGST: <strong>{formatINR(summary.totalCgst + summary.totalSgst)}</strong>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Eligible Input Tax Credit (ITC) */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Eligible Input Tax Credit (ITC)
              </span>
              <ShieldCheck size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
              {formatINR(summary.gstr3b.eligibleItc.totalAvailableItc)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              COGS: <strong>{formatINR(summary.gstr3b.eligibleItc.cogsProcurementItc)}</strong> · Platform Fees: <strong>{formatINR(summary.gstr3b.eligibleItc.marketplaceServicesItc + summary.gstr3b.eligibleItc.shippingLogisticsItc)}</strong>
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Section 52 TCS Withheld */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Sec 52 TCS Credit
              </span>
              <Coins size={18} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1', marginBottom: '0.25rem' }}>
              {formatINR(summary.tcsSummary.blended.totalTcs)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              1% withheld by Amazon, Flipkart & Meesho (claimable in cash ledger)
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Net Cash Tax Payable */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Net Cash Tax Payable
              </span>
              <Scale size={18} style={{ color: summary.gstr3b.netTaxPayableInCash > 0 ? '#ef4444' : '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.gstr3b.netTaxPayableInCash > 0 ? '#ef4444' : '#10b981', marginBottom: '0.25rem' }}>
              {formatINR(summary.gstr3b.netTaxPayableInCash)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              {summary.gstr3b.excessCreditCarriedForward > 0 ? (
                <span style={{ color: '#10b981', fontWeight: 500 }}>
                  Credit carried forward: {formatINR(summary.gstr3b.excessCreditCarriedForward)}
                </span>
              ) : (
                <span>After deducting total ITC and Section 52 TCS credit</span>
              )}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '1.25rem',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('b2cs')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'b2cs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'b2cs' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'b2cs' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          GSTR-1 B2CS (Place of Supply)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('hsn')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'hsn' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'hsn' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'hsn' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          HSN Summary (Table 12)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tcs')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'tcs' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'tcs' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'tcs' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          Section 52 TCS Audit
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('gstr3b')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'gstr3b' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'gstr3b' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'gstr3b' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          GSTR-3B & Input Tax Credit (ITC)
        </button>
      </div>

      {/* Tab 1: GSTR-1 B2CS Table */}
      {activeTab === 'b2cs' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>GSTR-1 Table 7: B2C (Small) Outward Supplies by Place of Supply (POS)</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Aggregated state-wise retail invoices for filing on the GST Portal. Inter-state sales incur IGST; intra-state sales in {sellerInfo.name} incur CGST + SGST.
                </div>
              </div>
              <Badge variant="neutral">{summary.b2csSummary.length} States / Rates</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Place of Supply (POS)</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'center' }}>GST Rate</th>
                    <th style={{ textAlign: 'right' }}>Invoiced Value</th>
                    <th style={{ textAlign: 'right' }}>Taxable Value</th>
                    <th style={{ textAlign: 'right' }}>Integrated (IGST)</th>
                    <th style={{ textAlign: 'right' }}>Central (CGST)</th>
                    <th style={{ textAlign: 'right' }}>State (SGST)</th>
                    <th style={{ textAlign: 'right' }}>Total Tax</th>
                    <th style={{ textAlign: 'center' }}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.b2csSummary.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No orders recorded for the selected period and platform.
                      </td>
                    </tr>
                  ) : (
                    summary.b2csSummary.map((item, idx) => (
                      <tr key={`${item.pos}_${item.taxRate}_${idx}`}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.pos}
                        </td>
                        <td>
                          {item.supplyType === 'intra_state' ? (
                            <Badge variant="success" size="sm">Intra-State</Badge>
                          ) : (
                            <Badge variant="primary" size="sm">Inter-State</Badge>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.taxRate}%</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(item.grossValue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatINR(item.taxableValue)}</td>
                        <td style={{ textAlign: 'right', color: item.igst > 0 ? '#6366f1' : 'var(--text-secondary)' }}>
                          {item.igst > 0 ? formatINR(item.igst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', color: item.cgst > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          {item.cgst > 0 ? formatINR(item.cgst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', color: item.sgst > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          {item.sgst > 0 ? formatINR(item.sgst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {formatINR(item.totalTax)}
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.orderCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                    <td>Total Outward Supplies</td>
                    <td>—</td>
                    <td style={{ textAlign: 'center' }}>—</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(summary.totalGrossSales)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(summary.totalTaxableValue)}</td>
                    <td style={{ textAlign: 'right', color: '#6366f1' }}>{formatINR(summary.totalIgst)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(summary.totalCgst)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(summary.totalSgst)}</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(summary.totalOutputTax)}</td>
                    <td style={{ textAlign: 'center' }}>
                      {summary.b2csSummary.reduce((acc, i) => acc + i.orderCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 2: HSN Summary Table 12 */}
      {activeTab === 'hsn' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>GSTR-1 Table 12: HSN-Wise Summary of Outward Supplies</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Statutory commodity breakdown required by GST regulations. Includes quantities sold, taxable values, and applicable tax rates.
                </div>
              </div>
              <Badge variant="neutral">{summary.hsnSummary.length} HSN Codes</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>HSN Code</th>
                    <th>Description</th>
                    <th style={{ textAlign: 'center' }}>UQC</th>
                    <th style={{ textAlign: 'center' }}>Total Qty</th>
                    <th style={{ textAlign: 'center' }}>Rate</th>
                    <th style={{ textAlign: 'right' }}>Total Value</th>
                    <th style={{ textAlign: 'right' }}>Taxable Value</th>
                    <th style={{ textAlign: 'right' }}>IGST</th>
                    <th style={{ textAlign: 'right' }}>CGST</th>
                    <th style={{ textAlign: 'right' }}>SGST</th>
                    <th style={{ textAlign: 'right' }}>Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.hsnSummary.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No items sold in the selected period.
                      </td>
                    </tr>
                  ) : (
                    summary.hsnSummary.map((item) => (
                      <tr key={`${item.hsnCode}_${item.taxRate}`}>
                        <td style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          {item.hsnCode}
                        </td>
                        <td style={{ color: 'var(--text-primary)' }}>{item.description}</td>
                        <td style={{ textAlign: 'center' }}>
                          <Badge variant="neutral" size="sm">{item.uqc}</Badge>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.totalQuantity}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{item.taxRate}%</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(item.totalValue)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 500 }}>{formatINR(item.taxableValue)}</td>
                        <td style={{ textAlign: 'right', color: item.igst > 0 ? '#6366f1' : 'var(--text-secondary)' }}>
                          {item.igst > 0 ? formatINR(item.igst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', color: item.cgst > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          {item.cgst > 0 ? formatINR(item.cgst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', color: item.sgst > 0 ? '#10b981' : 'var(--text-secondary)' }}>
                          {item.sgst > 0 ? formatINR(item.sgst) : '₹0'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(item.totalTax)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 3: Section 52 TCS Audit */}
      {activeTab === 'tcs' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <div>
                <CardTitle>Section 52 TCS Audit (Tax Collected at Source by Marketplaces)</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Under Section 52 of the CGST Act, Amazon, Flipkart, and Meesho collect 1% TCS on net taxable supplies (Gross Sales minus Returns). Reconcile against your GSTR-8 credits.
                </div>
              </div>
              <Badge variant="primary">1.0% Statutory Rate</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Marketplace / Channel</th>
                    <th style={{ textAlign: 'right' }}>Gross Taxable</th>
                    <th style={{ textAlign: 'right' }}>Returns Deduction</th>
                    <th style={{ textAlign: 'right' }}>Net Taxable Supply</th>
                    <th style={{ textAlign: 'right' }}>IGST TCS (1%)</th>
                    <th style={{ textAlign: 'right' }}>CGST TCS (0.5%)</th>
                    <th style={{ textAlign: 'right' }}>SGST TCS (0.5%)</th>
                    <th style={{ textAlign: 'right' }}>Total 1% TCS Withheld</th>
                    <th style={{ textAlign: 'center' }}>Orders</th>
                    <th style={{ textAlign: 'center' }}>Returns</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    summary.tcsSummary.amazon,
                    summary.tcsSummary.flipkart,
                    summary.tcsSummary.meesho
                  ].map((t) => (
                    <tr key={t.marketplace}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: t.marketplace === 'amazon' ? '#ff9900' : t.marketplace === 'flipkart' ? '#2874f0' : '#f43397'
                          }} />
                          {t.displayName}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatINR(t.grossTaxableValue)}</td>
                      <td style={{ textAlign: 'right', color: '#ef4444' }}>
                        {t.returnedTaxableValue > 0 ? `-${formatINR(t.returnedTaxableValue)}` : '₹0'}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(t.netTaxableValue)}</td>
                      <td style={{ textAlign: 'right', color: '#6366f1' }}>{formatINR(t.igstTcs)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(t.cgstTcs)}</td>
                      <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(t.sgstTcs)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {formatINR(t.totalTcs)}
                      </td>
                      <td style={{ textAlign: 'center' }}>{t.orderCount}</td>
                      <td style={{ textAlign: 'center', color: t.returnCount > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                        {t.returnCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-color)', fontWeight: 700 }}>
                    <td>Total Portfolio TCS</td>
                    <td style={{ textAlign: 'right' }}>{formatINR(summary.tcsSummary.blended.grossTaxableValue)}</td>
                    <td style={{ textAlign: 'right', color: '#ef4444' }}>
                      {summary.tcsSummary.blended.returnedTaxableValue > 0 ? `-${formatINR(summary.tcsSummary.blended.returnedTaxableValue)}` : '₹0'}
                    </td>
                    <td style={{ textAlign: 'right' }}>{formatINR(summary.tcsSummary.blended.netTaxableValue)}</td>
                    <td style={{ textAlign: 'right', color: '#6366f1' }}>{formatINR(summary.tcsSummary.blended.igstTcs)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(summary.tcsSummary.blended.cgstTcs)}</td>
                    <td style={{ textAlign: 'right', color: '#10b981' }}>{formatINR(summary.tcsSummary.blended.sgstTcs)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-primary)' }}>
                      {formatINR(summary.tcsSummary.blended.totalTcs)}
                    </td>
                    <td style={{ textAlign: 'center' }}>{summary.tcsSummary.blended.orderCount}</td>
                    <td style={{ textAlign: 'center' }}>{summary.tcsSummary.blended.returnCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1.15rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'flex-start'
            }}>
              <HelpCircle size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>How to Claim Your TCS Credit:</strong> E-commerce operators file Form GSTR-8 monthly. When filing your monthly returns on the GST portal, navigate to <em>TDS and TCS Credit Received</em> to accept these credits into your Electronic Cash Ledger, directly reducing your cash tax payable.
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 4: GSTR-3B & Input Tax Credit (ITC) */}
      {activeTab === 'gstr3b' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {/* Step-by-Step Waterfall Card */}
          <Card>
            <CardHeader>
              <CardTitle>GSTR-3B Cash Liability Reconciliation</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.875rem' }}>
                {/* Step 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(A) Gross Output GST Payable</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tax on outward deliveries</div>
                  </div>
                  <div style={{ fontWeight: 700, color: '#f59e0b' }}>
                    {formatINR(summary.gstr3b.outwardTaxableSupplies.totalTax)}
                  </div>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(B) Less: COGS Procurement ITC</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>GST paid to product manufacturers/suppliers</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>
                    -{formatINR(summary.gstr3b.eligibleItc.cogsProcurementItc)}
                  </div>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(C) Less: Marketplace Services ITC</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>18% GST on Amazon, Flipkart & Meesho commissions</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>
                    -{formatINR(summary.gstr3b.eligibleItc.marketplaceServicesItc)}
                  </div>
                </div>

                {/* Step 4 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(D) Less: Courier & Logistics ITC</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>18% GST charged on forward/reverse shipping</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#10b981' }}>
                    -{formatINR(summary.gstr3b.eligibleItc.shippingLogisticsItc)}
                  </div>
                </div>

                {/* Step 5 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>(E) Less: Section 52 TCS Credit</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Electronic cash ledger credits from platforms</div>
                  </div>
                  <div style={{ fontWeight: 600, color: '#6366f1' }}>
                    -{formatINR(summary.gstr3b.tcsCreditAvailable)}
                  </div>
                </div>

                {/* Final Net Cash */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '2px solid var(--border-color)',
                  backgroundColor: summary.gstr3b.netTaxPayableInCash > 0 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: summary.gstr3b.netTaxPayableInCash > 0 ? '#ef4444' : '#10b981' }}>
                      (F) Net GST Cash Outflow
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Amount to pay via GST Challan (PMT-06)
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: summary.gstr3b.netTaxPayableInCash > 0 ? '#ef4444' : '#10b981' }}>
                    {formatINR(summary.gstr3b.netTaxPayableInCash)}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Strategic Tax Optimization Guidance */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Optimization & Cash Flow Protection</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <ShieldCheck size={20} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>100% Marketplace Fee Invoices Claimable</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Amazon and Flipkart issue monthly GST invoices for closing fees, referral commissions, and FBA storage. Claiming this ₹{summary.gstr3b.eligibleItc.marketplaceServicesItc.toFixed(0)} ITC reduces your business cash burn directly.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <Coins size={20} style={{ color: '#6366f1', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Section 52 TCS Cash Offsetting</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      You have <strong>{formatINR(summary.gstr3b.tcsCreditAvailable)}</strong> withheld in platform escrow. Ensure your GST filing practitioner accepts these entries under GSTR-8 before finalizing GSTR-3B challans.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <AlertCircle size={20} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Zero-Tax Book Sales Immunity</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Printed books under HSN 4901 are statutory tax-exempt (0% GST). Ensure your invoicing software does not add output GST on book SKUs.
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
};
