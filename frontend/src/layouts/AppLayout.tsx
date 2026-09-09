import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
