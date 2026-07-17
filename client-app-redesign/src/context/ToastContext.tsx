import React, { createContext, useState, useContext, useCallback } from 'react';

interface ToastState {
  show: boolean;
  message: string;
  isError: boolean;
  /** Her gösterimde artar: aynı mesaj arka arkaya gelse de ilerleme çizgisi baştan başlar. */
  seq: number;
}

interface ToastContextType {
  toast: ToastState;
  showToast: (message: string, isErrorOverride?: boolean) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    show: false,
    message: '',
    isError: false,
    seq: 0,
  });

  const showToast = useCallback((message: string, isErrorOverride?: boolean) => {
    if (!message) return;

    const isError =
      isErrorOverride ??
      (message.toLowerCase().includes('hata') ||
        message.toLowerCase().includes('error') ||
        message.toLowerCase().includes('failed') ||
        message.toLowerCase().includes('başarısız') ||
        message.toLowerCase().includes('geçersiz') ||
        message.toLowerCase().includes('alınmış') ||
        message.toLowerCase().includes('bulunamadı') ||
        message.toLowerCase().includes('yetkiniz') ||
        message.toLowerCase().includes('uymuyor') ||
        message.toLowerCase().includes('boş') ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('http') ||
        message.toLowerCase().includes('doğrulayın') ||
        message.toLowerCase().includes('yetersiz'));

    setToast((prev) => ({ show: true, message, isError, seq: prev.seq + 1 }));
    setTimeout(
      () => {
        setToast((prev) => ({ ...prev, show: false }));
      },
      isError ? 4000 : 2500,
    );
  }, []);

  return <ToastContext.Provider value={{ toast, showToast }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
