import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, downloadFile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  X,
  Printer,
  FileDown,
  ShieldCheck,
  Truck,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  Save,
  ArrowRightCircle,
  QrCode,
  ScanLine,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface GatePassModalProps {
  dispatchId: string;
  onClose: () => void;
}

export const GatePassModal: React.FC<GatePassModalProps> = ({
  dispatchId,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Inline scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Local checklist state for live interactive edits before saving
  const [checklist, setChecklist] = useState<any>(null);
  const [securityRemarks, setSecurityRemarks] = useState('');

  const { data: gatePass, isLoading, error } = useQuery({
    queryKey: ['security-gate-pass', dispatchId],
    queryFn: async () => {
      const res = await api.get(`/dispatches/${dispatchId}/gate-pass`);
      const data = res.data;
      if (!checklist) {
        setChecklist(data.verification);
        setSecurityRemarks(data.verification.securityRemarks || '');
      }
      return data;
    },
  });

  const updateVerificationMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post(`/dispatches/${dispatchId}/gate-pass/verify`, payload)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-gate-pass', dispatchId] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      alert('Security verification checklist updated successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update verification checklist');
    },
  });

  // Inline scan mutation for box verification
  const inlineScanMutation = useMutation({
    mutationFn: async (code: string) => {
      return (await api.post('/barcodes/scan', {
        code,
        scanAction: 'DISPATCH_VERIFY',
        targetDispatchId: dispatchId,
        deviceInfo: 'Gate Pass Inline Scanner',
      })).data;
    },
    onSuccess: () => {
      setScanFeedback({ ok: true, msg: '✅ Box verified successfully!' });
      setScanInput('');
      queryClient.invalidateQueries({ queryKey: ['security-gate-pass', dispatchId] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      setTimeout(() => setScanFeedback(null), 3000);
      scanInputRef.current?.focus();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Scan rejected';
      setScanFeedback({ ok: false, msg: `❌ ${msg}` });
      setScanInput('');
      setTimeout(() => setScanFeedback(null), 4000);
      scanInputRef.current?.focus();
    },
  });

  // Unverify (delete scan) mutation
  const unverifyMutation = useMutation({
    mutationFn: async (boxId: string) => {
      return (await api.post(`/dispatches/${dispatchId}/unverify-box`, { boxId })).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-gate-pass', dispatchId] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to remove verification');
    },
  });

  const handleInlineScan = (e: React.FormEvent) => {
    e.preventDefault();
    const code = scanInput.trim();
    if (!code) return;
    // Check for duplicate scan (already verified box)
    const alreadyVerified = materials.some(
      (m: any) => m.verified && (m.boxBarcode?.toLowerCase() === code.toLowerCase() || m.boxNumber?.toLowerCase() === code.toLowerCase())
    );
    if (alreadyVerified) {
      setScanFeedback({ ok: false, msg: '⚠️ This box is already scanned and verified. Use the 🗑 button to remove it if needed.' });
      setScanInput('');
      setTimeout(() => setScanFeedback(null), 5000);
      scanInputRef.current?.focus();
      return;
    }
    inlineScanMutation.mutate(code);
  };


  const gateOutMutation = useMutation({
    mutationFn: async () => {
      return (await api.post(`/dispatches/${dispatchId}/gate-pass/gate-out`)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['security-gate-pass', dispatchId] });
      queryClient.invalidateQueries({ queryKey: ['dispatches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      alert('Vehicle Gate Out AUTHORIZED! Inventory deducted and timestamp recorded.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Gate out authorization failed');
    },
  });

  const handleToggleCheck = (key: string) => {
    if (!checklist) return;
    setChecklist({ ...checklist, [key]: !checklist[key] });
  };

  const handleSaveChecklist = () => {
    updateVerificationMutation.mutate({
      ...checklist,
      securityRemarks,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!gatePass) return;
    try {
      setDownloading(true);
      await downloadFile(
        `/dispatches/${dispatchId}/gate-pass/pdf`,
        `Security_Gate_Pass_${gatePass.gatePassNumber}.pdf`,
      );
    } catch (err: any) {
      alert(err.message || 'Failed to download Gate Pass PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-bold text-slate-800">Generating Security Gate Pass...</p>
        </div>
      </div>
    );
  }

  if (error || !gatePass) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <p className="text-rose-600 font-bold">Failed to load Security Gate Pass.</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-200 rounded-xl text-sm font-bold">
            Close
          </button>
        </div>
      </div>
    );
  }

  const { company, references, vehicle, materials, materialSummary, seal, movement, approvals } = gatePass;
  const isGateOut = gatePass.status === 'GATE_OUT';
  const isVerified = gatePass.status === 'VERIFIED' || isGateOut;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        {/* Top Actions Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-black text-slate-900 text-sm block">SECURITY GATE PASS</span>
              <span className="font-mono text-xs font-bold text-blue-700">{gatePass.gatePassNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>{downloading ? 'Downloading...' : 'Export PDF'}</span>
            </button>

            {!isGateOut && hasPermission('dispatch.gate_out') && (
              <button
                onClick={() => gateOutMutation.mutate()}
                disabled={gateOutMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all"
              >
                <ArrowRightCircle className="w-4 h-4" />
                <span>Authorize Gate Out</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-slate-800 print:overflow-visible print:p-0 print:space-y-4">
          {/* SECTION 1: HEADER */}
          <div className="border-b-2 border-blue-700 pb-3 flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">{company.name}</h1>
              <p className="text-xs text-slate-600">{company.plantName} - {company.address}</p>
              <p className="text-xs font-semibold text-slate-700">
                GSTIN: <span className="font-mono font-bold text-slate-900">{company.gstin}</span> | Checkpoint: {gatePass.gateNumber}
              </p>
            </div>

            <div className="text-right sm:text-right border sm:border-0 p-2.5 sm:p-0 rounded-xl bg-slate-50 sm:bg-transparent w-full sm:w-auto">
              <h2 className="text-base sm:text-lg font-black text-blue-700 uppercase tracking-wide">
                SECURITY GATE PASS
              </h2>
              <div className="font-mono text-sm font-black text-slate-900">
                {gatePass.gatePassNumber}
              </div>
              <div className="text-xs text-slate-500 font-semibold">
                Issued: {new Date(gatePass.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* SECTION 2: MOVEMENT STATUS BANNER */}
          <div className={`px-4 py-2.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold ${
            isGateOut ? 'bg-emerald-50 text-emerald-900 border-emerald-300' :
            isVerified ? 'bg-blue-50 text-blue-900 border-blue-300' :
            'bg-amber-50 text-amber-900 border-amber-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-white font-black text-[11px] shadow-sm uppercase">
                {gatePass.gatePassType}
              </span>
              <span>Status: <span className="uppercase font-black">{gatePass.status.replace('_', ' ')}</span></span>
            </div>
            <div className="text-[11px] text-slate-600">
              Inspection Bay: <span className="font-bold text-slate-900">{gatePass.gateLocation}</span>
            </div>
          </div>

          {/* SECTION 3: PROMINENT VEHICLE & CARRIER IDENTIFICATION */}
          <div className="border border-slate-300 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 font-black text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span>Vehicle & Carrier Identification (Primary Security Check)</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                <span className="text-blue-700 font-bold uppercase text-[10px] block">Vehicle Registration #</span>
                <span className="text-xl font-mono font-black text-blue-900 block mt-0.5">{vehicle.vehicleNumber}</span>
                <span className="text-xs text-slate-600 block mt-1">Type: {vehicle.vehicleType}</span>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Transport Fleet Carrier</span>
                <p className="font-bold text-slate-900 text-sm">{vehicle.transporterName}</p>
                <p className="text-slate-600 font-mono text-[11px]">GSTIN: {vehicle.transporterGstin}</p>
              </div>

              <div className="space-y-1 text-xs">
                <span className="text-slate-500 font-bold uppercase text-[10px] block">Driver Identity</span>
                <p className="font-bold text-slate-900 text-sm">{vehicle.driverName}</p>
                <p className="text-slate-600 font-mono text-[11px]">Mobile: {vehicle.driverMobile}</p>
                <p className="text-slate-600 text-[11px]">DL No: <span className="font-mono font-semibold">{vehicle.driverLicense}</span></p>
              </div>
            </div>
          </div>

          {/* SECTION 4: REFERENCE DOCUMENTS */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <span className="text-slate-500 font-semibold block text-[10px]">Dispatch Reference</span>
              <span className="font-mono font-bold text-blue-700">{references.dispatchNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px]">Delivery Challan</span>
              <span className="font-mono font-bold text-slate-900">{references.challanNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px]">E-Way Bill Ref</span>
              <span className="font-mono font-bold text-slate-900">{references.ewayBillNumber || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block text-[10px]">Sales Order / Client PO</span>
              <span className="font-mono font-bold text-slate-900">{references.salesOrderNumber}</span>
            </div>
          </div>

          {/* SECTION 5: MATERIAL MANIFEST (FOR PHYSICAL SECURITY VERIFICATION - NO COMMERCIAL PRICING) */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-900 text-white px-4 py-2 font-black uppercase tracking-wider flex items-center justify-between">
              <span>Dispatched Material Manifest (Physical Count & Barcode Tally)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {materialSummary.totalPackages} Total Packages | Gross Wt: {materialSummary.grossWeightKg} KG
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-300 font-black text-slate-700">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10">Sr.</th>
                    <th className="py-2.5 px-3">Item Code & Name</th>
                    <th className="py-2.5 px-3">Carton Box #</th>
                    <th className="py-2.5 px-3">Barcode / Lot Tally</th>
                    <th className="py-2.5 px-3 text-right">Quantity</th>
                    <th className="py-2.5 px-3">UOM</th>
                    <th className="py-2.5 px-3 text-center">Tally Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {materials.map((m: any) => (
                    <tr key={m.sr} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-center font-semibold text-slate-500">{m.sr}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-slate-900">{m.description}</div>
                        <div className="font-mono text-[10px] text-slate-500">{m.itemCode}</div>
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-700">{m.boxNumber}</td>
                      <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">{m.batchOrSerial}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{m.quantity}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{m.uom}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          m.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {m.verified ? '100% VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 5B: INLINE BOX BARCODE SCANNER — SCAN RIGHT HERE */}
          {!isGateOut && (
            <div className="border-2 border-blue-400 rounded-2xl overflow-hidden bg-blue-50/40 print:hidden">
              <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="w-5 h-5 animate-pulse" />
                  <span className="font-black text-sm uppercase tracking-wide">Scan Boxes to Verify — Right Here</span>
                </div>
                <span className="text-xs font-bold text-blue-200">
                  {materials.filter((m: any) => m.verified).length} / {materials.length} boxes verified
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 bg-blue-200">
                <div
                  className="h-2 bg-emerald-500 transition-all duration-500"
                  style={{ width: `${materials.length > 0 ? (materials.filter((m: any) => m.verified).length / materials.length) * 100 : 0}%` }}
                />
              </div>

              <div className="p-4 space-y-3">
                {/* Box Status List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {materials.map((m: any, idx: number) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-bold ${
                        m.verified
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-white border-amber-300 text-slate-700'
                      }`}
                    >
                      {m.verified
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        : <div className="w-4 h-4 rounded-full border-2 border-amber-400 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-black block truncate">{m.boxNumber}</span>
                        <span className="text-[10px] font-mono text-slate-500 truncate block">{m.boxBarcode}</span>
                      </div>
                      {m.verified ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove verification for ${m.boxNumber}?`)) {
                              unverifyMutation.mutate(m.boxId);
                            }
                          }}
                          disabled={unverifyMutation.isPending}
                          className="ml-1 p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 transition-colors flex-shrink-0"
                          title="Remove scan verification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-100 text-amber-800">
                          ⏳ SCAN
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Scanner Input */}
                <form onSubmit={handleInlineScan} className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanLine className="w-4 h-4 text-blue-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      ref={scanInputRef}
                      type="text"
                      autoFocus
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      placeholder="Scan or type box barcode (e.g. BOX-20260911-0003)..."
                      className="w-full bg-white border-2 border-blue-400 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={inlineScanMutation.isPending || !scanInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-xs shadow transition-all"
                  >
                    {inlineScanMutation.isPending ? 'Verifying...' : 'Verify'}
                  </button>
                </form>

                {/* Feedback */}
                {scanFeedback && (
                  <div className={`px-4 py-2.5 rounded-xl text-xs font-bold border ${
                    scanFeedback.ok
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-rose-50 border-rose-300 text-rose-800'
                  }`}>
                    {scanFeedback.msg}
                  </div>
                )}

                {materials.length > 0 && materials.every((m: any) => m.verified) && (
                  <div className="px-4 py-3 rounded-xl bg-emerald-600 text-white text-xs font-black text-center">
                    🎉 All boxes verified! Click "Authorize Gate Out" above.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 6: INTERACTIVE SECURITY VERIFICATION CHECKLIST (SIDE BY SIDE WITH SEAL & TIMESTAMPS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Checklist Box */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-white space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Security Physical Verification Checklist</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold print:hidden">Click to verify</span>
              </div>

              <div className="space-y-2">
                {[
                  { key: 'vehicleVerified', label: 'Vehicle Number & Registration Verified' },
                  { key: 'driverVerified', label: 'Driver Physical Identity & License Checked' },
                  { key: 'materialVerified', label: 'Material Package Count & Quantities Tally' },
                  { key: 'packagesVerified', label: 'All Box Barcode Seals Intact & Undamaged' },
                  { key: 'challanVerified', label: 'Delivery Challan & E-Way Bill Attached' },
                ].map((item) => {
                  const isChecked = checklist ? checklist[item.key] : false;
                  return (
                    <label
                      key={item.key}
                      onClick={() => !isGateOut && handleToggleCheck(item.key)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all ${
                        isGateOut ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                      } ${
                        isChecked ? 'bg-emerald-50/50 border-emerald-300 text-emerald-900 font-bold' : 'border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        readOnly
                        className="rounded text-blue-600 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs">{item.label}</span>
                    </label>
                  );
                })}
              </div>

              {!isGateOut && (
                <div className="pt-2 flex justify-end print:hidden">
                  <button
                    onClick={handleSaveChecklist}
                    disabled={updateVerificationMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Checklist</span>
                  </button>
                </div>
              )}
            </div>

            {/* Seal & Gate Movement Timestamps */}
            <div className="border border-slate-300 rounded-2xl p-4 bg-white space-y-3">
              <span className="font-black text-slate-900 uppercase tracking-wider text-[11px] block border-b border-slate-200 pb-2">
                Seal & Gate Movement Timestamps
              </span>

              {/* Conditional Seal Details */}
              {seal.sealRequired ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                  <span className="font-black text-amber-900 block text-[11px]">Container Security Seal</span>
                  <p className="font-mono font-bold text-amber-950">Seal #: {seal.sealNumber || 'SEAL-APX-8821'}</p>
                  <p className="text-[11px] text-amber-800">Condition: {seal.sealCondition} ({seal.sealType})</p>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-[11px]">
                  Container Seal: <span className="font-semibold text-slate-700">Not mandatory for this transport route</span>
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Vehicle Entry:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {movement.entryTime ? new Date(movement.entryTime).toLocaleTimeString('en-IN') : '10:15 AM'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Loading Cleared:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {movement.loadingEndTime ? new Date(movement.loadingEndTime).toLocaleTimeString('en-IN') : '11:45 AM'}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Gate Exit Departure:</span>
                  </span>
                  <span className={`font-mono font-black ${movement.exitTime ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {movement.exitTime ? new Date(movement.exitTime).toLocaleTimeString('en-IN') : 'PENDING EXIT'}
                  </span>
                </div>
              </div>

              {/* Remarks */}
              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-bold uppercase text-[10px] block mb-1">Security Remarks</span>
                {isGateOut ? (
                  <p className="text-slate-800 italic text-xs">{securityRemarks || 'Material physically verified.'}</p>
                ) : (
                  <input
                    type="text"
                    value={securityRemarks}
                    onChange={(e) => setSecurityRemarks(e.target.value)}
                    placeholder="Enter security officer gate remarks..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* SECTION 7: APPROVAL SIGNATURES */}
          <div className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Warehouse Officer</span>
                <div className="border-b border-slate-300 mx-2" />
                <div>
                  <span className="font-bold text-slate-900 block">{approvals.warehouseOfficer.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{approvals.warehouseOfficer.id}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Security Inspector</span>
                <div className="border-b border-slate-300 mx-2" />
                <div>
                  <span className="font-bold text-slate-900 block">{approvals.securityOfficer.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{approvals.securityOfficer.id}</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Gate Controller</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{approvals.authorizedPerson.name}</span>
              </div>

              <div className="border border-slate-300 rounded-xl p-3 flex flex-col justify-between h-24 bg-white">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver Signature</span>
                <div className="border-b border-slate-300 mx-2" />
                <span className="font-bold text-slate-900">{approvals.driver.name}</span>
              </div>
            </div>
          </div>

          {/* SECTION 8: FOOTER */}
          <div className="pt-3 border-t border-slate-200 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-bold text-slate-700">Official Security Gate Pass.</span>
              <span> Material is permitted to exit plant premises once authorized.</span>
            </div>
            <div className="font-mono">
              Printed: {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
