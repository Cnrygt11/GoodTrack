import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api } from '../../services/api';
import { Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState<'seller' | 'mfr'>('seller');

  // Email verification state
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationUsername, setVerificationUsername] = useState('');

  // Real-time validations
  const [usernameValid, setUsernameValid] = useState({ valid: true, dirty: false });
  const [emailValid, setEmailValid] = useState({ valid: true, dirty: false });
  const [phoneValid, setPhoneValid] = useState({ valid: true, dirty: false });
  const [passwordValid, setPasswordValid] = useState({ valid: true, dirty: false });
  const [confirmValid, setConfirmValid] = useState({ valid: true, dirty: false });

  // Validate Phone Number
  useEffect(() => {
    if (!regPhone) {
      setPhoneValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^\+?[0-9\s\-()]{10,20}$/;
    setPhoneValid({ valid: regex.test(regPhone), dirty: true });
  }, [regPhone]);

  // Validate Username
  useEffect(() => {
    if (!regUsername) {
      setUsernameValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^[a-z0-9_]{3,15}$/;
    setUsernameValid({ valid: regex.test(regUsername), dirty: true });
  }, [regUsername]);

  // Validate Email
  useEffect(() => {
    if (!regEmail) {
      setEmailValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    setEmailValid({ valid: regex.test(regEmail), dirty: true });
  }, [regEmail]);

  // Validate Password Length
  useEffect(() => {
    if (!regPassword) {
      setPasswordValid({ valid: true, dirty: false });
      return;
    }
    setPasswordValid({ valid: regPassword.length >= 6 && regPassword.length <= 20, dirty: true });
  }, [regPassword]);

  // Validate Password Match
  useEffect(() => {
    if (!regConfirm) {
      setConfirmValid({ valid: true, dirty: false });
      return;
    }
    setConfirmValid({ valid: regPassword === regConfirm, dirty: true });
  }, [regConfirm, regPassword]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.login(loginUsername.trim(), loginPassword);
      showToast(data.message || t('loginSuccess'));
      login(data.token, data.username, data.role, data.userId);
    } catch (err: any) {
      if (err.message && (err.message.includes('doğrulayın') || err.message.includes('verify your email'))) {
        setVerificationUsername(loginUsername.trim());
        setVerificationPending(true);
      }
      alert(err.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final checks
    const usernameRegex = /^[a-z0-9_]{3,15}$/;
    if (!usernameRegex.test(regUsername)) {
      alert(language === 'tr' ? 'Kullanıcı adı sadece İngilizce küçük harfler, rakamlar ve alt çizgi (_) içerebilir, 3-15 karakter uzunluğunda olmalıdır!' : 'Username can only contain English lowercase letters, numbers and underscore (_), and must be 3-15 characters long!');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(regEmail)) {
      alert(language === 'tr' ? 'Geçersiz veya şüpheli e-posta formatı!' : 'Invalid or suspicious email format!');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    if (!phoneRegex.test(regPhone)) {
      alert(t('phoneRequired'));
      return;
    }

    if (regPassword.length < 6 || regPassword.length > 20) {
      alert(language === 'tr' ? 'Şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!' : 'Password must be between 6 and 20 characters long!');
      return;
    }

    if (regPassword !== regConfirm) {
      alert(t('passwordMismatch'));
      return;
    }

    try {
      const data = await api.register({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhone.trim(),
        password: regPassword,
        confirmpassword: regConfirm,
        role: regRole,
      });

      showToast(data.message || t('registerSuccess'));
      setActiveTab('login');
      setLoginUsername(regUsername.trim());
      
      // Clear inputs
      setFirstName('');
      setLastName('');
      setRegUsername('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirm('');
      setRegRole('seller');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getInputStyle = (validationState: { valid: boolean; dirty: boolean }) => {
    if (!validationState.dirty) return {};
    return {
      borderColor: validationState.valid ? 'var(--success)' : 'var(--danger)',
    };
  };

  return (
    <div id="splash" style={{ position: 'relative' }}>
      {/* Theme & Language Switchers for Guest / Auth Screen */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 100
      }}>
        {/* Theme Toggle */}
        <button
          type="button"
          className="btn-secondary"
          onClick={toggleTheme}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px' }}
          title={theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Language Toggle */}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
          style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px' }}
        >
          {language === 'tr' ? 'EN' : 'TR'}
        </button>
      </div>

      <div>
        <div className="splash-title">
          {t('appTitle')}<br /><span>{t('appSubTitle')}</span>
        </div>
        <p className="splash-sub" style={{ textAlign: 'center', marginTop: '12px' }}>
          {activeTab === 'login' ? t('welcomeBack') : t('joinUs')}
        </p>
      </div>

      <div className="auth-card">
        {verificationPending ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'rgba(6, 182, 212, 0.1)', 
              color: 'var(--primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto 20px', 
              fontSize: '28px',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.1)'
            }}>
              ✉️
            </div>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-main)', fontSize: '20px', fontWeight: 600 }}>
              {language === 'tr' ? 'Doğrulama E-postası Gönderildi' : 'Verification Email Sent'}
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--text-sub)', lineHeight: '1.6', marginBottom: '24px' }}>
              {language === 'tr' 
                ? `Lütfen ${verificationUsername} hesabı için e-posta kutunuzu kontrol edin ve size gönderdiğimiz doğrulama linkine tıklayın. Hesabınız aktif edildiğinde giriş yapabilirsiniz.`
                : `Please check your inbox for user ${verificationUsername} and click the verification link we sent you. You can log in once your account is activated.`}
            </p>
            <button 
              type="button" 
              className="btn-primary" 
              style={{ width: '100%' }}
              onClick={() => {
                setVerificationPending(false);
                setActiveTab('login');
              }}
            >
              {language === 'tr' ? 'Giriş Sayfasına Dön' : 'Back to Login'}
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button 
                type="button"
                className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
                onClick={() => setActiveTab('login')}
              >
                {t('login')}
              </button>
              <button 
                type="button"
                className={`auth-tab ${activeTab === 'register' ? 'active register' : ''}`}
                onClick={() => setActiveTab('register')}
              >
                {t('register')}
              </button>
            </div>

            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{t('username')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder={t('username')} 
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>{t('password')}</label>
                  <input 
                    type="password" 
                    required 
                    placeholder={t('password')} 
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>{t('login')}</button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label>{language === 'tr' ? 'İsim' : 'First Name'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={language === 'tr' ? 'İsminiz' : 'First Name'} 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>{language === 'tr' ? 'Soyisim' : 'Last Name'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={language === 'tr' ? 'Soyisminiz' : 'Last Name'} 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{t('username')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder={t('username')} 
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    style={getInputStyle(usernameValid)}
                  />
                  {usernameValid.dirty && !usernameValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                      {language === 'tr' 
                        ? 'Kullanıcı adı 3-15 karakter olmalı, sadece küçük harf, rakam ve _ içermelidir!' 
                        : 'Username must be 3-15 chars, containing only lowercase letters, numbers, and _!'}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{language === 'tr' ? 'E-posta Adresi' : 'Email Address'}</label>
                  <input 
                    type="email" 
                    required 
                    placeholder={language === 'tr' ? 'E-posta adresinizi girin' : 'Enter email address'} 
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={getInputStyle(emailValid)}
                  />
                  {emailValid.dirty && !emailValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                      {language === 'tr'
                        ? 'Geçersiz veya şüpheli e-posta formatı! (Örn: ad.soyad@gmail.com)'
                        : 'Invalid email format! (e.g., name@domain.com)'}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{t('phone')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder={language === 'tr' ? 'Telefon numaranızı girin (Örn: 05551234567)' : 'Enter phone number (e.g., +905551234567)'} 
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={getInputStyle(phoneValid)}
                  />
                  {phoneValid.dirty && !phoneValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px' }}>
                      {t('phoneRequired')}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label>{t('password')}</label>
                    <input 
                      type="password" 
                      required 
                      placeholder={t('password')} 
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      style={getInputStyle(passwordValid)}
                    />
                    {passwordValid.dirty && !passwordValid.valid && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '4px' }}>
                        {language === 'tr' ? 'Şifre 6-20 karakter olmalı!' : 'Password must be 6-20 chars!'}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>{t('confirmPassword')}</label>
                    <input 
                      type="password" 
                      required 
                      placeholder={t('confirmPassword')} 
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      style={getInputStyle(confirmValid)}
                    />
                    {confirmValid.dirty && !confirmValid.valid && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '4px' }}>
                        {t('passwordMismatch')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label>{t('selectRole')}</label>
                  <select 
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as 'seller' | 'mfr')}
                    required
                  >
                    <option value="seller">{t('seller')} {language === 'tr' ? '(🛍️ Sipariş Yönetimi)' : '(🛍️ Order Management)'}</option>
                    <option value="mfr">{t('mfr')} {language === 'tr' ? '(🏭 Sipariş Tamamlama)' : '(🏭 Order Fulfill)'}</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }}>{t('register')}</button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
