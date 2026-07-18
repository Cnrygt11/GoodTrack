import { ShieldCheck, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import usePasswordChange from '../../hooks/usePasswordChange';
import { useSettings } from '../../context/SettingsContext';

interface PasswordChangeFormProps {
  passwordFlow: ReturnType<typeof usePasswordChange>;
  accentColor: string;
  glowBg: string;
}

export default function PasswordChangeForm({
  passwordFlow,
  accentColor,
  glowBg,
}: PasswordChangeFormProps) {
  const { t } = useSettings();

  const {
    flowStep,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    showOld,
    setShowOld,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
    actionLoading: passwordLoading,
    handleVerifyPassword,
    handleChangePassword,
    handleCancelFlow,
  } = passwordFlow;

  return (
    <>
      {flowStep === 'verify-password' && (
        <div className="card password-card">
          <div className="password-card-header">
            <div
              className="password-icon-box"
              style={{ background: glowBg, color: accentColor, border: `1px solid ${accentColor}` }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="password-card-title">{t('passwordChangeTitle')}</h2>
              <span className="password-card-subtitle">{t('passwordStep1')}</span>
            </div>
          </div>

          <p className="password-card-desc">{t('enterOldPassword')}</p>

          <form onSubmit={handleVerifyPassword} className="password-form">
            <div className="form-group">
              <label>{t('oldPassword')}</label>
              <div className="password-input-wrap">
                <input
                  type={showOld ? 'text' : 'password'}
                  required
                  placeholder={t('oldPassword')}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="password-toggle"
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="password-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelFlow}
                disabled={passwordLoading}
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                className="btn-primary password-submit-btn"
                style={{
                  background: accentColor,
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                }}
                disabled={passwordLoading}
              >
                {passwordLoading && <Loader2 className="animate-spin" size={14} />}
                {t('verifyOldPasswordBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {flowStep === 'new-password' && (
        <div className="card password-card">
          <div className="password-card-header">
            <div
              className="password-icon-box"
              style={{ background: glowBg, color: accentColor, border: `1px solid ${accentColor}` }}
            >
              <Key size={24} />
            </div>
            <div>
              <h2 className="password-card-title">{t('passwordChangeTitle')}</h2>
              <span className="password-card-subtitle">{t('passwordStep2')}</span>
            </div>
          </div>

          <p className="password-card-desc">{t('enterNewPassword')}</p>

          <form onSubmit={handleChangePassword} className="password-form password-form--compact">
            <div className="form-group">
              <label>{t('newPassword')}</label>
              <div className="password-input-wrap">
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  placeholder={t('newPassword')}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="password-toggle"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t('confirmNewPassword')}</label>
              <div className="password-input-wrap">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  placeholder={t('confirmNewPassword')}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="password-toggle"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="password-actions password-actions--lg">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleCancelFlow}
                disabled={passwordLoading}
              >
                {t('btnBackToProfile')}
              </button>
              <button
                type="submit"
                className="btn-primary password-submit-btn"
                style={{
                  background: accentColor,
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                }}
                disabled={passwordLoading}
              >
                {passwordLoading && <Loader2 className="animate-spin" size={14} />}
                {t('updatePasswordBtn')}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
