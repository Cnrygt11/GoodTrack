import React, { useState, useEffect } from 'react';
import { api, UserProfile } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { ShieldCheck, User, Mail, Phone, Key, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';

export default function MyAccountPage() {
  const { user, setActiveScreen } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow State: 'profile' | 'verify-password' | 'new-password'
  const [flowStep, setFlowStep] = useState<'profile' | 'verify-password' | 'new-password'>('profile');

  // Password Input Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Show/Hide Password States
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Profil yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      alert(language === 'tr' ? 'Lütfen mevcut şifrenizi girin!' : 'Please enter your current password!');
      return;
    }

    try {
      setActionLoading(true);
      await api.verifyPassword(oldPassword);
      setFlowStep('new-password');
      showToast(language === 'tr' ? 'Şifre doğrulandı, yeni şifre belirleyebilirsiniz.' : 'Password verified, you can now set your new password.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      alert(language === 'tr' ? 'Lütfen tüm alanları doldurun!' : 'Please fill in all fields!');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      alert(language === 'tr' ? 'Yeni şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!' : 'New password must be between 6 and 20 characters long!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert(t('passwordMismatch'));
      return;
    }

    try {
      setActionLoading(true);
      await api.changePassword(oldPassword, newPassword, confirmNewPassword);
      showToast(t('passwordChangeSuccess'));
      // Reset flow
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFlowStep('profile');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelFlow = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFlowStep('profile');
  };

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {language === 'tr' ? 'Hesap bilgileri yükleniyor...' : 'Loading account details...'}
        </span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Hata / Error</h3>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{error || 'Profil verileri alınamadı.'}</p>
        <button className="btn-secondary" onClick={fetchProfile}>
          {language === 'tr' ? 'Yeniden Dene' : 'Try Again'}
        </button>
      </div>
    );
  }

  const roleLabel = profile.role === 'seller' ? t('seller') : t('mfr');
  const accentColor = profile.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = profile.role === 'seller' ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Back to dashboard breadcrumb */}
      <button 
        onClick={() => setActiveScreen(profile.role === 'mfr' ? 'mfr' : 'seller')}
        className="btn-back" 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} />
        {language === 'tr' ? 'Kontrol Paneline Dön' : 'Back to Dashboard'}
      </button>

      {flowStep === 'profile' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '12px', 
              background: glowBg, 
              color: accentColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${accentColor}`
            }}>
              <User size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '1px' }}>{t('profileTitle')}</h2>
              <span className={`badge-role ${profile.role}`} style={{ marginTop: '6px', display: 'inline-block' }}>
                {roleLabel}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Full Name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={16} style={{ color: 'var(--muted)' }} />
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {language === 'tr' ? 'Ad Soyad' : 'Name'}
                </span>
              </div>
              <strong style={{ fontSize: '14px' }}>{profile.firstName} {profile.lastName}</strong>
            </div>

            {/* Username */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <User size={16} style={{ color: 'var(--muted)' }} />
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {t('username')}
                </span>
              </div>
              <strong style={{ fontSize: '14px' }}>@{profile.username}</strong>
            </div>

            {/* Email */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={16} style={{ color: 'var(--muted)' }} />
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  E-posta
                </span>
              </div>
              <strong style={{ fontSize: '14px' }}>{profile.email}</strong>
            </div>

            {/* Phone */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={16} style={{ color: 'var(--muted)' }} />
                <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {t('phone')}
                </span>
              </div>
              <strong style={{ fontSize: '14px' }}>{profile.phoneNumber || '-'}</strong>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn-secondary" 
              onClick={() => setFlowStep('verify-password')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderColor: accentColor,
                color: accentColor,
                background: 'transparent'
              }}
            >
              <Key size={14} />
              {t('changePasswordBtn')}
            </button>
          </div>
        </div>
      )}

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
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={actionLoading}>
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
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="animate-spin" size={14} />}
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
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={actionLoading}>
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
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="animate-spin" size={14} />}
                {language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
