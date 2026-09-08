import React, { useState, useMemo } from 'react';
import { X, Upload, Download, Search, Check, AlertCircle, Save } from 'lucide-react';
import { useSkuCosts } from '../../hooks/useSkuCosts';
import { type SkuCost, parseCogsCsv, exportCogsCsv } from '../../services/catalog/cogsService';
import type { Order } from '../../models/order';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface CogsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: Order[];
}

export const CogsManagerModal: React.FC<CogsManagerModalProps> = ({
  isOpen,
  onClose,
  orders = []
}) => {
  const { skuCosts, updateCost, bulkUpdateCosts, refresh } = useSkuCosts();
  const [activeTab, setActiveTab] = useState<'table' | 'csv'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local edit state for inline changes: Map<sku, Partial<SkuCost>>
  const [editedCosts, setEditedCosts] = useState<Record<string, { cogs?: number; packagingCost?: number; taxRate?: number }>>({});
  const [savingSku, setSavingSku] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // CSV Tab State
  const [csvParseResult, setCsvParseResult] = useState<{ valid: SkuCost[]; errors: string[] } | null>(null);

  // Identify unique SKUs from orders that may not be in skuCosts
  const unconfiguredSkus = useMemo(() => {
    const configuredSet = new Set(skuCosts.map((s) => s.sku.toLowerCase()));
    const unconfigured = new Map<string, string>(); // sku -> productName

    for (const o of orders) {
      const sku = (o.sku || '').trim();
      if (!sku) continue;
      if (!configuredSet.has(sku.toLowerCase())) {
        const name = o.product_name || o.productName || sku;
        unconfigured.set(sku, name);
      }
    }
    return Array.from(unconfigured.entries()).map(([sku, name]) => ({
      sku,
      productName: name,
      cogs: 0,
      packagingCost: 25,
      taxRate: 18,
      updatedAt: new Date().toISOString(),
      isNew: true
    }));
  }, [orders, skuCosts]);

  // Combined list of SKUs (existing + unconfigured)
  const combinedSkuList = useMemo(() => {
    const list = [...skuCosts.map((c) => ({ ...c, isNew: false })), ...unconfiguredSkus];
    if (!searchQuery.trim()) return list;

    const query = searchQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.sku.toLowerCase().includes(query) ||
        item.productName.toLowerCase().includes(query)
    );
  }, [skuCosts, unconfiguredSkus, searchQuery]);

  if (!isOpen) return null;

  const handleFieldChange = (sku: string, field: 'cogs' | 'packagingCost' | 'taxRate', val: number) => {
    setEditedCosts((prev) => ({
      ...prev,
      [sku]: {
        ...prev[sku],
        [field]: val
      }
    }));
  };

  const handleSaveRow = async (item: SkuCost & { isNew?: boolean }) => {
    const edits = editedCosts[item.sku] || {};
    const costToSave: SkuCost = {
      sku: item.sku,
      productName: item.productName,
      cogs: edits.cogs !== undefined ? edits.cogs : item.cogs,
      packagingCost: edits.packagingCost !== undefined ? edits.packagingCost : item.packagingCost,
      taxRate: edits.taxRate !== undefined ? edits.taxRate : item.taxRate,
      updatedAt: new Date().toISOString()
    };

    setSavingSku(item.sku);
    try {
      await updateCost(costToSave);
      // Remove from edit state
      setEditedCosts((prev) => {
        const next = { ...prev };
        delete next[item.sku];
        return next;
      });
      setSuccessMsg(`Saved costs for ${item.sku}`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSavingSku(null);
    }
  };

  const handleSaveAll = async () => {
    const itemsToSave: SkuCost[] = [];

    for (const item of combinedSkuList) {
      const edits = editedCosts[item.sku];
      if (edits || item.isNew) {
        itemsToSave.push({
          sku: item.sku,
          productName: item.productName,
          cogs: edits?.cogs !== undefined ? edits.cogs : item.cogs,
          packagingCost: edits?.packagingCost !== undefined ? edits.packagingCost : item.packagingCost,
          taxRate: edits?.taxRate !== undefined ? edits.taxRate : item.taxRate,
          updatedAt: new Date().toISOString()
        });
      }
    }

    if (itemsToSave.length === 0) return;

    await bulkUpdateCosts(itemsToSave);
    setEditedCosts({});
    setSuccessMsg(`Successfully updated ${itemsToSave.length} SKUs!`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCogsCsv(text);
      setCsvParseResult(parsed);
    };
    reader.readAsText(file);
  };

  const handleApplyCsv = async () => {
    if (!csvParseResult || csvParseResult.valid.length === 0) return;
    await bulkUpdateCosts(csvParseResult.valid);
    setCsvParseResult(null);
    setActiveTab('table');
    setSuccessMsg(`Imported ${csvParseResult.valid.length} SKUs from CSV!`);
    setTimeout(() => setSuccessMsg(null), 3500);
    refresh();
  };

  const handleDownloadCsv = () => {
    const csvStr = exportCogsCsv(skuCosts);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `seller_cogs_master_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasUnsavedChanges = Object.keys(editedCosts).length > 0;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-dialog"
        style={{
          backgroundColor: 'var(--bg-card, #1e293b)',
          border: '1px solid var(--border-color, #334155)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '1000px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--border-color, #334155)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary, #f8fafc)' }}>
              Product Cost Master (COGS & Direct Materials)
            </h2>
            <Badge variant="primary" size="sm">
              {skuCosts.length} SKUs Configured
            </Badge>
            {unconfiguredSkus.length > 0 && (
              <Badge variant="warning" size="sm">
                {unconfiguredSkus.length} Unconfigured
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div
            className="p-2.5 px-4 text-xs font-semibold flex items-center gap-2"
            style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderBottom: '1px solid #10b981' }}
          >
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Selection & Search Bar */}
        <div
          className="p-3 px-4 flex flex-wrap items-center justify-between gap-3"
          style={{ backgroundColor: 'var(--bg-secondary, #0f172a)', borderBottom: '1px solid var(--border-color, #334155)' }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                activeTab === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              SKU Cost Catalog
            </button>
            <button
              onClick={() => setActiveTab('csv')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'csv'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Upload size={14} />
              CSV Bulk Upload / Export
            </button>
          </div>

          {activeTab === 'table' && (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search SKU or title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 rounded bg-slate-800 text-slate-200 border border-slate-700 focus:outline-none focus:border-blue-500 w-56"
                />
              </div>

              {hasUnsavedChanges && (
                <Button variant="primary" size="sm" onClick={handleSaveAll} className="flex items-center gap-1">
                  <Save size={14} />
                  Save All Changes
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="modal-body p-4 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {activeTab === 'table' ? (
            <div>
              {unconfiguredSkus.length > 0 && (
                <div
                  className="p-3 mb-4 rounded-lg flex items-start gap-2.5 text-xs"
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b' }}
                >
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">
                      {unconfiguredSkus.length} unconfigured SKUs detected from imported orders:
                    </span>{' '}
                    Please assign manufacturing COGS below so the profit waterfall can accurately calculate real net profit.
                  </div>
                </div>
              )}

              <div className="table-container">
                <table className="data-table text-xs">
                  <thead>
                    <tr>
                      <th style={{ width: '18%' }}>SKU</th>
                      <th style={{ width: '28%' }}>Product Name</th>
                      <th style={{ width: '14%' }}>Base COGS (₹)</th>
                      <th style={{ width: '12%' }}>Packaging (₹)</th>
                      <th style={{ width: '10%' }}>GST (%)</th>
                      <th style={{ width: '10%' }}>Total Unit Cost</th>
                      <th style={{ width: '8%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedSkuList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-6 text-slate-400">
                          No SKUs found matching your search.
                        </td>
                      </tr>
                    ) : (
                      combinedSkuList.map((item) => {
                        const edits = editedCosts[item.sku] || {};
                        const currentCogs = edits.cogs !== undefined ? edits.cogs : item.cogs;
                        const currentPkg = edits.packagingCost !== undefined ? edits.packagingCost : item.packagingCost;
                        const currentTax = edits.taxRate !== undefined ? edits.taxRate : item.taxRate;
                        const totalCost = currentCogs + currentPkg;
                        const isEdited = edits.cogs !== undefined || edits.packagingCost !== undefined || edits.taxRate !== undefined;

                        return (
                          <tr
                            key={item.sku}
                            style={{
                              backgroundColor: item.isNew
                                ? 'rgba(245, 158, 11, 0.05)'
                                : isEdited
                                ? 'rgba(59, 130, 246, 0.05)'
                                : 'transparent'
                            }}
                          >
                            <td>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-200">{item.sku}</span>
                                {item.isNew && (
                                  <Badge variant="warning" size="sm">
                                    New
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="text-slate-300 truncate max-w-xs" title={item.productName}>
                              {item.productName}
                            </td>

                            <td>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={currentCogs}
                                  onChange={(e) =>
                                    handleFieldChange(item.sku, 'cogs', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                                />
                              </div>
                            </td>

                            <td>
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={currentPkg}
                                  onChange={(e) =>
                                    handleFieldChange(item.sku, 'packagingCost', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                                />
                              </div>
                            </td>

                            <td>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={currentTax}
                                  onChange={(e) =>
                                    handleFieldChange(item.sku, 'taxRate', parseFloat(e.target.value) || 0)
                                  }
                                  className="w-14 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs"
                                />
                                <span className="text-slate-400">%</span>
                              </div>
                            </td>

                            <td className="font-semibold text-slate-200 font-mono">
                              ₹{totalCost.toFixed(0)}
                            </td>

                            <td style={{ textAlign: 'center' }}>
                              <button
                                disabled={savingSku === item.sku || (!isEdited && !item.isNew)}
                                onClick={() => handleSaveRow(item)}
                                className={`px-2.5 py-1 rounded text-2xs font-semibold transition ${
                                  isEdited || item.isNew
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {savingSku === item.sku ? 'Saving...' : 'Save'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* CSV Upload & Export Tab */
            <div className="flex flex-col gap-5 max-w-2xl mx-auto py-4">
              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200">Download Current Catalog</h3>
                    <p className="text-xs text-slate-400">
                      Export all {skuCosts.length} configured SKU cost configurations as a CSV file.
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleDownloadCsv} className="flex items-center gap-1.5">
                    <Download size={14} />
                    Export CSV
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 flex flex-col gap-3">
                <h3 className="text-sm font-bold text-slate-200">Bulk Upload SKU Costs</h3>
                <p className="text-xs text-slate-400">
                  Upload a CSV file containing your product costs. Column headers required:
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-slate-800 text-blue-400 font-mono">
                    sku, productName, cogs, packagingCost, taxRate
                  </code>
                </p>

                <div className="mt-2">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-lg cursor-pointer transition">
                    <Upload size={24} className="text-slate-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">
                      Click to choose CSV file or drag here
                    </span>
                    <span className="text-2xs text-slate-500 mt-1">.csv flat files supported</span>
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </label>
                </div>

                {csvParseResult && (
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-400 font-semibold">
                        ✓ {csvParseResult.valid.length} valid SKUs found in file
                      </span>
                      {csvParseResult.errors.length > 0 && (
                        <span className="text-amber-400 font-semibold">
                          ⚠ {csvParseResult.errors.length} warnings
                        </span>
                      )}
                    </div>

                    {csvParseResult.errors.length > 0 && (
                      <div className="p-2 rounded bg-amber-950/40 border border-amber-800 text-2xs text-amber-300 max-h-24 overflow-y-auto">
                        {csvParseResult.errors.map((err, i) => (
                          <div key={i}>{err}</div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setCsvParseResult(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleApplyCsv}
                        disabled={csvParseResult.valid.length === 0}
                      >
                        Apply {csvParseResult.valid.length} Costs
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="modal-footer p-3 px-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-secondary, #0f172a)', borderTop: '1px solid var(--border-color, #334155)' }}
        >
          <span className="text-2xs text-slate-400">
            Total Unit Cost = Base COGS + Packaging Materials. Deducted automatically in the Profit Waterfall.
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
