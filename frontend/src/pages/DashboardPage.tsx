import React, { useState } from 'react';
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
  PieChart as PieChartIcon,
  DollarSign,
  Users,
  Boxes,
  CheckCircle2,
  Clock,
  ChevronRight,
  GitFork,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { WorkflowStepper } from '../components/WorkflowStepper';

export const DashboardPage: React.FC = () => {
  const [revenueTab, setRevenueTab] = useState<'customer' | 'product' | 'status'>('customer');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res: any = await api.get('/dashboard/metrics');
      return res.data;
    },
    refetchInterval: 15000,
  });

  const kpis = data?.kpis;
  const revenue = data?.revenue;

  const statCards = [
    { title: 'Pending PO Approvals', value: kpis?.pendingPOs ?? 0, icon: ShoppingCart, link: '/purchase-orders?status=SUBMITTED', tag: 'Purchase', badgeColor: 'bg-amber-100 text-amber-900 border-amber-300' },
    { title: 'Inwarding / Draft GRNs', value: kpis?.pendingGRNs ?? 0, icon: PackageCheck, link: '/grns?status=DRAFT', tag: 'Stores', badgeColor: 'bg-blue-100 text-blue-900 border-blue-300' },
    { title: 'Active Job Cards', value: kpis?.openJobCards ?? 0, icon: Cpu, link: '/production', tag: 'Shopfloor', badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300' },
    { title: 'Sealed Ready Boxes', value: kpis?.sealedBoxes ?? 0, icon: Package, link: '/packing', tag: 'Packing', badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
    { title: 'Pending Tax Invoices', value: kpis?.pendingInvoices ?? 0, icon: Receipt, link: '/invoices', tag: 'Billing', badgeColor: 'bg-purple-100 text-purple-900 border-purple-300' },
    { title: 'Shipments in Prep', value: kpis?.pendingDispatches ?? 0, icon: Truck, link: '/dispatch', tag: 'Logistics', badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
    { title: 'Barcode Scans (24h)', value: kpis?.recentScans24h ?? 0, icon: Barcode, link: '/barcodes', tag: 'Traceability', badgeColor: 'bg-sky-100 text-sky-900 border-sky-300' },
    { title: 'Pending QA Inspections', value: kpis?.pendingInspections ?? 0, icon: ShieldCheck, link: '/quality?status=PENDING', tag: 'Quality QA', badgeColor: 'bg-teal-100 text-teal-900 border-teal-300' },
    { title: 'Low Stock Warnings', value: kpis?.lowStockAlerts ?? 0, icon: AlertTriangle, link: '/inventory', tag: 'Critical Alert', badgeColor: 'bg-rose-100 text-rose-900 border-rose-300' },
  ];

  // Prepare current revenue slice items based on tab
  const getActiveRevenueItems = () => {
    if (!revenue) return [];
    if (revenueTab === 'customer') {
      return (revenue.byCustomer || []).map((c: any) => ({
        id: c.customerId,
        title: c.customerName,
        subtitle: `Code: ${c.customerCode}`,
        amount: c.revenue,
        percentage: c.percentage,
        color: c.color,
        metricLabel: `${c.invoiceCount} Invoices • ${c.itemsQuantity} Units`,
        tag: c.customerCode,
      }));
    } else if (revenueTab === 'product') {
      return (revenue.byProduct || []).map((p: any) => ({
        id: p.partId,
        title: p.partName,
        subtitle: `Part Code: ${p.partCode}`,
        amount: p.revenue,
        percentage: p.percentage,
        color: p.color,
        metricLabel: `${p.totalQty} Units Billed`,
        tag: p.partCode,
      }));
    } else {
      return (revenue.byStatus || []).map((s: any) => ({
        id: s.status,
        title: `Invoices (${s.status})`,
        subtitle: `${s.count} Invoices in ${s.status.toLowerCase()} state`,
        amount: s.totalAmount,
        percentage: s.percentage,
        color: s.color,
        metricLabel: `${s.count} Invoices`,
        tag: s.status,
      }));
    }
  };

  const activeSlices = getActiveRevenueItems();
  const totalRevenueAmount = revenue?.summary?.totalRevenue || 0;

  // SVG Donut Path Builder
  let cumulativeAngle = 0;
  const sliceArcs = activeSlices.map((slice: any, index: number) => {
    const sliceAngle = (slice.percentage / 100) * 360;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + sliceAngle;
    cumulativeAngle = endAngle;

    const isHovered = hoveredIndex === index;
    const innerRadius = isHovered ? 74 : 78;
    const outerRadius = isHovered ? 126 : 120;

    const angleDiff = Math.min(sliceAngle, 359.99);
    const radStart = ((startAngle - 90) * Math.PI) / 180;
    const radEnd = (((startAngle + angleDiff) - 90) * Math.PI) / 180;

    const x1 = 160 + outerRadius * Math.cos(radStart);
    const y1 = 160 + outerRadius * Math.sin(radStart);
    const x2 = 160 + outerRadius * Math.cos(radEnd);
    const y2 = 160 + outerRadius * Math.sin(radEnd);

    const x3 = 160 + innerRadius * Math.cos(radEnd);
    const y3 = 160 + innerRadius * Math.sin(radEnd);
    const x4 = 160 + innerRadius * Math.cos(radStart);
    const y4 = 160 + innerRadius * Math.sin(radStart);

    const largeArc = angleDiff > 180 ? 1 : 0;
    const pathData = [
      `M ${x1} ${y1}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...slice,
      pathData,
      index,
    };
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

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
          <p className="text-sm font-semibold text-slate-600 mt-1">Real-time revenue metrics, inventory balances, job cards & shipment milestones</p>
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

      {/* 8-Stage Business Flow Stepper Banner */}
      <WorkflowStepper activeStageKey="dashboard" />

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

      {/* REVENUE BREAKDOWN & PIE CHART SECTION */}
      <div className="bg-white border border-slate-300 rounded-2xl p-6 shadow-sm">
        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <PieChartIcon className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Revenue Breakdown & Distribution</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                PostgreSQL Live Sync
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Visualizing commercial revenue streams, client contributions, item volumes, and settlement status
            </p>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-slate-100 p-1.5 rounded-xl border border-slate-200 self-start md:self-auto">
            <button
              onClick={() => { setRevenueTab('customer'); setHoveredIndex(null); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                revenueTab === 'customer'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>By Customer</span>
            </button>

            <button
              onClick={() => { setRevenueTab('product'); setHoveredIndex(null); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                revenueTab === 'product'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>By Product</span>
            </button>

            <button
              onClick={() => { setRevenueTab('status'); setHoveredIndex(null); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black transition-all ${
                revenueTab === 'status'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>By Status</span>
            </button>
          </div>
        </div>

        {/* Revenue Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-xl font-black text-slate-900 font-mono mt-1">
              {isLoading ? '—' : formatCurrency(revenue?.summary?.totalRevenue)}
            </p>
            <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {revenue?.summary?.totalInvoicesCount || 0} Invoices generated
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Realized (Paid)
            </p>
            <p className="text-xl font-black text-emerald-900 font-mono mt-1">
              {isLoading ? '—' : formatCurrency(revenue?.summary?.paidRevenue)}
            </p>
            <p className="text-[11px] font-semibold text-emerald-700 mt-0.5">
              {totalRevenueAmount > 0 ? Math.round(((revenue?.summary?.paidRevenue || 0) / totalRevenueAmount) * 100) : 0}% collected
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Awaiting Payment
            </p>
            <p className="text-xl font-black text-amber-900 font-mono mt-1">
              {isLoading ? '—' : formatCurrency(revenue?.summary?.pendingRevenue)}
            </p>
            <p className="text-[11px] font-semibold text-amber-700 mt-0.5">
              Approved & Draft billings
            </p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
            <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1">
              <Package className="w-3.5 h-3.5" /> Total Items Billed
            </p>
            <p className="text-xl font-black text-blue-900 font-mono mt-1">
              {isLoading ? '—' : (revenue?.summary?.totalItemsBilled || 0).toLocaleString()}
            </p>
            <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
              Units shipped & billed
            </p>
          </div>
        </div>

        {/* Chart & Explanatory Breakdown Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Interactive SVG Pie/Donut Chart */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50/70 border border-slate-200 rounded-2xl relative">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72">
              <svg viewBox="0 0 320 320" className="w-full h-full transform transition-all duration-300">
                {/* Background Ring */}
                <circle cx="160" cy="160" r="100" fill="none" stroke="#e2e8f0" strokeWidth="40" />

                {/* Slices */}
                {sliceArcs.map((slice: any) => (
                  <path
                    key={slice.id || slice.index}
                    d={slice.pathData}
                    fill={slice.color}
                    className="transition-all duration-300 cursor-pointer drop-shadow-sm hover:opacity-95"
                    style={{
                      transformOrigin: '160px 160px',
                      filter: hoveredIndex === slice.index ? 'brightness(1.1) drop-shadow(0 4px 12px rgba(0,0,0,0.15))' : undefined,
                    }}
                    onMouseEnter={() => setHoveredIndex(slice.index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                ))}

                {/* Center Donut Hole Content */}
                <circle cx="160" cy="160" r="68" fill="#ffffff" />
              </svg>

              {/* Center Info Text Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {hoveredIndex !== null && activeSlices[hoveredIndex] ? (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">
                      {activeSlices[hoveredIndex].title}
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatCurrency(activeSlices[hoveredIndex].amount)}
                    </span>
                    <span className="text-xs font-black text-blue-600 mt-0.5">
                      {activeSlices[hoveredIndex].percentage}% Share
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total Revenue
                    </span>
                    <span className="text-xl font-black text-slate-900 font-mono mt-0.5">
                      {formatCurrency(totalRevenueAmount)}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {activeSlices.length} Contributors
                    </span>
                  </>
                )}
              </div>
            </div>

            <p className="text-[11px] font-semibold text-slate-500 mt-3 text-center">
              Hover over slices or items to inspect specific segment contribution
            </p>
          </div>

          {/* Detailed Explanatory Cards ("Explain how many things are there") */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                {revenueTab === 'customer' && 'Client Breakdown & Contribution'}
                {revenueTab === 'product' && 'Product Lines & Units Billed'}
                {revenueTab === 'status' && 'Settlement Lifecycle Breakdown'}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Sorted by Revenue Volume
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {activeSlices.map((item: any, idx: number) => {
                const isHovered = hoveredIndex === idx;
                return (
                  <div
                    key={item.id || idx}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isHovered
                        ? 'bg-blue-50/80 border-blue-400 shadow-md translate-x-1'
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded-md mt-0.5 flex-shrink-0 shadow-xs"
                          style={{ backgroundColor: item.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{item.title}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                              {item.tag}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            {item.subtitle} • <span className="font-bold text-slate-700">{item.metricLabel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="font-mono text-base font-black text-slate-900">
                          {formatCurrency(item.amount)}
                        </div>
                        <span className="text-xs font-black text-blue-600 font-mono">
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress bar visualizing percentage share */}
                    <div className="mt-2.5 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {activeSlices.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-sm font-semibold">
                  No revenue records found in the database.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Grids for Live Ledger & Audit Activity */}
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
