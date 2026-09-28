import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search, 
  ArrowUpDown, 
  PackageCheck, 
  Boxes 
} from 'lucide-react';
import type { RestockMetrics, RestockUrgency } from '../../services/inventory/inventoryCalculations';
import type { InventoryItem } from '../../services/inventory/inventoryService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatINR } from '../../services/analyticsService';

export interface RestockRecommendationTableProps {
  metrics: RestockMetrics[];
  inventoryMap: Map<string, InventoryItem>;
  onAdjustStock: (item: InventoryItem) => void;
}

type FilterTab = 'all' | 'reorder' | 'stockout' | 'critical' | 'healthy' | 'overstock';
type SortField = 'urgency' | 'doi' | 'poValue' | 'available' | 'velocity';

export const RestockRecommendationTable: React.FC<RestockRecommendationTableProps> = ({
  metrics,
  inventoryMap,
  onAdjustStock
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('urgency');
  const [sortAsc, setSortAsc] = useState(true);

  // Filter items
  const filteredMetrics = useMemo(() => {
    let result = [...metrics];

    // Category tab filter
    if (activeFilter === 'reorder') {
      result = result.filter(
        (m) =>
          m.urgency === 'STOCKOUT' ||
          m.urgency === 'CRITICAL_STOCKOUT_RISK' ||
          m.urgency === 'REORDER_NOW'
      );
    } else if (activeFilter === 'stockout') {
      result = result.filter((m) => m.urgency === 'STOCKOUT');
    } else if (activeFilter === 'critical') {
      result = result.filter((m) => m.urgency === 'CRITICAL_STOCKOUT_RISK');
    } else if (activeFilter === 'healthy') {
      result = result.filter((m) => m.urgency === 'HEALTHY');
    } else if (activeFilter === 'overstock') {
      result = result.filter((m) => m.urgency === 'OVERSTOCKED' || m.urgency === 'DEAD_STOCK');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.sku.toLowerCase().includes(q) ||
          m.productName.toLowerCase().includes(q)
      );
    }

    // Sorting
    const urgencyWeight: Record<RestockUrgency, number> = {
      STOCKOUT: 0,
      CRITICAL_STOCKOUT_RISK: 1,
      REORDER_NOW: 2,
      OVERSTOCKED: 3,
      DEAD_STOCK: 4,
      HEALTHY: 5
    };

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'urgency') {
        cmp = urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
      } else if (sortField === 'doi') {
        cmp = a.doi - b.doi;
      } else if (sortField === 'poValue') {
        cmp = b.reorderPoValue - a.reorderPoValue;
      } else if (sortField === 'available') {
        cmp = a.availableStock - b.availableStock;
      } else if (sortField === 'velocity') {
        cmp = b.velocity.vDaily - a.velocity.vDaily;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [metrics, activeFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getUrgencyBadge = (urgency: RestockUrgency) => {
    switch (urgency) {
      case 'STOCKOUT':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <AlertTriangle size={12} />
            STOCKOUT
          </span>
        );
      case 'CRITICAL_STOCKOUT_RISK':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(249, 115, 22, 0.12)',
              color: '#fb923c',
              border: '1px solid rgba(249, 115, 22, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Clock size={12} />
            CRITICAL RISK
          </span>
        );
      case 'REORDER_NOW':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(245, 158, 11, 0.12)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Clock size={12} />
            REORDER NOW
          </span>
        );
      case 'HEALTHY':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <CheckCircle2 size={12} />
            HEALTHY
          </span>
        );
      case 'OVERSTOCKED':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(139, 92, 246, 0.12)',
              color: '#c4b5fd',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <Boxes size={12} />
            OVERSTOCKED
          </span>
        );
      case 'DEAD_STOCK':
        return (
          <span
            style={{
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            <PackageCheck size={12} />
            DEAD STOCK
          </span>
        );
    }
  };

  const reorderNeededCount = useMemo(() => {
    return metrics.filter(
      (m) =>
        m.urgency === 'STOCKOUT' ||
        m.urgency === 'CRITICAL_STOCKOUT_RISK' ||
        m.urgency === 'REORDER_NOW'
    ).length;
  }, [metrics]);

  return (
    <div
      style={{
        background: 'var(--bg-surface, #ffffff)',
        borderRadius: '12px',
        border: '1px solid var(--border-color, #e2e8f0)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm, 0 1px 2px 0 rgba(0, 0, 0, 0.05))'
      }}
    >
      {/* Table Header Controls */}
      <div
        style={{
          padding: '1.25rem',
          borderBottom: '1px solid var(--border-color, #e2e8f0)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'all' ? 'var(--color-primary)' : 'var(--border-color)',
              background: activeFilter === 'all' ? 'var(--color-primary)' : 'transparent',
              color: activeFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            All Items ({metrics.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('reorder')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'reorder' ? '#f59e0b' : 'var(--border-color)',
              background: activeFilter === 'reorder' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
              color: activeFilter === 'reorder' ? '#fbbf24' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Reorder Needed ({reorderNeededCount})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('stockout')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'stockout' ? '#ef4444' : 'var(--border-color)',
              background: activeFilter === 'stockout' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              color: activeFilter === 'stockout' ? '#f87171' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Stockouts ({metrics.filter((m) => m.urgency === 'STOCKOUT').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('critical')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'critical' ? '#f97316' : 'var(--border-color)',
              background: activeFilter === 'critical' ? 'rgba(249, 115, 22, 0.15)' : 'transparent',
              color: activeFilter === 'critical' ? '#fb923c' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Critical Risk ({metrics.filter((m) => m.urgency === 'CRITICAL_STOCKOUT_RISK').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('healthy')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'healthy' ? '#10b981' : 'var(--border-color)',
              background: activeFilter === 'healthy' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              color: activeFilter === 'healthy' ? '#34d399' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Healthy ({metrics.filter((m) => m.urgency === 'HEALTHY').length})
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('overstock')}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: activeFilter === 'overstock' ? '#8b5cf6' : 'var(--border-color)',
              background: activeFilter === 'overstock' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
              color: activeFilter === 'overstock' ? '#c4b5fd' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Overstocked / Dead ({metrics.filter((m) => m.urgency === 'OVERSTOCKED' || m.urgency === 'DEAD_STOCK').length})
          </button>
        </div>

        {/* Search input */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }}
          />
          <input
            type="text"
            placeholder="Search SKU or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.45rem 0.75rem 0.45rem 2.2rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              outline: 'none',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Table Container */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                SKU & Product Name
              </th>
              <th
                onClick={() => handleSort('velocity')}
                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Daily Velocity (V)
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('available')}
                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Stock on Hand
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('doi')}
                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Days of Inventory (DOI)
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Reorder Point (ROP)
              </th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Restock Suggestion
              </th>
              <th
                onClick={() => handleSort('poValue')}
                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  PO Cost (INR)
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th
                onClick={() => handleSort('urgency')}
                style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  Restock Urgency
                  <ArrowUpDown size={12} />
                </div>
              </th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No inventory items match the selected filter criteria.
                </td>
              </tr>
            ) : (
              filteredMetrics.map((item) => {
                const invItem = inventoryMap.get(item.sku.toLowerCase()) || {
                  sku: item.sku,
                  productName: item.productName,
                  marketplace: item.marketplace,
                  currentStock: item.currentStock,
                  reservedStock: item.reservedStock,
                  leadTimeDays: item.leadTimeDays,
                  safetyStockDays: item.safetyStockDays,
                  unitCost: item.unitCost,
                  updatedAt: new Date().toISOString()
                };

                return (
                  <tr
                    key={item.sku}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    {/* SKU & Name */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                          {item.sku}
                        </span>
                        <Badge
                          variant={
                            item.marketplace === 'amazon'
                              ? 'amazon'
                              : item.marketplace === 'flipkart'
                              ? 'flipkart'
                              : 'primary'
                          }
                          size="sm"
                        >
                          {item.marketplace === 'all' ? 'Amazon & Flipkart' : item.marketplace}
                        </Badge>
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.2rem',
                          maxWidth: '260px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.productName}
                      >
                        {item.productName}
                      </div>
                    </td>

                    {/* Sales Velocity */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.velocity.vDaily.toFixed(2)} units/d
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        7d: {item.velocity.v7.toFixed(1)} | 30d: {item.velocity.v30.toFixed(1)}
                      </div>
                    </td>

                    {/* Stock on Hand */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: item.availableStock === 0 ? '#f87171' : 'var(--text-primary)'
                          }}
                        >
                          {item.availableStock} avail
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Total: {item.currentStock} | Rsv: {item.reservedStock}
                      </div>
                    </td>

                    {/* Days of Inventory */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600 }}>
                        {item.doi >= 999 ? (
                          <span style={{ color: 'var(--text-muted)' }}>&gt;120 days</span>
                        ) : item.doi === 0 ? (
                          <span style={{ color: '#f87171' }}>0 days</span>
                        ) : (
                          <span
                            style={{
                              color:
                                item.doi <= item.leadTimeDays
                                  ? '#f87171'
                                  : item.doi <= (item.leadTimeDays + item.safetyStockDays)
                                  ? '#fbbf24'
                                  : item.doi <= 60
                                  ? '#34d399'
                                  : '#c4b5fd'
                            }}
                          >
                            {item.doi.toFixed(1)} days
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        Lead: {item.leadTimeDays}d | Safe: {item.safetyStockDays}d
                      </div>
                    </td>

                    {/* Reorder Point */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.rop} units
                      </span>
                    </td>

                    {/* Restock Units */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {item.recommendedReorderQty > 0 ? (
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                          +{item.recommendedReorderQty} units
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                          Sufficient
                        </span>
                      )}
                    </td>

                    {/* Estimated PO Value */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {item.reorderPoValue > 0 ? (
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                            {formatINR(item.reorderPoValue)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            @{formatINR(item.unitCost)}/unit
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>₹0</span>
                      )}
                    </td>

                    {/* Urgency Badge */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {getUrgencyBadge(item.urgency)}
                    </td>

                    {/* Action */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onAdjustStock(invItem)}
                        style={{ fontSize: '0.78rem' }}
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
