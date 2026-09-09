import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { GrnPage } from './pages/GrnPage';
import { InventoryPage } from './pages/InventoryPage';
import { ProductionPage } from './pages/ProductionPage';
import { PackingPage } from './pages/PackingPage';
import { BarcodePage } from './pages/BarcodePage';
import { InvoicesPage } from './pages/InvoicesPage';
import { DispatchPage } from './pages/DispatchPage';
import { MastersPage } from './pages/MastersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { UsersPage } from './pages/UsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5000,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/grns" element={<GrnPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/production" element={<ProductionPage />} />
              <Route path="/packing" element={<PackingPage />} />
              <Route path="/barcodes" element={<BarcodePage />} />
              <Route path="/invoices" element={<InvoicesPage />} />
              <Route path="/dispatch" element={<DispatchPage />} />
              <Route path="/masters" element={<MastersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/audit-logs" element={<AuditPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
