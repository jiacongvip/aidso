import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { SearchProvider } from './contexts/SearchContext';
import { AuthProvider, PermissionGuard, ProtectedRoute, useAuth } from './contexts/AuthContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { PricingPage } from './pages/PricingPage';
import { ApiDocPage } from './pages/ApiDocPage';
import { BrandMonitoringPage } from './pages/BrandMonitoringPage';
import { ContentOptimizationPage } from './pages/ContentOptimizationPage';
import { AdminPage } from './pages/AdminPage';
import { AgentWorkflowPage } from './pages/AgentWorkflowPage';
import { ResultsPage } from './pages/ResultsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReplicaHomePage } from './pages/ReplicaHome/ReplicaHomePage';

const AppContent = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPageWrapper />} />
            
            <Route element={<MainLayout />}>
                <Route path="/" element={<PermissionGuard feature="search"><ReplicaHomePage /></PermissionGuard>} />
                <Route path="/landing" element={<PermissionGuard feature="search"><LandingPage /></PermissionGuard>} />
                <Route path="/results" element={<PermissionGuard feature="search"><ResultsPage /></PermissionGuard>} />
                <Route path="/agent" element={<PermissionGuard feature="agent"><AgentWorkflowPage /></PermissionGuard>} />
                <Route path="/monitoring" element={<PermissionGuard feature="monitoring"><BrandMonitoringPage /></PermissionGuard>} />
                <Route path="/optimization" element={<PermissionGuard feature="optimization"><ContentOptimizationPage /></PermissionGuard>} />
                <Route path="/me" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/api-docs" element={<PermissionGuard feature="api"><ApiDocPage /></PermissionGuard>} />
            </Route>
            
            <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                    <AdminPageWrapper />
                </ProtectedRoute>
            } />
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
    
    return <LoginPage onNavigate={handleNavigate} onLoginSuccess={login} />;
};

const AdminPageWrapper = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    
    const handleExit = () => {
        logout();
        navigate('/login');
    };
    
    return <AdminPage onExit={handleExit} />;
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SearchProvider>
                    <AppContent />
                </SearchProvider>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;
