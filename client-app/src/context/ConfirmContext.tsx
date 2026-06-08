import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useSettings } from './SettingsContext';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({ title: '', message: '', isDestructive: true });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({
      isDestructive: true, // Default to true if not specified
      ...opts
    });
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(true);
      resolveRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, marginBottom: '14px', color: 'var(--text)' }}>
              {options.title}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '13.5px', lineHeight: '1.6', marginBottom: '24px' }}>
              {options.message}
            </p>
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleCancel}
                style={{ padding: '8px 16px', borderRadius: '7px', fontSize: '13px' }}
              >
                {options.cancelText || (language === 'tr' ? 'İptal' : 'Cancel')}
              </button>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={handleConfirm}
                style={{ 
                  padding: '8px 16px', 
                  borderRadius: '7px', 
                  fontSize: '13px',
                  background: options.isDestructive ? 'var(--danger)' : 'var(--accent-seller)',
                  color: '#fff',
                  border: 'none',
                  boxShadow: 'none'
                }}
              >
                {options.confirmText || (language === 'tr' ? 'Onayla' : 'Confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context.confirm;
}
