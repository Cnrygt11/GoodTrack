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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: glowBg, 
              color: accentColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${accentColor}`
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '0.5px' }}>{t('passwordChangeTitle')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {t('passwordStep1')}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterOldPassword')}
          </p>

          <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>{t('oldPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showOld ? 'text' : 'password'} 
                  required 
                  placeholder={t('oldPassword')} 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={passwordLoading}>
                {t('cancelBtn')}
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  background: accentColor, 
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: glowBg, 
              color: accentColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${accentColor}`
            }}>
              <Key size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '0.5px' }}>{t('passwordChangeTitle')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {t('passwordStep2')}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterNewPassword')}
          </p>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>{t('newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNew ? 'text' : 'password'} 
                  required 
                  placeholder={t('newPassword')} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t('confirmNewPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  required 
                  placeholder={t('confirmNewPassword')} 
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={passwordLoading}>
                {t('btnBackToProfile')}
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  background: accentColor, 
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
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
