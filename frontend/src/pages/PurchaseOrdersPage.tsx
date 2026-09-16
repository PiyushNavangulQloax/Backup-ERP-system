import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { PODetailsModal } from '../components/purchase/PODetailsModal';
import {
  InsufficientStockModal,
  InsufficientItem,
} from '../components/purchase/InsufficientStockModal';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  X,
  Search,
  FileText,
  AlertTriangle,
  Trash2,
  Eye,
  ShieldAlert,
  AlertOctagon,
} from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPoIdForDetails, setSelectedPoIdForDetails] = useState<string | null>(null);

  // Rejection Dialog State
  const [rejectingPo, setRejectingPo] = useState<{ id: string; poNumber: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Insufficient Stock Modal State
  const [isInsufficientStockModalOpen, setIsInsufficientStockModalOpen] = useState(false);

  const canReview =
    hasPermission('po.approve') ||
    user?.role === 'Administrator' ||
    user?.role === 'Management';

  // Fetch POs
  const { data: pos, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: async () => {
      const res: any = await api.get('/purchase-orders', {
        params: { status: statusFilter || undefined },
      });
      return res.data;
    },
  });

  // Filter POs by global/in-page search query
  const filteredPos = pos?.filter((po: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      po.poNumber?.toLowerCase().includes(q) ||
      po.supplier?.name?.toLowerCase().includes(q) ||
      po.status?.toLowerCase().includes(q) ||
      po.items?.some(
        (it: any) =>
          it.part?.name?.toLowerCase().includes(q) ||
          it.part?.code?.toLowerCase().includes(q)
      )
    );
  });

  // Masters
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    enabled: isCreateOpen,
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
    enabled: isCreateOpen,
  });

  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<
    Array<{ partId: string; orderedQty: number; unitPrice: number; taxRate: number }>
  >([{ partId: '', orderedQty: 100, unitPrice: 10, taxRate: 18 }]);

  // Available stock helper
  const getPartInfo = (partId: string) => {
    const part = parts?.find((p: any) => p.id === partId);
    if (!part) return { part: null, stock: 0, uom: 'units' };
    const storeStock =
      part.stocks?.reduce(
        (acc: number, s: any) =>
          acc + Number(s.quantityOnHand ?? s.quantity ?? 0),
        0
      ) || 0;
    const stock =
      storeStock > 0
        ? storeStock
        : Number(part.availableStock ?? part.minStockLevel ?? 0);
    const uom =
      part.unit?.symbol ||
      part.unit?.name ||
      part.uom ||
      'units';
    return { part, stock, uom };
  };

  // Compute all items with insufficient stock
  const getInsufficientItems = (): InsufficientItem[] => {
    const list: InsufficientItem[] = [];
    items.forEach((it, idx) => {
      if (!it.partId) return;
      const { part, stock, uom } = getPartInfo(it.partId);
      if (it.orderedQty > stock) {
        list.push({
          index: idx,
          partName: part?.name || 'Selected Part',
          partCode: part?.code || 'N/A',
          orderedQty: it.orderedQty,
          availableStock: stock,
          uom,
        });
      }
    });
    return list;
  };

  const insufficientItems = getInsufficientItems();
  const hasInsufficientStockItem = insufficientItems.length > 0;

  // 1-Click Auto Reduce Handler: sets orderedQty = availableStock for all shortages
  const handleAutoReduceStock = () => {
    const updated = items.map((it) => {
      if (!it.partId) return it;
      const { stock } = getPartInfo(it.partId);
      if (it.orderedQty > stock) {
        return { ...it, orderedQty: Math.max(stock, 0) };
      }
      return it;
    });
    setItems(updated);
  };

  const createPOMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/purchase-orders', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsCreateOpen(false);
      setItems([{ partId: '', orderedQty: 100, unitPrice: 10, taxRate: 18 }]);
      setSelectedSupplier('');
      setDeliveryDate('');
      setNotes('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create purchase order');
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/purchase-orders/${id}/approve`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      alert('Purchase order approved successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Approval failed');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return (await api.post(`/purchase-orders/${id}/reject`, { reason })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setRejectingPo(null);
      setRejectReason('');
      alert('Purchase order rejected successfully.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Rejection failed');
    },
  });

  const handleAddItem = () => {
    setItems([...items, { partId: '', orderedQty: 50, unitPrice: 10, taxRate: 18 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT CHECK: If insufficient stock exists, BLOCK SUBMISSION and pop up warning modal
    if (hasInsufficientStockItem) {
      setIsInsufficientStockModalOpen(true);
      return;
    }

    if (!selectedSupplier || items.some((i) => !i.partId)) {
      alert('Please fill out all fields and select a part for each line');
      return;
    }

    createPOMutation.mutate({
      supplierId: selectedSupplier,
      deliveryDate: deliveryDate || undefined,
      notes,
      items,
    });
  };

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey="procurement" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <ShoppingCart className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Purchase Orders</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Supplier procurement orders, line item pricing, live stock checks and management review
          </p>
        </div>

        {hasPermission('po.create') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & In-Page Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {['', 'SUBMITTED', 'APPROVED', 'PARTIAL', 'COMPLETED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              {st || 'All Orders'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PO number, supplier, part..."
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

      {/* Orders Table */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">PO Number</th>
                <th className="py-4 px-5">Supplier Name</th>
                <th className="py-4 px-5">Order Date</th>
                <th className="py-4 px-5">Line Items</th>
                <th className="py-4 px-5">Grand Total</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-600 font-bold">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : filteredPos?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                    {searchQuery ? (
                      <span>
                        No purchase orders matching &ldquo;
                        <span className="font-bold text-slate-800">{searchQuery}</span>
                        &rdquo;.{' '}
                        <button
                          onClick={() => setSearchQuery('')}
                          className="text-blue-600 underline font-bold ml-1 hover:text-blue-800"
                        >
                          Clear search
                        </button>
                      </span>
                    ) : (
                      <span>No purchase orders found.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPos?.map((po: any) => {
                  const isSubmitted = po.status === 'SUBMITTED';
                  const isRejected = po.status === 'REJECTED';

                  return (
                    <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">
                        <button
                          onClick={() => setSelectedPoIdForDetails(po.id)}
                          className="hover:underline text-left cursor-pointer"
                          title="Click to view purchase order details"
                        >
                          {po.poNumber}
                        </button>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                          <Building className="w-4 h-4 text-slate-500" />
                          <span>{po.supplier?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-mono font-medium">
                        {new Date(po.orderDate).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 text-slate-800 font-semibold">
                        {po.items?.length} items (
                        {po.items?.reduce((acc: number, cur: any) => acc + cur.orderedQty, 0)}{' '}
                        units)
                      </td>
                      <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">
                        ${po.grandTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5">
                        <div>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                              po.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : po.status === 'SUBMITTED'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : po.status === 'COMPLETED'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : po.status === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                          >
                            {po.status === 'APPROVED' && (
                              <CheckCircle className="w-4 h-4 text-emerald-700" />
                            )}
                            {po.status === 'SUBMITTED' && (
                              <Clock className="w-4 h-4 text-amber-700" />
                            )}
                            {po.status === 'REJECTED' && (
                              <XCircle className="w-4 h-4 text-rose-700" />
                            )}
                            <span>{po.status}</span>
                          </span>

                          {isRejected && po.rejectionReason && (
                            <div className="text-[11px] text-rose-700 font-medium mt-1 truncate max-w-xs">
                              Reason: {po.rejectionReason}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Details Button */}
                          <button
                            onClick={() => setSelectedPoIdForDetails(po.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center gap-1 cursor-pointer"
                            title="Inspect purchase order details"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            <span>Details</span>
                          </button>

                          {/* PDF Download */}
                          <button
                            onClick={() =>
                              downloadFile(
                                `/purchase-orders/${po.id}/pdf`,
                                `Purchase_Order_${po.poNumber}.pdf`
                              )
                            }
                            className="px-2 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Download PO PDF"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>PDF</span>
                          </button>

                          {/* Quick Reviewer Actions (Management & Admin) */}
                          {isSubmitted && canReview && (
                            <>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Approve Purchase Order ${po.poNumber}?`)) {
                                    approveMutation.mutate(po.id);
                                  }
                                }}
                                disabled={approveMutation.isPending}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
                                title="Approve Purchase Order"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  setRejectingPo({ id: po.id, poNumber: po.poNumber })
                                }
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-black text-xs shadow-sm transition-all cursor-pointer"
                                title="Reject Purchase Order"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Reason Modal */}
      {rejectingPo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2 bg-rose-100 rounded-xl">
                <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Reject {rejectingPo.poNumber}
                </h3>
                <p className="text-xs text-slate-500">Provide an audit reason for rejecting this PO</p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!rejectReason.trim()) {
                  alert('Please provide a rejection reason');
                  return;
                }
                rejectMutation.mutate({ id: rejectingPo.id, reason: rejectReason });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Rejection Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Budget exceeded, incorrect vendor, or redundant material..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectingPo(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {selectedPoIdForDetails && (
        <PODetailsModal
          poId={selectedPoIdForDetails}
          onClose={() => setSelectedPoIdForDetails(null)}
        />
      )}

      {/* Insufficient Stock Warning Modal */}
      <InsufficientStockModal
        isOpen={isInsufficientStockModalOpen}
        items={insufficientItems}
        onClose={() => setIsInsufficientStockModalOpen(false)}
        onAutoReduce={handleAutoReduceStock}
      />

      {/* Create PO Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-slate-900">Create Purchase Order</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Procure raw materials or components with real-time stock validation
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form
              onSubmit={handleCreateSubmit}
              className="p-6 overflow-y-auto space-y-5 flex-1 bg-white"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Supplier / Vendor *
                  </label>
                  <SearchableSelect
                    value={selectedSupplier}
                    onChange={setSelectedSupplier}
                    options={
                      suppliers?.map((s: any) => ({
                        value: s.id,
                        label: `${s.name} (${s.code})`,
                        sublabel: s.contactPerson
                          ? `Contact: ${s.contactPerson} | Phone: ${s.phone || 'N/A'}`
                          : undefined,
                        badge: s.gstin || s.city || undefined,
                      })) || []
                    }
                    placeholder="-- Search & Select Supplier --"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Order Items Breakdown
                    </label>
                    <span className="text-[11px] font-semibold text-slate-500">
                      Real-time inventory stock checking is strictly enforced
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const { part, stock, uom } = getPartInfo(it.partId);
                    const isExceeding = Boolean(it.partId && it.orderedQty > stock);

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isExceeding
                            ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300 shadow-sm'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-12 sm:col-span-5">
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                Part / Item *
                              </label>
                              {it.partId && (
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    stock > 0
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-100 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  Available Stock: {stock} {uom}
                                </span>
                              )}
                            </div>
                            <SearchableSelect
                              value={it.partId}
                              onChange={(val) => {
                                const updated = [...items];
                                updated[idx].partId = val;
                                const found = parts?.find((p: any) => p.id === val);
                                if (found) updated[idx].unitPrice = found.standardCost || 10;
                                setItems(updated);
                              }}
                              options={
                                parts?.map((p: any) => {
                                  const storeStock =
                                    p.stocks?.reduce(
                                      (acc: number, s: any) =>
                                        acc +
                                        Number(s.quantityOnHand ?? s.quantity ?? 0),
                                      0
                                    ) || 0;
                                  const pStock =
                                    storeStock > 0
                                      ? storeStock
                                      : Number(p.availableStock ?? p.minStockLevel ?? 0);
                                  const uom =
                                    p.unit?.symbol || p.unit?.name || p.uom || 'units';
                                  return {
                                    value: p.id,
                                    label: `${p.name} (${p.code})`,
                                    sublabel: `Available Stock: ${pStock} ${uom}`,
                                    badge: `${pStock} ${uom} in stock`,
                                  };
                                }) || []
                              }
                              placeholder="-- Search & Select Part --"
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                              Ordered Qty
                            </label>
                            <input
                              type="number"
                              min="1"
                              required
                              value={it.orderedQty}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].orderedQty = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                                isExceeding
                                  ? 'border-rose-400 focus:ring-rose-500 bg-rose-50/50'
                                  : 'border-slate-300 focus:ring-blue-600'
                              }`}
                            />
                          </div>

                          <div className="col-span-6 sm:col-span-2">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                              Rate ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              required
                              value={it.unitPrice}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
                            />
                          </div>

                          <div className="col-span-9 sm:col-span-2">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                              Total
                            </label>
                            <span className="font-mono font-black text-blue-700 text-sm block py-1.5 px-2 bg-white rounded-xl text-right border border-slate-200 shadow-sm">
                              ${(it.orderedQty * it.unitPrice).toFixed(2)}
                            </span>
                          </div>

                          <div className="col-span-3 sm:col-span-1 flex justify-end pb-1">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove line item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Insufficient Stock Inline Banner */}
                        {isExceeding && (
                          <div className="mt-3 p-3 rounded-xl bg-rose-100/90 border border-rose-300 flex items-start justify-between gap-3 text-rose-950 shadow-sm">
                            <div className="flex items-start gap-2 text-xs leading-relaxed">
                              <AlertOctagon className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-black text-rose-900">
                                  ⚠️ Insufficient Stock:{' '}
                                </span>
                                Requested quantity (
                                <span className="font-mono font-black text-rose-950">
                                  {it.orderedQty}
                                </span>
                                ) exceeds stock (
                                <span className="font-mono font-black text-rose-950">
                                  {stock} {uom}
                                </span>
                                ).
                                <span className="block mt-0.5 font-bold text-rose-800">
                                  Submission is blocked. Reduce quantity or replenish stock.
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...items];
                                updated[idx].orderedQty = stock;
                                setItems(updated);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 text-rose-900 font-black text-[10px] shrink-0 transition-colors"
                            >
                              Set to {stock}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Special Terms & Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
                  placeholder="Payment terms, delivery instructions, packaging specs..."
                />
              </div>

              {/* Overarching Notice if any item exceeds stock */}
              {hasInsufficientStockItem && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-950 shadow-sm">
                  <div className="flex items-center gap-2.5 text-xs">
                    <AlertOctagon className="w-5 h-5 text-rose-700 shrink-0" />
                    <div>
                      <span className="font-black text-rose-900">
                        Insufficient stock detected ({insufficientItems.length} item
                        {insufficientItems.length > 1 ? 's' : ''}):{' '}
                      </span>
                      Submission is disabled. Please reduce quantities to available stock or apply for stock replenishment.
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsInsufficientStockModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-rose-300 text-rose-800 font-bold text-xs hover:bg-rose-100 transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoReduceStock}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow transition-colors"
                    >
                      Fix All ({insufficientItems.length})
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
                >
                  Cancel
                </button>

                {/* Submit button: Disabled & clearly styled when insufficient stock exists */}
                {hasInsufficientStockItem ? (
                  <button
                    type="button"
                    onClick={() => setIsInsufficientStockModalOpen(true)}
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
                    title="Submission is blocked due to insufficient stock. Click to inspect or reduce."
                  >
                    <AlertOctagon className="w-4 h-4" />
                    <span>Submission Blocked (Insufficient Stock)</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={createPOMutation.isPending}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    {createPOMutation.isPending ? 'Submitting...' : 'Submit Purchase Order'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
