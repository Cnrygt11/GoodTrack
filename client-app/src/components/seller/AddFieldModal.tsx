import React from 'react';
import { X, PlusCircle, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { TranslationKey } from '../../services/translations';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  t: (key: TranslationKey) => string;
  newFieldName: string;
  setNewFieldName: (v: string) => void;
  newFieldType: string;
  setNewFieldType: (v: string) => void;
  newFieldOptions: string;
  setNewFieldOptions: (v: string) => void;
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function AddFieldModal({
  isOpen, onClose, language, t,
  newFieldName, setNewFieldName,
  newFieldType, setNewFieldType,
  newFieldOptions, setNewFieldOptions,
  actionLoading, onSubmit
}: AddFieldModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>{t('newFeatureTitle')}</h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label>{t('featureName')}</label>
          <input
            type="text"
            placeholder={t('featureNamePlaceholder')}
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            required
          />
        </div>
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label>{t('fieldType')}</label>
          <select
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value)}
          >
            <option value="text">{t('fieldTypeText')}</option>
            <option value="select">{t('fieldTypeDropdown')}</option>
          </select>
        </div>
        {newFieldType === 'select' && (
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>{t('optionsListLabel')}</label>
            <input
              type="text"
              placeholder={t('optionsPlaceholder')}
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              required
            />
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={actionLoading}>
            {language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} />}
            {t('addBtn')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
