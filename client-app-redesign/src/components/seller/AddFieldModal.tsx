import { X, PlusCircle, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { TranslationKey } from '../../services/translations';

interface AddFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  isOpen, onClose, t,
  newFieldName, setNewFieldName,
  newFieldType, setNewFieldType,
  newFieldOptions, setNewFieldOptions,
  actionLoading, onSubmit
}: AddFieldModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h3>{t('newFeatureTitle')}</h3>
        <button
          onClick={onClose}
          className="modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group mb-14">
          <label>{t('featureName')}</label>
          <input
            type="text"
            placeholder={t('featureNamePlaceholder')}
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            required
          />
        </div>
        <div className="form-group mb-14">
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
          <div className="form-group mb-20">
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
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            className="btn-primary inline-flex-center-gap-4"
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
