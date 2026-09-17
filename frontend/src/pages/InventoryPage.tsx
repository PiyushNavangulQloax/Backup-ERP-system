import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';
import {
  Boxes,
  Layers,
  History,
  AlertCircle,
  Warehouse,
  Search,
  X,
  Plus,
  ArrowUpRight,
  CheckCircle,
  Building,
  Clock,
  Calendar,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'balance' | 'ledger'>('balance');
  const { searchQuery, setSearchQuery } = useSearch();

  // Inward Stock / Add Boxes Modal State
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [addStockForm, setAddStockForm] = useState({
    partId: '',
    storeId: '',
    supplierId: '',
    quantity: 10,
    reason: 'Supplier Delivery / Inward Shipment',
    batchNumber: '',
  });

  const { data: stocks, isLoading: isStocksLoading } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: async () => (await api.get('/inventory')).data,
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
    enabled: isAddStockOpen,
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
    enabled: isAddStockOpen,
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    enabled: isAddStockOpen,
  });

  const addStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/inventory/adjust', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setIsAddStockOpen(false);
      setAddStockForm({
        partId: '',
        storeId: '',
        supplierId: '',
        quantity: 10,
        reason: 'Supplier Delivery / Inward Shipment',
        batchNumber: '',
      });
    },
  });

  const { data: ledger, isLoading: isLedgerLoading } = useQuery({
    queryKey: ['inventory-ledger'],
    queryFn: async () => (await api.get('/inventory/ledger')).data,
    enabled: activeTab === 'ledger',
  });

  const q = searchQuery.toLowerCase().trim();

  const filteredStocks = stocks?.filter((s: any) => {
    if (!q) return true;
    return (
      s.part?.code?.toLowerCase().includes(q) ||
      s.part?.name?.toLowerCase().includes(q) ||
      s.part?.partType?.toLowerCase().includes(q) ||
      s.store?.name?.toLowerCase().includes(q) ||
      s.location?.code?.toLowerCase().includes(q) ||
      s.batchNumber?.toLowerCase().includes(q) ||
      s.supplier?.name?.toLowerCase().includes(q) ||
      s.supplier?.code?.toLowerCase().includes(q) ||
      s.part?.supplier?.name?.toLowerCase().includes(q)
    );
  });

  const filteredLedger = ledger?.filter((m: any) => {
    if (!q) return true;
    return (
      m.part?.name?.toLowerCase().includes(q) ||
      m.part?.code?.toLowerCase().includes(q) ||
      m.movementType?.toLowerCase().includes(q) ||
      m.store?.name?.toLowerCase().includes(q) ||
      m.reason?.toLowerCase().includes(q) ||
      m.supplier?.name?.toLowerCase().includes(q) ||
      m.supplier?.code?.toLowerCase().includes(q) ||
      m.performedBy?.firstName?.toLowerCase().includes(q) ||
      m.performedBy?.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey="procurement" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Boxes className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Inventory & Stock Ledger</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Real-time stock positions across warehouse racks, lots & immutable debit/credit movement history
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddStockOpen(true);
            if (stores && stores.length > 0 && !addStockForm.storeId) {
              setAddStockForm((prev) => ({ ...prev, storeId: stores[0].id }));
            }
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>+ Add Stock / Boxes</span>
        </button>
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('balance')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'balance'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4 stroke-[2.5]" />
            <span>Warehouse Stock Positions</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'ledger'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <History className="w-4 h-4 stroke-[2.5]" />
            <span>Immutable Movement Ledger</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'balance' ? 'Search part, store, lot #...' : 'Search ledger item, type...'}
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'balance' ? (
        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-5">Part Code</th>
                  <th className="py-4 px-5">Part Description</th>
                  <th className="py-4 px-5">Category</th>
                  <th className="py-4 px-5">Store Location</th>
                  <th className="py-4 px-5">Supplier / Vendor</th>
                  <th className="py-4 px-5">Batch / Lot #</th>
                  <th className="py-4 px-5">Stock on Hand</th>
                  <th className="py-4 px-5">Valuation ($)</th>
                  <th className="py-4 px-5">Last Inward Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isStocksLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-600 font-bold">Loading stock balances...</td></tr>
                ) : stocks?.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-600 font-bold">No inventory recorded.</td></tr>
                ) : (
                  filteredStocks?.map((s: any) => {
                    const isLow = s.quantityOnHand <= (s.part.minStockLevel || 100);
                    const sup = s.supplier || s.part?.supplier;
                    const inwardTime = s.lastInwardAt || s.updatedAt;

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{s.part.code}</td>
                        <td className="py-4 px-5 text-slate-900 font-bold">{s.part.name}</td>
                        <td className="py-4 px-5">
                          <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                            {s.part.partType}
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2 text-slate-800 font-bold">
                            <Warehouse className="w-4 h-4 text-slate-500 shrink-0" />
                            <span>{s.store.name}</span>
                            {s.location && <span className="text-slate-500 font-mono text-xs">({s.location.code})</span>}
                          </div>
                        </td>
                        <td className="py-4 px-5">
                          {sup ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-blue-600 shrink-0" />
                              <div>
                                <div className="text-slate-900 font-bold text-xs">{sup.name}</div>
                                <div className="text-slate-500 font-mono text-[10px]">{sup.code}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-800 font-bold">{s.batchNumber || '—'}</td>
                        <td className="py-4 px-5 font-mono font-black text-base">
                          <span className={isLow ? 'text-rose-700 flex items-center gap-1.5' : 'text-emerald-700'}>
                            {isLow && <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />}
                            {s.quantityOnHand.toLocaleString()} {s.part.unit?.symbol}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">
                          ₹{(s.quantityOnHand * (s.part.standardCost || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-4 px-5 font-mono text-xs text-slate-700 whitespace-nowrap">
                          {inwardTime ? (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{new Date(inwardTime).toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
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
        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-5">Date & Time</th>
                  <th className="py-4 px-5">Part Item</th>
                  <th className="py-4 px-5">Movement Type</th>
                  <th className="py-4 px-5">Quantity</th>
                  <th className="py-4 px-5">Store</th>
                  <th className="py-4 px-5">Supplier Details</th>
                  <th className="py-4 px-5">Reason</th>
                  <th className="py-4 px-5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLedgerLoading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-600 font-bold">Loading ledger movements...</td></tr>
                ) : (
                  filteredLedger?.map((m: any) => {
                    const isPositive = m.movementType.includes('ADD') || m.movementType.includes('RECEIPT');
                    const sup = m.supplier || m.part?.supplier;

                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-5 text-slate-700 font-mono font-medium text-xs whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-slate-900 font-bold">
                          {m.part?.name} <span className="text-slate-500 font-mono text-xs">({m.part?.code})</span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="px-3 py-1 rounded-md text-xs font-mono font-black bg-blue-50 text-blue-800 border border-blue-200">
                            {m.movementType}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-black text-base">
                          <span className={isPositive ? 'text-emerald-700' : 'text-amber-700'}>
                            {isPositive ? '+' : '-'}{m.quantity}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-slate-800 font-bold">{m.store?.name}</td>
                        <td className="py-4 px-5">
                          {sup ? (
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-blue-600 shrink-0" />
                              <div>
                                <div className="text-slate-900 font-bold text-xs">{sup.name}</div>
                                <div className="text-slate-500 font-mono text-[10px]">{sup.code}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-4 px-5 text-slate-700 font-medium">{m.reason || '—'}</td>
                        <td className="py-4 px-5 text-slate-900 font-bold">
                          {m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : 'System'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inward Stock / Add Boxes Modal */}
      {isAddStockOpen && (() => {
        const selectedPart = parts?.find((p: any) => p.id === addStockForm.partId);
        const currentPartStock = selectedPart
          ? (selectedPart.stocks?.reduce((acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)), 0) || Number(selectedPart.availableStock ?? selectedPart.minStockLevel ?? 0))
          : 0;
        const uom = selectedPart?.unit?.symbol || selectedPart?.unit?.name || selectedPart?.uom || 'BOX';
        const projectedNewStock = currentPartStock + (Number(addStockForm.quantity) || 0);

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <Boxes className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Inward Stock / Add Boxes</h2>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      Increase available warehouse stock & generate credit movement log
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddStockOpen(false)}
                  className="text-slate-400 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addStockForm.partId || !addStockForm.storeId || addStockForm.quantity <= 0) return;
                  addStockMutation.mutate({
                    partId: addStockForm.partId,
                    storeId: addStockForm.storeId,
                    supplierId: addStockForm.supplierId || undefined,
                    quantity: Number(addStockForm.quantity),
                    reason: addStockForm.reason,
                    batchNumber: addStockForm.batchNumber?.trim() || undefined,
                  });
                }}
                className="space-y-4"
              >
                {/* Part Searchable Select */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      Product / Part Item *
                    </label>
                    {selectedPart && (
                      <span className="text-[11px] font-bold text-slate-600">
                        Current: <span className="font-mono font-black text-emerald-700">{currentPartStock} {uom}</span>
                      </span>
                    )}
                  </div>
                  <SearchableSelect
                    value={addStockForm.partId}
                    onChange={(val) => {
                      const p = parts?.find((x: any) => x.id === val);
                      setAddStockForm((prev) => ({
                        ...prev,
                        partId: val,
                        supplierId: p?.supplierId || p?.supplier?.id || prev.supplierId,
                      }));
                    }}
                    options={
                      parts?.map((p: any) => {
                        const sStock =
                          p.stocks?.reduce(
                            (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
                            0
                          ) || Number(p.availableStock ?? p.minStockLevel ?? 0);
                        const sym = p.unit?.symbol || p.unit?.name || 'BOX';
                        return {
                          value: p.id,
                          label: `${p.name} (${p.code})`,
                          sublabel: `Category: ${p.partType} | Current Stock: ${sStock} ${sym}${p.supplier ? ` | Vendor: ${p.supplier.name}` : ''}`,
                          badge: `${sStock} ${sym}`,
                        };
                      }) || []
                    }
                    placeholder="-- Search & Select Product to Inward / Add Boxes --"
                  />
                </div>

                {/* Supplier / Vendor Select */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Supplier / Vendor Details
                  </label>
                  <SearchableSelect
                    value={addStockForm.supplierId}
                    onChange={(val) => setAddStockForm({ ...addStockForm, supplierId: val })}
                    options={
                      suppliers?.map((sup: any) => ({
                        value: sup.id,
                        label: `${sup.name} (${sup.code})`,
                        sublabel: sup.phone ? `Phone: ${sup.phone} | GSTIN: ${sup.gstin || 'N/A'}` : `GSTIN: ${sup.gstin || 'N/A'}`,
                        badge: sup.code,
                      })) || []
                    }
                    placeholder="-- Select Supplier / Vendor --"
                  />
                </div>

                {/* Warehouse Store Select */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Target Warehouse / Store *
                  </label>
                  <SearchableSelect
                    value={addStockForm.storeId}
                    onChange={(val) => setAddStockForm({ ...addStockForm, storeId: val })}
                    options={
                      stores?.map((st: any) => ({
                        value: st.id,
                        label: `${st.name} (${st.code})`,
                        sublabel: `Type: ${st.type}`,
                        badge: st.type,
                      })) || []
                    }
                    placeholder="-- Select Warehouse Store --"
                  />
                </div>

                {/* Live Date & Time stamp badge */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>Inward Entry Timestamp:</span>
                  </div>
                  <span className="font-mono font-black text-blue-950 bg-white px-2.5 py-1 rounded-lg border border-blue-300 shadow-xs">
                    {new Date().toLocaleString()}
                  </span>
                </div>

                {/* Quantity & Reason */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      Quantity of Boxes / Units to Add *
                    </label>
                    <NumberInput
                      min="1"
                      placeholder="e.g. 10"
                      value={addStockForm.quantity}
                      onChange={(e) =>
                        setAddStockForm({
                          ...addStockForm,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                      Inward Source / Reason *
                    </label>
                    <select
                      value={addStockForm.reason}
                      onChange={(e) =>
                        setAddStockForm({ ...addStockForm, reason: e.target.value })
                      }
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                    >
                      <option value="Direct Inward / Added Boxes">Direct Inward / Added Boxes</option>
                      <option value="Supplier Delivery / Inward Shipment">Supplier Delivery / Inward Shipment</option>
                      <option value="Production Completed Boxes">Production Completed Boxes</option>
                      <option value="Opening Stock / Inward Boxes">Opening Stock / Inward Boxes</option>
                      <option value="Customer Return Restock">Customer Return Restock</option>
                      <option value="Manual Box Addition / Adjustment">Manual Box Addition / Adjustment</option>
                    </select>
                  </div>
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Batch / Lot Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOT-202609-01 or leave blank for default"
                    value={addStockForm.batchNumber}
                    onChange={(e) =>
                      setAddStockForm({ ...addStockForm, batchNumber: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                  />
                </div>

                {/* Live Stock Balance Calculation Card */}
                {selectedPart && (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-200 space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900 block">
                      Live Stock Balance Calculation:
                    </span>
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="text-slate-700">
                        Current: <span className="font-mono font-bold text-slate-900">{currentPartStock} {uom}</span>
                      </div>
                      <div className="font-black text-emerald-700">
                        + Adding: <span className="font-mono">{addStockForm.quantity} {uom}</span>
                      </div>
                      <div className="font-black text-emerald-950 flex items-center gap-1 bg-white px-3 py-1 rounded-xl border border-emerald-300 shadow-xs">
                        <ArrowUpRight className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span>New Total: <span className="font-mono text-base">{projectedNewStock} {uom}</span></span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddStockOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addStockMutation.isPending || !addStockForm.partId || !addStockForm.storeId || addStockForm.quantity <= 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>{addStockMutation.isPending ? 'Adding Boxes...' : '+ Inward & Update Stock'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
