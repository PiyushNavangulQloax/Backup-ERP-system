import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';
import {
  Cpu,
  Layers,
  Play,
  X,
  Search,
  Plus,
  AlertCircle,
  FilePlus,
  CheckCircle2,
} from 'lucide-react';

export const ProductionPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const location = useLocation();

  const getInitialTab = (): 'jobCards' | 'bom' => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'plans' || tab === 'bom') return 'bom';
    return 'jobCards';
  };

  const [activeTab, setActiveTab] = useState<'jobCards' | 'bom'>(getInitialTab);

  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    if (tab === 'plans' || tab === 'bom') {
      setActiveTab('bom');
    } else if (tab === 'jobCards') {
      setActiveTab('jobCards');
    }
  }, [location.search]);

  // Modals for creating Job Card & BOM
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Job Card Form State
  const [jobForm, setJobForm] = useState({
    partId: '',
    targetQty: 50,
  });

  // BOM Form State
  const [bomForm, setBomForm] = useState({
    partId: '',
    bomCode: '',
    notes: '',
    componentPartId: '',
    componentQty: 1,
  });

  // Data Queries
  const { data: jobCards, isLoading: isJobsLoading } = useQuery({
    queryKey: ['job-cards'],
    queryFn: async () => (await api.get('/production/job-cards')).data,
  });

  const { data: boms } = useQuery({
    queryKey: ['boms'],
    queryFn: async () => (await api.get('/production/bom')).data,
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
  });

  // Filter data by search query
  const filteredJobCards = jobCards?.filter((j: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      j.jobCardNumber?.toLowerCase().includes(q) ||
      j.part?.name?.toLowerCase().includes(q) ||
      j.status?.toLowerCase().includes(q)
    );
  });

  const filteredBoms = boms?.filter((b: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      b.bomCode?.toLowerCase().includes(q) ||
      b.part?.name?.toLowerCase().includes(q) ||
      b.items?.some((item: any) => item.part?.name?.toLowerCase().includes(q))
    );
  });

  const [completeJobId, setCompleteJobId] = useState<string | null>(null);
  const [producedQty, setProducedQty] = useState(10);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [selectedStoreId, setSelectedStoreId] = useState('');

  // Create Job Card Mutation
  const createJobCardMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/production/job-cards', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-cards'] });
      setIsJobModalOpen(false);
      setJobForm({ partId: '', targetQty: 50 });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to create job card');
    },
  });

  // Create BOM Mutation
  const createBomMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/production/bom', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      setIsBomModalOpen(false);
      setBomForm({ partId: '', bomCode: '', notes: '', componentPartId: '', componentQty: 1 });
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err?.response?.data?.message || 'Failed to create BOM');
    },
  });

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

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobForm.partId) {
      setErrorMsg('Please select a target finished good part');
      return;
    }
    createJobCardMutation.mutate({
      partId: jobForm.partId,
      targetQty: Number(jobForm.targetQty),
    });
  };

  const handleCreateBom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bomForm.partId || !bomForm.bomCode || !bomForm.componentPartId) {
      setErrorMsg('Please complete all required fields for BOM creation');
      return;
    }
    createBomMutation.mutate({
      partId: bomForm.partId,
      bomCode: bomForm.bomCode.toUpperCase(),
      notes: bomForm.notes,
      items: [
        {
          partId: bomForm.componentPartId,
          quantityRequired: Number(bomForm.componentQty),
        },
      ],
    });
  };

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

  const fgParts = parts?.filter((p: any) => p.partType === 'FINISHED_GOOD' || p.partType === 'RAW_MATERIAL') || [];
  const rawParts = parts?.filter((p: any) => p.partType === 'RAW_MATERIAL' || p.partType === 'SEMI_FINISHED') || [];

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey={activeTab === 'bom' ? 'requirements' : 'production'} />

      <div className="pb-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
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

        {hasPermission('production.manage') && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setErrorMsg('');
                setIsJobModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Create Job Card</span>
            </button>

            <button
              onClick={() => {
                setErrorMsg('');
                setIsBomModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all"
            >
              <FilePlus className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              <span>Create BOM Recipe</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job card, part, BOM code..."
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
                  filteredJobCards?.map((j: any) => (
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
          {filteredBoms?.map((b: any) => (
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

      {/* Create Job Card Modal */}
      {isJobModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-blue-600" />
                <span>Create Production Job Card</span>
              </h2>
              <button onClick={() => setIsJobModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateJob} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Finished Product / Part *
                </label>
                <SearchableSelect
                  value={jobForm.partId}
                  onChange={(val) => setJobForm({ ...jobForm, partId: val })}
                  options={fgParts.map((p: any) => ({
                    value: p.id,
                    label: `${p.name} (${p.code})`,
                    sublabel: `UOM: ${p.uom || 'units'} | Cost: $${p.standardCost || 0}`,
                  }))}
                  placeholder="-- Search & Select Finished Product --"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Target Production Quantity *
                </label>
                <NumberInput
                  min="1"
                  value={jobForm.targetQty}
                  onChange={(e) => setJobForm({ ...jobForm, targetQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsJobModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-black text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createJobCardMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md"
                >
                  {createJobCardMutation.isPending ? 'Releasing...' : 'Release Job Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create BOM Modal */}
      {isBomModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-600" />
                <span>Create Bill of Materials (BOM)</span>
              </h2>
              <button onClick={() => setIsBomModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateBom} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Finished Product Part *
                </label>
                <SearchableSelect
                  value={bomForm.partId}
                  onChange={(val) => setBomForm({ ...bomForm, partId: val })}
                  options={fgParts.map((p: any) => ({
                    value: p.id,
                    label: `${p.name} (${p.code})`,
                    sublabel: `UOM: ${p.uom || 'units'}`,
                  }))}
                  placeholder="-- Search & Select Product --"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  BOM Code / Number *
                </label>
                <input
                  type="text"
                  placeholder="e.g. BOM-FG-101"
                  value={bomForm.bomCode}
                  onChange={(e) => setBomForm({ ...bomForm, bomCode: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono uppercase"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Primary Raw Material Component *
                </label>
                <SearchableSelect
                  value={bomForm.componentPartId}
                  onChange={(val) => setBomForm({ ...bomForm, componentPartId: val })}
                  options={rawParts.map((p: any) => ({
                    value: p.id,
                    label: `${p.name} (${p.code})`,
                    sublabel: `UOM: ${p.uom || 'units'} | Cost: $${p.standardCost || 0}`,
                  }))}
                  placeholder="-- Search & Select Component Part --"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Quantity Required Per Unit *
                </label>
                <NumberInput
                  step="0.01"
                  min="0.01"
                  value={bomForm.componentQty}
                  onChange={(e) => setBomForm({ ...bomForm, componentQty: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBomModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-black text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBomMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs shadow-md"
                >
                  {createBomMutation.isPending ? 'Saving...' : 'Save BOM Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {completeJobId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-black text-slate-900">Post Production Output</h2>
              <button onClick={() => setCompleteJobId(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Produced Quantity
                </label>
                <NumberInput
                  value={producedQty}
                  onChange={(e) => setProducedQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Rejected / Scrap Quantity
                </label>
                <NumberInput
                  value={rejectedQty}
                  onChange={(e) => setRejectedQty(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Receiving Store Location
                </label>
                <SearchableSelect
                  value={selectedStoreId}
                  onChange={setSelectedStoreId}
                  options={
                    stores?.map((s: any) => ({
                      value: s.id,
                      label: `${s.name} (${s.code})`,
                      badge: s.type || undefined,
                    })) || []
                  }
                  placeholder="-- Search & Select Store --"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCompleteJobId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 font-black text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeJobMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md"
                >
                  {completeJobMutation.isPending ? 'Posting...' : 'Post Completion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
