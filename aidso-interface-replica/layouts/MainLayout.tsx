import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { TaskSidebar } from '../components/TaskSidebar';
import { ToastProvider } from '../contexts/ToastContext';
import { TaskProvider } from '../contexts/TaskContext';

export const MainLayout = () => {
  const location = useLocation();
  const isAgentPage = location.pathname.startsWith('/agent');
  const isLandingPage = location.pathname === '/';

  return (
    <TaskProvider>
      <ToastProvider>
        <div className="min-h-screen bg-[#fafafa] font-sans text-gray-900 pb-0 selection:bg-purple-100 selection:text-purple-900 flex flex-col">
            <Navbar />
            <main className="flex-1 flex flex-col">
                <Outlet />
            </main>
            {!isAgentPage && <Footer />}
            <TaskSidebar />
        </div>
      </ToastProvider>
    </TaskProvider>
  );
};
