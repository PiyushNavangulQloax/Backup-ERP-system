import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
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
import { SalesOrdersPage } from './pages/SalesOrdersPage';
import { QualityPage } from './pages/QualityPage';
import { DispatchPage } from './pages/DispatchPage';
import { MastersPage } from './pages/MastersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditPage } from './pages/AuditPage';
import { UsersPage } from './pages/UsersPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ProtectedRoute } from './components/ProtectedRoute';

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
        <SearchProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute requiredPermission="po.view">
                    <PurchaseOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales-orders"
                element={
                  <ProtectedRoute requiredPermission="billing.view">
                    <SalesOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/grns"
                element={
                  <ProtectedRoute requiredPermission="grn.view">
                    <GrnPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quality"
                element={
                  <ProtectedRoute requiredPermission="quality.view">
                    <QualityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute requiredPermission="inventory.view">
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/production"
                element={
                  <ProtectedRoute requiredPermission="production.view">
                    <ProductionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/packing"
                element={
                  <ProtectedRoute requiredPermission="packing.view">
                    <PackingPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/barcodes"
                element={
                  <ProtectedRoute requiredPermission="barcode.scan">
                    <BarcodePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute requiredPermission="billing.view">
                    <InvoicesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dispatch"
                element={
                  <ProtectedRoute requiredPermission="dispatch.view">
                    <DispatchPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/documents"
                element={
                  <ProtectedRoute requiredPermission="documents.view">
                    <DocumentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/masters"
                element={
                  <ProtectedRoute requiredPermission="masters.view">
                    <MastersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute requiredPermission="reports.view">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit-logs"
                element={
                  <ProtectedRoute requiredPermission="audit.view">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute requiredPermission="users.view">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        </SearchProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
