'use client';

import { useState, useEffect } from 'react';

interface AlertProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onClose: () => void;
}

export function CustomAlert({ message, type = 'info', onClose }: AlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 페이드 아웃 애니메이션 후 완전히 제거
      setTimeout(() => {
        onClose();
      }, 3000); // 페이드 아웃 애니메이션 시간
    }, 1500); // 1.5초 후 페이드 아웃 시작

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible
          ? 'animate-in slide-in-from-top opacity-100'
          : 'animate-out slide-out-to-top opacity-0'
      }`}
    >
      <div className={`px-6 py-4 rounded-xl border shadow-xl max-w-md min-w-[320px] ${getTypeStyles(type)}`}>
        <div className="flex items-center gap-4">
          <span className="text-xl">{getIcon(type)}</span>
          <p className="font-semibold text-base flex-1">{message}</p>
          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => onClose(), 200);
            }}
            className="text-gray-500 hover:text-gray-700 text-lg font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// 유틸리티 함수들을 전역으로 이동
const getTypeStyles = (type: 'success' | 'error' | 'warning' | 'info') => {
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

const getIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
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

// 전역 알림 관리를 위한 컨텍스트
interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

import { createContext, useContext, ReactNode } from 'react';

const AlertContext = createContext<AlertContextType | null>(null);

// 개별 알림 아이템 컴포넌트
function AlertItem({ alert, onRemove }: {
  alert: { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
  onRemove: (id: string) => void;
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      // 페이드 아웃 애니메이션 후 완전히 제거
      setTimeout(() => {
        onRemove(alert.id);
      }, 300); // 페이드 아웃 애니메이션 시간
    }, 2000); // 2초 후 페이드 아웃 시작

    return () => clearTimeout(timer);
  }, [alert.id, onRemove]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onRemove(alert.id), 300);
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isVisible
          ? 'animate-in slide-in-from-top opacity-100'
          : 'animate-out slide-out-to-top opacity-0'
      }`}
    >
      <div className={`px-6 py-4 rounded-xl border shadow-xl max-w-md min-w-[320px] ${getTypeStyles(alert.type)}`}>
        <div className="flex items-center gap-4">
          <span className="text-xl">{getIcon(alert.type)}</span>
          <p className="font-semibold text-base flex-1">{alert.message}</p>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 text-lg font-bold"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 space-y-3">
        {alerts.map((alert) => (
          <AlertItem
            key={alert.id}
            alert={alert}
            onRemove={removeAlert}
          />
        ))}
      </div>
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
