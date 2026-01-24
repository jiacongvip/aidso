import React, { createContext, useState, useContext } from 'react';
import { ToastContainer } from '../components/ToastContainer';

interface ToastContextType {
    addToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export const ToastContext = createContext<ToastContextType>({ addToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<{ id: number, msg: string, type: 'success' | 'info' | 'error' }[]>([]);

    const addToast = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            <ToastContainer toasts={toasts} />
            {children}
        </ToastContext.Provider>
    );
};
