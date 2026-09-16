import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Search,
  ArrowRight,
  Scale,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useEffect } from 'react';

import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { SearchableSelect } from '../components/SearchableSelect';
import { NumberInput } from '../components/NumberInput';

export const MastersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { searchQuery, setSearchQuery } = useSearch();
  
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get('tab') as any) || 'parts';
  const [tab, setTab] = useState<'parts' | 'customers' | 'suppliers' | 'stores' | 'units'>(initialTab);

  useEffect(() => {
    const currentTab = searchParams.get('tab');
    if (currentTab && ['parts', 'customers', 'suppliers', 'stores', 'units'].includes(currentTab)) {
      setTab(currentTab as any);
    }
  }, [location.search]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    code?: string;
    type: 'parts' | 'customers' | 'suppliers' | 'stores' | 'units';
  } | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for Part
  const [partForm, setPartForm] = useState({
    code: '',
    name: '',
    description: '',
    partType: 'RAW_MATERIAL',
    unitId: '',
    supplierId: '',
    openingStock: 0,
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

  // Form states for Unit
  const [unitForm, setUnitForm] = useState({
    name: '',
    symbol: '',
  });

  // Quick unit add inside Part modal
  const [showQuickAddUnit, setShowQuickAddUnit] = useState(false);
  const [quickUnit, setQuickUnit] = useState({
    name: '',
    symbol: '',
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
        supplierId: '',
        openingStock: 0,
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

  // Create Unit Mutation
  const createUnitMutation = useMutation({
    mutationFn: async (payload: { name: string; symbol: string }) => {
      return (await api.post('/masters/units', payload)).data;
    },
    onSuccess: (newUnit: any) => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      if (showQuickAddUnit) {
        setPartForm((prev) => ({ ...prev, unitId: newUnit.id }));
        setShowQuickAddUnit(false);
        setQuickUnit({ name: '', symbol: '' });
      } else {
        setIsModalOpen(false);
        setUnitForm({ name: '', symbol: '' });
      }
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to create unit of measure');
    },
  });

  // UPDATE MUTATIONS
  const updatePartMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/masters/parts/${editingId}`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setErrorMsg('');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Failed to update part'),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/masters/customers/${editingId}`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setErrorMsg('');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Failed to update customer'),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/masters/suppliers/${editingId}`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setErrorMsg('');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Failed to update supplier'),
  });

  const updateStoreMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/masters/stores/${editingId}`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setErrorMsg('');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Failed to update store'),
  });

  const updateUnitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.put(`/masters/units/${editingId}`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      setErrorMsg('');
    },
    onError: (err: any) => setErrorMsg(err.response?.data?.message || 'Failed to update unit of measure'),
  });

  // DELETE MUTATIONS
  const deletePartMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/masters/parts/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.message || 'Failed to delete part'),
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/masters/customers/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.message || 'Failed to delete customer'),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/masters/suppliers/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.message || 'Failed to delete supplier'),
  });

  const deleteStoreMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/masters/stores/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stores'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.message || 'Failed to delete store'),
  });

  const deleteUnitMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/masters/units/${id}`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] });
      setDeleteConfirm(null);
      setDeleteError('');
    },
    onError: (err: any) => setDeleteError(err.response?.data?.message || 'Failed to delete unit of measure'),
  });

  const handleOpenModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setErrorMsg('');
    setShowQuickAddUnit(false);
    if (tab === 'parts') {
      setPartForm({
        code: '',
        name: '',
        description: '',
        partType: 'RAW_MATERIAL',
        unitId: units && units.length > 0 ? units[0].id : '',
        supplierId: '',
        openingStock: 0,
        minStockLevel: 0,
        standardCost: 0,
        hsnCode: '',
        barcodeValue: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleEdit = (item: any, itemType: 'parts' | 'customers' | 'suppliers' | 'stores' | 'units') => {
    setIsEditMode(true);
    setEditingId(item.id);
    setErrorMsg('');
    setShowQuickAddUnit(false);

    if (itemType === 'parts') {
      const currentStock =
        item.stocks?.reduce(
          (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
          0
        ) ?? (item.availableStock ?? item.minStockLevel ?? 0);

      setPartForm({
        code: item.code || '',
        name: item.name || '',
        description: item.description || '',
        partType: item.partType || 'RAW_MATERIAL',
        unitId: item.unitId || '',
        supplierId: item.supplierId || item.supplier?.id || '',
        openingStock: currentStock,
        minStockLevel: item.minStockLevel || 0,
        standardCost: item.standardCost || 0,
        hsnCode: item.hsnCode || '',
        barcodeValue: item.barcodeValue || '',
      });
    } else if (itemType === 'customers') {
      setCustomerForm({
        code: item.code || '',
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        gstin: item.gstin || '',
        billingAddress: item.billingAddress || '',
        shippingAddress: item.shippingAddress || '',
      });
    } else if (itemType === 'suppliers') {
      setSupplierForm({
        code: item.code || '',
        name: item.name || '',
        email: item.email || '',
        phone: item.phone || '',
        gstin: item.gstin || '',
        address: item.address || '',
        paymentTerms: item.paymentTerms || 'Net 30',
      });
    } else if (itemType === 'stores') {
      setStoreForm({
        code: item.code || '',
        name: item.name || '',
        type: item.type || 'RAW_MATERIALS',
      });
    } else if (itemType === 'units') {
      setUnitForm({
        name: item.name || '',
        symbol: item.symbol || '',
      });
    }

    setIsModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    setDeleteError('');
    switch (deleteConfirm.type) {
      case 'parts':
        deletePartMutation.mutate(deleteConfirm.id);
        break;
      case 'customers':
        deleteCustomerMutation.mutate(deleteConfirm.id);
        break;
      case 'suppliers':
        deleteSupplierMutation.mutate(deleteConfirm.id);
        break;
      case 'stores':
        deleteStoreMutation.mutate(deleteConfirm.id);
        break;
      case 'units':
        deleteUnitMutation.mutate(deleteConfirm.id);
        break;
    }
  };

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partForm.code || !partForm.name || !partForm.unitId) {
      setErrorMsg('Code, Name, and Unit are required.');
      return;
    }
    const payload = {
      ...partForm,
      openingStock: Number(partForm.openingStock) || 0,
      minStockLevel: Number(partForm.minStockLevel) || 0,
      standardCost: Number(partForm.standardCost) || 0,
      barcodeValue: partForm.barcodeValue.trim() || undefined,
    };
    if (isEditMode) {
      updatePartMutation.mutate(payload);
    } else {
      createPartMutation.mutate(payload);
    }
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.code || !customerForm.name) {
      setErrorMsg('Customer Code and Name are required.');
      return;
    }
    if (isEditMode) {
      updateCustomerMutation.mutate(customerForm);
    } else {
      createCustomerMutation.mutate(customerForm);
    }
  };

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.code || !supplierForm.name) {
      setErrorMsg('Supplier Code and Name are required.');
      return;
    }
    if (isEditMode) {
      updateSupplierMutation.mutate(supplierForm);
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

  const handleStoreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.code || !storeForm.name) {
      setErrorMsg('Store Code and Name are required.');
      return;
    }
    if (isEditMode) {
      updateStoreMutation.mutate(storeForm);
    } else {
      createStoreMutation.mutate(storeForm);
    }
  };

  const handleUnitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.name || !unitForm.symbol) {
      setErrorMsg('Unit Name and Symbol are required.');
      return;
    }
    const payload = {
      name: unitForm.name.trim(),
      symbol: unitForm.symbol.trim().toUpperCase(),
    };
    if (isEditMode) {
      updateUnitMutation.mutate(payload);
    } else {
      createUnitMutation.mutate(payload);
    }
  };

  const handleQuickAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUnit.name || !quickUnit.symbol) {
      setErrorMsg('Unit Name and Symbol are required.');
      return;
    }
    createUnitMutation.mutate({
      name: quickUnit.name.trim(),
      symbol: quickUnit.symbol.trim().toUpperCase(),
    });
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
      case 'units':
        return 'Add Unit';
    }
  };

  const getModalTitle = () => {
    if (isEditMode) {
      switch (tab) {
        case 'parts':
          return 'Edit Part';
        case 'customers':
          return 'Edit Customer';
        case 'suppliers':
          return 'Edit Supplier';
        case 'stores':
          return 'Edit Store';
        case 'units':
          return 'Edit Unit';
      }
    }
    return getAddButtonLabel();
  };

  const getSearchPlaceholder = () => {
    switch (tab) {
      case 'parts':
        return 'Search parts by name, code, barcode...';
      case 'customers':
        return 'Search customers by name, code, GSTIN, email...';
      case 'suppliers':
        return 'Search suppliers by name, code, GSTIN, phone...';
      case 'stores':
        return 'Search stores by code, name, category, rack...';
      case 'units':
        return 'Search units by name or symbol (e.g. PCS, KG)...';
    }
  };

  const filteredParts = parts?.filter((p: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.code?.toLowerCase().includes(q) ||
      p.name?.toLowerCase().includes(q) ||
      p.barcodeValue?.toLowerCase().includes(q) ||
      p.partType?.toLowerCase().includes(q) ||
      p.hsnCode?.toLowerCase().includes(q) ||
      p.unit?.symbol?.toLowerCase().includes(q) ||
      p.supplier?.name?.toLowerCase().includes(q) ||
      p.supplier?.code?.toLowerCase().includes(q)
    );
  });

  const filteredCustomers = customers?.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      c.code?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.gstin?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.billingAddress?.toLowerCase().includes(q) ||
      c.shippingAddress?.toLowerCase().includes(q)
    );
  });

  const filteredSuppliers = suppliers?.filter((s: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      s.code?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.gstin?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.phone?.toLowerCase().includes(q) ||
      s.paymentTerms?.toLowerCase().includes(q) ||
      s.address?.toLowerCase().includes(q)
    );
  });

  const filteredStores = stores?.filter((st: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      st.code?.toLowerCase().includes(q) ||
      st.name?.toLowerCase().includes(q) ||
      st.type?.toLowerCase().includes(q) ||
      st.locations?.some((l: any) => l.code?.toLowerCase().includes(q))
    );
  });

  const filteredUnits = units?.filter((u: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.symbol?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <WorkflowStepper activeStageKey={tab === 'customers' ? 'customer' : 'masters'} />

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

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'parts', label: 'Parts & Materials', icon: Boxes },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'suppliers', label: 'Suppliers & Vendors', icon: Building },
            { id: 'stores', label: 'Stores & Racks', icon: Warehouse },
            { id: 'units', label: 'Units of Measure', icon: Scale },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id as any);
                  setIsModalOpen(false);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
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

        {/* In-Page Table Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={getSearchPlaceholder()}
            className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all"
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
                  <th className="py-4 px-5">Supplier / Vendor</th>
                  <th className="py-4 px-5">Available Stock</th>
                  <th className="py-4 px-5">Std Cost</th>
                  <th className="py-4 px-5">Barcode Identifier</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isPartsLoading ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-600 font-bold">Loading parts...</td></tr>
                ) : filteredParts?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500 font-medium">
                      {searchQuery ? (
                        <span>
                          No parts found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                            Clear search
                          </button>
                        </span>
                      ) : (
                        <span>No parts found. Click &quot;Add Part&quot; to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : filteredParts?.map((p: any) => {
                  const storeStock = p.stocks?.reduce(
                    (acc: number, s: any) => acc + (Number(s.quantityOnHand ?? s.quantity ?? 0)),
                    0
                  ) || 0;
                  const stock = storeStock > 0 ? storeStock : (Number(p.availableStock ?? p.minStockLevel ?? 0));
                  const uom = p.unit?.symbol || p.unit?.name || 'units';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{p.code}</td>
                      <td className="py-4 px-5 text-slate-900 font-bold">{p.name}</td>
                      <td className="py-4 px-5">
                        <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                          {p.partType}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-800 font-bold">{p.unit?.symbol}</td>
                      <td className="py-4 px-5">
                        {p.supplier ? (
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-blue-600 shrink-0" />
                            <div>
                              <div className="text-slate-900 font-bold text-xs">{p.supplier.name}</div>
                              <div className="text-slate-500 font-mono text-[10px]">{p.supplier.code}</div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="py-4 px-5 font-mono">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
                          stock > 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-sm'
                            : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stock > 0 ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                          {stock} {uom}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono font-black text-slate-900">${p.standardCost?.toFixed(2)}</td>
                      <td className="py-4 px-5 font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        {p.barcodeValue}
                      </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate('/inventory')}
                          className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200 flex items-center gap-1"
                          title="Inward / Add Stock & Boxes in Inventory"
                        >
                          <Boxes className="w-4 h-4" />
                          <span className="text-[11px] font-black">+ Stock</span>
                        </button>
                        <button
                          onClick={() => handleEdit(p, 'parts')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Part"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteConfirm({
                              isOpen: true,
                              id: p.id,
                              name: p.name,
                              code: p.code,
                              type: 'parts',
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                          title="Delete Part"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isCustomersLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">Loading customers...</td></tr>
                ) : filteredCustomers?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                      {searchQuery ? (
                        <span>
                          No customers found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                            Clear search
                          </button>
                        </span>
                      ) : (
                        <span>No customers found. Click &quot;Add Customer&quot; to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : filteredCustomers?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{c.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{c.name}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{c.gstin || '—'}</td>
                    <td className="py-4 px-5 text-slate-800 font-semibold">{c.email} &bull; {c.phone}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{c.billingAddress}</td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(c, 'customers')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteConfirm({
                              isOpen: true,
                              id: c.id,
                              name: c.name,
                              code: c.code,
                              type: 'customers',
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
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
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isSuppliersLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">Loading suppliers...</td></tr>
                ) : filteredSuppliers?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-medium">
                      {searchQuery ? (
                        <span>
                          No suppliers found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                            Clear search
                          </button>
                        </span>
                      ) : (
                        <span>No suppliers found. Click &quot;Add Supplier&quot; to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : filteredSuppliers?.map((s: any) => (
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
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(s, 'suppliers')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Supplier"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteConfirm({
                              isOpen: true,
                              id: s.id,
                              name: s.name,
                              code: s.code,
                              type: 'suppliers',
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                          title="Delete Supplier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
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
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isStoresLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading stores...</td></tr>
                ) : filteredStores?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500 font-medium">
                      {searchQuery ? (
                        <span>
                          No stores found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                            Clear search
                          </button>
                        </span>
                      ) : (
                        <span>No stores found. Click &quot;Add Store&quot; to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : filteredStores?.map((st: any) => (
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
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(st, 'stores')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Store"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteConfirm({
                              isOpen: true,
                              id: st.id,
                              name: st.name,
                              code: st.code,
                              type: 'stores',
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                          title="Delete Store"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'units' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Symbol / Code</th>
                  <th className="py-4 px-5">Unit Name</th>
                  <th className="py-4 px-5">Standard Classification</th>
                  <th className="py-4 px-5">System Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUnits?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-600 font-bold">
                      {searchQuery ? (
                        <span>
                          No units found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;.{' '}
                          <button onClick={() => setSearchQuery('')} className="text-blue-600 underline font-bold ml-1 hover:text-blue-800">
                            Clear search
                          </button>
                        </span>
                      ) : (
                        <span>No units found. Click &quot;Add Unit&quot; to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : filteredUnits?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5">
                      <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-blue-100 text-blue-800 border border-blue-200 font-mono tracking-wider shadow-sm">
                        {u.symbol}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 text-base">{u.name}</td>
                    <td className="py-4 px-5 text-slate-600 font-semibold text-xs">
                      Universal UOM
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Active
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(u, 'units')}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200"
                          title="Edit Unit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteError('');
                            setDeleteConfirm({
                              isOpen: true,
                              id: u.id,
                              name: u.name,
                              code: u.symbol,
                              type: 'units',
                            });
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors border border-transparent hover:border-red-200"
                          title="Delete Unit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
                {isEditMode ? <Pencil className="w-5 h-5 text-blue-600" /> : <Plus className="w-5 h-5 text-blue-600" />}
                <span>{getModalTitle()}</span>
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
                    <SearchableSelect
                      value={partForm.partType}
                      onChange={(val) => setPartForm({ ...partForm, partType: val })}
                      options={[
                        { value: 'RAW_MATERIAL', label: 'RAW_MATERIAL', badge: 'RM', badgeColor: 'bg-amber-100 text-amber-800' },
                        { value: 'WORK_IN_PROGRESS', label: 'WORK_IN_PROGRESS', badge: 'WIP', badgeColor: 'bg-blue-100 text-blue-800' },
                        { value: 'FINISHED_GOOD', label: 'FINISHED_GOOD', badge: 'FG', badgeColor: 'bg-emerald-100 text-emerald-800' },
                      ]}
                      placeholder="Select Classification..."
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-black text-slate-700">Unit of Measure *</label>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddUnit(!showQuickAddUnit)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{showQuickAddUnit ? 'Use Existing List' : '+ Quick Add Unit'}</span>
                      </button>
                    </div>

                    {showQuickAddUnit ? (
                      <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-blue-950">Add &amp; Auto-Select Custom Unit</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Unit Name (e.g. Feet)"
                            value={quickUnit.name}
                            onChange={(e) => setQuickUnit({ ...quickUnit, name: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Symbol (e.g. FT)"
                            value={quickUnit.symbol}
                            onChange={(e) => setQuickUnit({ ...quickUnit, symbol: e.target.value.toUpperCase() })}
                            className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickAddUnit(false)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-600 hover:text-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!quickUnit.name || !quickUnit.symbol || createUnitMutation.isPending}
                            onClick={handleQuickAddUnit}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-sm disabled:opacity-50"
                          >
                            {createUnitMutation.isPending ? 'Saving...' : 'Save & Select'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <SearchableSelect
                        required
                        value={partForm.unitId}
                        onChange={(val) => setPartForm({ ...partForm, unitId: val })}
                        options={units?.map((u: any) => ({
                          value: u.id,
                          label: `${u.name} (${u.symbol})`,
                          badge: u.symbol,
                        })) || []}
                        placeholder="Select Unit of Measure..."
                        searchPlaceholder="Search unit by name or symbol..."
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Standard Cost ($)</label>
                    <NumberInput
                      step="0.01"
                      min="0"
                      value={partForm.standardCost}
                      onChange={(e) => setPartForm({ ...partForm, standardCost: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-blue-950 mb-1">
                      Available / Opening Stock
                    </label>
                    <NumberInput
                      min="0"
                      placeholder="e.g. 30"
                      value={partForm.openingStock}
                      onChange={(e) => setPartForm({ ...partForm, openingStock: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-blue-300 bg-blue-50/40 rounded-xl text-sm font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1">Min Stock Alert Level</label>
                    <NumberInput
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
                    <label className="block text-xs font-black text-slate-700 mb-1">
                      Custom Barcode Tag (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Auto-generated if empty"
                      value={partForm.barcodeValue}
                      onChange={(e) => setPartForm({ ...partForm, barcodeValue: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    Preferred Supplier / Origin Vendor
                  </label>
                  <SearchableSelect
                    value={partForm.supplierId}
                    onChange={(val) => setPartForm({ ...partForm, supplierId: val })}
                    options={
                      suppliers?.map((s: any) => ({
                        value: s.id,
                        label: `${s.name} (${s.code})`,
                        sublabel: s.phone ? `Phone: ${s.phone} | GSTIN: ${s.gstin || 'N/A'}` : undefined,
                        badge: s.code,
                      })) || []
                    }
                    placeholder="-- Select Preferred Supplier / Vendor --"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={2}
                    placeholder="Material grade, dimensions, tolerances..."
                    value={partForm.description}
                    onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                    disabled={createPartMutation.isPending || updatePartMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {isEditMode
                      ? updatePartMutation.isPending
                        ? 'Updating...'
                        : 'Update Part'
                      : createPartMutation.isPending
                      ? 'Saving...'
                      : 'Save Part'}
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
                    disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {isEditMode
                      ? updateCustomerMutation.isPending
                        ? 'Updating...'
                        : 'Update Customer'
                      : createCustomerMutation.isPending
                      ? 'Saving...'
                      : 'Save Customer'}
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
                    disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {isEditMode
                      ? updateSupplierMutation.isPending
                        ? 'Updating...'
                        : 'Update Supplier'
                      : createSupplierMutation.isPending
                      ? 'Saving...'
                      : 'Save Supplier'}
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
                  <SearchableSelect
                    value={storeForm.type}
                    onChange={(val) => setStoreForm({ ...storeForm, type: val })}
                    options={[
                      { value: 'RAW_MATERIALS', label: 'RAW_MATERIALS', badge: 'RM', badgeColor: 'bg-amber-100 text-amber-800' },
                      { value: 'FINISHED_GOODS', label: 'FINISHED_GOODS', badge: 'FG', badgeColor: 'bg-emerald-100 text-emerald-800' },
                      { value: 'SCRAP', label: 'SCRAP', badge: 'SCRAP', badgeColor: 'bg-rose-100 text-rose-800' },
                      { value: 'GENERAL', label: 'GENERAL', badge: 'GEN', badgeColor: 'bg-slate-100 text-slate-800' },
                    ]}
                    placeholder="Select Store Category..."
                  />
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
                    disabled={createStoreMutation.isPending || updateStoreMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {isEditMode
                      ? updateStoreMutation.isPending
                        ? 'Updating...'
                        : 'Update Store'
                      : createStoreMutation.isPending
                      ? 'Saving...'
                      : 'Save Store'}
                  </button>
                </div>
              </form>
            )}

            {/* UNIT FORM */}
            {tab === 'units' && (
              <form onSubmit={handleUnitSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Unit Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kilograms, Pieces, Meters, Rolls"
                    value={unitForm.name}
                    onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">Unit Symbol / Abbreviation *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KG, PCS, MTR, ROL"
                    value={unitForm.symbol}
                    onChange={(e) => setUnitForm({ ...unitForm, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-500 mt-1 font-medium">Standard uppercase abbreviation used in invoices, POs, and barcode tags.</p>
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
                    disabled={createUnitMutation.isPending || updateUnitMutation.isPending}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-sm shadow-md disabled:opacity-50"
                  >
                    {isEditMode
                      ? updateUnitMutation.isPending
                        ? 'Updating...'
                        : 'Update Unit'
                      : createUnitMutation.isPending
                      ? 'Saving...'
                      : 'Save Unit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center gap-3 text-red-600 pb-2 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm Deletion</h3>
                <p className="text-xs font-semibold text-slate-500">Irreversible Master Data Action</p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-sm font-semibold text-slate-700">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900 font-black">{deleteConfirm.name}</strong>
              {deleteConfirm.code ? ` (${deleteConfirm.code})` : ''}?
            </p>
            <p className="text-xs text-slate-500 font-medium">
              If this record is actively referenced in purchase orders, inventory stocks, or other records, deletion will be blocked to maintain referential integrity.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm(null);
                  setDeleteError('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={
                  deletePartMutation.isPending ||
                  deleteCustomerMutation.isPending ||
                  deleteSupplierMutation.isPending ||
                  deleteStoreMutation.isPending ||
                  deleteUnitMutation.isPending
                }
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  {deletePartMutation.isPending ||
                  deleteCustomerMutation.isPending ||
                  deleteSupplierMutation.isPending ||
                  deleteStoreMutation.isPending ||
                  deleteUnitMutation.isPending
                    ? 'Deleting...'
                    : 'Confirm Delete'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

