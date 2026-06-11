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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={20} />
          {language === 'tr' ? 'Bozuk Sipariş Açıklaması' : 'Broken Order Explanation'}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
      {product && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {language === 'tr' ? 'Üretici Açıklaması' : 'Manufacturer Explanation'}
            </span>
            <div style={{
              background: 'var(--surface2)',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '14px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {product.defectNote || (language === 'tr' ? 'Açıklama belirtilmemiş.' : 'No description provided.')}
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                background: 'var(--accent-seller)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {t('closeBtn')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
