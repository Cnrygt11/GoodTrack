import { Camera, X, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import { TranslationKey } from '../../services/translations';

interface DefectReportModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  isOpen, onClose, t,
  defectNote, setDefectNote,
  defectImage, defectImageFileName,
  actionLoading, onImageChange, onSubmit
}: DefectReportModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal-header">
        <h3 className="modal-header-danger">
          <X size={20} />
          {t('defectReportTitle')}
        </h3>
        <button
          onClick={onClose}
          className="modal-close-btn"
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="form-group mb-14">
          <label>{t('defectNoteLabel')}</label>
          <textarea
            placeholder={t('defectNotePlaceholder')}
            value={defectNote}
            onChange={(e) => setDefectNote(e.target.value)}
            required
            rows={4}
            className="modal-textarea modal-textarea-danger"
          />
        </div>
        <div className="form-group mb-20">
          <label>{t('defectImageLabel')}</label>
          <div className="image-upload-area">
            <input
              type="file"
              accept="image/*"
              id="defect-image-input"
              onChange={onImageChange}
            />
            {!defectImage ? (
              <>
                <div className="upload-icon">
                  <Camera size={24} />
                </div>
                <div className="upload-text">{t('clickToUpload')}</div>
              </>
            ) : (
              <>
                <img className="image-preview" src={defectImage} alt="preview" />
                <span className="filename-preview">
                  {defectImageFileName.substring(0, 20)}...
                </span>
              </>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={actionLoading}>
            {t('btnCancel')}
          </button>
          <button
            type="submit"
            className="btn-danger"
            disabled={actionLoading}
          >
            {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
            {t('btnReport')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
