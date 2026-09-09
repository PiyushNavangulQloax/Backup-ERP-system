import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  PackageCheck,
  Boxes,
  Cpu,
  Package,
  Barcode,
  Receipt,
  Truck,
  FileSpreadsheet,
  ShieldAlert,
  Database,
  Users,
  Layers,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { hasPermission, user } = useAuth();

  const navGroups = [
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, show: true },
        { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, show: hasPermission('po.view') },
        { name: 'Inwarding (GRN)', path: '/grns', icon: PackageCheck, show: hasPermission('grn.view') },
        { name: 'Inventory & Ledger', path: '/inventory', icon: Boxes, show: hasPermission('inventory.view') },
        { name: 'Production & BOM', path: '/production', icon: Cpu, show: hasPermission('production.view') },
        { name: 'Packing & Boxes', path: '/packing', icon: Package, show: hasPermission('packing.view') },
        { name: 'Invoices & Billing', path: '/invoices', icon: Receipt, show: hasPermission('billing.view') },
        { name: 'Dispatch & Gate-Out', path: '/dispatch', icon: Truck, show: hasPermission('dispatch.view') },
      ],
    },
    {
      title: 'BARCODE SYSTEM',
      items: [
        { name: 'Barcode Scanner', path: '/barcodes', icon: Barcode, show: hasPermission('barcode.scan') },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        { name: 'Master Data', path: '/masters', icon: Database, show: hasPermission('masters.view') },
        { name: 'Reports & Exports', path: '/reports', icon: FileSpreadsheet, show: hasPermission('reports.view') },
        { name: 'Users & Roles', path: '/users', icon: Users, show: user?.role === 'Administrator' },
        { name: 'Audit Trail', path: '/audit-logs', icon: ShieldAlert, show: user?.role === 'Administrator' },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 select-none shadow-xl border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-5 border-b border-slate-800 gap-3 bg-slate-950">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white shadow-md">
          <Layers className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base tracking-tight text-white">APEX ERP</span>
            <span className="font-mono text-xs font-black px-1.5 py-0.5 rounded bg-blue-500 text-white">
              2.0
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Manufacturing Suite</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-extrabold tracking-wider text-slate-400 uppercase px-3 mb-2.5">
              {group.title}
            </p>
            <nav className="space-y-1">
              {group.items
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-md font-extrabold'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 flex-shrink-0 stroke-[2.2]" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-sm font-extrabold text-white truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs font-bold text-blue-400 truncate">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
