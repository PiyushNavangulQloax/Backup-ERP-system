import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Database,
  Users,
  Building,
  Boxes,
  Warehouse,
  Plus,
  X,
  AlertCircle,
} from 'lucide-react';

export const MastersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'parts' | 'customers' | 'suppliers' | 'stores'>('parts');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for Part
  const [partForm, setPartForm] = useState({
    code: '',
    name: '',
    description: '',
    partType: 'RAW_MATERIAL',
    unitId: '',
    minStockLevel: 0,
    standardCost: 0,
    hsnCode: '',
    barcodeValue: '',
  });

  // Form states for Customer
  const [customerForm, setCustomerForm] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    gstin: '',
    billingAddress: '',
    shippingAddress: '',
  });

  // Form states for Supplier
  const [supplierForm, setSupplierForm] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: '',
    paymentTerms: 'Net 30',
  });

  // Form states for Store
  const [storeForm, setStoreForm] = useState({
    code: '',
    name: '',
    type: 'RAW_MATERIALS',
  });

  // Data queries
  const { data: parts, isLoading: isPartsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    enabled: tab === 'customers',
  });

  const { data: suppliers, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    enabled: tab === 'suppliers',
  });

  const { data: stores, isLoading: isStoresLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
    enabled: tab === 'stores',
  });

  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: async () => (await api.get('/masters/units')).data,
  });

  // Create Part Mutation
  const createPartMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/masters/parts', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setIsModalOpen(false);
      setErrorMsg('');
      setPartForm({
        code: '',
        name: '',
        description: '',
        partType: 'RAW_MATERIAL',
        unitId: units?.[0]?.id || '',
        minStockLevel: 0,
        standardCost: 0,
        hsnCode: '',
        barcodeValue: '',
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create part');
    },
  });

  // Create Customer Mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/masters/customers', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setErrorMsg('');
      setCustomerForm({
        code: '',
        name: '',
        email: '',
        phone: '',
        gstin: '',
        billingAddress: '',
        shippingAddress: '',
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create customer');
    },
  });

  // Create Supplier Mutation
  const createSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/masters/suppliers', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setErrorMsg('');
      setSupplierForm({
        code: '',
        name: '',
        email: '',
        phone: '',
        gstin: '',
        address: '',
        paymentTerms: 'Net 30',
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create supplier');
    },
  });

  // Create Store Mutation
  const createStoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/masters/stores', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setIsModalOpen(false);
      setErrorMsg('');
      setStoreForm({
        code: '',
        name: '',
        type: 'RAW_MATERIALS',
      });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create store');
    },
  });

  const handleOpenModal = () => {
    setErrorMsg('');
    if (tab === 'parts' && !partForm.unitId && units && units.length > 0) {
      setPartForm((prev) => ({ ...prev, unitId: units[0].id }));
    }
    setIsModalOpen(true);
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.code || !partForm.name || !partForm.unitId) {
      setErrorMsg('Code, Name, and Unit are required.');
      return;
    }
    createPartMutation.mutate({
      ...partForm,
      minStockLevel: Number(partForm.minStockLevel) || 0,
      standardCost: Number(partForm.standardCost) || 0,
      barcodeValue: partForm.barcodeValue.trim() || undefined,
    });
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.code || !customerForm.name) {
      setErrorMsg('Customer Code and Name are required.');
      return;
    }
    createCustomerMutation.mutate(customerForm);
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.code || !supplierForm.name) {
      setErrorMsg('Supplier Code and Name are required.');
      return;
    }
    createSupplierMutation.mutate(supplierForm);
  };

  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.code || !storeForm.name) {
      setErrorMsg('Store Code and Name are required.');
      return;
    }
    createStoreMutation.mutate(storeForm);
  };

  const getAddButtonLabel = () => {
    switch (tab) {
      case 'parts':
        return 'Add Part';
      case 'customers':
        return 'Add Customer';
      case 'suppliers':
        return 'Add Supplier';
      case 'stores':
        return 'Add Store';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Enterprise Master Data</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Configurations for parts, customers, suppliers & warehouse rack structures
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all self-start sm:self-auto text-sm"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{getAddButtonLabel()}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        {[
          { id: 'parts', label: 'Parts & Materials', icon: Boxes },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'suppliers', label: 'Suppliers & Vendors', icon: Building },
          { id: 'stores', label: 'Stores & Racks', icon: Warehouse },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id as any);
                setIsModalOpen(false);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          {tab === 'parts' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Part Code</th>
                  <th className="py-4 px-5">Part Name</th>
                  <th className="py-4 px-5">Classification</th>
                  <th className="py-4 px-5">Unit</th>
                  <th className="py-4 px-5">Std Cost</th>
                  <th className="py-4 px-5">Barcode Identifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isPartsLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">Loading parts...</td></tr>
                ) : parts?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-500 font-medium">No parts found. Click &quot;Add Part&quot; to create one.</td></tr>
                ) : parts?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{p.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{p.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                        {p.partType}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{p.unit?.symbol}</td>
                    <td className="py-4 px-5 font-mono font-black text-slate-900">${p.standardCost?.toFixed(2)}</td>
                    <td className="py-4 px-5 font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block mt-3">
                      {p.barcodeValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'customers' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Customer Code</th>
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">Tax / GSTIN</th>
                  <th className="py-4 px-5">Contact Details</th>
                  <th className="py-4 px-5">Billing Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isCustomersLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading customers...</td></tr>
                ) : customers?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-medium">No customers found. Click &quot;Add Customer&quot; to create one.</td></tr>
                ) : customers?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{c.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{c.name}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{c.gstin || '—'}</td>
                    <td className="py-4 px-5 text-slate-800 font-semibold">{c.email} &bull; {c.phone}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{c.billingAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'suppliers' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Supplier Code</th>
                  <th className="py-4 px-5">Supplier Name</th>
                  <th className="py-4 px-5">Tax / GSTIN</th>
                  <th className="py-4 px-5">Payment Terms</th>
                  <th className="py-4 px-5">Contact Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isSuppliersLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading suppliers...</td></tr>
                ) : suppliers?.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-500 font-medium">No suppliers found. Click &quot;Add Supplier&quot; to create one.</td></tr>
                ) : suppliers?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{s.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{s.name}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{s.gstin || '—'}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                        {s.paymentTerms}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-800 font-semibold">{s.email} &bull; {s.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'stores' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Store Code</th>
                  <th className="py-4 px-5">Store Name</th>
                  <th className="py-4 px-5">Store Category</th>
                  <th className="py-4 px-5">Configured Racks / Bins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isStoresLoading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-600 font-bold">Loading stores...</td></tr>
                ) : stores?.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-500 font-medium">No stores found. Click &quot;Add Store&quot; to create one.</td></tr>
                ) : stores?.map((st: any) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{st.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{st.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                        {st.type}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">
                      {st.locations?.map((l: any) => l.code).join(', ') || 'Floor level'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                <span>{getAddButtonLabel()}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-700 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* PART FORM */}
            {tab === 'parts' && (
              <form onSubmit={handlePartSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Part Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PRT-RM-003"
                      value={partForm.code}
                      onChange={(e) => setPartForm({ ...partForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Part Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aluminum Sheet 3mm"
                      value={partForm.name}
                      onChange={(e) => setPartForm({ ...partForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Classification</label>
                    <select
                      value={partForm.partType}
                      onChange={(e) => setPartForm({ ...partForm, partType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="RAW_MATERIAL">RAW_MATERIAL</option>
                      <option value="WORK_IN_PROGRESS">WORK_IN_PROGRESS</option>
                      <option value="FINISHED_GOOD">FINISHED_GOOD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Unit of Measure *</label>
                    <select
                      required
                      value={partForm.unitId}
                      onChange={(e) => setPartForm({ ...partForm, unitId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Unit</option>
                      {units?.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.symbol})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Standard Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={partForm.standardCost}
                      onChange={(e) => setPartForm({ ...partForm, standardCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Min Stock Level</label>
                    <input
                      type="number"
                      min="0"
                      value={partForm.minStockLevel}
                      onChange={(e) => setPartForm({ ...partForm, minStockLevel: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">HSN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 7209"
                      value={partForm.hsnCode}
                      onChange={(e) => setPartForm({ ...partForm, hsnCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Barcode Value (Optional)</label>
                    <input
                      type="text"
                      placeholder="Auto-generated if blank"
                      value={partForm.barcodeValue}
                      onChange={(e) => setPartForm({ ...partForm, barcodeValue: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createPartMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {createPartMutation.isPending ? 'Saving...' : 'Save Part'}
                  </button>
                </div>
              </form>
            )}

            {/* CUSTOMER FORM */}
            {tab === 'customers' && (
              <form onSubmit={handleCustomerSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Customer Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CUST-003"
                      value={customerForm.code}
                      onChange={(e) => setCustomerForm({ ...customerForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Dynamics Ltd"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="contact@company.com"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 555-0199"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AABCA1234R1ZM"
                      value={customerForm.gstin}
                      onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Billing Address</label>
                    <input
                      type="text"
                      placeholder="Street, City, State"
                      value={customerForm.billingAddress}
                      onChange={(e) => setCustomerForm({ ...customerForm, billingAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {createCustomerMutation.isPending ? 'Saving...' : 'Save Customer'}
                  </button>
                </div>
              </form>
            )}

            {/* SUPPLIER FORM */}
            {tab === 'suppliers' && (
              <form onSubmit={handleSupplierSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Supplier Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUPP-003"
                      value={supplierForm.code}
                      onChange={(e) => setSupplierForm({ ...supplierForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Supplier Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Global Metals Corp"
                      value={supplierForm.name}
                      onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="sales@metals.com"
                      value={supplierForm.email}
                      onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 555-0188"
                      value={supplierForm.phone}
                      onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Payment Terms</label>
                    <input
                      type="text"
                      placeholder="e.g. Net 30"
                      value={supplierForm.paymentTerms}
                      onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Address</label>
                    <input
                      type="text"
                      placeholder="City, State"
                      value={supplierForm.address}
                      onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createSupplierMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {createSupplierMutation.isPending ? 'Saving...' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            )}

            {/* STORE FORM */}
            {tab === 'stores' && (
              <form onSubmit={handleStoreSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Store Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. QA-STORE"
                      value={storeForm.code}
                      onChange={(e) => setStoreForm({ ...storeForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Store Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. QA Quarantine Store"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Store Category</label>
                  <select
                    value={storeForm.type}
                    onChange={(e) => setStoreForm({ ...storeForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="RAW_MATERIALS">RAW_MATERIALS</option>
                    <option value="FINISHED_GOODS">FINISHED_GOODS</option>
                    <option value="SCRAP">SCRAP</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-100 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createStoreMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {createStoreMutation.isPending ? 'Saving...' : 'Save Store'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

