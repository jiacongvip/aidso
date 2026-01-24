
import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const ToastContainer = ({ toasts }: { toasts: { id: number, msg: string, type: 'success' | 'info' | 'error' }[] }) => (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
            <div key={toast.id} className="bg-gray-900/90 backdrop-blur text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2.5 animate-fade-in slide-in-from-top-2 text-sm font-medium min-w-[200px] justify-center">
                {toast.type === 'success' ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                ) : toast.type === 'error' ? (
                    <AlertCircle size={16} className="text-red-400" />
                ) : (
                    <AlertCircle size={16} className="text-blue-400" />
                )}
                {toast.msg}
            </div>
        ))}
    </div>
);
