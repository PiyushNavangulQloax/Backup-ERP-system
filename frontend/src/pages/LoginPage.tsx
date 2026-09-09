import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, AlertCircle, ArrowRight, Layers } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@erp.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  const sampleUsers = [
    { role: 'Administrator', email: 'admin@erp.local' },
    { role: 'Purchase', email: 'purchase@erp.local' },
    { role: 'Stores', email: 'stores@erp.local' },
    { role: 'Production', email: 'production@erp.local' },
    { role: 'Packing', email: 'packing@erp.local' },
    { role: 'Dispatch', email: 'dispatch@erp.local' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Layers className="w-9 h-9 text-white stroke-[2.5]" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black tracking-tight text-slate-900">
          Manufacturing ERP 2.0
        </h2>
        <p className="mt-1.5 text-center text-sm font-bold text-slate-600 uppercase tracking-wider">
          Enterprise Materials & Barcode Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white border border-slate-300 py-8 px-6 shadow-xl rounded-3xl sm:px-10">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs font-bold">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                Corporate Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md transition-all disabled:opacity-50"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick role switcher */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider mb-3 text-center">
              Quick Role Switcher (Pass: Admin@12345)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {sampleUsers.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => setEmail(u.email)}
                  className="text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all border border-slate-300"
                >
                  <span className="font-black text-xs text-slate-900 block">{u.role}</span>
                  <span className="text-[10px] text-slate-500 font-mono truncate block mt-0.5">{u.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
