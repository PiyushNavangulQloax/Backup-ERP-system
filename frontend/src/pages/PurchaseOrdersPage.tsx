import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  X,
} from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

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
  const [items, setItems] = useState<Array<{ partId: string; orderedQty: number; unitPrice: number; taxRate: number }>>([
    { partId: '', orderedQty: 100, unitPrice: 10, taxRate: 18 },
  ]);

  const createPOMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/purchase-orders', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setIsCreateOpen(false);
      setItems([{ partId: '', orderedQty: 100, unitPrice: 10, taxRate: 18 }]);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/purchase-orders/${id}/approve`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });

  const handleAddItem = () => {
    setItems([...items, { partId: '', orderedQty: 50, unitPrice: 10, taxRate: 18 }]);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
            Supplier procurement orders, line item pricing, taxes and approvals
          </p>
        </div>

        {hasPermission('po.create') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {['', 'SUBMITTED', 'APPROVED', 'PARTIAL', 'COMPLETED', 'REJECTED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              statusFilter === st
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            {st || 'All Orders'}
          </button>
        ))}
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
                  <td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading purchase orders...</td>
                </tr>
              ) : pos?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-600 font-bold">No purchase orders found.</td>
                </tr>
              ) : (
                pos?.map((po: any) => (
                  <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{po.poNumber}</td>
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
                      {po.items?.length} items ({po.items?.reduce((acc: number, cur: any) => acc + cur.orderedQty, 0)} units)
                    </td>
                    <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">
                      ${po.grandTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                        po.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        po.status === 'SUBMITTED' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        po.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                        po.status === 'REJECTED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {po.status === 'APPROVED' && <CheckCircle className="w-4 h-4 text-emerald-700" />}
                        {po.status === 'SUBMITTED' && <Clock className="w-4 h-4 text-amber-700" />}
                        {po.status === 'REJECTED' && <XCircle className="w-4 h-4 text-rose-700" />}
                        <span>{po.status}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {po.status === 'SUBMITTED' && hasPermission('po.approve') && (
                        <button
                          onClick={() => approveMutation.mutate(po.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                        >
                          Approve PO
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

      {/* High-Contrast Crisp Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-black text-slate-900">Create Purchase Order</h2>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">Procure raw materials or components from verified vendors</p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={selectedSupplier}
                    onChange={(e) => setSelectedSupplier(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="">-- Select Supplier --</option>
                    {suppliers?.map((s: any) => (
                      <option key={s.id} value={s.id} className="text-slate-900 font-bold">{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Order Items */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Order Items Breakdown
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-300 items-center">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Part / Item</label>
                        <select
                          required
                          value={it.partId}
                          onChange={(e) => {
                            const updated = [...items];
                            updated[idx].partId = e.target.value;
                            const found = parts?.find((p: any) => p.id === e.target.value);
                            if (found) updated[idx].unitPrice = found.standardCost || 10;
                            setItems(updated);
                          }}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-900"
                        >
                          <option value="">Select Part...</option>
                          {parts?.map((p: any) => (
                            <option key={p.id} value={p.id} className="text-slate-900 font-bold">{p.name} ({p.code})</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Qty</label>
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
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Rate ($)</label>
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
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Total</label>
                        <span className="font-mono font-black text-blue-700 text-sm block pt-1">
                          ${(it.orderedQty * it.unitPrice).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
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
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  placeholder="Payment terms, delivery instructions, packaging specs..."
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
                  disabled={createPOMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all"
                >
                  {createPOMutation.isPending ? 'Submitting...' : 'Submit Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
