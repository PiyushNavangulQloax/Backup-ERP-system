import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  Lock,
  Unlock,
  Printer,
  X,
} from 'lucide-react';

export const PackingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [selectedBox, setSelectedBox] = useState<any | null>(null);

  const { data: boxes, isLoading } = useQuery({
    queryKey: ['boxes'],
    queryFn: async () => (await api.get('/packing/boxes')).data,
  });

  const { data: parts } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
  });

  const createBoxMutation = useMutation({
    mutationFn: async () => {
      return (await api.post('/packing/boxes', {})).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
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
          <button
            onClick={() => createBoxMutation.mutate()}
            disabled={createBoxMutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Initialize New Box</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Boxes list */}
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
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
                  boxes?.map((b: any) => (
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

        {/* Right Column: Selected Box Inspector */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 space-y-5 shadow-md">
          {selectedBox ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-black text-lg text-slate-900">{selectedBox.boxNumber}</h3>
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
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 flex flex-col items-center justify-center space-y-2">
                <img
                  src={`/api/v1/barcodes/image/${selectedBox.barcode}`}
                  alt="Box Barcode"
                  className="max-h-20 object-contain"
                />
                <p className="text-[11px] font-mono font-black text-slate-900 uppercase tracking-widest">
                  APEX MFG &bull; {selectedBox.boxNumber}
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
              {selectedBox.status === 'OPEN' && hasPermission('packing.manage') && (
                <form onSubmit={handleAddItem} className="pt-3 border-t border-slate-200 space-y-2.5">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">Add Item into Box</label>
                  <div className="flex gap-2">
                    <select
                      value={itemPartId}
                      onChange={(e) => setItemPartId(e.target.value)}
                      required
                      className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                    >
                      <option value="">Choose Part...</option>
                      {parts?.map((p: any) => (
                        <option key={p.id} value={p.id} className="text-slate-900 font-bold">{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(parseFloat(e.target.value) || 1)}
                      className="w-16 bg-white border border-slate-300 rounded-xl px-2 py-2 text-xs font-mono font-bold text-slate-900 text-center"
                    />
                    <button
                      type="submit"
                      disabled={addItemMutation.isPending}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black"
                    >
                      Add
                    </button>
                  </div>
                </form>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 text-xs font-black text-slate-700 hover:text-slate-900"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Label</span>
                </button>

                {selectedBox.status === 'OPEN' ? (
                  <button
                    onClick={() => sealBoxMutation.mutate(selectedBox.id)}
                    disabled={sealBoxMutation.isPending || !selectedBox.items?.length}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm disabled:opacity-50"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Seal & Lock Box</span>
                  </button>
                ) : selectedBox.status === 'SEALED' ? (
                  <button
                    onClick={() => reopenBoxMutation.mutate(selectedBox.id)}
                    disabled={reopenBoxMutation.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Supervisor Reopen</span>
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm font-semibold">
              Select any box on the left to inspect contents, generate barcode, or seal carton.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
