import React from 'react';
import { FileSpreadsheet, Download } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reports = [
    {
      title: 'Current Inventory & Valuation Report',
      description: 'Full real-time stock position across warehouse racks, bins, lot numbers and standard valuation totals.',
      format: 'Excel (.xlsx)',
      endpoint: '/api/v1/reports/stock/export-excel',
      icon: FileSpreadsheet,
    },
    {
      title: 'Purchase Order History & Status Report',
      description: 'Complete procurement log of purchase orders, vendor item rates, received quantities and fulfillment progress.',
      format: 'Excel (.xlsx)',
      endpoint: '/api/v1/reports/po/export-excel',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>Operational Reports & Data Exports</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          High-fidelity Excel spreadsheets & automated business data exports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.title}
              className="p-6 rounded-2xl bg-white border border-slate-300 shadow-md flex flex-col justify-between space-y-6 hover:shadow-lg hover:border-blue-400 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 text-blue-700">
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="px-3 py-1 rounded-md text-xs font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {r.format}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">{r.title}</h3>
                  <p className="text-sm font-semibold text-slate-600 mt-2 leading-relaxed">{r.description}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <a
                  href={r.endpoint}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md hover:shadow-lg transition-all w-full"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>Download Spreadsheet</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
