import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Download, FileText, CheckCircle2, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { api, downloadFile } from '../services/api';
import { useSearch } from '../context/SearchContext';
import { WorkflowStepper } from '../components/WorkflowStepper';

export const ReportsPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const { searchQuery, setSearchQuery } = useSearch();

  const { data: dispatches } = useQuery({
    queryKey: ['dispatches-report'],
    queryFn: async () => (await api.get('/dispatches')).data,
  });

  // Filter dispatches by search query
  const filteredDispatches = dispatches?.filter((d: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      d.dispatchNumber?.toLowerCase().includes(q) ||
      d.customer?.name?.toLowerCase().includes(q) ||
      d.invoice?.invoiceNumber?.toLowerCase().includes(q) ||
      d.vehicleNumber?.toLowerCase().includes(q) ||
      d.status?.toLowerCase().includes(q)
    );
  });

  const handleDownload = async (endpoint: string, filename: string) => {
    try {
      setDownloading(filename);
      await downloadFile(endpoint, filename);
    } catch (err: any) {
      alert(err.message || 'Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  const excelReports = [
    {
      title: 'Current Inventory & Valuation Report',
      description: 'Full real-time stock position across warehouse racks, bins, lot numbers and standard valuation totals.',
      format: 'Excel (.xlsx)',
      endpoint: '/reports/stock/export-excel',
      filename: 'Inventory_Stock_Report.xlsx',
      icon: FileSpreadsheet,
    },
    {
      title: 'Purchase Order History & Status Report',
      description: 'Complete procurement log of purchase orders, vendor item rates, received quantities and fulfillment progress.',
      format: 'Excel (.xlsx)',
      endpoint: '/reports/po/export-excel',
      filename: 'Purchase_Orders_Report.xlsx',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <div className="space-y-8">
      <WorkflowStepper activeStageKey="reports" />

      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <FileSpreadsheet className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>Operational Reports & Data Exports</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          High-fidelity Excel spreadsheets & automated PDF gate-pass business exports
        </p>
      </div>

      {/* Search Input */}
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dispatch #, customer, vehicle..."
          className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-sm transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Excel Reports Grid */}
      <div>
        <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
          <span>Excel Operational Spreadsheets</span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">2 Reports</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {excelReports.map((r) => {
            const Icon = r.icon;
            const isBusy = downloading === r.filename;
            return (
              <div
                key={r.title}
                className="p-6 rounded-2xl bg-white border border-slate-300 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md hover:border-blue-400 transition-all"
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
                  <button
                    disabled={isBusy}
                    onClick={() => handleDownload(r.endpoint, r.filename)}
                    className="inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-black text-sm shadow-sm hover:shadow transition-all w-full"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Excel...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>Download Spreadsheet</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PDF Challans & Gate Passes */}
      <div className="bg-white border border-slate-300 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>Dispatch Challans & Gate Pass PDF Exports</span>
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Printable official dispatch manifest with barcode verification status & security authorization
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase font-black text-slate-600 bg-slate-50">
                <th className="py-3 px-4">Dispatch #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-semibold">
              {!dispatches || dispatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No dispatches found to export.
                  </td>
                </tr>
              ) : (
                dispatches.map((d: any) => {
                  const pdfName = `GatePass_${d.dispatchNumber}.pdf`;
                  const isBusy = downloading === pdfName;
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-black text-blue-700">{d.dispatchNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{d.customer?.name || 'Customer'}</td>
                      <td className="py-3 px-4 font-mono text-slate-700">{d.invoice?.invoiceNumber}</td>
                      <td className="py-3 px-4 text-slate-700 font-mono">{d.vehicleNumber || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            d.status === 'DISPATCHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          disabled={isBusy}
                          onClick={() => handleDownload(`/reports/dispatch/${d.id}/pdf`, pdfName)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-xs transition-colors"
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          <span>Export PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

