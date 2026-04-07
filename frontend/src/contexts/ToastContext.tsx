import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import Toast, { type ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map((toast) => (
            <Toast 
              key={toast.id} 
              id={toast.id} 
              message={toast.message} 
              type={toast.type} 
              onClose={closeToast} 
            />
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
};
