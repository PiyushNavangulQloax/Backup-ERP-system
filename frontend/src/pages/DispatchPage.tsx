import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  Building,
  FileDown,
  X,
  FileText,
  ShieldCheck,
  Layers,
  ArrowRightCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { DeliveryChallanModal } from '../components/dispatch/DeliveryChallanModal';
import { GatePassModal } from '../components/dispatch/GatePassModal';
import { DocumentChainModal } from '../components/dispatch/DocumentChainModal';

export const DispatchPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Active Modals
  const [selectedChallanDispatchId, setSelectedChallanDispatchId] = useState<string | null>(null);
  const [selectedGatePassDispatchId, setSelectedGatePassDispatchId] = useState<string | null>(null);
  const [selectedChainDispatchId, setSelectedChainDispatchId] = useState<string | null>(null);

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

  // Form State
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('Covered Container Truck');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverLicense, setDriverLicense] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [movementType, setMovementType] = useState('Customer Delivery');
  const [reasonForTransport, setReasonForTransport] = useState('Supply');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [sealRequired, setSealRequired] = useState(false);
  const [sealNumber, setSealNumber] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('Handle with extreme care. Keep dry.');
  const [selectedBoxIds, setSelectedBoxIds] = useState<string[]>([]);

  const createDispatchMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/dispatches', payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      setIsCreateOpen(false);
      setSelectedBoxIds([]);
      // Reset form
      setVehicleNumber('');
      setDriverName('');
      setDriverPhone('');
      setDriverLicense('');
      setLrNumber('');
      setEwayBillNumber('');
      setSealRequired(false);
      setSealNumber('');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to create dispatch manifest');
    },
  });

  const gateOutMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.post(`/dispatches/${id}/gate-out`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      alert('Gate Out clearance approved! Inventory deducted and gate movement recorded.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gate out authorization failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || selectedBoxIds.length === 0) {
      alert('Please select an approved invoice and at least one sealed box carton');
      return;
    }
    createDispatchMutation.mutate({
      invoiceId: selectedInvoiceId,
      transporterId: selectedTransporterId || undefined,
      vehicleNumber,
      vehicleType,
      driverName,
      driverPhone,
      driverLicense,
      lrNumber,
      movementType,
      reasonForTransport,
      ewayBillNumber: ewayBillNumber || undefined,
      sealRequired,
      sealNumber: sealRequired ? sealNumber : undefined,
      specialInstructions,
      boxIds: selectedBoxIds,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span>Dispatch Manifest & Security Gate-Out</span>
          </h1>
          <p className="text-sm font-semibold text-slate-600 mt-1">
            Dynamic Delivery Challans, Security Gate Passes, 100% barcode verification & automated document chain
          </p>
        </div>

        {hasPermission('dispatch.manage') && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Prepare Shipment Manifest</span>
          </button>
        )}
      </div>

      {/* Dispatches Table */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase tracking-wider text-xs">
              <tr>
                <th className="py-4 px-5">Dispatch #</th>
                <th className="py-4 px-5">Customer Consignee</th>
                <th className="py-4 px-5">Invoice Ref</th>
                <th className="py-4 px-5">Carrier & Vehicle</th>
                <th className="py-4 px-5">Box Tally</th>
                <th className="py-4 px-5">Gate Status</th>
                <th className="py-4 px-5 text-right">Document & Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-600 font-bold">
                    Loading dispatch manifest records...
                  </td>
                </tr>
              ) : dispatches?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-600 font-bold">
                    No dispatch shipments found.
                  </td>
                </tr>
              ) : (
                dispatches?.map((d: any) => {
                  const verifiedCount = d.boxes?.filter((b: any) => b.verifiedAt).length || 0;
                  const totalBoxes = d.boxes?.length || 0;
                  const allVerified = verifiedCount === totalBoxes && totalBoxes > 0;
                  const isDispatched = d.status === 'DISPATCHED';

                  return (
                    <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">
                        {d.dispatchNumber}
                      </td>
                      <td className="py-4 px-5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-slate-500" />
                          <span>{d.customer?.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono text-slate-700 font-semibold">
                        {d.invoice?.invoiceNumber}
                      </td>
                      <td className="py-4 px-5 text-slate-800 font-semibold">
                        <div>{d.transporter?.name || 'Dedicated Logistics Fleet'}</div>
                        <div className="font-mono text-xs font-bold text-blue-800">
                          {d.vehicleNumber || 'MH-12-AB-5050'}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-mono font-bold">
                        <span className={allVerified ? 'text-emerald-700' : 'text-amber-700'}>
                          {verifiedCount} / {totalBoxes} boxes
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                            isDispatched
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right space-x-1.5">
                        {/* Delivery Challan */}
                        <button
                          type="button"
                          onClick={() => setSelectedChallanDispatchId(d.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs border border-teal-200 cursor-pointer transition-colors"
                          title="View & Print Dynamic Delivery Challan"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>Challan</span>
                        </button>

                        {/* Security Gate Pass */}
                        <button
                          type="button"
                          onClick={() => setSelectedGatePassDispatchId(d.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200 cursor-pointer transition-colors"
                          title="Inspect Security Gate Pass & Authorize Clearance"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Gate Pass</span>
                        </button>

                        {/* Document Chain */}
                        <button
                          type="button"
                          onClick={() => setSelectedChainDispatchId(d.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 cursor-pointer transition-colors"
                          title="View Traceability Document Chain"
                        >
                          <Layers className="w-3.5 h-3.5 text-purple-600" />
                          <span>Chain</span>
                        </button>

                        {/* Quick Gate Out Button */}
                        {!isDispatched && hasPermission('dispatch.gate_out') && (
                          <button
                            onClick={() => gateOutMutation.mutate(d.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Gate Out</span>
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

      {/* Prepare Shipment Manifest Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Prepare Shipment Manifest</h2>
                <p className="text-xs font-semibold text-slate-500">
                  Assign sealed boxes, carrier details, and movement metadata
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Invoice Selection */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Approved Tax Invoice *
                </label>
                <select
                  required
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="">-- Select Approved Commercial Invoice --</option>
                  {invoices?.map((inv: any) => (
                    <option key={inv.id} value={inv.id} className="text-slate-900 font-bold">
                      {inv.invoiceNumber} - {inv.customer?.name} (₹{inv.grandTotal.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Movement & Transport Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Movement Type
                  </label>
                  <select
                    value={movementType}
                    onChange={(e) => setMovementType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    <option value="Customer Delivery">Customer Delivery</option>
                    <option value="Stock Transfer">Inter-Warehouse Stock Transfer</option>
                    <option value="Job Work">Job Work Supply</option>
                    <option value="Return">Commercial Return</option>
                    <option value="Sample">Product Sample</option>
                    <option value="Repair">Repair / Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Reason for Transportation
                  </label>
                  <input
                    type="text"
                    value={reasonForTransport}
                    onChange={(e) => setReasonForTransport(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                    placeholder="e.g. Supply under Sales Contract"
                  />
                </div>
              </div>

              {/* Transporter & Vehicle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Transporter Carrier
                  </label>
                  <select
                    value={selectedTransporterId}
                    onChange={(e) => setSelectedTransporterId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  >
                    <option value="">-- Choose Transporter --</option>
                    {transporters?.map((t: any) => (
                      <option key={t.id} value={t.id} className="text-slate-900 font-bold">
                        {t.name} ({t.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Vehicle Registration # *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-12-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Vehicle Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Container Truck"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Driver & LR & E-Way */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Driver Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patil"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Driver Mobile Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98220 11223"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    Driving License #
                  </label>
                  <input
                    type="text"
                    placeholder="MH12 20180045678"
                    value={driverLicense}
                    onChange={(e) => setDriverLicense(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    LR / GR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LR-78945"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                    E-Way Bill Number (if generated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 181234567890"
                    value={ewayBillNumber}
                    onChange={(e) => setEwayBillNumber(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Security Seal (Conditional) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sealRequired}
                    onChange={(e) => setSealRequired(e.target.checked)}
                    className="rounded text-blue-600 w-4 h-4"
                  />
                  <span>Dispatch requires tamper-evident container security seal</span>
                </label>
                {sealRequired && (
                  <div>
                    <label className="block text-slate-700 font-bold uppercase text-[10px] mb-1">
                      Container Seal Number *
                    </label>
                    <input
                      type="text"
                      required={sealRequired}
                      placeholder="e.g. SEAL-APX-88210"
                      value={sealNumber}
                      onChange={(e) => setSealNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-slate-900"
                    />
                  </div>
                )}
              </div>

              {/* Sealed Boxes Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                  Assign Sealed Finished Goods Boxes for Loading *
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-300">
                  {sealedBoxes?.map((box: any) => (
                    <label
                      key={box.id}
                      className="flex items-center gap-2.5 text-xs text-slate-900 cursor-pointer p-1.5 rounded hover:bg-white font-bold"
                    >
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
                      <span className="text-slate-500 font-mono text-[11px]">({box.barcode})</span>
                    </label>
                  ))}
                  {(!sealedBoxes || sealedBoxes.length === 0) && (
                    <p className="text-xs text-slate-500 py-3 text-center font-medium">
                      No sealed boxes ready in Finished Goods warehouse.
                    </p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDispatchMutation.isPending}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-md transition-all"
                >
                  Save Dispatch Manifest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Delivery Challan Modal */}
      {selectedChallanDispatchId && (
        <DeliveryChallanModal
          dispatchId={selectedChallanDispatchId}
          onClose={() => setSelectedChallanDispatchId(null)}
        />
      )}

      {/* Dynamic Security Gate Pass Modal */}
      {selectedGatePassDispatchId && (
        <GatePassModal
          dispatchId={selectedGatePassDispatchId}
          onClose={() => setSelectedGatePassDispatchId(null)}
        />
      )}

      {/* Document Chain Modal */}
      {selectedChainDispatchId && (
        <DocumentChainModal
          dispatchId={selectedChainDispatchId}
          onClose={() => setSelectedChainDispatchId(null)}
          onOpenChallan={() => {
            setSelectedChallanDispatchId(selectedChainDispatchId);
            setSelectedChainDispatchId(null);
          }}
          onOpenGatePass={() => {
            setSelectedGatePassDispatchId(selectedChainDispatchId);
            setSelectedChainDispatchId(null);
          }}
        />
      )}
    </div>
  );
};
