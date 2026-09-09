import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Barcode,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  History,
  Box,
  Truck,
  Search,
} from 'lucide-react';

export const BarcodePage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [scannedInput, setScannedInput] = useState('');
  const [scanAction, setScanAction] = useState<'LOOKUP' | 'BOX_PACK' | 'DISPATCH_VERIFY'>('LOOKUP');
  const [activeBoxId, setActiveBoxId] = useState('');
  const [activeDispatchId, setActiveDispatchId] = useState('');

  const [lastResult, setLastResult] = useState<any | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const { data: history, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['barcode-history'],
    queryFn: async () => (await api.get('/barcodes/history')).data,
    refetchInterval: 5000,
  });

  const { data: openBoxes } = useQuery({
    queryKey: ['open-boxes'],
    queryFn: async () => (await api.get('/packing/boxes', { params: { status: 'OPEN' } })).data,
  });

  const { data: preparedDispatches } = useQuery({
    queryKey: ['prepared-dispatches'],
    queryFn: async () => (await api.get('/dispatches', { params: { status: 'PREPARED' } })).data,
  });

  const scanMutation = useMutation({
    mutationFn: async (payload: any) => {
      return (await api.post('/barcodes/scan', payload)).data;
    },
    onSuccess: (data) => {
      setLastResult(data);
      setLastError(null);
      setScannedInput('');
      queryClient.invalidateQueries({ queryKey: ['barcode-history'] });
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
    },
    onError: (err: any) => {
      setLastError(err.response?.data?.message || 'Barcode scan rejected or invalid code');
      setLastResult(null);
      queryClient.invalidateQueries({ queryKey: ['barcode-history'] });
    },
  });

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedInput.trim()) return;

    setLastError(null);
    scanMutation.mutate({
      code: scannedInput.trim(),
      scanAction,
      targetBoxId: scanAction === 'BOX_PACK' ? activeBoxId : undefined,
      targetDispatchId: scanAction === 'DISPATCH_VERIFY' ? activeDispatchId : undefined,
      deviceInfo: 'Laser Scanner Terminal v2.0',
    });
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <Barcode className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>Barcode & QR Code Console</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          High-speed keyboard-wedge laser gun input & industrial validation pipeline
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Terminal Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-blue-600 animate-pulse" />
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">HARDWARE SCANNER TERMINAL</span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                READY TO SCAN
              </span>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { id: 'LOOKUP', label: 'Instant Lookup', icon: Search },
                { id: 'BOX_PACK', label: 'Pack into Box', icon: Box },
                { id: 'DISPATCH_VERIFY', label: 'Verify Dispatch', icon: Truck },
              ].map((act) => {
                const Icon = act.icon;
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => setScanAction(act.id as any)}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                      scanAction === act.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2.5]" />
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Context Selectors */}
            {scanAction === 'BOX_PACK' && (
              <div className="mb-4">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Open Target Box *
                </label>
                <select
                  value={activeBoxId}
                  onChange={(e) => setActiveBoxId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Choose Open Box --</option>
                  {openBoxes?.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.boxNumber} ({b.barcode})</option>
                  ))}
                </select>
              </div>
            )}

            {scanAction === 'DISPATCH_VERIFY' && (
              <div className="mb-4">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Target Dispatch Manifest *
                </label>
                <select
                  value={activeDispatchId}
                  onChange={(e) => setActiveDispatchId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">-- Choose Dispatch Manifest --</option>
                  {preparedDispatches?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.dispatchNumber} ({d.customer?.name})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Scan form */}
            <form onSubmit={handleScanSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder="Scan barcode gun or type code (e.g. PRT-RM-001-CODE128 or BOX-20260909-0001)..."
                  value={scannedInput}
                  onChange={(e) => setScannedInput(e.target.value)}
                  className="w-full bg-white border-2 border-blue-500 rounded-xl pl-4 pr-28 py-3.5 text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 shadow-sm"
                />
                <button
                  type="submit"
                  disabled={scanMutation.isPending}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all"
                >
                  {scanMutation.isPending ? 'Verifying...' : 'Submit'}
                </button>
              </div>
            </form>

            {/* Notifications */}
            {lastResult && (
              <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 overflow-hidden flex-1">
                  <p className="font-black text-emerald-900 text-sm">Scan Accepted & Verified</p>
                  <pre className="font-mono text-xs text-slate-800 overflow-x-auto bg-white p-3 rounded-lg border border-emerald-200">
                    {JSON.stringify(lastResult, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {lastError && (
              <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-rose-900 text-sm">Scan Rejected</p>
                  <p className="text-slate-800 mt-1 font-bold text-xs">{lastError}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Stream */}
        <div className="bg-white border border-slate-300 rounded-2xl p-5 space-y-4 shadow-md">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            <span>Scan Audit History</span>
          </h2>
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {isHistoryLoading ? (
              <p className="text-xs text-slate-500 font-bold py-6 text-center">Loading history...</p>
            ) : history?.length === 0 ? (
              <p className="text-xs text-slate-500 font-bold py-6 text-center">No scans recorded yet.</p>
            ) : (
              history?.map((h: any) => (
                <div
                  key={h.id}
                  className={`p-3 rounded-xl border text-xs ${
                    h.isSuccess
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-rose-50 border-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-slate-900 text-xs truncate max-w-[150px]">{h.barcodeCode}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                      h.isSuccess ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {h.isSuccess ? 'VERIFIED' : 'FAILED'}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-600 mt-1.5">
                    {h.scanAction} &bull; {h.scannedBy?.firstName || 'User'} &bull; {new Date(h.scannedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
