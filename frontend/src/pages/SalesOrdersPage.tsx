import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NumberInput } from '../components/NumberInput';
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Search,
  Filter,
  Eye,
  FileText,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';

interface SalesOrderItem {
  id: string;
  partId: string;
  part: { id: string; name: string; code: string; unit?: { symbol: string } };
  orderedQty: number;
  rate: number;
  taxRate: number;
  lineTotal: number;
  dispatchedQty: number;
  pendingQty: number;
}

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { id: string; name: string; code: string; email?: string; phone?: string };
  orderDate: string;
  requiredDate?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED';
  totalAmount: number;
  taxAmount: number;
  grandTotal: number;
  remarks?: string;
  createdBy: { firstName: string; lastName: string };
  approvedBy?: { firstName: string; lastName: string };
  items: SalesOrderItem[];
}

export const SalesOrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [items, setItems] = useState<Array<{ partId: string; orderedQty: number; rate: number; taxRate: number }>>([
    { partId: '', orderedQty: 1, rate: 100, taxRate: 18 },
  ]);

  // Queries
  const { data: salesOrders = [], isLoading } = useQuery<SalesOrder[]>({
    queryKey: ['sales-orders', statusFilter],
    queryFn: async () => {
      const res = await api.get('/sales-orders', { params: { status: statusFilter || undefined } });
      return res.data?.data || res.data || [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-list'],
    queryFn: async () => {
      const res = await api.get('/masters/customers');
      return res.data?.data || res.data || [];
    },
  });

  const { data: parts = [] } = useQuery({
    queryKey: ['parts-list'],
    queryFn: async () => {
      const res = await api.get('/masters/parts');
      return res.data?.data || res.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newSO: any) => api.post('/sales-orders', newSO),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      setIsCreateOpen(false);
      setCustomerId('');
      setRemarks('');
      setItems([{ partId: '', orderedQty: 1, rate: 100, taxRate: 18 }]);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sales-orders/${id}/submit`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/sales-orders/${id}/approve`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/sales-orders/${id}/reject`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-orders'] }),
  });

  const filteredOrders = salesOrders.filter((so) => {
    const matchesSearch =
      so.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      so.customer?.name?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const handleAddItem = () => {
    setItems([...items, { partId: '', orderedQty: 1, rate: 100, taxRate: 18 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) return alert('Please select a customer');
    if (items.some((i) => !i.partId || i.orderedQty <= 0)) {
      return alert('Please configure valid part and quantity for all items');
    }
    createMutation.mutate({ customerId, requiredDate: requiredDate || undefined, remarks, items });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
            <Send className="w-3.5 h-3.5" /> Submitted
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Draft
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Fulfilled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Sales Orders</h1>
              <p className="text-xs font-semibold text-slate-500">
                Customer Demand & Requirement Orders for Finished Goods Dispatch
              </p>
            </div>
          </div>
        </div>

        {hasPermission('billing.manage') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-sm shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Customer Order
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by order number or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="APPROVED">Approved</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Items / Qty</th>
                <th className="py-3.5 px-4">Grand Total</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm font-semibold text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading sales orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ShoppingCart className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                      <p className="font-bold">No sales orders found.</p>
                      <p className="text-xs">Create your first customer sales order above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((so) => (
                  <tr key={so.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-blue-600">{so.orderNumber}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{so.customer?.name}</div>
                      <div className="text-xs text-slate-400">{so.customer?.code}</div>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-slate-500">
                      {new Date(so.orderDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold">
                      {so.items?.length || 0} items (
                      {so.items?.reduce((acc, i) => acc + i.orderedQty, 0)} units)
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      ₹{so.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(so.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedOrder(so)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {so.status === 'DRAFT' && hasPermission('billing.manage') && (
                          <button
                            onClick={() => submitMutation.mutate(so.id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-black rounded-lg border border-blue-200 flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" /> Submit
                          </button>
                        )}

                        {so.status === 'SUBMITTED' && (hasPermission('billing.approve') || user?.role === 'Management' || user?.role === 'Administrator') && (
                          <>
                            <button
                              onClick={() => approveMutation.mutate(so.id)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black rounded-lg border border-emerald-200 flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Approve
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Reason for rejection:');
                                if (reason) rejectMutation.mutate({ id: so.id, reason });
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black rounded-lg border border-rose-200 flex items-center gap-1"
                            >
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900">Create Customer Sales Order</h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Customer</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Target Delivery / Required Date
                </label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                    Ordered Parts & Products
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" /> Add Item
                  </button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="col-span-5">
                      <select
                        value={item.partId}
                        onChange={(e) => handleItemChange(index, 'partId', e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold"
                        required
                      >
                        <option value="">Select Part</option>
                        {parts.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <NumberInput
                        min="1"
                        placeholder="Qty"
                        value={item.orderedQty}
                        onChange={(e) => handleItemChange(index, 'orderedQty', parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <NumberInput
                        step="0.01"
                        placeholder="Rate ₹"
                        value={item.rate}
                        onChange={(e) => handleItemChange(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold"
                        required
                      />
                    </div>
                    <div className="col-span-2">
                      <NumberInput
                        placeholder="GST %"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-xs font-bold"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-rose-500 hover:text-rose-700 font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Remarks / Special Instructions
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Special packing or transport instructions..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-sm text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm shadow-md"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Draft Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-slate-400">SALES ORDER DETAILS</span>
                <h2 className="text-xl font-black text-slate-900">{selectedOrder.orderNumber}</h2>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs font-bold text-slate-600">
              <div>
                <span className="text-slate-400 block">Customer:</span>
                <span className="font-extrabold text-slate-900 text-sm">{selectedOrder.customer?.name}</span>
                <div className="text-slate-500 font-mono">{selectedOrder.customer?.code}</div>
              </div>
              <div>
                <span className="text-slate-400 block">Status:</span>
                <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
              </div>
              <div>
                <span className="text-slate-400 block">Order Date:</span>
                <span>{new Date(selectedOrder.orderDate).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Created By:</span>
                <span>{selectedOrder.createdBy?.firstName} {selectedOrder.createdBy?.lastName}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Order Line Items</h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 font-black text-slate-500">
                    <tr>
                      <th className="p-2.5">Part</th>
                      <th className="p-2.5 text-right">Ordered</th>
                      <th className="p-2.5 text-right">Dispatched</th>
                      <th className="p-2.5 text-right">Pending</th>
                      <th className="p-2.5 text-right">Rate</th>
                      <th className="p-2.5 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="p-2.5 font-bold text-slate-900">
                          {item.part?.name} <span className="text-slate-400 font-mono">({item.part?.code})</span>
                        </td>
                        <td className="p-2.5 text-right">{item.orderedQty}</td>
                        <td className="p-2.5 text-right text-emerald-600 font-black">{item.dispatchedQty}</td>
                        <td className="p-2.5 text-right text-amber-600 font-black">{item.pendingQty}</td>
                        <td className="p-2.5 text-right">₹{item.rate}</td>
                        <td className="p-2.5 text-right font-extrabold text-slate-900">₹{item.lineTotal?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-md"
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
