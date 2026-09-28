import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  RotateCw,
  MessageSquare,
  TrendingUp,
  Percent,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import type { Order } from '../../models/order';
import type { InventoryItem } from '../../services/inventory/inventoryService';
import type { SkuCost } from '../../services/catalog/cogsService';
import type { DatePresetFilter, PlatformFilter } from '../../hooks/useFilters';
import { buildStoreContext } from '../../services/ai/contextBuilder';
import { generateExecutiveNarrative } from '../../services/ai/copilotService';
import { formatINR, formatPercent } from '../../services/analyticsService';
import { Button } from '../ui/Button';

export interface ExecutiveSummaryCardProps {
  orders: Order[];
  inventory?: InventoryItem[];
  skuCostsMap?: Map<string, SkuCost>;
  preset?: DatePresetFilter;
  platform?: PlatformFilter;
  startDate?: string;
  endDate?: string;
  onOpenCopilot?: (query?: string) => void;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  orders,
  inventory,
  skuCostsMap,
  preset,
  platform,
  startDate,
  endDate,
  onOpenCopilot
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const contextPayload = useMemo(() => {
    void refreshKey;
    return buildStoreContext({
      orders,
      inventory,
      skuCostsMap,
      preset,
      platform,
      startDate,
      endDate
    });
  }, [orders, inventory, skuCostsMap, preset, platform, startDate, endDate, refreshKey]);

  const narrative = useMemo(() => {
    return generateExecutiveNarrative(contextPayload);
  }, [contextPayload]);

  const s = contextPayload.snapshot;

  return (
    <div
      style={{
        borderRadius: '12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)'
            }}
          >
            <Sparkles size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Executive Brief & Store Narrative
              </h3>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.45rem',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(99, 102, 241, 0.15)',
                  color: '#a5b4fc',
                  border: '1px solid rgba(99, 102, 241, 0.3)'
                }}
              >
                AI Synthesized • Live Grounding
              </span>
            </div>
            <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Deterministic synthesis of revenue velocity, margin leakages, and replenishment priorities ({s.periodLabel})
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRefreshKey((prev) => prev + 1)}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            title="Re-synthesize narrative"
          >
            <RotateCw size={13} />
            <span>Regenerate</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenCopilot?.("Give me an executive deep dive into this week's store performance.")}
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <MessageSquare size={13} />
            <span>Deep Dive in Copilot</span>
          </Button>
        </div>
      </div>

      {/* Main Narrative Body */}
      <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p
          style={{
            margin: 0,
            fontSize: '0.9rem',
            lineHeight: 1.65,
            color: 'var(--text-primary)',
            background: 'var(--bg-secondary)',
            padding: '1rem 1.15rem',
            borderRadius: '8px',
            borderLeft: '3px solid var(--color-primary)'
          }}
        >
          {narrative}
        </p>

        {/* 3 Executive Pulse Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem'
          }}
        >
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <TrendingUp size={13} style={{ color: 'var(--color-primary)' }} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Topline Velocity</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {formatINR(s.totalRevenue)}
            </div>
            <div style={{ fontSize: '0.72rem', color: s.growth.revenueGrowth >= 0 ? '#34d399' : '#f87171' }}>
              {s.growth.revenueGrowth >= 0 ? '+' : ''}{s.growth.revenueGrowth.toFixed(1)}% vs prior period
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <Percent size={13} style={{ color: s.profitMargin >= 15 ? '#34d399' : '#f87171' }} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Operating Margin</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: s.netProfit >= 0 ? 'var(--text-primary)' : '#f87171' }}>
              {formatPercent(s.profitMargin)} ({formatINR(s.netProfit)})
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              After {formatPercent(s.returnRate)} returns & deductions
            </div>
          </div>

          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              <AlertTriangle size={13} style={{ color: s.criticalSkus.length > 0 ? '#f87171' : '#34d399' }} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>Supply Chain Risk</span>
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: s.criticalSkus.length > 0 ? '#f87171' : '#34d399' }}>
              {s.criticalSkus.length > 0 ? `${s.criticalSkus.length} SKUs Critical` : 'Inventory Balanced'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {s.criticalSkus.length > 0 ? `${formatINR(s.inventorySummary.totalReorderPoValue)} restock PO needed` : 'Zero stockout risks'}
            </div>
          </div>
        </div>

        {/* Quick Follow-up Chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
            paddingTop: '0.25rem'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Follow up with Copilot:</span>
          {[
            { label: 'Why did profit drop this week?', query: 'Why did my profit drop this week? Analyze returns, fees, and COGS.' },
            { label: 'Which SKUs are at risk of stocking out?', query: 'Which SKUs are at immediate risk of stocking out? Show DOI and reorder units.' },
            { label: 'Compare Amazon vs Flipkart margins', query: 'Compare my Amazon vs. Flipkart net margins and return rates.' }
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onOpenCopilot?.(chip.query)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <span>{chip.label}</span>
              <ArrowRight size={11} style={{ color: 'var(--color-primary)' }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
