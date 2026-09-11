import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import {
  X,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Truck,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

interface DocumentChainModalProps {
  dispatchId: string;
  onClose: () => void;
  onOpenChallan: () => void;
  onOpenGatePass: () => void;
}

export const DocumentChainModal: React.FC<DocumentChainModalProps> = ({
  dispatchId,
  onClose,
  onOpenChallan,
  onOpenGatePass,
}) => {
  const { data: chainData, isLoading, error } = useQuery({
    queryKey: ['document-chain', dispatchId],
    queryFn: async () => {
      const res = await api.get(`/dispatches/${dispatchId}/document-chain`);
      return res.data;
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
              <Layers className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">ERP Document Relationship Chain</h2>
              <p className="text-xs font-semibold text-slate-500">
                End-to-end audit traceability from Sales Order to Security Gate Out
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Loading / Error State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-bold text-slate-700 text-sm">Tracing document relationships...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 rounded-xl text-rose-700 font-bold text-sm">
            Failed to load document relationship chain.
          </div>
        )}

        {/* Chain Flow Visualization */}
        {chainData && (
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-purple-900 font-bold">Consignee Client: </span>
                <span className="font-black text-slate-900">{chainData.customer}</span>
              </div>
              <div>
                <span className="text-purple-900 font-bold">Shipment: </span>
                <span className="font-mono font-black text-purple-800">{chainData.dispatchNumber}</span>
              </div>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
              {chainData.chain.map((step: any) => {
                const isChallan = step.code === 'DC';
                const isGatePass = step.code === 'GP';
                const isCleared = step.status === 'CONFIRMED' || step.status === 'APPROVED' || step.status === 'BOOKED' || step.status === 'ACTIVE' || step.status === 'DISPATCHED';

                return (
                  <div key={step.stage} className="relative group">
                    {/* Stage Marker */}
                    <div className={`absolute -left-6 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center font-mono text-[9px] font-bold ${
                      isCleared ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-slate-100 border-slate-400 text-slate-600'
                    }`}>
                      {step.stage}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 hover:border-purple-300 hover:shadow-md transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{step.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCleared ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {step.status}
                          </span>
                        </div>

                        {/* Quick View Link */}
                        {isChallan && (
                          <button
                            onClick={onOpenChallan}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                          >
                            <span>Open Challan</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {isGatePass && (
                          <button
                            onClick={onOpenGatePass}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                          >
                            <span>Inspect Pass</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <div className="font-mono font-black text-slate-800 text-sm">
                          {step.number}
                        </div>
                        {step.date && (
                          <div className="text-[11px] text-slate-500">
                            {new Date(step.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        )}
                      </div>

                      <div className="mt-1 text-[11px] text-slate-600 font-medium">
                        {step.details}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black transition-colors"
          >
            Close Traceability Chain
          </button>
        </div>
      </div>
    </div>
  );
};
