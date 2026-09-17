import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';
import {
  PackageCheck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Building,
  X,
  Search,
} from 'lucide-react';

export const GrnPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: grns, isLoading } = useQuery({
    queryKey: ['grns'],
    queryFn: async () => (await api.get('/grns')).data,
  });

  const filteredGrns = grns?.filter((g: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      g.grnNumber?.toLowerCase().includes(q) ||
      g.purchaseOrder?.poNumber?.toLowerCase().includes(q) ||
      g.purchaseOrder?.supplier?.name?.toLowerCase().includes(q) ||
      g.supplierInvoiceNo?.toLowerCase().includes(q) ||
      g.status?.toLowerCase().includes(q) ||
      g.items?.some((it: any) => it.batchNumber?.toLowerCase().includes(q) || it.part?.name?.toLowerCase().includes(q))
    );
  });

  const { data: approvedPOs } = useQuery({
    queryKey: ['approved-pos'],
    queryFn: async () => (await api.get('/purchase-orders', { params: { status: 'APPROVED' } })).data,
    enabled: isCreateOpen,
  });

  const { data: stores } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
    enabled: isCreateOpen,
  });

  const [selectedPoId, setSelectedPoId] = useState('');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [grnItems, setGrnItems] = useState<any[]>([]);

  const handlePoChange = (poId: string) => {
    setSelectedPoId(poId);
    const po = approvedPOs?.find((p: any) => p.id === poId);
    if (po && stores && stores.length > 0) {
      const defaultStoreId = stores[0].id;
      setGrnItems(
        po.items.map((it: any) => ({
          poItemId: it.id,
          partId: it.partId,
          partName: it.part.name,
          orderedQty: it.orderedQty,
          receivedQty: it.orderedQty - it.receivedQty,
          acceptedQty: it.orderedQty - it.receivedQty,
          rejectedQty: 0,
          damagedQty: 0,
          storeId: defaultStoreId,
          batchNumber: `BATCH-${Date.now().toString().slice(-6)}`,
        }))
      );
    }
  };

  const createGrnMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/grns', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      setIsCreateOpen(false);
    },
  });

  const verifyGrnMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/grns/${id}/verify`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoId || grnItems.length === 0) return;
    createGrnMutation.mutate({
      purchaseOrderId: selectedPoId,
      supplierInvoiceNo,
      remarks,
      items: grnItems,
    });
  };

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey="procurement" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <PackageCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Goods Received Notes (GRN)</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Material inwarding inspection, accepted quantities & automated stock ledger postings
          </p>
        </div>

        {hasPermission('grn.create') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Inward Materials (New GRN)</span>
          </button>
        )}
      </div>

      {/* In-Page Search Toolbar */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search GRN #, PO #, supplier, batch..."
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

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">GRN #</th>
                <th className="py-4 px-5">PO Reference</th>
                <th className="py-4 px-5">Supplier Name</th>
                <th className="py-4 px-5">Inward Date</th>
                <th className="py-4 px-5">Accepted / Rejected</th>
                <th className="py-4 px-5">Inspection Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading GRN receipts...</td></tr>
              ) : filteredGrns?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    {searchQuery ? (
                      <span>
                        No GRNs found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                        <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                          Clear search
                        </button>
                      </span>
                    ) : (
                      <span>No GRN receipts recorded yet.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredGrns?.map((g: any) => (
                  <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{g.grnNumber}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{g.purchaseOrder?.poNumber}</td>
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2 text-slate-900 font-bold">
                        <Building className="w-4 h-4 text-slate-500" />
                        <span>{g.purchaseOrder?.supplier?.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 text-slate-700 font-mono font-medium">
                      {new Date(g.receivedDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 font-mono">
                      <span className="text-emerald-700 font-black text-sm">
                        {g.items?.reduce((acc: number, c: any) => acc + c.acceptedQty, 0)} accepted
                      </span>
                      {g.items?.some((c: any) => c.rejectedQty > 0) && (
                        <span className="text-rose-700 ml-2 font-bold text-xs">
                          ({g.items?.reduce((acc: number, c: any) => acc + c.rejectedQty, 0)} rejected)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                        g.status === 'VERIFIED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {g.status === 'VERIFIED' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertTriangle className="w-4 h-4 text-amber-700" />}
                        <span>{g.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {g.status === 'DRAFT' && hasPermission('grn.verify') && (
                        <button
                          onClick={() => verifyGrnMutation.mutate(g.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                        >
                          Quality Sign-Off
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

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-slate-900">Inward Materials (Create GRN)</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Receive supplier shipments and log physical quality check</p>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Select Approved PO *
                  </label>
                  <SearchableSelect
                    value={selectedPoId}
                    onChange={(val) => handlePoChange(val)}
                    options={
                      approvedPOs?.map((po: any) => ({
                        value: po.id,
                        label: `${po.poNumber} - ${po.supplier?.name}`,
                        sublabel: `Date: ${new Date(po.orderDate).toLocaleDateString()} | Items: ${po.items?.length || 0}`,
                        badge: `Total: ₹${po.grandTotal?.toFixed(2) || '0.00'}`,
                      })) || []
                    }
                    placeholder="-- Search & Select Approved PO --"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Supplier Invoice / DC #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-9042"
                    value={supplierInvoiceNo}
                    onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {grnItems.length > 0 && (
                <div className="pt-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block mb-2.5">
                    Physical Quality Inspection
                  </label>
                  <div className="space-y-3">
                    {grnItems.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 text-sm">{item.partName}</span>
                          <span className="text-xs text-slate-600 font-mono font-bold">Ordered: {item.orderedQty}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Received</label>
                            <NumberInput
                              min="0"
                              value={item.receivedQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...grnItems];
                                updated[idx].receivedQty = val;
                                updated[idx].acceptedQty = Math.max(0, val - updated[idx].rejectedQty);
                                setGrnItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-emerald-700 uppercase mb-1">Accepted</label>
                            <NumberInput
                              min="0"
                              value={item.acceptedQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...grnItems];
                                updated[idx].acceptedQty = val;
                                setGrnItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-emerald-700 font-mono font-black"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-rose-700 uppercase mb-1">Rejected</label>
                            <NumberInput
                              min="0"
                              value={item.rejectedQty}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updated = [...grnItems];
                                updated[idx].rejectedQty = val;
                                updated[idx].acceptedQty = Math.max(0, updated[idx].receivedQty - val);
                                setGrnItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-rose-700 font-mono font-black"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Lot / Batch #</label>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => {
                                const updated = [...grnItems];
                                updated[idx].batchNumber = e.target.value;
                                setGrnItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono font-bold text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Remarks / Inspection Notes</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  placeholder="Verification details, visual inspect OK..."
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createGrnMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all"
                >
                  Save Inward GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
