import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  Plus,
  CheckCircle,
  Building,
  X,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    enabled: isCreateOpen,
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
    enabled: isCreateOpen,
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<Array<{ partId: string; quantity: number; unitPrice: number; taxRate: number }>>([
    { partId: '', quantity: 20, unitPrice: 350, taxRate: 18 },
  ]);

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/invoices', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCreateOpen(false);
    },
  });

  const approveInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/invoices/${id}/approve`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.some((i) => !i.partId)) return;
    createInvoiceMutation.mutate({
      customerId: selectedCustomerId,
      items,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Receipt className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Tax Invoices & Billing</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Commercial invoices, GST calculations, receivables tracking and approvals
          </p>
        </div>

        {hasPermission('billing.manage') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Create Invoice</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">Invoice #</th>
                <th className="py-4 px-5">Customer Name</th>
                <th className="py-4 px-5">Invoice Date</th>
                <th className="py-4 px-5">Subtotal</th>
                <th className="py-4 px-5">Tax (GST)</th>
                <th className="py-4 px-5">Grand Total</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-slate-600 font-bold">Loading invoices...</td></tr>
              ) : (
                invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{inv.invoiceNumber}</td>
                    <td className="py-4 px-5 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-500" />
                        <span>{inv.customer?.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-700">
                      {new Date(inv.invoiceDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">
                      ${inv.subTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-700">
                      ${inv.taxAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">
                      ${inv.grandTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                        inv.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                        'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      {inv.status === 'DRAFT' && hasPermission('billing.approve') && (
                        <button
                          onClick={() => approveInvoiceMutation.mutate(inv.id)}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all"
                        >
                          Approve
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
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="text-xl font-black text-slate-900">Generate Commercial Tax Invoice</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Customer *</label>
                <select
                  required
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers?.map((c: any) => (
                    <option key={c.id} value={c.id} className="text-slate-900 font-bold">{c.name} ({c.gstin || c.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">Billing Line Items</label>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-300 items-center">
                    <div className="col-span-6">
                      <select
                        required
                        value={it.partId}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].partId = e.target.value;
                          const p = parts?.find((x: any) => x.id === e.target.value);
                          if (p) updated[idx].unitPrice = p.standardCost || 100;
                          setItems(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900"
                      >
                        <option value="">Select Part...</option>
                        {parts?.map((p: any) => (
                          <option key={p.id} value={p.id} className="text-slate-900 font-bold">{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].quantity = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        placeholder="Price"
                        value={it.unitPrice}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                          setItems(updated);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>
                ))}
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
                  disabled={createInvoiceMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all"
                >
                  Create Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
