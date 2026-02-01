import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, PermissionGuard, ProtectedRoute, useAuth } from './contexts/AuthContext';
import { PublicConfigProvider, usePublicConfig } from './contexts/PublicConfigContext';
import { SeoSync } from './components/SeoSync';

import { ReplicaHomePage } from './pages/ReplicaHome/ReplicaHomePage';

const PageLoading = () => (
  <div className="w-full py-24 flex items-center justify-center text-sm text-gray-400">页面加载中...</div>
);

// Route-level code splitting (reduce initial bundle size)
const LazyLandingPage = React.lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LazyLoginPage = React.lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const LazyPricingPage = React.lazy(() => import('./pages/PricingPage').then((m) => ({ default: m.PricingPage })));
const LazyApiDocPage = React.lazy(() => import('./pages/ApiDocPage').then((m) => ({ default: m.ApiDocPage })));
const LazyBrandMonitoringPage = React.lazy(() =>
  import('./pages/BrandMonitoringPage').then((m) => ({ default: m.BrandMonitoringPage }))
);
const LazyContentOptimizationPage = React.lazy(() =>
  import('./pages/ContentOptimizationPage').then((m) => ({ default: m.ContentOptimizationPage }))
);
const LazyAdminPage = React.lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const LazyAgentWorkflowPage = React.lazy(() =>
  import('./pages/AgentWorkflowPage').then((m) => ({ default: m.AgentWorkflowPage }))
);
const LazyResultsPage = React.lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const LazyProfilePage = React.lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const LazyMaintenancePage = React.lazy(() =>
  import('./pages/MaintenancePage').then((m) => ({ default: m.MaintenancePage }))
);
const LazyNotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const MaintenanceGuard = () => {
  const { config, loading } = usePublicConfig();
  const { user } = useAuth();

  if (loading) return <PageLoading />;
  if (config.maintenanceMode && user?.role !== 'ADMIN') {
    return <Navigate to="/maintenance" replace />;
  }
  return <Outlet />;
};

const AppContent = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPageWrapper />} />
            <Route
              path="/maintenance"
              element={
                <Suspense fallback={<PageLoading />}>
                  <LazyMaintenancePage />
                </Suspense>
              }
            />
            
            <Route element={<MaintenanceGuard />}>
              <Route element={<MainLayout />}>
                <Route path="/" element={<PermissionGuard feature="search"><ReplicaHomePage /></PermissionGuard>} />
                <Route
                  path="/landing"
                  element={
                    <PermissionGuard feature="search">
                      <Suspense fallback={<PageLoading />}>
                        <LazyLandingPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <PermissionGuard feature="search">
                      <Suspense fallback={<PageLoading />}>
                        <LazyResultsPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/agent"
                  element={
                    <PermissionGuard feature="agent">
                      <Suspense fallback={<PageLoading />}>
                        <LazyAgentWorkflowPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/monitoring"
                  element={
                    <PermissionGuard feature="monitoring">
                      <Suspense fallback={<PageLoading />}>
                        <LazyBrandMonitoringPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/optimization"
                  element={
                    <PermissionGuard feature="optimization">
                      <Suspense fallback={<PageLoading />}>
                        <LazyContentOptimizationPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/me"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<PageLoading />}>
                        <LazyProfilePage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pricing"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <LazyPricingPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/api-docs"
                  element={
                    <PermissionGuard feature="api">
                      <Suspense fallback={<PageLoading />}>
                        <LazyApiDocPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="*"
                  element={
                    <Suspense fallback={<PageLoading />}>
                      <LazyNotFoundPage />
                    </Suspense>
                  }
                />
              </Route>

              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPageWrapper />
                  </ProtectedRoute>
                }
              />
            </Route>
        </Routes>
    );
};

// Wrappers to handle navigation prop expected by existing components
const LoginPageWrapper = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    
    const handleNavigate = (page: string) => {
        if (page === 'admin') navigate('/admin');
        else if (page === 'landing') navigate('/');
        else navigate('/' + page);
    };

    // Override internal login logic to update global auth state
    // We need to pass a special prop or context to LoginPage to handle this better,
    // but since LoginPage is tightly coupled with `onNavigate`, let's wrap it.
    
    return (
      <Suspense fallback={<PageLoading />}>
        <LazyLoginPage onNavigate={handleNavigate} onLoginSuccess={login} />
      </Suspense>
    );
};

const AdminPageWrapper = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    const handleExit = () => {
        logout();
        navigate('/login');
    };
    
    return (
      <Suspense fallback={<PageLoading />}>
        <LazyAdminPage onExit={handleExit} />
      </Suspense>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <PublicConfigProvider>
                    <SearchProvider>
                        <SeoSync />
                        <AppContent />
                    </SearchProvider>
                </PublicConfigProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
