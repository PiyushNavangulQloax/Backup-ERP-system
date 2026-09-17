import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plus,
  Play,
  Check,
  X,
  Search,
  FileText,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const QualityPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { searchQuery } = useSearch();

  // Filters
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  const [detailInspection, setDetailInspection] = useState<any>(null);

  // Queries
  const { data: inspections, isLoading } = useQuery({
    queryKey: ['quality-inspections'],
    queryFn: async () => (await api.get('/quality/inspections')).data,
  });

  const { data: stats } = useQuery({
    queryKey: ['quality-stats'],
    queryFn: async () => (await api.get('/quality/inspections/stats')).data,
  });

  // Source options for creation
  const { data: grns } = useQuery({
    queryKey: ['grns-for-quality'],
    queryFn: async () => (await api.get('/grns')).data,
    enabled: isCreateOpen,
  });

  const { data: jobCards } = useQuery({
    queryKey: ['job-cards-for-quality'],
    queryFn: async () => (await api.get('/production/job-cards')).data,
    enabled: isCreateOpen,
  });

  // Create Form State
  const [createSourceType, setCreateSourceType] = useState<'INCOMING_GRN' | 'PRODUCTION_OUTPUT'>('INCOMING_GRN');
  const [selectedGrnId, setSelectedGrnId] = useState('');
  const [selectedGrnItemId, setSelectedGrnItemId] = useState('');
  const [selectedJobCardId, setSelectedJobCardId] = useState('');
  const [createPartId, setCreatePartId] = useState('');
  const [createPartName, setCreatePartName] = useState('');
  const [createBatch, setCreateBatch] = useState('');
  const [createMaxQty, setCreateMaxQty] = useState(0);
  const [createInspectedQty, setCreateInspectedQty] = useState<number | string>(0);
  const [createRemarks, setCreateRemarks] = useState('');
  const [createError, setCreateError] = useState('');

  // Complete Form State
  const [completeAcceptedQty, setCompleteAcceptedQty] = useState<number | string>(0);
  const [completeRejectedQty, setCompleteRejectedQty] = useState<number | string>(0);
  const [completeRejectionReason, setCompleteRejectionReason] = useState('');
  const [completeRemarks, setCompleteRemarks] = useState('');
  const [completeError, setCompleteError] = useState('');

  // Handle Source selection in Create Modal
  const handleGrnSelect = (grnId: string) => {
    setSelectedGrnId(grnId);
    const grn = grns?.find((g: any) => g.id === grnId);
    if (grn && grn.items && grn.items.length > 0) {
      const firstItem = grn.items[0];
      setSelectedGrnItemId(firstItem.id);
      setCreatePartId(firstItem.partId);
      setCreatePartName(`${firstItem.part?.partCode || ''} - ${firstItem.part?.name || ''}`);
      setCreateBatch(firstItem.batchNumber || '');
      setCreateMaxQty(firstItem.receivedQty || 0);
      setCreateInspectedQty(firstItem.receivedQty || 0);
    } else {
      setSelectedGrnItemId('');
      setCreatePartId('');
      setCreatePartName('');
      setCreateBatch('');
      setCreateMaxQty(0);
      setCreateInspectedQty(0);
    }
  };

  const handleGrnItemSelect = (itemId: string) => {
    setSelectedGrnItemId(itemId);
    const grn = grns?.find((g: any) => g.id === selectedGrnId);
    const item = grn?.items?.find((it: any) => it.id === itemId);
    if (item) {
      setCreatePartId(item.partId);
      setCreatePartName(`${item.part?.partCode} - ${item.part?.name}`);
      setCreateBatch(item.batchNumber || '');
      setCreateMaxQty(item.receivedQty || 0);
      setCreateInspectedQty(item.receivedQty || 0);
    }
  };

  const handleJobCardSelect = (jobCardId: string) => {
    setSelectedJobCardId(jobCardId);
    const jc = jobCards?.find((j: any) => j.id === jobCardId);
    if (jc) {
      setCreatePartId(jc.partId);
      setCreatePartName(`${jc.part?.partCode} - ${jc.part?.name}`);
      setCreateBatch(jc.batchNumber || '');
      const maxQ = jc.producedQty > 0 ? jc.producedQty : jc.targetQty;
      setCreateMaxQty(maxQ);
      setCreateInspectedQty(maxQ);
    }
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => (await api.post('/quality/inspections', data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
      setIsCreateOpen(false);
      resetCreateForm();
    },
    onError: (err: any) => {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : (raw || err.message || 'Failed to create inspection');
      setCreateError(msg);
    },
  });

  const startMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/quality/inspections/${id}/start`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
    },
    onError: (err: any) => {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : (raw || err.message || 'Failed to start inspection');
      alert(msg);
    },
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) =>
      (await api.post(`/quality/inspections/${id}/complete`, data)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] });
      queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
      setIsCompleteOpen(false);
      setSelectedInspection(null);
    },
    onError: (err: any) => {
      const raw = err.response?.data?.message;
      const msg = Array.isArray(raw) ? raw.join(', ') : (raw || err.message || 'Failed to complete inspection');
      setCompleteError(msg);
    },
  });

  const resetCreateForm = () => {
    setSelectedGrnId('');
    setSelectedGrnItemId('');
    setSelectedJobCardId('');
    setCreatePartId('');
    setCreatePartName('');
    setCreateBatch('');
    setCreateMaxQty(0);
    setCreateInspectedQty(0);
    setCreateRemarks('');
    setCreateError('');
  };

  const handleOpenComplete = (inspection: any) => {
    setSelectedInspection(inspection);
    setCompleteAcceptedQty(inspection.inspectedQty);
    setCompleteRejectedQty(0);
    setCompleteRejectionReason('');
    setCompleteRemarks('');
    setCompleteError('');
    setIsCompleteOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    const inspectedQty = Number(createInspectedQty);

    if (inspectedQty <= 0) {
      setCreateError('Inspected quantity must be greater than 0');
      return;
    }

    if (inspectedQty > createMaxQty) {
      setCreateError(`Inspected quantity cannot exceed available quantity (${createMaxQty})`);
      return;
    }

    if (createSourceType === 'INCOMING_GRN' && (!selectedGrnId || !selectedGrnItemId)) {
      setCreateError('Please select a GRN and specific GRN item');
      return;
    }

    if (createSourceType === 'PRODUCTION_OUTPUT' && !selectedJobCardId) {
      setCreateError('Please select a Job Card');
      return;
    }

    const payload: any = {
      sourceType: createSourceType,
      partId: createPartId,
      inspectedQty,
      batchNumber: createBatch || undefined,
      remarks: createRemarks || undefined,
    };

    if (createSourceType === 'INCOMING_GRN') {
      payload.grnId = selectedGrnId;
      payload.grnItemId = selectedGrnItemId;
    } else {
      payload.jobCardId = selectedJobCardId;
    }

    createMutation.mutate(payload);
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCompleteError('');
    const accepted = Number(completeAcceptedQty);
    const rejected = Number(completeRejectedQty);
    const total = selectedInspection?.inspectedQty || 0;

    if (accepted < 0 || rejected < 0) {
      setCompleteError('Quantities cannot be negative');
      return;
    }

    if (Math.abs((accepted + rejected) - total) > 0.001) {
      setCompleteError(`Sum of accepted (${accepted}) and rejected (${rejected}) must equal inspected quantity (${total})`);
      return;
    }

    if (rejected > 0 && !completeRejectionReason.trim()) {
      setCompleteError('Rejection reason is mandatory when rejected quantity is greater than 0');
      return;
    }

    completeMutation.mutate({
      id: selectedInspection.id,
      data: {
        acceptedQty: accepted,
        rejectedQty: rejected,
        rejectionReason: rejected > 0 ? completeRejectionReason.trim() : undefined,
        remarks: completeRemarks || undefined,
      },
    });
  };

  // Filtered Inspections
  const filteredInspections = inspections?.filter((insp: any) => {
    if (sourceFilter !== 'ALL' && insp.sourceType !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && insp.status !== statusFilter) return false;
    if (decisionFilter !== 'ALL' && insp.decision !== decisionFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        insp.inspectionNumber?.toLowerCase().includes(q) ||
        insp.part?.partCode?.toLowerCase().includes(q) ||
        insp.part?.name?.toLowerCase().includes(q) ||
        insp.batchNumber?.toLowerCase().includes(q) ||
        insp.grn?.grnNumber?.toLowerCase().includes(q) ||
        insp.jobCard?.jobCardNumber?.toLowerCase().includes(q) ||
        insp.decision?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const selectedGrn = grns?.find((g: any) => g.id === selectedGrnId);

  return (
    <div className="space-y-6">
      {/* Workflow Navigation */}
      <WorkflowStepper activeStageKey="procurement" />

      {/* Header & Action Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Quality Management & Inspection
              </h1>
              <p className="text-sm font-medium text-slate-500">
                Independent QA verification for incoming raw materials and finished goods production output
              </p>
            </div>
          </div>
        </div>

        {hasPermission('quality.manage') && (
          <button
            onClick={() => {
              resetCreateForm();
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New Inspection
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tests</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats?.total ?? 0}</p>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 shadow-sm">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-black text-amber-900 mt-1">{stats?.pending ?? 0}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-black text-blue-900 mt-1">{stats?.inProgress ?? 0}</p>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Accepted</p>
          <p className="text-2xl font-black text-emerald-900 mt-1">{stats?.accepted ?? 0}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 shadow-sm">
          <p className="text-xs font-bold text-purple-700 uppercase tracking-wider">Partial Pass</p>
          <p className="text-2xl font-black text-purple-900 mt-1">{stats?.partiallyAccepted ?? 0}</p>
        </div>
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200 shadow-sm">
          <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Rejected</p>
          <p className="text-2xl font-black text-rose-900 mt-1">{stats?.rejected ?? 0}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Source Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'ALL', label: 'All Sources' },
            { id: 'INCOMING_GRN', label: 'Incoming GRN' },
            { id: 'PRODUCTION_OUTPUT', label: 'Production Output' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSourceFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                sourceFilter === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'IN_PROGRESS', label: 'In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Decision Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
          {[
            { id: 'ALL', label: 'All Decisions' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'PARTIALLY_ACCEPTED', label: 'Partial' },
            { id: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDecisionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                decisionFilter === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inspections Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 font-semibold">Loading quality inspections...</div>
        ) : !filteredInspections || filteredInspections.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-semibold">
            No inspections found matching the current criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Inspection #</th>
                  <th className="px-4 py-3">Source & Reference</th>
                  <th className="px-4 py-3">Part Details</th>
                  <th className="px-4 py-3 text-right">Inspected Qty</th>
                  <th className="px-4 py-3 text-center">Results (Pass / Fail)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Inspector</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredInspections.map((insp: any) => {
                  return (
                    <tr key={insp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-black text-indigo-600 text-xs px-2 py-1 rounded bg-indigo-50 border border-indigo-100">
                          {insp.inspectionNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span
                            className={`inline-flex items-center text-[10px] font-black uppercase px-1.5 py-0.5 rounded w-fit ${
                              insp.sourceType === 'INCOMING_GRN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {insp.sourceType === 'INCOMING_GRN' ? 'GRN' : 'Job Card'}
                          </span>
                          <span className="font-mono text-xs text-slate-700 mt-0.5">
                            {insp.sourceType === 'INCOMING_GRN'
                              ? insp.grn?.grnNumber || insp.sourceId
                              : insp.jobCard?.jobCardNumber || insp.sourceId}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-bold text-slate-800">{insp.part?.name}</p>
                          <p className="text-xs text-slate-400 font-mono">
                            {insp.part?.partCode} {insp.batchNumber ? `• Batch: ${insp.batchNumber}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        {insp.inspectedQty} {insp.part?.unit?.symbol || 'Units'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {insp.status === 'COMPLETED' ? (
                          <div className="inline-flex items-center gap-2 font-mono text-xs">
                            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              ✓ {insp.acceptedQty}
                            </span>
                            {insp.rejectedQty > 0 && (
                              <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                ✗ {insp.rejectedQty}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Pending inspection</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-1 rounded-full ${
                            insp.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-800'
                              : insp.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              insp.status === 'COMPLETED'
                                ? 'bg-slate-600'
                                : insp.status === 'IN_PROGRESS'
                                ? 'bg-blue-600 animate-pulse'
                                : 'bg-amber-500'
                            }`}
                          />
                          {insp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center text-xs font-black px-2 py-0.5 rounded ${
                            insp.decision === 'ACCEPTED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : insp.decision === 'PARTIALLY_ACCEPTED'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : insp.decision === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {insp.decision}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {insp.inspectedBy ? (
                          <div>
                            <p className="font-semibold text-slate-900">
                              {insp.inspectedBy.firstName} {insp.inspectedBy.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {insp.inspectedAt ? new Date(insp.inspectedAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {insp.status === 'PENDING' && hasPermission('quality.manage') && (
                            <button
                              onClick={() => startMutation.mutate(insp.id)}
                              disabled={startMutation.isPending}
                              className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-all flex items-center gap-1"
                              title="Begin Inspection"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              Start
                            </button>
                          )}

                          {insp.status !== 'COMPLETED' && hasPermission('quality.approve') && (
                            <button
                              onClick={() => handleOpenComplete(insp)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-all flex items-center gap-1 shadow-sm"
                              title="Record Inspection Results"
                            >
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                              Complete
                            </button>
                          )}

                          <button
                            onClick={() => setDetailInspection(insp)}
                            className="px-2 py-1 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-all"
                            title="View Details"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE INSPECTION MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Create Quality Inspection</h2>
                <p className="text-xs text-slate-500">Initiate QA verification for materials or production batch</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Source Type Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                  Inspection Source Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateSourceType('INCOMING_GRN');
                      resetCreateForm();
                    }}
                    className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2.5 transition-all ${
                      createSourceType === 'INCOMING_GRN'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Package className="w-4 h-4 text-indigo-600" />
                    Incoming Material (GRN)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateSourceType('PRODUCTION_OUTPUT');
                      resetCreateForm();
                    }}
                    className={`p-3 rounded-xl border text-left font-bold text-xs flex items-center gap-2.5 transition-all ${
                      createSourceType === 'PRODUCTION_OUTPUT'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 shadow-sm'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Production Output (Job Card)
                  </button>
                </div>
              </div>

              {/* Source Selection Fields */}
              {createSourceType === 'INCOMING_GRN' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Select GRN</label>
                    <SearchableSelect
                      options={
                        grns?.map((g: any) => ({
                          value: g.id,
                          label: `${g.grnNumber} (${g.purchaseOrder?.supplier?.name || 'Supplier'})`,
                          subLabel: `Status: ${g.status} • Items: ${g.items?.length || 0}`,
                        })) || []
                      }
                      value={selectedGrnId}
                      onChange={handleGrnSelect}
                      placeholder="Search and select GRN..."
                    />
                  </div>

                  {selectedGrn && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Select GRN Item / Part</label>
                      <SearchableSelect
                        options={
                          selectedGrn.items?.map((it: any) => ({
                            value: it.id,
                            label: `${it.part?.partCode} - ${it.part?.name}`,
                            subLabel: `Received: ${it.receivedQty} ${it.part?.unit?.symbol || ''} • Batch: ${it.batchNumber || 'N/A'}`,
                          })) || []
                        }
                        value={selectedGrnItemId}
                        onChange={handleGrnItemSelect}
                        placeholder="Select part from GRN..."
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Select Job Card</label>
                  <SearchableSelect
                    options={
                      jobCards?.map((jc: any) => ({
                        value: jc.id,
                        label: `${jc.jobCardNumber} — ${jc.part?.partCode} (${jc.part?.name})`,
                        subLabel: `Status: ${jc.status} • Target: ${jc.targetQty} • Produced: ${jc.producedQty || 0}`,
                      })) || []
                    }
                    value={selectedJobCardId}
                    onChange={handleJobCardSelect}
                    placeholder="Search Job Card..."
                  />
                </div>
              )}

              {createPartId && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-slate-500">Selected Part</p>
                  <p className="text-sm font-extrabold text-slate-900">{createPartName}</p>
                  <p className="text-xs text-slate-600 font-mono">
                    Batch: {createBatch || 'N/A'} • Available Qty: {createMaxQty}
                  </p>
                </div>
              )}

              {/* Inspected Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity to Inspect (Max: {createMaxQty})
                </label>
                <NumberInput
                  value={createInspectedQty}
                  onChange={(e) => setCreateInspectedQty(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  min={0.01}
                  max={createMaxQty}
                  required
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remarks (Optional)</label>
                <input
                  type="text"
                  value={createRemarks}
                  onChange={(e) => setCreateRemarks(e.target.value)}
                  placeholder="e.g. Inward sampling per AQL Level II"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || !createPartId}
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE INSPECTION MODAL */}
      {isCompleteOpen && selectedInspection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Record Inspection Results</h2>
                <p className="text-xs text-slate-500">Sign off quality decision and defects</p>
              </div>
              <button
                onClick={() => setIsCompleteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspection Summary Card */}
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Inspection #:</span>
                <span className="font-mono text-indigo-700">{selectedInspection.inspectionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Part:</span>
                <span className="font-bold text-slate-800">{selectedInspection.part?.name}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span className="text-slate-500">Total Inspected Qty:</span>
                <span className="font-mono text-slate-900">
                  {selectedInspection.inspectedQty} {selectedInspection.part?.unit?.symbol || 'Units'}
                </span>
              </div>
            </div>

            {completeError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {completeError}
              </div>
            )}

            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Accepted Qty */}
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    Accepted Quantity
                  </label>
                  <NumberInput
                    value={completeAcceptedQty}
                    onChange={(e) => {
                      const acc = Number(e.target.value) || 0;
                      setCompleteAcceptedQty(acc);
                      // Auto calculate rejected
                      const rem = Math.max(0, selectedInspection.inspectedQty - acc);
                      setCompleteRejectedQty(rem);
                    }}
                    className="w-full px-3 py-2 border border-emerald-300 bg-emerald-50/30 rounded-lg text-sm font-mono font-bold text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    min={0}
                    max={selectedInspection.inspectedQty}
                    required
                  />
                </div>

                {/* Rejected Qty */}
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1 flex items-center gap-1">
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                    Rejected Quantity
                  </label>
                  <NumberInput
                    value={completeRejectedQty}
                    onChange={(e) => {
                      const rej = Number(e.target.value) || 0;
                      setCompleteRejectedQty(rej);
                      const acc = Math.max(0, selectedInspection.inspectedQty - rej);
                      setCompleteAcceptedQty(acc);
                    }}
                    className="w-full px-3 py-2 border border-rose-300 bg-rose-50/30 rounded-lg text-sm font-mono font-bold text-rose-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    min={0}
                    max={selectedInspection.inspectedQty}
                    required
                  />
                </div>
              </div>

              {/* Tally Balance Indicator */}
              <div
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between ${
                  Math.abs((Number(completeAcceptedQty) + Number(completeRejectedQty)) - selectedInspection.inspectedQty) <= 0.001
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-rose-50 border-rose-300 text-rose-700'
                }`}
              >
                <span>
                  Tally: {Number(completeAcceptedQty)} + {Number(completeRejectedQty)} ={' '}
                  {Number(completeAcceptedQty) + Number(completeRejectedQty)} / {selectedInspection.inspectedQty}
                </span>
                <span>
                  {Math.abs((Number(completeAcceptedQty) + Number(completeRejectedQty)) - selectedInspection.inspectedQty) <= 0.001 ? (
                    <span className="text-emerald-600 font-extrabold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Balanced
                    </span>
                  ) : (
                    <span className="text-rose-600 font-extrabold flex items-center gap-1">
                      <X className="w-3.5 h-3.5" /> Unbalanced
                    </span>
                  )}
                </span>
              </div>

              {/* Mandatory Rejection Reason if Rejected > 0 */}
              {Number(completeRejectedQty) > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-extrabold text-rose-700">
                    Rejection Reason (Mandatory)*
                  </label>
                  <input
                    type="text"
                    value={completeRejectionReason}
                    onChange={(e) => setCompleteRejectionReason(e.target.value)}
                    placeholder="e.g. Dimensions out of tolerance, surface porosity, dented flange"
                    className="w-full px-3 py-2 border border-rose-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Dimensional Non-conformance',
                      'Surface Porosity / Scratch',
                      'Burr / Flash Present',
                      'Material Hardness Deviation',
                      'Packaging Damage',
                    ].map((reason) => (
                      <button
                        type="button"
                        key={reason}
                        onClick={() => setCompleteRejectionReason(reason)}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all"
                      >
                        + {reason}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspector Remarks */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Inspector Remarks</label>
                <input
                  type="text"
                  value={completeRemarks}
                  onChange={(e) => setCompleteRemarks(e.target.value)}
                  placeholder="e.g. Sample checked against Drawing Rev C"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCompleteOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    completeMutation.isPending ||
                    Math.abs((Number(completeAcceptedQty) + Number(completeRejectedQty)) - selectedInspection.inspectedQty) > 0.001 ||
                    (Number(completeRejectedQty) > 0 && !completeRejectionReason.trim())
                  }
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {completeMutation.isPending ? 'Submitting...' : 'Confirm Decision & Sign Off'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INSPECTION DETAIL DRAWER / MODAL */}
      {detailInspection && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">Inspection Record Details</h3>
                <p className="text-xs text-slate-500">{detailInspection.inspectionNumber}</p>
              </div>
              <button
                onClick={() => setDetailInspection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase">Source:</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{detailInspection.sourceType}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase">Status / Decision:</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">
                    {detailInspection.status} / {detailInspection.decision}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase">Part Code:</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{detailInspection.part?.partCode}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase">Part Name:</span>
                  <p className="font-extrabold text-slate-800 mt-0.5">{detailInspection.part?.name}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase">Batch Number:</span>
                  <p className="font-mono text-slate-800 mt-0.5">{detailInspection.batchNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase">Inspected Qty:</span>
                  <p className="font-mono font-black text-indigo-700 mt-0.5">{detailInspection.inspectedQty}</p>
                </div>
              </div>

              {detailInspection.status === 'COMPLETED' && (
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-emerald-700 font-bold uppercase">Accepted Qty:</span>
                    <p className="font-mono font-black text-emerald-800 text-sm mt-0.5">
                      {detailInspection.acceptedQty}
                    </p>
                  </div>
                  <div>
                    <span className="text-rose-700 font-bold uppercase">Rejected Qty:</span>
                    <p className="font-mono font-black text-rose-800 text-sm mt-0.5">
                      {detailInspection.rejectedQty}
                    </p>
                  </div>
                  {detailInspection.rejectionReason && (
                    <div className="col-span-2 mt-1">
                      <span className="text-rose-700 font-bold uppercase">Rejection Reason:</span>
                      <p className="font-semibold text-rose-900 bg-rose-50 p-2 rounded border border-rose-200 mt-0.5">
                        {detailInspection.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {detailInspection.remarks && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase">Remarks:</span>
                  <p className="text-slate-700 mt-0.5">{detailInspection.remarks}</p>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                <div>
                  <span className="text-slate-400 font-bold uppercase">Inspector:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {detailInspection.inspectedBy
                      ? `${detailInspection.inspectedBy.firstName} ${detailInspection.inspectedBy.lastName}`
                      : 'Unassigned'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold uppercase">Date:</span>
                  <p className="font-mono text-slate-800 mt-0.5">
                    {detailInspection.inspectedAt
                      ? new Date(detailInspection.inspectedAt).toLocaleString()
                      : new Date(detailInspection.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setDetailInspection(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
