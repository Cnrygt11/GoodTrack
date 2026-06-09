import React, { createContext, useState, useContext, useCallback } from 'react';

interface ToastState {
  show: boolean;
  message: string;
  isError: boolean;
}

interface ToastContextType {
  toast: ToastState;
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', isError: false });

  const showToast = useCallback((message: string) => {
    const isNetworkOrFetchError = 
      message.toLowerCase().includes('fetch') || 
      message.toLowerCase().includes('network') || 
      message.toLowerCase().includes('hata kodu') || 
      message.toLowerCase().includes('sunucu') || 
      message.toLowerCase().includes('bulunamadı') || 
      message.toLowerCase().includes('geçersiz veri') || 
      message.toLowerCase().includes('typeerror') || 
      message.toLowerCase().includes('error') ||
      message.toLowerCase().includes('connect') ||
      message.toLowerCase().includes('http');

    if (isNetworkOrFetchError) {
      setToast({ show: true, message, isError: true });
      setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 4000); // 4 seconds for errors so they are more readable
    }
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
