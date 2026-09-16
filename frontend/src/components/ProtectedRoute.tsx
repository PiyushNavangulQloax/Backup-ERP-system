import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  requiredPermission?: string;
  children: React.ReactElement;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredPermission,
  children,
}) => {
  const { user, hasPermission } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm font-semibold text-slate-500 max-w-md mb-6">
          Your role (<span className="text-blue-600 font-bold">{user.role}</span>) does not possess the{' '}
          <code className="px-2 py-0.5 rounded bg-slate-100 font-mono text-xs font-bold text-slate-700">
            {requiredPermission}
          </code>{' '}
          permission required to view this module.
        </p>
        <a
          href="/dashboard"
          className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs transition-colors shadow-md"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return children;
};
