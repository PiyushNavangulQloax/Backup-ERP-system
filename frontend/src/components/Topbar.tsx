import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { api } from '../services/api';
import {
  LogOut,
  Bell,
  Search,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Info,
  CheckCheck,
  X,
  ShoppingCart,
  Boxes,
  Package,
  ArrowRight,
} from 'lucide-react';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { searchQuery, setSearchQuery, clearSearch } = useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data,
    refetchInterval: 15000,
  });

  // Prefetch data for global search dropdown
  const { data: allPos } = useQuery({
    queryKey: ['quick-search-pos'],
    queryFn: async () => (await api.get('/purchase-orders')).data,
    enabled: isSearchFocused || !!searchQuery,
    staleTime: 30000,
  });

  const { data: allParts } = useQuery({
    queryKey: ['quick-search-parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
    enabled: isSearchFocused || !!searchQuery,
    staleTime: 30000,
  });

  const { data: allBoxes } = useQuery({
    queryKey: ['quick-search-boxes'],
    queryFn: async () => (await api.get('/packing/boxes')).data,
    enabled: isSearchFocused || !!searchQuery,
    staleTime: 30000,
  });

  // Calculate matching items
  const q = searchQuery.toLowerCase().trim();
  const matchingPos = q
    ? allPos?.filter((p: any) =>
        p.poNumber?.toLowerCase().includes(q) ||
        p.supplier?.name?.toLowerCase().includes(q) ||
        p.status?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingParts = q
    ? allParts?.filter((pt: any) =>
        pt.code?.toLowerCase().includes(q) ||
        pt.name?.toLowerCase().includes(q) ||
        pt.barcodeValue?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const matchingBoxes = q
    ? allBoxes?.filter((b: any) =>
        b.boxNumber?.toLowerCase().includes(q) ||
        b.barcode?.toLowerCase().includes(q)
      ).slice(0, 4)
    : [];

  const totalResults = (matchingPos?.length || 0) + (matchingParts?.length || 0) + (matchingBoxes?.length || 0);

  const markAllReadMutation = useMutation({
    mutationFn: async () => (await api.post('/notifications/read-all')).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markOneReadMutation = useMutation({
    mutationFn: async (id: string) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifData?.unreadCount || 0;
  const items = notifData?.items || [];

  return (
    <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between z-30 shadow-sm relative">
      {/* Search Input & Live Results Dropdown */}
      <div className="relative w-96" ref={searchRef}>
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchFocused(true);
          }}
          onFocus={() => setIsSearchFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setIsSearchFocused(false);
          }}
          placeholder="Search parts, purchase orders, boxes..."
          className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-9 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
        />
        {searchQuery && (
          <button
            onClick={() => {
              clearSearch();
              setIsSearchFocused(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-200 transition-colors"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Global Search Results Dropdown */}
        {isSearchFocused && q.length > 0 && (
          <div className="absolute left-0 top-full mt-2 w-full max-w-lg bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-black text-slate-700">
              <span className="uppercase tracking-wider">Global Search Results</span>
              <span className="text-[10px] font-mono text-slate-500 font-bold">{totalResults} matched</span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
              {totalResults === 0 ? (
                <div className="p-6 text-center text-slate-500 font-medium">
                  No records found matching &ldquo;<span className="font-bold text-slate-800">{searchQuery}</span>&rdquo;
                </div>
              ) : (
                <>
                  {/* Purchase Orders Matches */}
                  {matchingPos && matchingPos.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-blue-700 flex items-center gap-1.5">
                        <ShoppingCart className="w-3 h-3" />
                        <span>Purchase Orders ({matchingPos.length})</span>
                      </div>
                      {matchingPos.map((po: any) => (
                        <div
                          key={po.id}
                          onClick={() => {
                            navigate('/purchase-orders');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                          <div>
                            <span className="font-mono font-black text-blue-700 text-xs block">{po.poNumber}</span>
                            <span className="text-[11px] text-slate-600 font-bold">{po.supplier?.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              po.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              po.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {po.status}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Parts Matches */}
                  {matchingParts && matchingParts.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-purple-700 flex items-center gap-1.5">
                        <Boxes className="w-3 h-3" />
                        <span>Master Parts ({matchingParts.length})</span>
                      </div>
                      {matchingParts.map((pt: any) => (
                        <div
                          key={pt.id}
                          onClick={() => {
                            navigate('/masters');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-purple-50 cursor-pointer transition-colors group"
                        >
                          <div>
                            <span className="font-mono font-black text-slate-900 text-xs block">{pt.code} - {pt.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Barcode: {pt.barcodeValue || '—'}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-colors" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Boxes Matches */}
                  {matchingBoxes && matchingBoxes.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[10px] font-black uppercase text-amber-700 flex items-center gap-1.5">
                        <Package className="w-3 h-3" />
                        <span>Packaging Boxes ({matchingBoxes.length})</span>
                      </div>
                      {matchingBoxes.map((b: any) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            navigate('/packing');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-amber-50 cursor-pointer transition-colors group"
                        >
                          <div>
                            <span className="font-mono font-black text-amber-900 text-xs block">{b.boxNumber}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{b.barcode}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              b.status === 'SEALED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {b.status}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
              <span className="text-[11px] text-slate-500 font-medium">
                Filtering current page table in real time
              </span>
            </div>
          </div>
        )}
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

        {/* Notifications Button & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white border border-slate-300 rounded-2xl shadow-2xl py-3 z-50 text-slate-900">
              <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-black">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllReadMutation.mutate()}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {items.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-xs font-semibold">
                    No active notifications.
                  </div>
                ) : (
                  items.map((n: any) => (
                    <div
                      key={n.id}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors ${
                        !n.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {n.type === 'WARNING' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : n.type === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 font-medium leading-relaxed">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markOneReadMutation.mutate(n.id)}
                          title="Mark read"
                          className="text-slate-400 hover:text-blue-600 p-1 cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-blue-600 block" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* Logout */}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-rose-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50 border border-slate-300 hover:border-rose-300 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};

