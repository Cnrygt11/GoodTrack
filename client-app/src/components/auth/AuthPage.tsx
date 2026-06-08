import React from 'react';
import { Link } from 'react-router-dom';
import useAuthPage from '../../hooks/useAuthPage';
import { Sun, Moon } from 'lucide-react';

interface AuthPageProps {
  mode?: 'login' | 'register';
}

export default function AuthPage({ mode = 'login' }: AuthPageProps) {
  const {
    theme,
    language,
    toggleTheme,
    setLanguage,
    t,
    activeTab,
    loginUsername,
    setLoginUsername,
    loginPassword,
    setLoginPassword,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    regUsername,
    setRegUsername,
    regEmail,
    setRegEmail,
    countryCode,
    setCountryCode,
    phoneBody,
    setPhoneBody,
    regPassword,
    setRegPassword,
    regConfirm,
    setRegConfirm,
    regRole,
    setRegRole,
    verificationPending,
    setVerificationPending,
    verificationUsername,
    submitting,
    usernameValid,
    emailValid,
    phoneValid,
    passwordValid,
    confirmValid,
    handleLoginSubmit,
    handleRegisterSubmit,
    getInputStyle
  } = useAuthPage(mode);

  const isTr = language === 'tr';

  return (
    <div id="splash" style={{ 
      position: 'relative', 
      overflowY: 'auto', 
      padding: '40px 20px',
      boxSizing: 'border-box'
    }}>
      {/* Theme & Language Switchers */}
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

      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <div className="splash-title" style={{ cursor: 'pointer', fontSize: 'clamp(36px, 6vw, 56px)' }}>
            GOOD<span style={{ color: 'var(--accent-seller)' }}>TRACK</span>
          </div>
        </Link>
        <p className="splash-sub" style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px' }}>
          {activeTab === 'login' ? t('welcomeBack') : t('joinUs')}
        </p>
      </div>

      <div className="auth-card" style={{ marginTop: '10px' }}>
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
                // Switch manually or route back
              }}
            >
              {language === 'tr' ? 'Giriş Sayfasına Dön' : 'Back to Login'}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text)', textAlign: 'center', letterSpacing: '0.5px' }}>
                  {t('login')}
                </h2>
                
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{t('username')}</label>
                  <input 
                    type="text" 
                    required 
                    placeholder={t('username')} 
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    style={{ height: '42px', boxSizing: 'border-box' }}
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
                    style={{ height: '42px', boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }} disabled={submitting}>
                  {submitting ? (language === 'tr' ? 'Giriş yapılıyor...' : 'Logging in...') : t('login')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted)' }}>
                    {language === 'tr' ? 'Hesabınız yok mu?' : "Don't have an account?"}{' '}
                  </span>
                  <Link to="/register" style={{ color: 'var(--accent-seller)', fontWeight: '600', textDecoration: 'none' }}>
                    {t('register')}
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: 'var(--text)', textAlign: 'center', letterSpacing: '0.5px' }}>
                  {t('register')}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label>{language === 'tr' ? 'İsim' : 'First Name'}</label>
                    <input 
                      type="text" 
                      required 
                      placeholder={language === 'tr' ? 'İsminiz' : 'First Name'} 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{ height: '42px', boxSizing: 'border-box' }}
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
                      style={{ height: '42px', boxSizing: 'border-box' }}
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
                    style={{ ...getInputStyle(usernameValid), height: '42px', boxSizing: 'border-box' }}
                  />
                  {usernameValid.dirty && !usernameValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '2px' }}>
                      {language === 'tr' 
                        ? 'Kullanıcı adı sadece küçük harf, rakam ve _ içerebilir (3-15 kar.)' 
                        : 'Lowercase, digits, and _ only (3-15 chars)'}
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
                    style={{ ...getInputStyle(emailValid), height: '42px', boxSizing: 'border-box' }}
                  />
                  {emailValid.dirty && !emailValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '2px' }}>
                      {language === 'tr'
                        ? 'Geçersiz veya şüpheli e-posta formatı!'
                        : 'Invalid email format!'}
                    </span>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>{t('phone')}</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: '90px', flexShrink: 0, height: '42px', boxSizing: 'border-box', padding: '10px 8px' }}
                    >
                      <option value="+90">🇹🇷 +90</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+44">🇬🇧 +44</option>
                      <option value="+49">🇩🇪 +49</option>
                      <option value="+33">🇫🇷 +33</option>
                      <option value="+39">🇮🇹 +39</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+994">🇦🇿 +994</option>
                    </select>
                    <input 
                      type="text" 
                      required 
                      placeholder="555 123 4567" 
                      value={phoneBody}
                      onChange={(e) => setPhoneBody(e.target.value)}
                      style={{ ...getInputStyle(phoneValid), flexGrow: 1, height: '42px', boxSizing: 'border-box' }}
                    />
                  </div>
                  {phoneValid.dirty && !phoneValid.valid && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '2px' }}>
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
                      style={{ ...getInputStyle(passwordValid), height: '42px', boxSizing: 'border-box' }}
                    />
                    {passwordValid.dirty && !passwordValid.valid && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '2px' }}>
                        {language === 'tr' ? '6-20 karakter olmalı!' : 'Must be 6-20 chars!'}
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
                      style={{ ...getInputStyle(confirmValid), height: '42px', boxSizing: 'border-box' }}
                    />
                    {confirmValid.dirty && !confirmValid.valid && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '2px' }}>
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
                    style={{ height: '42px', boxSizing: 'border-box' }}
                  >
                    <option value="seller">
                      {t('seller')} {language === 'tr' ? '(🛍️ Sipariş)' : '(🛍️ Order)'}
                    </option>
                    <option value="mfr">
                      {t('mfr')} {language === 'tr' ? '(🏭 Üretim)' : '(🏭 Fulfill)'}
                    </option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', height: '42px' }} disabled={submitting}>
                  {submitting ? (language === 'tr' ? 'Kayıt yapılıyor...' : 'Registering...') : t('register')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--muted)' }}>
                    {language === 'tr' ? 'Zaten hesabınız var mı?' : 'Already have an account?'}{' '}
                  </span>
                  <Link to="/login" style={{ color: 'var(--accent-mfr)', fontWeight: '600', textDecoration: 'none' }}>
                    {t('login')}
                  </Link>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
