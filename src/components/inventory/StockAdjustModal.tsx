import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import type { InventoryItem } from '../../services/inventory/inventoryService';
import { Button } from '../ui/Button';

export interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onSave: (
    sku: string,
    currentStock: number,
    reservedStock: number,
    leadTimeDays: number,
    safetyStockDays: number
  ) => Promise<void>;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  item,
  onSave
}) => {
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [reservedStock, setReservedStock] = useState<number>(0);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(14);
  const [safetyStockDays, setSafetyStockDays] = useState<number>(7);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setCurrentStock(item.currentStock);
      setReservedStock(item.reservedStock);
      setLeadTimeDays(item.leadTimeDays);
      setSafetyStockDays(item.safetyStockDays);
      setSavedSuccess(false);
      setErrorMsg(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const availableUnits = Math.max(0, currentStock - reservedStock);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStock < 0 || reservedStock < 0) {
      setErrorMsg('Stock counts cannot be negative.');
      return;
    }
    if (leadTimeDays < 1) {
      setErrorMsg('Lead time must be at least 1 day.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(item.sku, currentStock, reservedStock, leadTimeDays, safetyStockDays);
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update stock levels');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-container"
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: '520px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Adjust Stock & Lead Time
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {item.sku} — {item.productName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0.35rem',
              borderRadius: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '6px',
                background: '#fef2f2',
                color: '#b91c1c',
                fontSize: '0.85rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {savedSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                borderRadius: '6px',
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '0.85rem'
              }}
            >
              <Check size={16} />
              <span>Stock levels updated successfully!</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Current Warehouse Stock
              </label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Physical units on shelves</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Reserved / In-Transit Units
              </label>
              <input
                type="number"
                min="0"
                value={reservedStock}
                onChange={(e) => setReservedStock(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending fulfillment / transit</span>
            </div>
          </div>

          {/* Available Units Callout */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: 'var(--bg-secondary, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Net Available Sellable Stock:
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: availableUnits > 0 ? 'var(--color-primary, #2563eb)' : '#dc2626' }}>
              {availableUnits} units
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Supplier Lead Time (Days)
              </label>
              <input
                type="number"
                min="1"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value, 10) || 1)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Manufacturing + transit</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                Safety Stock Buffer (Days)
              </label>
              <input
                type="number"
                min="0"
                value={safetyStockDays}
                onChange={(e) => setSafetyStockDays(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Spike demand cushion</span>
            </div>
          </div>

          {/* Footer actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              marginTop: '0.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-color, #e2e8f0)'
            }}
          >
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              <Save size={16} style={{ marginRight: '0.4rem' }} />
              {saving ? 'Saving...' : 'Save Stock Levels'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
