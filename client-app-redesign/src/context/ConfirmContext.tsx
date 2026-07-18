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
  const { t } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
    isDestructive: true,
  });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions({
      isDestructive: true, // Default to true if not specified
      ...opts,
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
        <div className="modal-overlay modal-overlay--top">
          <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="confirm-modal-title">{options.title}</h3>
            <p className="confirm-modal-message">{options.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary confirm-modal-btn"
                onClick={handleCancel}
              >
                {options.cancelText || t('cancelDefaultBtn')}
              </button>
              <button
                type="button"
                className="btn-primary confirm-modal-btn confirm-modal-btn--primary"
                onClick={handleConfirm}
                style={{
                  background: options.isDestructive ? 'var(--danger)' : 'var(--accent-seller)',
                }}
              >
                {options.confirmText || t('confirmDefaultBtn')}
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
