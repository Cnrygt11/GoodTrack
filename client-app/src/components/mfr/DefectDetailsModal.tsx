import { X, Info, Package } from 'lucide-react';
import { Product } from '../../services/api';
import Modal from '../ui/Modal';
import { useSettings } from '../../context/SettingsContext';

interface DefectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function DefectDetailsModal({ isOpen, onClose, product }: DefectDetailsModalProps) {
  const { language, t } = useSettings();
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={20} />
          {t('defectDetailsTitle')}
        </h3>
        <button
          onClick={onClose}
          className="modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
      {product && (
        <div className="modal-body-stack">
          <div className="field-group">
            <span className="modal-label">
              {t('defectNoteLabel')}
            </span>
            <div className="modal-display-box">
              {product.defectNote || t('noDescriptionProvided')}
            </div>
          </div>

          {product.defectImage ? (
            <div className="field-group">
              <span className="modal-label">
                {t('defectPhoto')}
              </span>
              <div className="modal-image-frame">
                <img
                  src={product.defectImage}
                  alt="Hata Görseli"
                />
              </div>
            </div>
          ) : (
            <div className="modal-info-row">
              <Package size={16} />
              <span>{t('noDefectImage')}</span>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="btn-primary mfr"
              onClick={onClose}
            >
              {t('closeBtn')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
