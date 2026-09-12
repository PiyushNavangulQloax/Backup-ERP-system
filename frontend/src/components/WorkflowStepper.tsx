import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Database,
  Users,
  FileCheck2,
  ShoppingCart,
  Cpu,
  Package,
  Receipt,
  Truck,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';

export const WORKFLOW_STAGES = [
  {
    id: 1,
    key: 'masters',
    title: 'Master Data',
    sub: 'Setup Base Entities',
    path: '/masters',
    icon: Database,
  },
  {
    id: 2,
    key: 'customer',
    title: 'Customer',
    sub: 'Client Profiles',
    path: '/masters?tab=customers',
    icon: Users,
  },
  {
    id: 3,
    key: 'requirements',
    title: 'Production Requirements',
    sub: 'Plans & BOM',
    path: '/production?tab=plans',
    icon: FileCheck2,
  },
  {
    id: 4,
    key: 'procurement',
    title: 'Material Procurement',
    sub: 'PO, Inwarding & GRN',
    path: '/purchase-orders',
    icon: ShoppingCart,
  },
  {
    id: 5,
    key: 'production',
    title: 'Production',
    sub: 'Job Cards & Execution',
    path: '/production',
    icon: Cpu,
  },
  {
    id: 6,
    key: 'packing',
    title: 'Packing & Barcode',
    sub: 'Code 128 / QR Boxes',
    path: '/packing',
    icon: Package,
  },
  {
    id: 7,
    key: 'dispatch',
    title: 'Invoice & Dispatch',
    sub: 'Tax Billing & Loading Bay',
    path: '/invoices',
    icon: Receipt,
  },
  {
    id: 8,
    key: 'tracking',
    title: 'Billing & Tracking',
    sub: 'Gate Pass & Audit Logs',
    path: '/dispatch',
    icon: Truck,
  },
  {
    id: 9,
    key: 'reports',
    title: 'Report',
    sub: 'Ledger & Analytics',
    path: '/reports',
    icon: FileSpreadsheet,
  },
];

interface WorkflowStepperProps {
  activeStageKey: string;
  /** When set (e.g. after a barcode scan), this stage is highlighted in amber to show where the scanned item currently is */
  highlightStageKey?: string;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ activeStageKey, highlightStageKey }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Only Administrators can see the workflow stepper
  if (user?.role !== 'Administrator') return null;

  const activeIndex = WORKFLOW_STAGES.findIndex((s) => s.key === activeStageKey);
  const highlightIndex = highlightStageKey
    ? WORKFLOW_STAGES.findIndex((s) => s.key === highlightStageKey)
    : -1;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            End-to-End Business Flow Progress
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isCompleted = activeIndex > idx;
          const isActive = activeIndex === idx;
          const isHighlighted = highlightIndex === idx;

          return (
            <React.Fragment key={stage.id}>
              <div
                onClick={() => navigate(stage.path)}
                className={`flex-1 min-w-[130px] p-2.5 rounded-xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                  isHighlighted
                    ? 'bg-amber-50 text-amber-950 border-amber-400 shadow-md ring-2 ring-amber-300 scale-[1.02]'
                    : isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300 scale-[1.02]'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-black ${
                      isHighlighted
                        ? 'bg-amber-500 text-white'
                        : isActive
                        ? 'bg-white text-blue-700'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {stage.id}
                  </span>
                  <Icon
                    className={`w-4 h-4 ${
                      isHighlighted
                        ? 'text-amber-600'
                        : isActive
                        ? 'text-white'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-400'
                    }`}
                  />
                </div>

                <div className="mt-2">
                  <p
                    className={`text-xs font-black leading-tight line-clamp-1 ${
                      isHighlighted
                        ? 'text-amber-900'
                        : isActive
                        ? 'text-white'
                        : isCompleted
                        ? 'text-emerald-950'
                        : 'text-slate-800'
                    }`}
                  >
                    {stage.title}
                  </p>
                  <p
                    className={`text-[10px] font-semibold mt-0.5 line-clamp-1 ${
                      isHighlighted
                        ? 'text-amber-700 font-black'
                        : isActive
                        ? 'text-blue-100'
                        : isCompleted
                        ? 'text-emerald-700'
                        : 'text-slate-500'
                    }`}
                  >
                    {isHighlighted ? '📦 Item is here' : stage.sub}
                  </p>
                </div>
              </div>

              {idx < WORKFLOW_STAGES.length - 1 && (
                <div className="text-slate-300 flex-shrink-0">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
