import React, { useState, useMemo } from 'react';
import { 
  Download, 
  Target, 
  Flame, 
  CheckCircle2, 
  Play, 
  Pause, 
  TrendingUp, 
  PieChart, 
  DollarSign, 
  RotateCcw, 
  Search, 
  Sparkles 
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardHeader, CardTitle, CardBody } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAdvertising } from '../hooks/useAdvertising';
import { formatINR } from '../services/analyticsService';
import {
  exportCampaignsCsv,
  exportSkuAdEfficiencyCsv
} from '../services/advertising/advertisingService';
import type { EfficiencyTier } from '../models/advertising';

type AdTab = 'sku' | 'campaigns' | 'channels';

export const Advertising: React.FC = () => {
  const {
    summary,
    toggleCampaign,
    resetCampaigns
  } = useAdvertising();

  const [activeTab, setActiveTab] = useState<AdTab>('sku');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<EfficiencyTier | 'all'>('all');
  const [skuSearchTerm, setSkuSearchTerm] = useState('');
  const [skuFilter, setSkuFilter] = useState<'all' | 'active_ads' | 'ad_bleed' | 'star' | 'organic'>('all');

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

  const handleDownloadCampaigns = () => {
    const csv = exportCampaignsCsv(summary);
    triggerDownload(csv, `ad_campaigns_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleDownloadSkuEfficiency = () => {
    const csv = exportSkuAdEfficiencyCsv(summary);
    triggerDownload(csv, `sku_ad_efficiency_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return summary.campaigns.filter((c) => {
      if (tierFilter !== 'all' && c.efficiencyTier !== tierFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.platform.toLowerCase().includes(q);
      }
      return true;
    });
  }, [summary.campaigns, tierFilter, searchTerm]);

  // Filter SKU Efficiencies
  const filteredSkuEfficiencies = useMemo(() => {
    return summary.skuEfficiencies.filter((item) => {
      if (skuFilter === 'active_ads' && item.adSpend === 0) return false;
      if (skuFilter === 'ad_bleed' && !item.isAdBleed) return false;
      if (skuFilter === 'star' && item.roas < 4.5) return false;
      if (skuFilter === 'organic' && item.adSpend > 0) return false;
      if (skuSearchTerm) {
        const q = skuSearchTerm.toLowerCase();
        return item.sku.toLowerCase().includes(q) || item.productName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [summary.skuEfficiencies, skuFilter, skuSearchTerm]);

  return (
    <div className="page-container">
      <PageHeader
        title="Advertising & Marketing ROI Command Center"
        subtitle="Multi-channel advertising intelligence, ROAS / TACoS attribution, and SKU-level ad bleed detection across Amazon, Flipkart, and Meesho"
        actions={
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" onClick={handleDownloadSkuEfficiency}>
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              SKU Ad Efficiency CSV
            </Button>
            <Button variant="primary" size="sm" onClick={handleDownloadCampaigns}>
              <Download size={15} style={{ marginRight: '0.35rem' }} />
              Campaigns CSV
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

      {/* Ad Bleed & Money Pit Alert Banner */}
      {(summary.adBleedCount > 0 || summary.moneyPitSpend > 0) && (
        <Card style={{
          marginBottom: '1.5rem',
          borderLeft: '4px solid #ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.04)'
        }}>
          <CardBody style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.9rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Flame size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Active Marketing Bleed Detected ({summary.adBleedCount} SKUs draining margins)
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Identified <strong>{summary.adBleedCount} products</strong> where Advertising Cost of Sales (ACoS) exceeds product gross margin. Additionally, <strong>{formatINR(summary.moneyPitSpend)}</strong> is trapped in zero-conversion money pit campaigns.
                </div>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setActiveTab('sku');
                setSkuFilter('ad_bleed');
              }}
              style={{ color: '#ef4444', borderColor: '#ef4444' }}
            >
              Review Ad Bleed SKUs
            </Button>
          </CardBody>
        </Card>
      )}

      {/* 5 Executive KPI Cards */}
      <div className="kpi-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
        {/* Card 1: Total Ad Spend */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total Ad Spend
              </span>
              <DollarSign size={18} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(summary.totalAdSpend)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              CPC: <strong>{formatINR(summary.blendedCpc, 2)}</strong> · Clicks: <strong>{summary.totalClicks.toLocaleString('en-IN')}</strong>
            </div>
          </CardBody>
        </Card>

        {/* Card 2: Attributed Ad Sales */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Attributed Ad Sales
              </span>
              <TrendingUp size={18} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginBottom: '0.25rem' }}>
              {formatINR(summary.totalAdSales)}
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Attributed Orders: <strong>{summary.totalAdOrders}</strong> ({summary.organicVsPaidRatio.paidPct}% of store)
            </div>
          </CardBody>
        </Card>

        {/* Card 3: Blended ROAS & ACoS */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blended ROAS / ACoS
              </span>
              <Target size={18} style={{ color: summary.blendedRoas >= 4.0 ? '#10b981' : '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {summary.blendedRoas}x <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-secondary)' }}>({summary.blendedAcos}% ACoS)</span>
            </div>
            <div style={{ fontSize: '0.775rem', color: summary.blendedRoas >= 4.0 ? '#10b981' : '#f59e0b' }}>
              {summary.blendedRoas >= 4.0 ? '✓ Healthy portfolio return' : '⚠️ Elevated acquisition cost'}
            </div>
          </CardBody>
        </Card>

        {/* Card 4: Blended TACoS */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blended TACoS
              </span>
              <PieChart size={18} style={{ color: summary.blendedTacos <= 15 ? '#10b981' : '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: summary.blendedTacos <= 15 ? '#10b981' : '#ef4444', marginBottom: '0.25rem' }}>
              {summary.blendedTacos}%
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Total Ad Spend / Total Store Revenue (Target: &lt;15%)
            </div>
          </CardBody>
        </Card>

        {/* Card 5: Blended CAC & Organic Split */}
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Blended CAC
              </span>
              <Sparkles size={18} style={{ color: '#6366f1' }} />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {formatINR(summary.blendedCac)} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/ order</span>
            </div>
            <div style={{ fontSize: '0.775rem', color: 'var(--text-secondary)' }}>
              Organic Share: <strong>{summary.organicVsPaidRatio.organicPct}%</strong>
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
        overflowX: 'auto',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: 'var(--bg-app)',
        paddingTop: '0.5rem'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('sku')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'sku' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'sku' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'sku' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          SKU Ad Bleed & Efficiency ({summary.adBleedCount} Bleeding)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'campaigns' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'campaigns' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'campaigns' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          Campaigns Performance Ledger ({summary.campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('channels')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'channels' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: activeTab === 'channels' ? 'var(--color-primary)' : 'var(--text-secondary)',
            fontWeight: activeTab === 'channels' ? 600 : 500,
            cursor: 'pointer',
            fontSize: '0.875rem',
            whiteSpace: 'nowrap'
          }}
        >
          Cross-Channel Marketing Contrast
        </button>
      </div>

      {/* Tab 1: SKU-Level Ad Bleed & Efficiency */}
      {activeTab === 'sku' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <CardTitle>SKU-Level Advertising Efficiency & Ad Bleed Analysis</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Compares Product Gross Margin % against Advertising Cost of Sales (ACoS). When ACoS exceeds Gross Margin, you lose cash on every ad-driven order.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Badge variant={summary.adBleedCount > 0 ? 'danger' : 'success'}>
                  {summary.adBleedCount} SKUs Bleeding Cash
                </Badge>
              </div>
            </div>

            {/* Filter and Search Bar */}
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

              {/* Filter Pills */}
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                <Button
                  variant={skuFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilter('all')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  All ({summary.skuEfficiencies.length})
                </Button>
                <Button
                  variant={skuFilter === 'active_ads' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilter('active_ads')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Active Ads ({summary.skuEfficiencies.filter(s => s.adSpend > 0).length})
                </Button>
                <Button
                  variant={skuFilter === 'ad_bleed' ? 'danger' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilter('ad_bleed')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Ad Bleed ({summary.adBleedCount})
                </Button>
                <Button
                  variant={skuFilter === 'star' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilter('star')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Stars ({summary.skuEfficiencies.filter(s => s.roas >= 4.5).length})
                </Button>
                <Button
                  variant={skuFilter === 'organic' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSkuFilter('organic')}
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                >
                  Organic ({summary.skuEfficiencies.filter(s => s.adSpend === 0).length})
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
                    <th>Channel</th>
                    <th style={{ textAlign: 'right' }}>Gross Margin %</th>
                    <th style={{ textAlign: 'right' }}>Ad Spend</th>
                    <th style={{ textAlign: 'right' }}>Ad Sales</th>
                    <th style={{ textAlign: 'right' }}>ACoS (%)</th>
                    <th style={{ textAlign: 'center' }}>ROAS</th>
                    <th style={{ textAlign: 'right' }}>TACoS (%)</th>
                    <th style={{ textAlign: 'center' }}>Organic Share</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Tactical Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSkuEfficiencies.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        No SKUs match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSkuEfficiencies.map((item) => (
                      <tr
                        key={item.sku}
                        style={{
                          backgroundColor: item.isAdBleed ? 'rgba(239, 68, 68, 0.05)' : undefined,
                          borderLeft: item.isAdBleed ? '3px solid #ef4444' : '3px solid transparent'
                        }}
                      >
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div>{item.sku}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                            {item.productName}
                          </div>
                        </td>
                        <td>
                          <Badge
                            variant={
                              item.platform === 'amazon' ? 'warning' :
                              item.platform === 'flipkart' ? 'primary' :
                              item.platform === 'meesho' ? 'meesho' : 'neutral'
                            }
                            size="sm"
                          >
                            {item.platform.toUpperCase()}
                          </Badge>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.grossMarginPct}%</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(item.adSpend)}</td>
                        <td style={{ textAlign: 'right' }}>{formatINR(item.adSales)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: item.isAdBleed ? '#ef4444' : '#10b981' }}>
                          {item.acos > 0 ? `${item.acos}%` : '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>
                          {item.roas > 0 ? `${item.roas}x` : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>{item.tacos}%</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{ color: item.organicSharePct > 70 ? '#10b981' : 'var(--text-primary)' }}>
                            {item.organicSharePct}%
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {item.isAdBleed ? (
                            <Badge variant="danger" size="sm">AD BLEED</Badge>
                          ) : item.roas >= 4.5 ? (
                            <Badge variant="success" size="sm">STAR</Badge>
                          ) : item.adSpend > 0 ? (
                            <Badge variant="neutral" size="sm">HEALTHY</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">ORGANIC</Badge>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: item.isAdBleed ? '#ef4444' : 'var(--text-secondary)' }}>
                          {item.recommendation}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 2: Campaigns Performance Ledger */}
      {activeTab === 'campaigns' && (
        <Card>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <CardTitle>Campaigns Performance Ledger & Control</CardTitle>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Live tracking across Amazon Sponsored Ads, Flipkart PLA, and Meesho Boost with one-click status controls.
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-secondary)' }} />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      padding: '0.4rem 0.6rem 0.4rem 2rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Tiers</option>
                  <option value="star_performer">Star Performers (ROAS &gt; 4.5)</option>
                  <option value="healthy">Healthy</option>
                  <option value="ad_bleed">Ad Bleed (ACoS &gt; Target)</option>
                  <option value="money_pit">Money Pits (Zero Sales)</option>
                </select>

                <Button variant="secondary" size="sm" onClick={resetCampaigns} title="Reset Status Overrides">
                  <RotateCcw size={14} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Platform</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Daily Budget</th>
                    <th style={{ textAlign: 'right' }}>Clicks</th>
                    <th style={{ textAlign: 'right' }}>CPC</th>
                    <th style={{ textAlign: 'right' }}>Ad Spend</th>
                    <th style={{ textAlign: 'right' }}>Ad Sales</th>
                    <th style={{ textAlign: 'right' }}>ACoS (%)</th>
                    <th style={{ textAlign: 'center' }}>ROAS</th>
                    <th style={{ textAlign: 'center' }}>Tier</th>
                    <th style={{ textAlign: 'center' }}>Status / Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        <div>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {c.id}</div>
                      </td>
                      <td>
                        <Badge
                          variant={
                            c.platform === 'amazon' ? 'warning' :
                            c.platform === 'flipkart' ? 'primary' : 'meesho'
                          }
                          size="sm"
                        >
                          {c.platform.toUpperCase()}
                        </Badge>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {c.campaignType.replace(/_/g, ' ')}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatINR(c.dailyBudget)}</td>
                      <td style={{ textAlign: 'right' }}>{c.clicks.toLocaleString('en-IN')}</td>
                      <td style={{ textAlign: 'right' }}>{formatINR(c.cpc, 2)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatINR(c.adSpend)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#10b981' }}>{formatINR(c.adSales)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: c.efficiencyTier === 'ad_bleed' ? '#ef4444' : 'var(--text-primary)' }}>
                        {c.adSales > 0 ? `${c.acos.toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {c.adSpend > 0 ? `${c.roas}x` : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.efficiencyTier === 'star_performer' ? (
                          <Badge variant="success" size="sm">STAR</Badge>
                        ) : c.efficiencyTier === 'healthy' ? (
                          <Badge variant="neutral" size="sm">HEALTHY</Badge>
                        ) : c.efficiencyTier === 'ad_bleed' ? (
                          <Badge variant="danger" size="sm">BLEED</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">MONEY PIT</Badge>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <Button
                          variant={c.status === 'active' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleCampaign(c.id, c.status === 'active' ? 'active' : 'paused')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          {c.status === 'active' ? (
                            <>
                              <Pause size={12} /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={12} /> Resume
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tab 3: Cross-Channel Marketing Contrast */}
      {activeTab === 'channels' && (
        <Card>
          <CardHeader>
            <CardTitle>Tri-Marketplace Marketing Contrast: Amazon vs Flipkart vs Meesho</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="table-container" style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>Marketing Metric</th>
                    <th>Amazon India Ads</th>
                    <th>Flipkart Product Listing Ads</th>
                    <th>Meesho Promotions</th>
                    <th>Leading Channel</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Total Ad Spend</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(summary.platformBreakdown.amazon.adSpend)}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(summary.platformBreakdown.flipkart.adSpend)}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(summary.platformBreakdown.meesho.adSpend)}</td>
                    <td>—</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Attributed Ad Revenue</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatINR(summary.platformBreakdown.amazon.adSales)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatINR(summary.platformBreakdown.flipkart.adSales)}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>{formatINR(summary.platformBreakdown.meesho.adSales)}</td>
                    <td><Badge variant="warning" size="sm">Amazon (Volume)</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Return on Ad Spend (ROAS)</td>
                    <td style={{ fontWeight: 700 }}>{summary.platformBreakdown.amazon.roas}x</td>
                    <td style={{ fontWeight: 700 }}>{summary.platformBreakdown.flipkart.roas}x</td>
                    <td style={{ fontWeight: 700, color: '#f43397' }}>{summary.platformBreakdown.meesho.roas}x</td>
                    <td><Badge variant="meesho" size="sm">Meesho ({summary.platformBreakdown.meesho.roas}x)</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Advertising Cost of Sales (ACoS)</td>
                    <td>{summary.platformBreakdown.amazon.acos}%</td>
                    <td>{summary.platformBreakdown.flipkart.acos}%</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{summary.platformBreakdown.meesho.acos}%</td>
                    <td><Badge variant="meesho" size="sm">Meesho (Lowest Cost)</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Cost Per Click (CPC)</td>
                    <td>{formatINR(summary.platformBreakdown.amazon.cpc, 2)}</td>
                    <td>{formatINR(summary.platformBreakdown.flipkart.cpc, 2)}</td>
                    <td style={{ fontWeight: 600, color: '#10b981' }}>{formatINR(summary.platformBreakdown.meesho.cpc, 2)}</td>
                    <td><Badge variant="meesho" size="sm">Meesho (₹{summary.platformBreakdown.meesho.cpc})</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Click-Through Rate (CTR)</td>
                    <td>{summary.platformBreakdown.amazon.ctr}%</td>
                    <td>{summary.platformBreakdown.flipkart.ctr}%</td>
                    <td>{summary.platformBreakdown.meesho.ctr}%</td>
                    <td><Badge variant="neutral" size="sm">Meesho ({summary.platformBreakdown.meesho.ctr}%)</Badge></td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 600 }}>Active Campaigns</td>
                    <td>{summary.platformBreakdown.amazon.activeCampaignsCount}</td>
                    <td>{summary.platformBreakdown.flipkart.activeCampaignsCount}</td>
                    <td>{summary.platformBreakdown.meesho.activeCampaignsCount}</td>
                    <td>—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
};
