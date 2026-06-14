import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Product } from '../../services/api';
import Modal from '../ui/Modal';
import { useSettings } from '../../context/SettingsContext';

interface BrokenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export default function BrokenDetailsModal({ isOpen, onClose, product }: BrokenDetailsModalProps) {
  const { language, t } = useSettings();
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h3 className="modal-header-danger">
          <AlertTriangle size={20} />
          {t('brokenOrderExplanation')}
        </h3>
        <button
          onClick={onClose}
          className="modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
      {product && (
        <div className="modal-body-column">
          <div className="modal-body-subcolumn">
            <span className="modal-label">
              {t('mfrExplanation')}
            </span>
            <div className="modal-explanation-box">
              {product.defectNote || t('noDescriptionProvided')}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-primary"
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
