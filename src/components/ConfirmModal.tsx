'use client';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'danger' | 'info';
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          icon: '⚠️',
          confirmButton: 'bg-red-500 hover:bg-red-600 text-white',
          iconBg: 'bg-red-100'
        };
      case 'info':
        return {
          icon: 'ℹ️',
          confirmButton: 'bg-blue-500 hover:bg-blue-600 text-white',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          icon: '⚠️',
          confirmButton: 'bg-yellow-500 hover:bg-yellow-600 text-white',
          iconBg: 'bg-yellow-100'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* 모달 */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${styles.iconBg}`}>
            <span className="text-2xl">{styles.icon}</span>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${styles.confirmButton}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
