import React from 'react';
import { TranslationKey } from '../../services/translations';
import { ShieldCheck, Key, Eye, EyeOff, Loader2 } from 'lucide-react';

interface PasswordChangeFormProps {
  flowStep: 'verify-password' | 'new-password';
  language: string;
  t: (key: TranslationKey) => string;
  accentColor: string;
  glowBg: string;
  oldPassword: string;
  setOldPassword: (v: string) => void;
  showOld: boolean;
  setShowOld: (v: boolean) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  showNew: boolean;
  setShowNew: (v: boolean) => void;
  confirmNewPassword: string;
  setConfirmNewPassword: (v: string) => void;
  showConfirm: boolean;
  setShowConfirm: (v: boolean) => void;
  passwordLoading: boolean;
  onVerifyPassword: (e: React.FormEvent) => void;
  onChangePassword: (e: React.FormEvent) => void;
  onCancelFlow: () => void;
}

export default function PasswordChangeForm({
  flowStep,
  language,
  t,
  accentColor,
  glowBg,
  oldPassword,
  setOldPassword,
  showOld,
  setShowOld,
  newPassword,
  setNewPassword,
  showNew,
  setShowNew,
  confirmNewPassword,
  setConfirmNewPassword,
  showConfirm,
  setShowConfirm,
  passwordLoading,
  onVerifyPassword,
  onChangePassword,
  onCancelFlow
}: PasswordChangeFormProps) {
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
                {language === 'tr' ? 'Aşama 1 / 2: Mevcut Şifre Doğrulama' : 'Step 1 / 2: Verify Current Password'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterOldPassword')}
          </p>

          <form onSubmit={onVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
              <button type="button" className="btn-secondary" onClick={onCancelFlow} disabled={passwordLoading}>
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
                {language === 'tr' ? 'Aşama 2 / 2: Yeni Şifre Tanımlama' : 'Step 2 / 2: Define New Password'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterNewPassword')}
          </p>

          <form onSubmit={onChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
              <button type="button" className="btn-secondary" onClick={onCancelFlow} disabled={passwordLoading}>
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
                {language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
