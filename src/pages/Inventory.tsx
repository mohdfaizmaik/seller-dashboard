import React, { useState, useMemo, useRef } from 'react';
import { 
  Download, 
  Upload, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSellerData } from '../hooks/useSellerData';
import { useInventory } from '../hooks/useInventory';
import {
  computeRestockMetrics,
  computeWorkingCapitalSummary,
  type RestockMetrics
} from '../services/inventory/inventoryCalculations';
import {
  parseInventoryCsv,
  exportInventoryCsv,
  type InventoryItem
} from '../services/inventory/inventoryService';
import { formatINR, formatPercent } from '../services/analyticsService';
import { RestockRecommendationTable } from '../components/inventory/RestockRecommendationTable';
import { WorkingCapitalCard } from '../components/inventory/WorkingCapitalCard';
import { StockAdjustModal } from '../components/inventory/StockAdjustModal';

export const Inventory: React.FC = () => {
  const { orders } = useSellerData();
  const {
    inventory,
    inventoryMap,
    adjustStockQuantity,
    bulkUpdate,
    resetDefaults
  } = useInventory();

  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute calculated velocity and restock indicators
  const metrics: RestockMetrics[] = useMemo(() => {
    return inventory.map((item) => computeRestockMetrics(item, orders));
  }, [inventory, orders]);

  // Compute portfolio working capital summary
  const workingCapital = useMemo(() => {
    return computeWorkingCapitalSummary(inventory, orders);
  }, [inventory, orders]);

  // Handle Export CSV
  const handleExportCsv = () => {
    const csvData = exportInventoryCsv(inventory);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_restock_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const { valid, errors } = parseInventoryCsv(text);

      if (errors.length > 0 && valid.length === 0) {
        setStatusMessage({
          type: 'error',
          text: `CSV Import Failed: ${errors[0]}`
        });
      } else {
        await bulkUpdate(valid);
        setStatusMessage({
          type: 'success',
          text: `Successfully imported ${valid.length} inventory items! ${errors.length > 0 ? `(${errors.length} rows skipped)` : ''}`
        });
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  const handleAdjustClick = (item: InventoryItem) => {
    setSelectedItemForAdjust(item);
    setIsAdjustModalOpen(true);
  };

  const handleSaveStockAdjust = async (
    sku: string,
    currentStock: number,
    reservedStock: number,
    leadTimeDays: number,
    safetyStockDays: number
  ) => {
    await adjustStockQuantity(sku, currentStock, reservedStock, leadTimeDays, safetyStockDays);
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all inventory levels and lead times back to standard demo defaults?')) {
      await resetDefaults();
      setStatusMessage({
        type: 'success',
        text: 'Inventory reset to standard defaults successfully.'
      });
    }
  };

  return (
    <div className="flex flex-col gap-6" style={{ paddingBottom: '2rem' }}>
      <PageHeader
        title="Inventory & Restock Command Center"
        subtitle="Velocity-driven replenishment forecasting, Days of Inventory (DOI), and working capital diagnostics"
        actions={
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv"
              style={{ display: 'none' }}
            />

            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5"
            >
              <Upload size={14} />
              Upload CSV
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5"
            >
              <Download size={14} />
              Export CSV
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5"
              title="Reset inventory to default seed data"
            >
              <RotateCcw size={14} />
              Reset Defaults
            </Button>
          </div>
        }
      />

      {/* Status notification banner */}
      {statusMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: statusMessage.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${statusMessage.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: statusMessage.type === 'success' ? '#047857' : '#b91c1c',
            fontSize: '0.85rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontWeight: 600
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* High-Level Inventory KPI Cards */}
      <div className="dashboard-grid">
        {/* Total Asset Value */}
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
              Warehouse Inventory Value
            </span>
            <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatINR(workingCapital.totalAssetValue)}
            </div>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              Across {workingCapital.totalSkus} configured products
            </span>
          </CardBody>
        </Card>

        {/* Trapped Capital */}
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: '#b91c1c' }}>
              Locked in Dead / Slow Stock
            </span>
            <div className="text-xl font-bold" style={{ color: '#b91c1c' }}>
              {formatINR(workingCapital.lockedDeadCapital)}
            </div>
            <span className="text-2xs" style={{ color: '#b91c1c' }}>
              {formatPercent(workingCapital.deadCapitalRatio)} of warehouse assets trapped
            </span>
          </CardBody>
        </Card>

        {/* SKUs Requiring Reorder */}
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: '#d97706' }}>
              SKUs Requiring Restock
            </span>
            <div className="text-xl font-bold" style={{ color: '#d97706' }}>
              {workingCapital.stockoutCount + workingCapital.criticalRiskCount + workingCapital.reorderNowCount} SKUs
            </div>
            <span className="text-2xs" style={{ color: 'var(--text-secondary)' }}>
              {workingCapital.stockoutCount} stockouts &bull; {workingCapital.criticalRiskCount} critical risk
            </span>
          </CardBody>
        </Card>

        {/* Daily Lost Revenue from Stockouts */}
        <Card>
          <CardBody className="p-4 flex flex-col gap-1">
            <span className="text-2xs font-medium uppercase" style={{ color: '#dc2626' }}>
              Est. Daily Stockout Loss
            </span>
            <div className="text-xl font-bold" style={{ color: '#dc2626' }}>
              {formatINR(workingCapital.dailyStockoutLossRate)}/day
            </div>
            <span className="text-2xs" style={{ color: '#dc2626' }}>
              Lost revenue on zero-stock listings
            </span>
          </CardBody>
        </Card>
      </div>

      {/* Phase 8B/8D: Dynamic Restock Planner Table */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Replenishment &amp; Restock Forecaster
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Multi-window sales run rates (V7, V14, V30), Days of Inventory (DOI), and supplier reorder PO recommendations
            </p>
          </div>
        </div>

        <RestockRecommendationTable
          metrics={metrics}
          inventoryMap={inventoryMap}
          onAdjustStock={handleAdjustClick}
        />
      </div>

      {/* Phase 8C/8D: Working Capital & Dead Inventory Diagnostics */}
      <WorkingCapitalCard summary={workingCapital} />

      {/* Phase 8D: Stock Adjust Modal */}
      <StockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        item={selectedItemForAdjust}
        onSave={handleSaveStockAdjust}
      />
    </div>
  );
};
