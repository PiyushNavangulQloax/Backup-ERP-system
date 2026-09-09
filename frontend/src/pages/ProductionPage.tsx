import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Cpu,
  Layers,
  Play,
  X,
} from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<'jobCards' | 'bom'>('jobCards');

  const { data: jobCards, isLoading: isJobsLoading } = useQuery({
    queryKey: ['job-cards'],
    queryFn: async () => (await api.get('/production/job-cards')).data,
  });

  const { data: boms } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => (await api.get('/production/bom')).data,
    enabled: activeTab === 'bom',
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
  });

  const [completeJobId, setCompleteJobId] = useState<string | null>(null);
  const [producedQty, setProducedQty] = useState(10);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');

  const completeJobMutation = useMutation({
    mutationFn: async ({ id, payload }: any) => {
      return (await api.post(`/production/job-cards/${id}/complete`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      setCompleteJobId(null);
    },
  });

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeJobId || !selectedStoreId) return;
    completeJobMutation.mutate({
      id: completeJobId,
      payload: {
        producedQty,
        rejectedQty,
        storeId: selectedStoreId,
        batchNumber: `LOT-${Date.now().toString().slice(-6)}`,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <Cpu className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>Production & Bill of Materials</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Manufacturing execution, shopfloor Job Cards & component recipe specifications
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('jobCards')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'jobCards'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
          }`}
        >
          <Play className="w-4 h-4 stroke-[2.5]" />
          <span>Active Job Cards</span>
        </button>

        <button
          onClick={() => setActiveTab('bom')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === 'bom'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
          }`}
        >
          <Layers className="w-4 h-4 stroke-[2.5]" />
          <span>Bill of Materials (BOM)</span>
        </button>
      </div>

      {activeTab === 'jobCards' ? (
        <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-5">Job Card #</th>
                  <th className="py-4 px-5">Finished Good</th>
                  <th className="py-4 px-5">Target Qty</th>
                  <th className="py-4 px-5">Produced</th>
                  <th className="py-4 px-5">Rejected</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isJobsLoading ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading job cards...</td></tr>
                ) : (
                  jobCards?.map((j: any) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{j.jobCardNumber}</td>
                      <td className="py-4 px-5 font-bold text-slate-900">{j.part?.name}</td>
                      <td className="py-4 px-5 font-mono text-slate-800 font-bold">{j.targetQty}</td>
                      <td className="py-4 px-5 font-mono text-emerald-700 font-black text-base">{j.producedQty}</td>
                      <td className="py-4 px-5 font-mono text-rose-700 font-bold">{j.rejectedQty}</td>
                      <td className="py-4 px-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                          j.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          j.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {j.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {j.status !== 'COMPLETED' && hasPermission('production.manage') && (
                          <button
                            onClick={() => {
                              setCompleteJobId(j.id);
                              setProducedQty(j.targetQty);
                              if (stores && stores.length > 0) setSelectedStoreId(stores[0].id);
                            }}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                          >
                            Post Completion
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {boms?.map((b: any) => (
            <div key={b.id} className="p-6 rounded-2xl bg-white border border-slate-300 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="font-black text-base text-slate-900">{b.part?.name}</h3>
                  <p className="text-xs text-blue-700 font-mono font-bold mt-0.5">BOM Code: {b.bomCode} (v{b.version})</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Active
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Required Raw Materials:</p>
                {b.items?.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-50 border border-slate-200 font-bold">
                    <span className="text-slate-800">{item.part?.name}</span>
                    <span className="font-mono text-blue-700 font-black text-sm">
                      {item.quantityRequired} {item.part?.unit?.symbol}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Completion Modal */}
      {completeJobId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900">Post Production Output</h2>
              <button onClick={() => setCompleteJobId(null)} className="text-slate-500 hover:text-slate-900">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Target Deposit Store</label>
                <select
                  required
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  {stores?.map((s: any) => (
                    <option key={s.id} value={s.id} className="text-slate-900 font-bold">{s.name} ({s.type})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-emerald-700 uppercase tracking-wider mb-2">Produced Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={producedQty}
                    onChange={(e) => setProducedQty(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-rose-700 uppercase tracking-wider mb-2">Scrap / Rejected</label>
                  <input
                    type="number"
                    min="0"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompleteJobId(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeJobMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md"
                >
                  Confirm Completion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
