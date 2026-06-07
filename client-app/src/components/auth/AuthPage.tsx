import React from 'react';
import useAuthPage from '../../hooks/useAuthPage';
import { Sun, Moon } from 'lucide-react';

export default function AuthPage() {
  const {
    theme,
    language,
    toggleTheme,
    setLanguage,
    t,
    activeTab,
    setActiveTab,
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
  } = useAuthPage();

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
                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? (language === 'tr' ? 'Giriş yapılıyor...' : 'Logging in...') : t('login')}
                </button>
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
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={{ width: '120px', flexShrink: 0 }}
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
                      placeholder={language === 'tr' ? '555 123 4567' : '555 123 4567'} 
                      value={phoneBody}
                      onChange={(e) => setPhoneBody(e.target.value)}
                      style={{ ...getInputStyle(phoneValid), flexGrow: 1 }}
                    />
                  </div>
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
                    <option value="seller">
                      {t('seller')} {language === 'tr' ? '(🛍️ Sipariş Yönetimi)' : '(🛍️ Order Management)'}
                    </option>
                    <option value="mfr">
                      {t('mfr')} {language === 'tr' ? '(🏭 Sipariş Tamamlama)' : '(🏭 Order Fulfill)'}
                    </option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={submitting}>
                  {submitting ? (language === 'tr' ? 'Kayıt yapılıyor...' : 'Registering...') : t('register')}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
