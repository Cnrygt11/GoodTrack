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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={20} />
          {t('defectDetailsTitle')}
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
              {t('defectNoteLabel')}
            </span>
            <div style={{
              background: 'var(--surface2)',
              padding: '12px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '14px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap'
            }}>
              {product.defectNote || t('noDescriptionProvided')}
            </div>
          </div>

          {product.defectImage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('defectPhoto')}
              </span>
              <div style={{
                background: 'var(--surface2)',
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden'
              }}>
                <img
                  src={product.defectImage}
                  alt="Hata Görseli"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '350px',
                    borderRadius: '6px',
                    objectFit: 'contain',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--muted)',
              fontSize: '13px',
              padding: '8px 0'
            }}>
              <Package size={16} />
              <span>{t('noDefectImage')}</span>
            </div>
          )}

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                background: 'var(--accent-mfr)',
                color: '#111',
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
