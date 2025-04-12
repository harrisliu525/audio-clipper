import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'info' | 'success' | 'error';
  duration?: number;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // 显示toast
    setIsVisible(true);
    
    // 设置自动关闭定时器
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // 等待渐出动画完成后调用onClose
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-800';
    }
  };
  
  return (
    <div
      className={`fixed bottom-8 left-1/2 transform -translate-x-1/2 py-2 px-4 rounded-full shadow-lg text-white transition-all duration-300 ${getBgColor()} ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
      }`}
    >
      {message}
    </div>
  );
};

export default Toast;

interface ToastMessage {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex flex-col items-center space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

/**
 * Toast上下文和钩子
 */
import { createContext, useCallback, useContext } from 'react';

interface ToastContextType {
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast必须在ToastProvider内使用');
  }
  return context;
};

/**
 * Toast提供者组件
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);
  
  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}; 