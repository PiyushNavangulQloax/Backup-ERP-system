import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';
import {
  Receipt,
  Plus,
  CheckCircle,
  Building,
  X,
  Search,
  FileText,
  AlertTriangle,
  Trash2,
  CreditCard,
  Boxes,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmModalInvoice, setConfirmModalInvoice] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'CASH',
    transactionRef: '',
    notes: '',
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: async () => (await api.get('/invoices')).data,
  });

  // Filter invoices by search query
  const filteredInvoices = invoices?.filter((inv: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q) ||
      inv.status?.toLowerCase().includes(q) ||
      String(inv.grandTotal)?.includes(q)
    );
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

  const { data: salesOrders } = useQuery({
    queryKey: ['sales-orders', 'APPROVED'],
    queryFn: async () => (await api.get('/sales-orders?status=APPROVED')).data,
    enabled: isCreateOpen,
  });

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSalesOrderId, setSelectedSalesOrderId] = useState('');
  const [items, setItems] = useState<Array<{ partId: string; quantity: number; unitPrice: number; taxRate: number }>>([
    { partId: '', quantity: 20, unitPrice: 350, taxRate: 18 },
  ]);

  const handleSelectSalesOrder = (soId: string) => {
    setSelectedSalesOrderId(soId);
    if (!soId) return;

    const so = salesOrders?.find((s: any) => s.id === soId);
    if (so) {
      if (so.customerId) {
        setSelectedCustomerId(so.customerId);
      }
      if (so.items && so.items.length > 0) {
        const soItems = so.items.map((it: any) => ({
          partId: it.partId,
          quantity: it.pendingQty > 0 ? it.pendingQty : it.orderedQty,
          unitPrice: it.rate || 100,
          taxRate: it.taxRate ?? 18,
        }));
        setItems(soItems);
      }
    }
  };

  // Available stock helper
  const getPartInfo = (partId: string) => {
    const part = parts?.find((p: any) => p.id === partId);
    if (!part) return { part: null, stock: 0, uom: 'units' };
    const storeStock =
      part.stocks?.reduce(
        (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
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

  const hasInsufficientStockItem = items.some((it) => {
    if (!it.partId) return false;
    const { stock } = getPartInfo(it.partId);
    return it.quantity > stock;
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/invoices', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCreateOpen(false);
      setSelectedCustomerId('');
      setSelectedSalesOrderId('');
      setItems([{ partId: '', quantity: 20, unitPrice: 350, taxRate: 18 }]);
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

  const confirmPaymentMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      return (await api.post(`/invoices/${id}/confirm`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-ledger'] });
      setConfirmModalInvoice(null);
      setPaymentForm({ paymentMethod: 'CASH', transactionRef: '', notes: '' });
    },
  });

  const handleAddItem = () => {
    setItems([...items, { partId: '', quantity: 10, unitPrice: 100, taxRate: 18 }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || items.some((i) => !i.partId)) return;
    createInvoiceMutation.mutate({
      customerId: selectedCustomerId,
      salesOrderId: selectedSalesOrderId || undefined,
      items,
    });
  };

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey="dispatch" />

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

      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search invoice number, customer, status..."
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
                filteredInvoices?.map((inv: any) => (
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
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                        inv.status === 'PAID'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm'
                          : inv.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800 border-blue-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {inv.status === 'PAID' && <CheckCircle className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />}
                        {inv.status === 'PAID' ? 'PAID & FULFILLED' : inv.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => downloadFile(`/invoices/${inv.id}/pdf`, `Tax_Invoice_${inv.invoiceNumber}.pdf`)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                          title="Download Tax Invoice PDF"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>PDF</span>
                        </button>
                        {inv.status === 'DRAFT' && hasPermission('billing.approve') && (
                          <button
                            onClick={() => approveInvoiceMutation.mutate(inv.id)}
                            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm transition-all"
                          >
                            Approve
                          </button>
                        )}
                        {inv.status !== 'PAID' && hasPermission('billing.manage') && (
                          <button
                            onClick={() => {
                              setConfirmModalInvoice(inv);
                              setPaymentForm({ paymentMethod: 'CASH', transactionRef: '', notes: '' });
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all flex items-center gap-1.5"
                            title="Confirm Payment & Deduct Stock"
                          >
                            <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Confirm Payment</span>
                          </button>
                        )}
                        {inv.status === 'PAID' && (
                          <span className="text-emerald-700 font-black text-xs flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                            Fulfilled
                          </span>
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
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  Sales Order Reference (Optional)
                </label>
                <p className="text-[11px] font-semibold text-slate-500 mb-2">
                  Link an APPROVED Sales Order to auto-populate customer & line items.
                </p>
                <SearchableSelect
                  value={selectedSalesOrderId}
                  onChange={handleSelectSalesOrder}
                  options={[
                    { value: '', label: '-- Direct Invoice (No Sales Order) --' },
                    ...(salesOrders?.map((so: any) => ({
                      value: so.id,
                      label: `${so.orderNumber} • ${so.customer?.name || 'Customer'} ($${Number(so.grandTotal || 0).toLocaleString()})`,
                      sublabel: `Status: ${so.status} | Items: ${so.items?.length || 0} line(s)`,
                      badge: so.status,
                    })) || []),
                  ]}
                  placeholder="-- Link to Approved Sales Order (Optional) --"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">
                  Customer *
                </label>
                <SearchableSelect
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  options={
                    customers?.map((c: any) => ({
                      value: c.id,
                      label: `${c.name} (${c.gstin || c.code})`,
                      sublabel: c.contactPerson ? `Contact: ${c.contactPerson} | City: ${c.city || 'N/A'}` : undefined,
                      badge: c.state || undefined,
                    })) || []
                  }
                  placeholder="-- Search & Select Customer --"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                      Billing Line Items
                    </label>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Real-time available stock validation enabled
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Add Item Row
                  </button>
                </div>

                <div className="space-y-3">
                  {items.map((it, idx) => {
                    const { part, stock, uom } = getPartInfo(it.partId);
                    const isExceeding = Boolean(it.partId && it.quantity > stock);

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isExceeding
                            ? 'bg-amber-50/85 border-amber-300 ring-1 ring-amber-300 shadow-sm'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-12 sm:col-span-6">
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
                                  Stock: {stock} {uom}
                                </span>
                              )}
                            </div>
                            <SearchableSelect
                              value={it.partId}
                              onChange={(val) => {
                                const updated = [...items];
                                updated[idx].partId = val;
                                const p = parts?.find((x: any) => x.id === val);
                                if (p) updated[idx].unitPrice = p.standardCost || 100;
                                setItems(updated);
                              }}
                              options={
                                parts?.map((p: any) => {
                                  const storeStock =
                                    p.stocks?.reduce(
                                      (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
                                      0
                                    ) || 0;
                                  const pStock =
                                    storeStock > 0
                                      ? storeStock
                                      : Number(p.availableStock ?? p.minStockLevel ?? 0);
                                  const uom = p.unit?.symbol || p.unit?.name || p.uom || 'units';
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

                          <div className="col-span-5 sm:col-span-3">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                              Quantity
                            </label>
                            <NumberInput
                              min="1"
                              placeholder="Qty"
                              value={it.quantity}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].quantity = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-mono font-black text-slate-900 focus:outline-none focus:ring-2 shadow-sm ${
                                isExceeding
                                  ? 'border-amber-400 focus:ring-amber-500 bg-amber-50/50'
                                  : 'border-slate-300 focus:ring-blue-600'
                              }`}
                            />
                          </div>

                          <div className="col-span-5 sm:col-span-2">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                              Rate ($)
                            </label>
                            <NumberInput
                              placeholder="Price"
                              value={it.unitPrice}
                              onChange={(e) => {
                                const updated = [...items];
                                updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                setItems(updated);
                              }}
                              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-sm"
                            />
                          </div>

                          <div className="col-span-2 sm:col-span-1 flex justify-end pb-1">
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

                        {/* Real-time Insufficient Stock Warning Alert Signal */}
                        {isExceeding && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-100/90 border border-amber-300 flex items-start gap-2.5 text-amber-950 shadow-sm animate-pulse">
                            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div className="text-xs leading-relaxed">
                              <span className="font-black text-amber-900">
                                ⚠️ Insufficient Stock Alert:{' '}
                              </span>
                              Required quantity (
                              <span className="font-mono font-black text-amber-950">
                                {it.quantity}
                              </span>
                              ) exceeds available stock (
                              <span className="font-mono font-black text-amber-950">
                                {stock} {uom}
                              </span>
                              ).
                              <span className="block mt-0.5 font-bold text-amber-800">
                                Notice: The order will be fulfilled based on the available stock quantity.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Overarching Notice if any item exceeds stock */}
              {hasInsufficientStockItem && (
                <div className="p-3.5 rounded-xl bg-amber-50 border-2 border-amber-300 flex items-center gap-3 text-amber-950 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                  <div className="text-xs">
                    <span className="font-black text-amber-900">Notice for all users: </span>
                    One or more items exceed current available stock. This invoice will be fulfilled based on the available stock quantity.
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

      {/* Confirm Payment & Order Fulfillment Modal */}
      {confirmModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <CreditCard className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Confirm Payment & Complete Order</h2>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Invoice #{confirmModalInvoice.invoiceNumber} • {confirmModalInvoice.customer?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmModalInvoice(null)}
                className="text-slate-400 hover:text-slate-800 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {/* Item Stock Deduction Breakdown */}
            <div className="space-y-2.5">
              <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                Order Items & Stock Balance Impact
              </label>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl divide-y divide-slate-200 overflow-hidden text-xs">
                {confirmModalInvoice.items?.map((item: any, idx: number) => {
                  const storeStock =
                    item.part?.stocks?.reduce(
                      (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
                      0
                    ) || 0;
                  const available =
                    storeStock > 0
                      ? storeStock
                      : Number(item.part?.availableStock ?? item.part?.minStockLevel ?? 0);
                  const remaining = Math.max(0, available - item.quantity);
                  const uom =
                    item.part?.unit?.symbol ||
                    item.part?.unit?.name ||
                    item.part?.uom ||
                    'BOX';

                  return (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {item.part?.name || 'Product'}
                        </div>
                        <div className="font-mono text-slate-500 text-[11px] font-semibold">
                          {item.part?.code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-slate-900 text-sm">
                          Order Qty: <span className="font-mono text-blue-700">{item.quantity} {uom}</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          Available: <span className="font-mono font-bold text-slate-800">{available}</span> → Projected Remaining:{' '}
                          <span className={`font-mono font-black ${remaining <= 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {remaining} {uom}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informative stock update alert banner */}
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-blue-950 text-xs shadow-sm">
              <Boxes className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <span className="font-black text-blue-900">Automatic Stock Deduction: </span>
                Upon confirming payment and completing this order, the purchased box quantity will be deducted from active warehouse stock and logged in the immutable Stock Ledger.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                confirmPaymentMutation.mutate({
                  id: confirmModalInvoice.id,
                  payload: paymentForm,
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Payment Method *
                  </label>
                  <select
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                  >
                    <option value="CASH">Cash (Immediate Settlement)</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS)</option>
                    <option value="UPI">UPI / Digital Payment</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                    Transaction / Cheque Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TXN-984210 or Cheque #"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Audit / Payment Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Full settlement received by finance desk"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">Total Amount Paid:</span>
                  <div className="text-xl font-mono font-black text-slate-900">
                    ${confirmModalInvoice.grandTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModalInvoice(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={confirmPaymentMutation.isPending}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                    <span>{confirmPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment & Complete Order'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
