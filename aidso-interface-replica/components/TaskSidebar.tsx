import React from 'react';
import { useTasks } from '../contexts/TaskContext';
import { CheckCircle2, XCircle, ChevronLeft } from 'lucide-react';

export const TaskSidebar = () => {
  const { tasks, restoreTask, activeTaskId } = useTasks();
  const [isOpen, setIsOpen] = React.useState(true);

  // Filter out the active task from the sidebar (optional, or show it as active)
  // Usually we show all background tasks. If a task is active (full screen), maybe we highlight it or hide it.
  // Let's show all tasks, highlighting the active one.

  if (tasks.length === 0) return null;

  return (
    <div className={`fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-start transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-[calc(100%-12px)]'}`}>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white border border-gray-200 border-r-0 shadow-md p-1 rounded-l-md mt-4 hover:bg-gray-50 text-gray-400 hover:text-brand-purple"
      >
        <ChevronLeft size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Sidebar Content */}
      <div className="bg-white/90 backdrop-blur-md border border-gray-200 shadow-2xl rounded-l-2xl p-3 flex flex-col gap-3 max-h-[80vh] overflow-y-auto w-[200px]">
        <div className="text-xs font-bold text-gray-400 px-1 uppercase tracking-wider mb-1">
          后台任务 ({tasks.length})
        </div>
        
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`group relative bg-white border rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:scale-105 active:scale-95 ${
              activeTaskId === task.id ? 'border-brand-purple ring-1 ring-brand-purple bg-purple-50' : 'border-gray-100'
            }`}
            onClick={() => restoreTask(task.id)}
          >
            <div className="flex items-center gap-3">
              {/* Icon / Status */}
              <div className="relative shrink-0">
                {task.status === 'running' || task.status === 'pending' ? (
                  <div className="relative">
                    <svg className="w-8 h-8 transform -rotate-90">
                      <circle
                        className="text-gray-100"
                        strokeWidth="3"
                        stroke="currentColor"
                        fill="transparent"
                        r="14"
                        cx="16"
                        cy="16"
                      />
                      <circle
                        className="text-brand-purple transition-all duration-300 ease-linear"
                        strokeWidth="3"
                        strokeDasharray={88}
                        strokeDashoffset={88 - (88 * task.progress) / 100}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="14"
                        cx="16"
                        cy="16"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-brand-purple">
                      {task.progress}%
                    </div>
                  </div>
                ) : task.status === 'failed' ? (
                  <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <XCircle size={16} />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={16} />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0">
                <div className="text-xs font-bold text-gray-900 truncate pr-1">
                  {task.keyword}
                </div>
                <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                  {task.status === 'running' || task.status === 'pending' ? (
                    <span className="text-brand-purple animate-pulse">执行中...</span>
                  ) : task.status === 'failed' ? (
                    <span className="text-red-500">失败</span>
                  ) : (
                    <span>已完成</span>
                  )}
                </div>
              </div>
            </div>

            {/* Latest Log (Hover Tooltip - simplified inline for now) */}
            {(task.status === 'running' || task.status === 'pending' || task.status === 'failed') && (
              <div className="mt-2 text-[10px] text-gray-400 truncate border-t border-gray-50 pt-1">
                {task.logs[task.logs.length - 1]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
