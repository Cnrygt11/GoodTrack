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
  const { t } = useSettings();
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    onSubmit(note.trim());
    setNote('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          {t('reportBrokenTitle')}
        </h3>
        <button
          onClick={onClose}
          className="modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="modal-label">
            {t('brokenExplanation')}
          </label>
          <textarea
            placeholder={t('brokenPlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            required
            rows={4}
            className="modal-textarea"
          />
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={actionLoading}
          >
            {t('cancelBtn')}
          </button>
          <button
            type="submit"
            className="btn-danger btn-flex-inline"
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <AlertTriangle size={16} />}
            {t('btnMarkBroken')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
