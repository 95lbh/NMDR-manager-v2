'use client';

import { useState, useEffect } from 'react';

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export function CustomAlert({ message, type = 'info', onClose }: AlertProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // 3초 후 자동 닫기

    return () => clearTimeout(timer);
  }, [onClose]);

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`p-4 rounded-lg border shadow-lg max-w-sm ${getTypeStyles()}`}>
        <div className="flex items-center gap-3">
          <span className="text-lg">{getIcon()}</span>
          <p className="font-medium">{message}</p>
          <button
            onClick={onClose}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// 전역 알림 관리를 위한 컨텍스트
interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

import { createContext, useContext, ReactNode } from 'react';

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>>([]);

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setAlerts(prev => [...prev, { id, message, type }]);
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alerts.map(alert => (
        <CustomAlert
          key={alert.id}
          message={alert.message}
          type={alert.type}
          onClose={() => removeAlert(alert.id)}
        />
      ))}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
}
