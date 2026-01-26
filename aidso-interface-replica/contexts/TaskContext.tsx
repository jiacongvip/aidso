import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';

export interface Task {
  id: string;
  keyword: string;
  searchType: 'quick' | 'deep';
  selectedModels: string[];
  costUnits: number;
  usageDate?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  logs: string[];
  result?: any;
  startTime: number;
}

interface TaskContextType {
  tasks: Task[];
  activeTaskId: string | null;
  addTask: (params: { keyword: string; searchType: 'quick' | 'deep'; models: string[] }) => Promise<void>;
  refreshTasks: () => Promise<void>;
  minimizeTask: () => void;
  restoreTask: (id: string) => void;
  deleteTask: (id: string) => void;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};

export const TaskProvider = ({ children }: { children: React.ReactNode }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  
  // Keep track of tasks that need polling
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const formatTaskFromBackend = (t: any): Task => ({
      id: t.id,
      keyword: t.keyword,
      searchType: t.searchType === 'deep' ? 'deep' : 'quick',
      selectedModels: Array.isArray(t.selectedModels) ? t.selectedModels : [],
      costUnits: typeof t.costUnits === 'number' ? t.costUnits : 0,
      usageDate: typeof t.usageDate === 'string' ? t.usageDate : undefined,
      status: t.status.toLowerCase(),
      progress: t.progress,
      logs: t.logs || [],
      result: t.result,
      startTime: new Date(t.createdAt).getTime()
  });

  const stopPolling = useCallback((taskId: string) => {
    const interval = pollingRef.current.get(taskId);
    if (interval) clearInterval(interval);
    pollingRef.current.delete(taskId);
  }, []);

  const startPolling = useCallback((taskId: string) => {
    if (pollingRef.current.has(taskId)) return;

    const interval = setInterval(async () => {
        try {
            const res = await apiFetch(`/api/tasks/${taskId}`);
            if (!res.ok) { // Task might be deleted or server error
                if (res.status === 404) {
                    stopPolling(taskId);
                }
                return;
            }
            
            const rawTask = await res.json();
            const task = formatTaskFromBackend(rawTask);
            
            setTasks(prev => prev.map(t => t.id === taskId ? task : t));
            
            if (task.status === 'completed' || task.status === 'failed') {
                stopPolling(taskId);
            }
        } catch (e) {
            console.error("Polling error", e);
            // Keep trying.
        }
    }, 1000);

    pollingRef.current.set(taskId, interval);
  }, [stopPolling]);

  const refreshTasks = useCallback(async () => {
    if (!token) return;

    const res = await apiFetch('/api/tasks');
    if (res.status === 401) return;
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json().catch(() => []);

    const formattedTasks = Array.isArray(data) ? data.map(formatTaskFromBackend) : [];
    setTasks(formattedTasks);

    setActiveTaskId((prev) => {
      if (prev && formattedTasks.some((t: Task) => t.id === prev)) return prev;
      return formattedTasks[0]?.id || null;
    });

    formattedTasks.forEach((t: Task) => {
      if (t.status === 'running' || t.status === 'pending') {
        startPolling(t.id);
      } else {
        stopPolling(t.id);
      }
    });
  }, [startPolling, stopPolling, token]);

  // Fetch tasks when token changes (login/logout)
  useEffect(() => {
    if (!token) {
      pollingRef.current.forEach((interval) => clearInterval(interval));
      pollingRef.current.clear();
      setTasks([]);
      setActiveTaskId(null);
      return;
    }

    refreshTasks().catch((err) => {
      console.error('Failed to load tasks from backend:', err);
    });
  }, [refreshTasks, token]);

  const addTask = useCallback(async (params: { keyword: string; searchType: 'quick' | 'deep'; models: string[] }) => {
    const res = await apiFetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: params.keyword, searchType: params.searchType, models: params.models }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      // 点数不足错误
      if (res.status === 403 && data && data.error === '点数不足') {
        const message = data.message || `执行此任务需要 ${data.requiredPoints || 1} 点，您当前余额为 ${data.currentPoints || 0} 点`;
        throw new Error(`💰 ${message}\n\n请联系管理员充值点数`);
      }
      
      // 原有的配额错误
      if (res.status === 429 && data && typeof data.dailyLimit === 'number' && typeof data.usedUnits === 'number') {
        const usageDate = typeof data.usageDate === 'string' ? data.usageDate : '';
        const costUnits = typeof data.costUnits === 'number' ? data.costUnits : 0;
        const suffix = usageDate ? `（${usageDate} Asia/Shanghai）` : '';
        throw new Error(`今日额度不足${suffix}：已用 ${data.usedUnits}/${data.dailyLimit}，本次需要 ${costUnits}。`);
      }

      const message = (data && (data.error as string || data.message as string)) || 'Failed to create task';
      throw new Error(message);
    }

    const newTask = formatTaskFromBackend(data);
    setTasks((prev) => [newTask, ...prev]);
    setActiveTaskId(newTask.id);

    // Start polling
    startPolling(newTask.id);
  }, [startPolling]);

  const minimizeTask = () => {
    setActiveTaskId(null);
  };

  const restoreTask = (id: string) => {
    setActiveTaskId(id);
  };

  const deleteTask = async (id: string) => {
    // Optimistic delete
    setTasks(prev => prev.filter(t => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
    
    // Stop polling if active
    stopPolling(id);

    try {
        // We assume backend has DELETE /api/tasks/:id, if not, it will just fail silently in background
        await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
    } catch (err) {
        console.error("Failed to delete task on server", err);
    }
  };

  return (
    <TaskContext.Provider value={{ tasks, activeTaskId, addTask, refreshTasks, minimizeTask, restoreTask, deleteTask }}>
      {children}
    </TaskContext.Provider>
  );
};
