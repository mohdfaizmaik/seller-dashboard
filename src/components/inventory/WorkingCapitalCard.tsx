import { AlertOctagon, ShieldCheck, Sparkles } from 'lucide-react';
import type { WorkingCapitalSummary } from '../../services/inventory/inventoryCalculations';
import { formatINR, formatPercent } from '../../services/analyticsService';

export interface WorkingCapitalCardProps {
  summary: WorkingCapitalSummary;
}

export const WorkingCapitalCard: React.FC<WorkingCapitalCardProps> = ({ summary }) => {
  const activePercent = summary.totalAssetValue > 0 ? (summary.activeCapital / summary.totalAssetValue) * 100 : 0;
  const deadPercent = summary.totalAssetValue > 0 ? (summary.lockedDeadCapital / summary.totalAssetValue) * 100 : 0;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Working Capital & Dead Stock Diagnostics
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Audit of capital velocity, trapped liquidity, and strategic stock liquidation playbooks
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {summary.lockedDeadCapital > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px'
              }}
            >
              <AlertOctagon size={14} />
              {summary.deadStockList.length} Stagnant SKU(s)
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#34d399',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px'
              }}
            >
              <ShieldCheck size={14} />
              100% Capital Turnover Healthy
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Working Capital Split Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            padding: '1rem',
            borderRadius: '10px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Warehouse Inventory Value
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              {formatINR(summary.totalAssetValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Across {summary.totalSkus} catalog items
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Working Capital
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
              {formatINR(summary.activeCapital)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
              {formatPercent(activePercent)} of total assets (healthy turnover)
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Trapped in Dead / Stagnant Stock
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#f87171', marginTop: '0.2rem' }}>
              {formatINR(summary.lockedDeadCapital)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              {formatPercent(deadPercent)} of working capital locked
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Restock Reorder Requirement
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
              {formatINR(summary.totalReorderPoValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Capital needed to replenish stockout &amp; critical SKUs
            </div>
          </div>
        </div>

        {/* Visual Capital Allocation Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 600, color: '#34d399' }}>
              Active Capital: {formatPercent(activePercent)}
            </span>
            <span style={{ fontWeight: 600, color: summary.lockedDeadCapital > 0 ? '#f87171' : 'var(--text-muted)' }}>
              Trapped Capital: {formatPercent(deadPercent)}
            </span>
          </div>
          <div
            style={{
              height: '10px',
              borderRadius: '9999px',
              background: '#1f2937',
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <div
              style={{
                width: `${activePercent}%`,
                background: '#10b981',
                transition: 'width 0.3s ease'
              }}
              title={`Active Capital: ${formatPercent(activePercent)}`}
            />
            <div
              style={{
                width: `${deadPercent}%`,
                background: '#ef4444',
                transition: 'width 0.3s ease'
              }}
              title={`Trapped Capital: ${formatPercent(deadPercent)}`}
            />
          </div>
        </div>

        {/* Stagnant Inventory Liquidation Strategy Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Dead Stock Liquidation Recommendations
            </h4>
          </div>

          {summary.deadStockList.length === 0 ? (
            <div
              style={{
                padding: '1.5rem',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                color: '#34d399',
                fontSize: '0.88rem',
                textAlign: 'center'
              }}
            >
              🎉 Excellent inventory health! No SKUs currently have more than 60 days of idle supply.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {summary.deadStockList.map((item) => (
                <div
                  key={item.sku}
                  style={{
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ flex: '1 1 280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        {item.sku}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: item.urgency === 'DEAD_STOCK' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(139, 92, 246, 0.12)',
                          color: item.urgency === 'DEAD_STOCK' ? '#f87171' : '#c4b5fd',
                          border: `1px solid ${item.urgency === 'DEAD_STOCK' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`
                        }}
                      >
                        {item.urgency === 'DEAD_STOCK' ? 'DEAD STOCK' : 'OVERSTOCKED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {item.productName}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Units Stagnant</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.currentStock} units</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Locked Capital</div>
                      <div style={{ fontWeight: 700, color: '#f87171' }}>{formatINR(item.lockedValue)}</div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Runway (DOI)</div>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {item.doi >= 999 ? '>120 days' : `${item.doi.toFixed(0)} days`}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      flex: '1 1 100%',
                      marginTop: '0.25rem',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                      borderLeft: '3px solid #8b5cf6',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <strong style={{ color: 'var(--text-primary)', marginRight: '0.35rem' }}>
                      Playbook Action:
                    </strong>
                    {item.recommendedLiquidationAction}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
