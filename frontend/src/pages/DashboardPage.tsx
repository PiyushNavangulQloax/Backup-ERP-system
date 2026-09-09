import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  ShoppingCart,
  PackageCheck,
  Cpu,
  Package,
  Receipt,
  Truck,
  Barcode,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res: any = await api.get('/dashboard/metrics');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const kpis = data?.kpis;

  const statCards = [
    { title: 'Pending PO Approvals', value: kpis?.pendingPOs ?? 0, icon: ShoppingCart, link: '/purchase-orders?status=SUBMITTED', tag: 'Purchase', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
    { title: 'Inwarding / Draft GRNs', value: kpis?.pendingGRNs ?? 0, icon: PackageCheck, link: '/grns?status=DRAFT', tag: 'Stores', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
    { title: 'Active Job Cards', value: kpis?.openJobCards ?? 0, icon: Cpu, link: '/production', tag: 'Shopfloor', badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
    { title: 'Sealed Ready Boxes', value: kpis?.sealedBoxes ?? 0, icon: Package, link: '/packing', tag: 'Packing', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
    { title: 'Pending Tax Invoices', value: kpis?.pendingInvoices ?? 0, icon: Receipt, link: '/invoices', tag: 'Billing', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300' },
    { title: 'Shipments in Prep', value: kpis?.pendingDispatches ?? 0, icon: Truck, link: '/dispatch', tag: 'Logistics', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { title: 'Barcode Scans (24h)', value: kpis?.recentScans24h ?? 0, icon: Barcode, link: '/barcodes', tag: 'Traceability', badgeColor: 'bg-sky-100 text-sky-900 border-sky-300' },
    { title: 'Low Stock Warnings', value: kpis?.lowStockAlerts ?? 0, icon: AlertTriangle, link: '/inventory', tag: 'Critical Alert', badgeColor: 'bg-rose-100 text-rose-900 border-rose-300' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Factory Operations Console</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300 uppercase tracking-wider">
              Live Monitoring
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-600 mt-1">Real-time inventory ledger balances, active job cards & shipment milestones</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/barcodes"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all"
          >
            <Barcode className="w-5 h-5 stroke-[2.5]" />
            <span>Open Barcode Scanner</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              to={card.link}
              className="group p-5 rounded-2xl bg-white border border-slate-300 hover:border-blue-500 hover:shadow-lg transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full border ${card.badgeColor}`}>
                  {card.tag}
                </span>
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 group-hover:text-blue-600 group-hover:bg-blue-50 transition-all">
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-1">{card.title}</p>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                    {isLoading ? '—' : card.value}
                  </span>
                  <span className="text-xs font-black text-blue-600 group-hover:underline flex items-center gap-0.5">
                    Open <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Ledger Movements */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <span>Live Stock Ledger Stream</span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Automated debit / credit movements from GRN, Jobs & Dispatch</p>
            </div>
            <Link to="/inventory" className="text-xs font-black text-blue-600 hover:underline">
              Full Ledger &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {data?.recentMovements?.map((m: any) => {
              const isPositive = m.movementType.includes('ADD') || m.movementType.includes('RECEIPT');
              return (
                <div key={m.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all">
                  <div>
                    <p className="font-black text-sm text-slate-900">{m.part?.name}</p>
                    <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-blue-700">{m.store?.name}</span>
                      <span>&bull;</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] font-mono text-slate-800 font-bold">{m.movementType}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-mono text-base font-black ${isPositive ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {isPositive ? '+' : '-'}{m.quantity}
                    </span>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!data?.recentMovements || data.recentMovements.length === 0) && (
              <div className="py-12 text-center text-slate-500 text-sm font-semibold">No recorded movements today.</div>
            )}
          </div>
        </div>

        {/* Audit Activity */}
        <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Security & State Audit Feed</span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Immutable record of approvals, seals, and user logins</p>
            </div>
            <Link to="/audit-logs" className="text-xs font-black text-blue-600 hover:underline">
              Full Trail &rarr;
            </Link>
          </div>

          <div className="space-y-3 flex-1">
            {data?.recentAudits?.map((a: any) => (
              <div key={a.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200 uppercase">
                      {a.action}
                    </span>
                    <span className="font-black text-sm text-slate-900">{a.module} - {a.entityName}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    By {a.user ? `${a.user.firstName} ${a.user.lastName}` : 'System Agent'}
                  </p>
                </div>
                <div className="text-right text-xs font-mono font-bold text-slate-600">
                  {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {(!data?.recentAudits || data.recentAudits.length === 0) && (
              <div className="py-12 text-center text-slate-500 text-sm font-semibold">No recent audit logs.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
