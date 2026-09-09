import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Users, Shield } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get('/users')).data,
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
          <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
            <Users className="w-6 h-6 stroke-[2.5]" />
          </div>
          <span>User Accounts & Security Roles</span>
        </h1>
        <p className="text-sm font-semibold text-slate-600 mt-1">
          Role-based access control (RBAC) permissions & operator identity management
        </p>
      </div>

      <div className="bg-white border border-slate-300 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider font-black text-xs">
              <tr>
                <th className="py-4 px-5">Staff Name</th>
                <th className="py-4 px-5">Email Address</th>
                <th className="py-4 px-5">Contact Phone</th>
                <th className="py-4 px-5">Assigned Security Role</th>
                <th className="py-4 px-5">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">Loading user accounts...</td></tr>
              ) : data?.items?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-slate-600 font-bold">No users found.</td></tr>
              ) : (
                data?.items?.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-900 text-base">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-800 font-semibold text-sm">{u.email}</td>
                    <td className="py-4 px-5 text-slate-700 font-medium">{u.phone || '—'}</td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-xs font-black">
                        <Shield className="w-3.5 h-3.5" />
                        <span>{u.role?.name}</span>
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active
                      </span>
                    </td>
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
