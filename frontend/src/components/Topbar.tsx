import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Bell, Search, Shield, CheckCircle2 } from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between z-10 shadow-sm">
      {/* Search Input */}
      <div className="relative w-96">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search parts, purchase orders, boxes..."
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-4 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all"
        />
      </div>

      {/* Badges & Actions */}
      <div className="flex items-center gap-4">
        {/* System Status badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>SYSTEM ONLINE</span>
        </div>

        {/* Role badge */}
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-800 text-xs px-3 py-1.5 rounded-lg border border-blue-200 font-extrabold shadow-sm">
          <Shield className="w-4 h-4 text-blue-600" />
          <span>{user?.role}</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-slate-300 hover:border-rose-300"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
