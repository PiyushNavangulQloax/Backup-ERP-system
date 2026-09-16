import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';
import { NumberInput } from '../components/NumberInput';
import {
  Package,
  Plus,
  Lock,
  Unlock,
  Printer,
  X,
  Search,
} from 'lucide-react';

export const PackingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { searchQuery, setSearchQuery } = useSearch();
  const [selectedBox, setSelectedBox] = useState<any | null>(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);
  const [selectedPackingOrderId, setSelectedPackingOrderId] = useState<string>('');
  const [showNewPkoModal, setShowNewPkoModal] = useState(false);
  const [newPkoSalesOrderId, setNewPkoSalesOrderId] = useState('');
  const [newPkoNotes, setNewPkoNotes] = useState('');

  // Fetch barcode as base64 data URL so it renders correctly on print
  useEffect(() => {
    if (!selectedBox?.barcode) { setBarcodeDataUrl(null); return; }
    api.get(`/barcodes/image/${selectedBox.barcode}`, { responseType: 'arraybuffer' })
      .then((res) => {
        const base64 = btoa(
          new Uint8Array(res.data).reduce((d, b) => d + String.fromCharCode(b), '')
        );
        setBarcodeDataUrl(`data:image/png;base64,${base64}`);
      })
      .catch(() => setBarcodeDataUrl(null));
  }, [selectedBox?.barcode]);

  // Fetch packing orders
  const { data: packingOrders } = useQuery({
    queryKey: ['packing-orders'],
    queryFn: async () => (await api.get('/packing/orders')).data,
  });

  // Fetch approved sales orders for creating packing orders
  const { data: salesOrders } = useQuery({
    queryKey: ['sales-orders', 'APPROVED'],
    queryFn: async () => (await api.get('/sales-orders?status=APPROVED')).data,
  });

  const currentPackingOrder = packingOrders?.find((po: any) => po.id === selectedPackingOrderId);

  const { data: boxes, isLoading } = useQuery({
    queryKey: ['boxes', selectedPackingOrderId],
    queryFn: async () => {
      const url = selectedPackingOrderId
        ? `/packing/boxes?packingOrderId=${selectedPackingOrderId}`
        : '/packing/boxes';
      return (await api.get(url)).data;
    },
  });

  // Filter boxes by search query
  const filteredBoxes = boxes?.filter((b: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      b.boxNumber?.toLowerCase().includes(q) ||
      b.barcode?.toLowerCase().includes(q) ||
      b.status?.toLowerCase().includes(q) ||
      b.items?.some((item: any) => item.part?.name?.toLowerCase().includes(q))
    );
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
  });

  const createBoxMutation = useMutation({
    mutationFn: async () => {
      const payload = selectedPackingOrderId
        ? { packingOrderId: selectedPackingOrderId }
        : {};
      return (await api.post('/packing/boxes', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      queryClient.invalidateQueries({ queryKey: ['packing-orders'] });
    },
  });

  const createPackingOrderMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/packing/orders', payload)).data;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['packing-orders'] });
      setSelectedPackingOrderId(newOrder.id);
      setShowNewPkoModal(false);
      setNewPkoSalesOrderId('');
      setNewPkoNotes('');
    },
  });

  const sealBoxMutation = useMutation({
    mutationFn: async (boxId: string) => {
      return (await api.post(`/packing/boxes/${boxId}/close`, {})).data;
    },
    onSuccess: (updatedBox) => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      setSelectedBox(updatedBox);
    },
  });

  const reopenBoxMutation = useMutation({
    mutationFn: async (boxId: string) => {
      return (await api.post(`/packing/boxes/${boxId}/reopen`)).data;
    },
    onSuccess: (updatedBox) => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      setSelectedBox(updatedBox);
    },
  });

  const [itemPartId, setItemPartId] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const addItemMutation = useMutation({
    mutationFn: async ({ boxId, payload }: any) => {
      return (await api.post(`/packing/boxes/${boxId}/items`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      api.get(`/packing/boxes/${selectedBox.id}`).then((res) => setSelectedBox(res.data));
    },
  });

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBox || !itemPartId) return;
    addItemMutation.mutate({
      boxId: selectedBox.id,
      payload: { partId: itemPartId, quantity: itemQty },
    });
  };

  return (
    <div className="space-y-6">
      <div className="no-print">
        <WorkflowStepper activeStageKey="packing" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 no-print">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Package className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Packing & Box Management</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Automated Code 128 / QR carton labeling, item scanning & tamper-proof sealing
          </p>
        </div>

        {hasPermission('packing.manage') && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowNewPkoModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Packing Order (from SO)</span>
            </button>
            <button
              onClick={() => createBoxMutation.mutate()}
              disabled={createBoxMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
              <span>{selectedPackingOrderId ? 'Initialize Box for Order' : 'Initialize New Box'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Packing Order Selector Bar */}
      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 no-print shadow-sm">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs font-black uppercase tracking-wider text-slate-700 whitespace-nowrap">
            Packing Order:
          </span>
          <select
            value={selectedPackingOrderId}
            onChange={(e) => setSelectedPackingOrderId(e.target.value)}
            className="w-full md:w-96 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600 shadow-sm"
          >
            <option value="">All Boxes (Ad-hoc Packing)</option>
            {packingOrders?.map((pko: any) => (
              <option key={pko.id} value={pko.id}>
                {pko.orderNumber} &bull; {pko.salesOrder?.customer?.name || 'Customer'} (SO: {pko.salesOrder?.orderNumber || 'N/A'}) &bull; [{pko.status}]
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search box, barcode, part..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-100"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Active Packing Order Details Banner */}
      {currentPackingOrder && (
        <div className="bg-blue-50/80 border-2 border-blue-300 rounded-2xl p-5 space-y-3 shadow-sm no-print">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-black text-blue-900 uppercase tracking-wider">
                  {currentPackingOrder.orderNumber}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  currentPackingOrder.status === 'COMPLETED'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {currentPackingOrder.status}
                </span>
              </div>
              <p className="text-sm font-black text-slate-900 mt-1">
                Customer: <span className="text-blue-950 font-bold">{currentPackingOrder.salesOrder?.customer?.name || 'Direct / Ad-hoc'}</span>
                {currentPackingOrder.salesOrder && (
                  <span className="ml-3 font-normal text-slate-600">
                    (Sales Order: <span className="font-mono font-bold text-slate-900">{currentPackingOrder.salesOrder.orderNumber}</span>)
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-500">Authorized Order Items</span>
              <p className="text-sm font-black text-slate-900">{currentPackingOrder.items?.length || 0} line items</p>
            </div>
          </div>

          {/* Authorized Items Progress Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-blue-100/70 text-blue-950 font-black uppercase">
                <tr>
                  <th className="py-2 px-3 rounded-l-lg">Part Code & Name</th>
                  <th className="py-2 px-3 text-right">Required Qty</th>
                  <th className="py-2 px-3 text-right">Packed Qty</th>
                  <th className="py-2 px-3 text-right">Remaining Qty</th>
                  <th className="py-2 px-3 rounded-r-lg text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-200/60">
                {currentPackingOrder.items?.map((pItem: any) => {
                  const pending = Math.max(0, pItem.requiredQty - pItem.packedQty);
                  const isDone = pending === 0;
                  return (
                    <tr key={pItem.id} className="hover:bg-blue-100/40">
                      <td className="py-2 px-3 font-bold text-slate-900">
                        <span className="font-mono text-blue-700 mr-2">{pItem.part?.code}</span>
                        {pItem.part?.name}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                        {pItem.requiredQty} {pItem.part?.unit?.symbol}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                        {pItem.packedQty} {pItem.part?.unit?.symbol}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-black text-blue-900">
                        {pending} {pItem.part?.unit?.symbol}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isDone ? 'FULFILLED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Boxes list */}
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md no-print">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-4 px-5">Box Number</th>
                  <th className="py-4 px-5">Barcode Code</th>
                  <th className="py-4 px-5">Items Packed</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading boxes...</td></tr>
                ) : (
                  filteredBoxes?.map((b: any) => (
                    <tr
                      key={b.id}
                      onClick={() => setSelectedBox(b)}
                      className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                        selectedBox?.id === b.id ? 'bg-blue-50/80 border-l-4 border-blue-600' : ''
                      }`}
                    >
                      <td className="py-4 px-5 font-mono font-black text-slate-900 text-base">{b.boxNumber}</td>
                      <td className="py-4 px-5 font-mono font-bold text-blue-700">{b.barcode}</td>
                      <td className="py-4 px-5 text-slate-800 font-semibold">
                        {b.items?.reduce((acc: number, cur: any) => acc + cur.quantity, 0)} units ({b.items?.length || 0} items)
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                          b.status === 'SEALED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          b.status === 'OPEN' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                          'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBox(b);
                          }}
                          className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Selected Box Inspector / Printable Carton Label */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-md printable-carton-label">
          {selectedBox ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Shipping Carton</span>
                  <h3 className="font-black text-xl text-slate-900">{selectedBox.boxNumber}</h3>
                  <p className="text-xs font-mono font-bold text-blue-700 mt-0.5">{selectedBox.barcode}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                  selectedBox.status === 'SEALED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                  'bg-blue-100 text-blue-800 border-blue-300'
                }`}>
                  {selectedBox.status}
                </span>
              </div>

              {/* Barcode Preview */}
              <div
                className="p-4 rounded-xl bg-white border-2 border-slate-900 flex flex-col items-center justify-center space-y-2"
                style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as any}
              >
                {barcodeDataUrl ? (
                  <img
                    src={barcodeDataUrl}
                    alt="Box Barcode"
                    className="w-full object-contain"
                    style={{ maxHeight: '80px', imageRendering: 'crisp-edges' }}
                  />
                ) : (
                  <div className="h-16 flex items-center justify-center text-xs text-slate-400 font-mono animate-pulse">
                    Loading barcode...
                  </div>
                )}
                <p className="text-[11px] font-mono font-black text-slate-900 uppercase tracking-widest">
                  APEX MANUFACTURING &bull; {selectedBox.boxNumber}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-2.5">
                <p className="text-xs font-black text-slate-700 uppercase tracking-wider">Packed Contents:</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedBox.items?.map((item: any) => (
                    <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between text-xs">
                      <span className="text-slate-900 font-bold">{item.part?.name}</span>
                      <span className="font-mono text-blue-700 font-black text-sm">{item.quantity} {item.part?.unit?.symbol}</span>
                    </div>
                  ))}
                  {(!selectedBox.items || selectedBox.items.length === 0) && (
                    <p className="text-xs text-slate-500 text-center py-4 font-medium">Box is currently empty.</p>
                  )}
                </div>
              </div>

              {/* Add form */}
              {selectedBox.status === 'OPEN' && hasPermission('packing.manage') && (() => {
                const boxPko = selectedBox.packingOrder || currentPackingOrder;
                const pkoItems = boxPko?.items;
                const selectableParts = pkoItems && pkoItems.length > 0
                  ? parts?.filter((p: any) => pkoItems.some((ai: any) => ai.partId === p.id))
                  : parts;

                return (
                  <form onSubmit={handleAddItem} className="pt-3 border-t border-slate-200 space-y-2 no-print">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        Add Item into Box
                      </label>
                      {boxPko && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                          Linked: {boxPko.orderNumber}
                        </span>
                      )}
                    </div>
                    <select
                      value={itemPartId}
                      onChange={(e) => setItemPartId(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <option value="">Choose Part...</option>
                      {selectableParts?.map((p: any) => {
                        const pkoItem = pkoItems?.find((ai: any) => ai.partId === p.id);
                        const pendingLabel = pkoItem
                          ? ` [Remaining req: ${Math.max(0, pkoItem.requiredQty - pkoItem.packedQty)}]`
                          : '';
                        return (
                          <option key={p.id} value={p.id} className="text-slate-900 font-bold">
                            {p.name}{pendingLabel}
                          </option>
                        );
                      })}
                    </select>
                    <div className="flex gap-2">
                      <NumberInput
                        min="1"
                        value={itemQty}
                        onChange={(e) => setItemQty(parseFloat(e.target.value) || 1)}
                        className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 text-center"
                        placeholder="Qty"
                      />
                      <button
                        type="submit"
                        disabled={addItemMutation.isPending}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer transition-colors"
                      >
                        {addItemMutation.isPending ? 'Adding...' : 'Add to Box'}
                      </button>
                    </div>
                  </form>
                );
              })()}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between no-print">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Label</span>
                </button>

                {selectedBox.status === 'OPEN' ? (
                  <button
                    onClick={() => sealBoxMutation.mutate(selectedBox.id)}
                    disabled={sealBoxMutation.isPending || !selectedBox.items?.length}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Seal & Lock Box</span>
                  </button>
                ) : selectedBox.status === 'SEALED' ? (
                  <button
                    onClick={() => reopenBoxMutation.mutate(selectedBox.id)}
                    disabled={reopenBoxMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm cursor-pointer"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Supervisor Reopen</span>
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm font-semibold no-print">
              Select any box on the left to inspect contents, generate barcode, or seal carton.
            </div>
          )}
        </div>
      </div>

      {/* New Packing Order Modal */}
      {showNewPkoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-black text-lg text-slate-900">Create Packing Order from Sales Order</h3>
              <button
                onClick={() => setShowNewPkoModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-bold text-slate-800">
              <div>
                <label className="block mb-1 text-slate-700 uppercase tracking-wider font-black">
                  Select Approved Sales Order:
                </label>
                <select
                  value={newPkoSalesOrderId}
                  onChange={(e) => setNewPkoSalesOrderId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="">Choose Approved Sales Order...</option>
                  {salesOrders?.map((so: any) => (
                    <option key={so.id} value={so.id}>
                      {so.orderNumber} &bull; {so.customer?.name} ({so.items?.length || 0} items)
                    </option>
                  ))}
                </select>
              </div>

              {newPkoSalesOrderId && (() => {
                const so = salesOrders?.find((s: any) => s.id === newPkoSalesOrderId);
                if (!so) return null;
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                    <p className="font-black text-slate-900">Order Items to Pack:</p>
                    <ul className="space-y-1">
                      {so.items?.map((item: any) => (
                        <li key={item.id} className="flex justify-between text-slate-700">
                          <span>{item.part?.name || item.partId}</span>
                          <span className="font-mono font-bold text-blue-700">
                            {item.orderedQty} {item.part?.unit?.symbol}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}

              <div>
                <label className="block mb-1 text-slate-700 uppercase tracking-wider font-black">
                  Notes / Instructions (Optional):
                </label>
                <textarea
                  value={newPkoNotes}
                  onChange={(e) => setNewPkoNotes(e.target.value)}
                  placeholder="Special packing notes, container sizes, batch handling..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowNewPkoModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newPkoSalesOrderId || createPackingOrderMutation.isPending}
                onClick={() => {
                  const so = salesOrders?.find((s: any) => s.id === newPkoSalesOrderId);
                  if (!so) return;
                  createPackingOrderMutation.mutate({
                    salesOrderId: so.id,
                    notes: newPkoNotes,
                    items: so.items.map((item: any) => ({
                      partId: item.partId,
                      requiredQty: item.orderedQty,
                    })),
                  });
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs disabled:opacity-50 shadow-sm"
              >
                {createPackingOrderMutation.isPending ? 'Creating...' : 'Release Packing Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
