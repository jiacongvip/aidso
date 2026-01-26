import React, { useEffect, useMemo, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { TaskSidebar } from '../components/TaskSidebar';
import { ToastProvider } from '../contexts/ToastContext';
import { TaskProvider } from '../contexts/TaskContext';
import { apiFetch, getAuthToken } from '../services/api';

export const MainLayout = () => {
  const location = useLocation();
  const isAgentPage = location.pathname.startsWith('/agent');
  const isLandingPage = location.pathname === '/';

  const sessionId = useMemo(() => {
    try {
      const key = 'aidso_session_id';
      const existing = localStorage.getItem(key);
      if (existing) return existing;
      const id =
        typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
          ? (crypto as any).randomUUID()
          : `s_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, id);
      return id;
    } catch {
      return `s_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
  }, []);

  const mountedRef = useRef(false);
  const lastPathRef = useRef<string>(location.pathname + location.search);
  const lastStartMsRef = useRef<number>(Date.now());

  useEffect(() => {
    // 仅登录用户才记录行为
    const token = getAuthToken();
    const currentPath = location.pathname + location.search;

    if (!mountedRef.current) {
      mountedRef.current = true;
      lastPathRef.current = currentPath;
      lastStartMsRef.current = Date.now();
      return;
    }

    const now = Date.now();
    const prevPath = lastPathRef.current;
    const prevStart = lastStartMsRef.current;
    lastPathRef.current = currentPath;
    lastStartMsRef.current = now;

    if (!token) return;
    const durationSeconds = Math.max(0, Math.round((now - prevStart) / 1000));

    apiFetch('/api/track/pageview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        path: prevPath,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent || null,
        startedAt: new Date(prevStart).toISOString(),
        endedAt: new Date(now).toISOString(),
        durationSeconds,
      }),
    }).catch(() => {});
  }, [location.pathname, location.search, sessionId]);

  useEffect(() => {
    const handler = () => {
      const token = getAuthToken();
      if (!token) return;

      const now = Date.now();
      const path = lastPathRef.current;
      const startedAtMs = lastStartMsRef.current;
      const durationSeconds = Math.max(0, Math.round((now - startedAtMs) / 1000));

      fetch('/api/track/pageview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          path,
          referrer: document.referrer || null,
          userAgent: navigator.userAgent || null,
          startedAt: new Date(startedAtMs).toISOString(),
          endedAt: new Date(now).toISOString(),
          durationSeconds,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handler);
    return () => {
      window.removeEventListener('beforeunload', handler);
    };
  }, [sessionId]);

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
