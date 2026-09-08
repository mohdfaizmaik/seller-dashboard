import React, { useState } from 'react';
import type { Recommendation } from '../../services/recommendations/recommendationEngine';
import { Card, CardHeader, CardTitle, CardBody } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { 
  AlertTriangle, 
  Zap, 
  Info, 
  CheckCircle2, 
  ArrowRight, 
  Layers,
  Sparkles
} from 'lucide-react';

interface RecommendationsCardProps {
  recommendations: Recommendation[];
  onActionClick?: (rec: Recommendation) => void;
  className?: string;
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({
  recommendations,
  onActionClick,
  className = ''
}) => {
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const filtered = filterCategory === 'all'
    ? recommendations
    : recommendations.filter((r) => r.category === filterCategory);

  const getTypeIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'danger':
        return <AlertTriangle size={18} style={{ color: 'var(--color-danger)' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />;
      case 'opportunity':
        return <Zap size={18} style={{ color: 'var(--color-success)' }} />;
      case 'info':
        return <Info size={18} style={{ color: 'var(--color-primary)' }} />;
      default:
        return <Sparkles size={18} style={{ color: 'var(--color-primary)' }} />;
    }
  };

  const getTypeBadgeVariant = (type: Recommendation['type']) => {
    switch (type) {
      case 'danger':
        return 'danger' as const;
      case 'warning':
        return 'warning' as const;
      case 'opportunity':
        return 'success' as const;
      case 'info':
        return 'info' as const;
      default:
        return 'neutral' as const;
    }
  };

  const getImpactBadgeVariant = (impact: Recommendation['impact']) => {
    switch (impact) {
      case 'high':
        return 'danger' as const;
      case 'medium':
        return 'warning' as const;
      case 'low':
        return 'neutral' as const;
    }
  };

  const categories = [
    { key: 'all', label: `All (${recommendations.length})` },
    { key: 'returns', label: 'Returns' },
    { key: 'margin', label: 'Margins' },
    { key: 'channel_arbitrage', label: 'Arbitrage' },
    { key: 'concentration', label: 'Concentration' },
    { key: 'velocity', label: 'Fulfillment' }
  ];

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--color-primary)'
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <CardTitle>Seller Action Recommendations</CardTitle>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Tactical insights evaluated across Amazon & Flipkart fees, returns, and margin health
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setFilterCategory(c.key)}
              className="text-2xs font-semibold py-1 px-2.5 rounded-full transition-colors"
              style={{
                backgroundColor: filterCategory === c.key ? 'var(--color-primary)' : 'var(--bg-secondary)',
                color: filterCategory === c.key ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer'
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardBody className="p-4 flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
            <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              No Urgent Action Items in this Category
            </span>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
              Your marketplace metrics are running within nominal performance thresholds for the selected parameters.
            </p>
          </div>
        ) : (
          filtered.map((rec) => (
            <div
              key={rec.id}
              className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                borderLeft: `4px solid ${
                  rec.type === 'danger'
                    ? 'var(--color-danger)'
                    : rec.type === 'warning'
                    ? 'var(--color-warning)'
                    : rec.type === 'opportunity'
                    ? 'var(--color-success)'
                    : 'var(--color-primary)'
                }`
              }}
            >
              <div className="flex items-start gap-3 flex-1">
                <div style={{ marginTop: '2px' }}>{getTypeIcon(rec.type)}</div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {rec.title}
                    </span>

                    <Badge variant={getTypeBadgeVariant(rec.type)} size="sm">
                      {rec.type.toUpperCase()}
                    </Badge>

                    <Badge variant={getImpactBadgeVariant(rec.impact)} size="sm">
                      {rec.impact.toUpperCase()} IMPACT
                    </Badge>

                    {rec.marketplace !== 'both' ? (
                      <Badge variant={rec.marketplace === 'amazon' ? 'warning' : 'info'} size="sm">
                        {rec.marketplace.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        CROSS-PLATFORM
                      </Badge>
                    )}
                  </div>

                  {/* Metric Pill */}
                  <div className="my-0.5">
                    <span
                      className="inline-block text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      {rec.metric}
                    </span>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {rec.description}
                  </p>

                  {/* Action recommendation */}
                  <div
                    className="mt-1 p-2 rounded text-2xs font-medium flex items-start gap-1.5"
                    onClick={onActionClick ? () => onActionClick(rec) : undefined}
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.06)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      color: 'var(--text-primary)',
                      cursor: onActionClick ? 'pointer' : 'default'
                    }}
                  >
                    <ArrowRight size={13} style={{ color: 'var(--color-primary)', marginTop: '2px', flexShrink: 0 }} />
                    <span>
                      <strong style={{ color: 'var(--color-primary)' }}>Recommended Action: </strong>
                      {rec.action}
                    </span>
                  </div>

                  {rec.affectedSkus && rec.affectedSkus.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-2xs" style={{ color: 'var(--text-muted)' }}>
                      <Layers size={12} />
                      <span>Affected SKU: </span>
                      {rec.affectedSkus.map((sku) => (
                        <code
                          key={sku}
                          className="px-1 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)'
                          }}
                        >
                          {sku}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardBody>
    </Card>
  );
};
