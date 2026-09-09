import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { ShieldAlert } from 'lucide-react';

export const AuditPage: React.FC = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => (await api.get('/audit-logs')).data,
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>System Audit Trail</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Immutable tamper-proof record of user actions, status transitions & security events
        </p>
      </div>

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
              <tr>
                <th className="py-4 px-5">Timestamp</th>
                <th className="py-4 px-5">Operator / User</th>
                <th className="py-4 px-5">Action Performed</th>
                <th className="py-4 px-5">Module</th>
                <th className="py-4 px-5">Entity Target</th>
                <th className="py-4 px-5">IP Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">Loading audit logs...</td></tr>
              ) : logs?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-slate-600 font-bold">No audit entries recorded yet.</td></tr>
              ) : (
                logs?.map((l: any) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-mono text-slate-700 font-bold text-xs whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-900 text-sm">
                      {l.user ? `${l.user.firstName} ${l.user.lastName}` : 'System / Auto'}
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-3 py-1 rounded-md text-xs font-mono font-black bg-blue-50 text-blue-800 border border-blue-200">
                        {l.action}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-slate-800 font-bold">{l.module}</td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-semibold text-xs">{l.entityName}</td>
                    <td className="py-4 px-5 font-mono text-slate-500 font-semibold text-xs">{l.ipAddress || '127.0.0.1'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
