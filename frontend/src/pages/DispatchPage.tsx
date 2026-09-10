import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  CheckCircle2,
  Building,
  FileDown,
  X,
} from 'lucide-react';

export const DispatchPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: dispatches, isLoading } = useQuery({
    queryKey: ['dispatches'],
    queryFn: async () => (await api.get('/dispatches')).data,
  });

  const { data: invoices } = useQuery({
    queryKey: ['approved-invoices'],
    queryFn: async () => (await api.get('/invoices', { params: { status: 'APPROVED' } })).data,
    enabled: isCreateOpen,
  });

  const { data: sealedBoxes } = useQuery({
    queryKey: ['sealed-boxes'],
    queryFn: async () => (await api.get('/packing/boxes', { params: { status: 'SEALED' } })).data,
    enabled: isCreateOpen,
  });

  const { data: transporters } = useQuery({
    queryKey: ['transporters'],
    queryFn: async () => (await api.get('/masters/transporters')).data,
    enabled: isCreateOpen,
  });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);

  const createDispatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/dispatches', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      setIsCreateOpen(false);
      setSelectedBoxIds([]);
    },
  });

  const gateOutMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/dispatches/${id}/gate-out`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gate out authorization failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || selectedBoxIds.length === 0) {
      alert('Please select an invoice and at least one sealed box');
      return;
    }
    createDispatchMutation.mutate({
      invoiceId: selectedInvoiceId,
      transporterId: selectedTransporterId || undefined,
      vehicleNumber,
      driverName,
      boxIds: selectedBoxIds,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Dispatch & Gate-Out Control</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Shipment manifests, 100% barcode verified loading & gate security exit authorization
          </p>
        </div>

        {hasPermission('dispatch.manage') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Prepare Shipment Manifest</span>
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">Dispatch #</th>
                <th className="py-4 px-5">Customer</th>
                <th className="py-4 px-5">Invoice Ref</th>
                <th className="py-4 px-5">Transporter & Vehicle</th>
                <th className="py-4 px-5">Boxes Verified</th>
                <th className="py-4 px-5">Status</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">Loading dispatches...</td></tr>
              ) : dispatches?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-slate-600 font-bold">No dispatch shipments found.</td></tr>
              ) : (
                dispatches?.map((d: any) => {
                  const verifiedCount = d.boxes?.filter((b: any) => b.verifiedAt).length || 0;
                  const totalBoxes = d.boxes?.length || 0;
                  const allVerified = verifiedCount === totalBoxes && totalBoxes > 0;

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{d.dispatchNumber}</td>
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-500" />
                          <span>{d.customer?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-700 font-semibold">{d.invoice?.invoiceNumber}</td>
                      <td className="py-4 px-5 text-slate-800 font-semibold">
                        {d.transporter?.name || 'Self Pickup'} {d.vehicleNumber && `(${d.vehicleNumber})`}
                      </td>
                      <td className="py-4 px-5 font-mono font-bold">
                        <span className={allVerified ? 'text-emerald-700' : 'text-amber-700'}>
                          {verifiedCount} / {totalBoxes} boxes
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                          d.status === 'DISPATCHED' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => downloadFile(`/reports/dispatch/${d.id}/pdf`, `GatePass_${d.dispatchNumber}.pdf`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" /> PDF Pass
                        </button>

                        {d.status === 'PREPARED' && hasPermission('dispatch.gate_out') && (
                          <button
                            onClick={() => gateOutMutation.mutate(d.id)}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm"
                          >
                            Gate Out
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              <h2 className="text-xl font-black text-slate-900">Prepare Dispatch Manifest</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-200">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Approved Tax Invoice *</label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Select Approved Invoice --</option>
                  {invoices?.map((inv: any) => (
                    <option key={inv.id} value={inv.id} className="text-slate-900 font-bold">{inv.invoiceNumber} - {inv.customer?.name} (${inv.grandTotal})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Transporter</label>
                  <select
                    value={selectedTransporterId}
                    onChange={(e) => setSelectedTransporterId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900"
                  >
                    <option value="">-- Choose Transporter --</option>
                    {transporters?.map((t: any) => (
                      <option key={t.id} value={t.id} className="text-slate-900 font-bold">{t.name} ({t.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. MH-12-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Assign Sealed Boxes for Shipment Loading
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-300">
                  {sealedBoxes?.map((box: any) => (
                    <label key={box.id} className="flex items-center gap-2.5 text-sm text-slate-900 cursor-pointer p-1.5 rounded hover:bg-white font-bold">
                      <input
                        type="checkbox"
                        checked={selectedBoxIds.includes(box.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBoxIds([...selectedBoxIds, box.id]);
                          } else {
                            setSelectedBoxIds(selectedBoxIds.filter((id) => id !== box.id));
                          }
                        }}
                        className="rounded border-slate-400 text-blue-600 focus:ring-blue-600 w-4 h-4"
                      />
                      <span className="font-mono text-blue-700">{box.boxNumber}</span>
                      <span className="text-slate-500 font-mono text-xs">({box.barcode})</span>
                    </label>
                  ))}
                  {(!sealedBoxes || sealedBoxes.length === 0) && (
                    <p className="text-xs text-slate-500 py-3 text-center font-medium">No sealed boxes ready in Finished Goods warehouse.</p>
                  )}
                </div>
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
                  disabled={createDispatchMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition-all"
                >
                  Save Dispatch Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
