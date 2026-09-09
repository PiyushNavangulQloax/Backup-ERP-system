import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import {
  Database,
  Users,
  Building,
  Boxes,
  Warehouse,
} from 'lucide-react';

export const MastersPage: React.FC = () => {
  const [tab, setTab] = useState<'parts' | 'customers' | 'suppliers' | 'stores'>('parts');

  const { data: parts, isLoading: isPartsLoading } = useQuery({
    queryKey: ['parts'],
    queryFn: async () => (await api.get('/masters/parts')).data,
  });

  const { data: customers, isLoading: isCustomersLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/masters/customers')).data,
    enabled: tab === 'customers',
  });

  const { data: suppliers, isLoading: isSuppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => (await api.get('/masters/suppliers')).data,
    enabled: tab === 'suppliers',
  });

  const { data: stores, isLoading: isStoresLoading } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => (await api.get('/masters/stores')).data,
    enabled: tab === 'stores',
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <Database className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>Enterprise Master Data</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Configurations for parts, customers, suppliers & warehouse rack structures
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3">
        {[
          { id: 'parts', label: 'Parts & Materials', icon: Boxes },
          { id: 'customers', label: 'Customers', icon: Users },
          { id: 'suppliers', label: 'Suppliers & Vendors', icon: Building },
          { id: 'stores', label: 'Stores & Racks', icon: Warehouse },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-300'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2.5]" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Table Container */}
      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          {tab === 'parts' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Part Code</th>
                  <th className="py-4 px-5">Part Name</th>
                  <th className="py-4 px-5">Classification</th>
                  <th className="py-4 px-5">Unit</th>
                  <th className="py-4 px-5">Std Cost</th>
                  <th className="py-4 px-5">Barcode Identifier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isPartsLoading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">Loading parts...</td></tr>
                ) : parts?.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{p.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{p.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                        {p.partType}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{p.unit?.symbol}</td>
                    <td className="py-4 px-5 font-mono font-black text-slate-900">${p.standardCost?.toFixed(2)}</td>
                    <td className="py-4 px-5 font-mono text-xs font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 inline-block mt-3">
                      {p.barcodeValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'customers' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Customer Code</th>
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">Tax / GSTIN</th>
                  <th className="py-4 px-5">Contact Details</th>
                  <th className="py-4 px-5">Billing Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isCustomersLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading customers...</td></tr>
                ) : customers?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{c.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{c.name}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{c.gstin || '—'}</td>
                    <td className="py-4 px-5 text-slate-800 font-semibold">{c.email} &bull; {c.phone}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{c.billingAddress}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'suppliers' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Supplier Code</th>
                  <th className="py-4 px-5">Supplier Name</th>
                  <th className="py-4 px-5">Tax / GSTIN</th>
                  <th className="py-4 px-5">Payment Terms</th>
                  <th className="py-4 px-5">Contact Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isSuppliersLoading ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading suppliers...</td></tr>
                ) : suppliers?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{s.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{s.name}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">{s.gstin || '—'}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                        {s.paymentTerms}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-800 font-semibold">{s.email} &bull; {s.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'stores' && (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
                <tr>
                  <th className="py-4 px-5">Store Code</th>
                  <th className="py-4 px-5">Store Name</th>
                  <th className="py-4 px-5">Store Category</th>
                  <th className="py-4 px-5">Configured Racks / Bins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {isStoresLoading ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-600 font-bold">Loading stores...</td></tr>
                ) : stores?.map((st: any) => (
                  <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono font-black text-blue-700 text-base">{st.code}</td>
                    <td className="py-4 px-5 text-slate-900 font-bold">{st.name}</td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-300">
                        {st.type}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-bold">
                      {st.locations?.map((l: any) => l.code).join(', ') || 'Floor level'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
