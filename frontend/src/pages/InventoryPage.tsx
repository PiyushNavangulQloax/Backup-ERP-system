import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import {
  Boxes,
  Layers,
  History,
  AlertCircle,
  Warehouse,
  Search,
  X,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'balance' | 'ledger'>('balance');
  const { searchQuery, setSearchQuery } = useSearch();

  const { data: stocks, isLoading: isStocksLoading } = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: async () => (await api.get('/inventory')).data,
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
      s.batchNumber?.toLowerCase().includes(q)
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
      m.performedBy?.firstName?.toLowerCase().includes(q) ||
      m.performedBy?.lastName?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey="procurement" />

      <div className="pb-4 border-b border-slate-200">
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
                  <th className="py-4 px-5">Batch / Lot #</th>
                  <th className="py-4 px-5">Stock on Hand</th>
                  <th className="py-4 px-5">Total Valuation ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isStocksLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading stock balances...</td></tr>
                ) : stocks?.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">No inventory recorded.</td></tr>
                ) : (
                  stocks?.map((s: any) => {
                    const isLow = s.quantityOnHand <= (s.part.minStockLevel || 100);
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
                            <Warehouse className="w-4 h-4 text-slate-500" />
                            <span>{s.store.name}</span>
                            {s.location && <span className="text-slate-500 font-mono text-xs">({s.location.code})</span>}
                          </div>
                        </td>
                        <td className="py-4 px-5 font-mono text-slate-800 font-bold">{s.batchNumber || '—'}</td>
                        <td className="py-4 px-5 font-mono font-black text-base">
                          <span className={isLow ? 'text-rose-700 flex items-center gap-1.5' : 'text-emerald-700'}>
                            {isLow && <AlertCircle className="w-4 h-4 text-rose-600 stroke-[2.5]" />}
                            {s.quantityOnHand.toLocaleString()} {s.part.unit?.symbol}
                          </span>
                        </td>
                        <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">
                          ${(s.quantityOnHand * (s.part.standardCost || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5">Part Item</th>
                  <th className="py-4 px-5">Movement Type</th>
                  <th className="py-4 px-5">Quantity</th>
                  <th className="py-4 px-5">Store</th>
                  <th className="py-4 px-5">Reason</th>
                  <th className="py-4 px-5">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLedgerLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading ledger movements...</td></tr>
                ) : (
                  ledger?.map((m: any) => {
                    const isPositive = m.movementType.includes('ADD') || m.movementType.includes('RECEIPT');
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-5 text-slate-700 font-mono font-medium">
                          {new Date(m.createdAt).toLocaleString()}
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
    </div>
  );
};
