import React from 'react';
import { AlertTriangle, X, ArrowDownCircle, AlertOctagon } from 'lucide-react';

export interface InsufficientItem {
  index: number;
  partName: string;
  partCode: string;
  orderedQty: number;
  availableStock: number;
  uom: string;
}

interface InsufficientStockModalProps {
  items: InsufficientItem[];
  isOpen: boolean;
  onClose: () => void;
  onAutoReduce: () => void;
}

export const InsufficientStockModal: React.FC<InsufficientStockModalProps> = ({
  items,
  isOpen,
  onClose,
  onAutoReduce,
}) => {
  if (!isOpen || items.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white border-2 border-rose-300 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 bg-rose-50 border-b border-rose-200 flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl ring-4 ring-rose-50 shrink-0">
              <AlertOctagon className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-rose-950">Insufficient Stock Alert</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-900 border border-rose-300">
                  Submission Blocked
                </span>
              </div>
              <p className="text-xs font-semibold text-rose-800 mt-1 leading-relaxed">
                You cannot submit this purchase order because the required quantity exceeds current available stock in inventory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          <div className="rounded-2xl border border-rose-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-rose-100/60 font-black text-rose-900 border-b border-rose-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Item / Part</th>
                  <th className="py-2.5 px-3 text-right">Requested</th>
                  <th className="py-2.5 px-3 text-right">In Stock</th>
                  <th className="py-2.5 px-3 text-right text-rose-700">Shortage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100">
                {items.map((it) => {
                  const shortage = it.orderedQty - it.availableStock;
                  return (
                    <tr key={it.index} className="bg-rose-50/30">
                      <td className="py-2.5 px-3">
                        <span className="font-black text-slate-900 block">{it.partName}</span>
                        <span className="font-mono text-[10px] text-slate-500">{it.partCode}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-slate-800">
                        {it.orderedQty} {it.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        {it.availableStock} {it.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700">
                        +{shortage} {it.uom}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 font-medium leading-relaxed flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-900">Mandatory Rule: </span>
              To place this purchase order, you must either <strong>reduce the quantity</strong> to match available stock or <strong>apply to receive new stock</strong> into your warehouse first.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            Adjust Quantity Manually
          </button>

          <button
            type="button"
            onClick={() => {
              onAutoReduce();
              onClose();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all cursor-pointer"
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Reduce to Available Stock</span>
          </button>
        </div>
      </div>
    </div>
  );
};
