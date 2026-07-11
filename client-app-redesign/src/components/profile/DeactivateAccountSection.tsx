import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import Modal from '../ui/Modal';
import { api } from '../../services/apiClient';
import { extractErrorMessage } from '../../utils/errorUtils';

/**
 * Hesap deaktivasyonu (soft-delete). Şifre onayı ister; onaylanınca hesabı deaktive edip
 * oturumu kapatır. Kullanıcı doğru şifreyle tekrar giriş yaparak hesabını reaktive edebilir.
 */
export default function DeactivateAccountSection() {
  const { t } = useSettings();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const close = () => {
    if (loading) return;
    setOpen(false);
    setPassword('');
  };

  const handleDeactivate = async () => {
    if (!password) {
      showToast(t('deactivatePasswordRequired'));
      return;
    }
    try {
      setLoading(true);
      const res = await api.deactivateAccount(password);
      showToast(res.message || t('deactivateSuccess'));
      setOpen(false);
      logout(); // oturumu kapat → giriş ekranına yönlenir
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card danger-zone">
      <div className="danger-zone-header">
        <AlertTriangle size={18} />
        <h3>{t('deactivateTitle')}</h3>
      </div>
      <p className="danger-zone-desc">{t('deactivateDesc')}</p>
      <button type="button" className="btn-danger" onClick={() => setOpen(true)}>
        {t('deactivateButton')}
      </button>

      <Modal isOpen={open} onClose={close}>
        <div className="deactivate-modal">
          <div className="deactivate-modal-header">
            <AlertTriangle size={20} />
            <h3>{t('deactivateModalTitle')}</h3>
          </div>
          <p className="deactivate-modal-desc">{t('deactivateModalDesc')}</p>

          <label className="deactivate-modal-label" htmlFor="deactivate-password">
            {t('deactivatePasswordLabel')}
          </label>
          <input
            id="deactivate-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={loading}
          />

          <div className="deactivate-modal-actions">
            <button type="button" className="btn-secondary" onClick={close} disabled={loading}>
              {t('cancelBtn')}
            </button>
            <button
              type="button"
              className="btn-danger"
              onClick={handleDeactivate}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" size={14} /> : t('deactivateConfirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
