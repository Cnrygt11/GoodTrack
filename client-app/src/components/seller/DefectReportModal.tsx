import React from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { TranslationKey } from '../../services/translations';

interface DefectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  t: (key: TranslationKey) => string;
  defectNote: string;
  setDefectNote: (v: string) => void;
  defectImage: string | null;
  defectImageFileName: string;
  actionLoading: boolean;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function DefectReportModal({
  isOpen, onClose, language, t,
  defectNote, setDefectNote,
  defectImage, defectImageFileName,
  actionLoading, onImageChange, onSubmit
}: DefectReportModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <X size={20} />
          {t('defectReportTitle')}
        </h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label>{t('defectNoteLabel')}</label>
          <textarea
            placeholder={t('defectNotePlaceholder')}
            value={defectNote}
            onChange={(e) => setDefectNote(e.target.value)}
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
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--danger)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
          />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>{t('defectImageLabel')}</label>
          <div className="image-upload-area" style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}>
            <input
              type="file"
              accept="image/*"
              id="defect-image-input"
              onChange={onImageChange}
            />
            {!defectImage ? (
              <>
                <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                  <Camera size={24} style={{ color: 'var(--muted)' }} />
                </div>
                <div className="upload-text">{t('clickToUpload')}</div>
              </>
            ) : (
              <>
                <img className="image-preview" src={defectImage} alt="preview" style={{ display: 'block', maxHeight: '150px', objectFit: 'contain' }} />
                <span style={{ fontSize: '10px', color: 'var(--success)', marginTop: '4px' }}>
                  {defectImageFileName.substring(0, 20)}...
                </span>
              </>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={actionLoading}>
            {language === 'tr' ? 'İptal' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn-danger"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              background: 'var(--danger)', color: 'white', border: 'none',
              borderRadius: '6px', padding: '10px 16px', fontWeight: 600,
              cursor: 'pointer', transition: 'opacity 0.2s'
            }}
            disabled={actionLoading}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
            {t('btnReport')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
