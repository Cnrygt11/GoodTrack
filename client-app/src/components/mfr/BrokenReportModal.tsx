import React, { useState } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { useSettings } from '../../context/SettingsContext';

interface BrokenReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void>;
  actionLoading: boolean;
}

export default function BrokenReportModal({
  isOpen,
  onClose,
  onSubmit,
  actionLoading,
}: BrokenReportModalProps) {
  const { language, t } = useSettings();
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    onSubmit(note.trim());
    setNote('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          {language === 'tr' ? 'Bozuk Sipariş Bildirimi' : 'Report Broken Order'}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
            {language === 'tr' ? 'Bozuk Sipariş Açıklaması' : 'Broken Order Explanation'}
          </label>
          <textarea
            placeholder={language === 'tr' ? 'Lütfen siparişin neden bozuk olduğunu açıklayın...' : 'Please explain why the order is broken...'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            rows={4}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '13.5px',
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--danger)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={actionLoading}
            style={{
              background: 'var(--surface2)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn-danger"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--danger)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '10px 16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
            {language === 'tr' ? 'Bozuk İşaretle' : 'Mark Broken'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
