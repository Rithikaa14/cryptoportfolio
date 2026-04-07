import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle className="text-neon-green" size={20} />,
    error: <AlertCircle className="text-neon-red" size={20} />,
    info: <Info className="text-neon-blue" size={20} />,
    warning: <AlertTriangle className="text-neon-yellow" size={20} />,
  };

  const borders = {
    success: 'border-neon-green/20',
    error: 'border-neon-red/20',
    info: 'border-neon-blue/20',
    warning: 'border-neon-yellow/20',
  };

  return (
    <div className={`glass-card p-4 border ${borders[type]} flex items-center justify-between gap-4 min-w-[300px] shadow-2xl animate-slide-in-right mb-3`}>
      <div className="flex items-center gap-3">
        {icons[type]}
        <p className="text-sm font-medium text-white">{message}</p>
      </div>
      <button 
        onClick={() => onClose(id)}
        className="text-white/40 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;
