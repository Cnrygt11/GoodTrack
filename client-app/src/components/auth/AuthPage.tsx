import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthPage from '../../hooks/useAuthPage';
import { Sun, Moon, Loader2, User, Lock, Mail, Phone, Shield, Eye, EyeOff } from 'lucide-react';

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
    handleLoginSubmit,
    handleRegisterSubmit,
    formErrors,
    showErrors
  } = useAuthPage(mode);

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Helper function to dynamically calculate input styles based on error presence
  const getFieldStyle = (fieldName: string) => {
    const hasError = showErrors && formErrors[fieldName];
    return {
      height: '42px',
      boxSizing: 'border-box' as const,
      width: '100%',
      paddingLeft: '38px',
      paddingRight: fieldName.toLowerCase().includes('password') ? '40px' : '12px',
      background: 'var(--surface)',
      color: 'var(--text)',
      border: hasError ? '1.5px solid var(--danger)' : '1px solid var(--border)',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      boxShadow: hasError ? '0 0 8px rgba(239, 68, 68, 0.15)' : 'none',
    };
  };

  const getSelectStyle = (fieldName: string) => {
    const hasError = showErrors && formErrors[fieldName];
    return {
      height: '42px',
      boxSizing: 'border-box' as const,
      background: 'var(--surface)',
      color: 'var(--text)',
      border: hasError ? '1.5px solid var(--danger)' : '1px solid var(--border)',
      borderRadius: '8px',
      outline: 'none',
      fontSize: '14px',
      padding: '0 8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    };
  };

  return (
    <div id="splash" style={{ 
      position: 'relative', 
      overflowY: 'auto', 
      padding: '40px 20px',
      boxSizing: 'border-box',
      background: theme === 'dark' 
        ? 'radial-gradient(ellipse at 60% 40%, #151109 0%, #09090b 80%)'
        : 'radial-gradient(ellipse at 60% 40%, #fefcf3 0%, #f4f4f5 80%)',
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
          <div className="splash-title" style={{ 
            cursor: 'pointer', 
            fontSize: 'clamp(36px, 6vw, 56px)',
            textShadow: theme === 'dark' ? '0 0 30px rgba(245, 166, 35, 0.25)' : 'none'
          }}>
            GOOD<span style={{ color: 'var(--accent-seller)' }}>TRACK</span>
          </div>
        </Link>
        <p className="splash-sub" style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px' }}>
          {activeTab === 'login' ? t('welcomeBack') : t('joinUs')}
        </p>
      </div>

      <div className="auth-card" style={{ 
        marginTop: '15px',
        border: '1px solid var(--border)',
        boxShadow: theme === 'dark' ? '0 24px 64px rgba(0, 0, 0, 0.7)' : '0 16px 48px rgba(9, 9, 11, 0.08)',
        background: theme === 'dark' 
          ? 'linear-gradient(135deg, rgba(24, 24, 27, 0.85) 0%, rgba(15, 15, 18, 0.95) 100%)' 
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(244, 244, 245, 0.95) 100%)',
      }}>
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
              }}
            >
              {language === 'tr' ? 'Giriş Sayfasına Dön' : 'Back to Login'}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} noValidate>
                <div style={{ position: 'relative', marginBottom: '24px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text)', letterSpacing: '0.5px' }}>
                    {t('login')}
                  </h2>
                  <div style={{ width: '32px', height: '3px', background: 'var(--accent-seller)', margin: '0 auto', borderRadius: '2px' }} />
                </div>
                
                {/* Username Field */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>{t('username')}</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input 
                      type="text" 
                      placeholder={t('username')} 
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      style={getFieldStyle('loginUsername')}
                    />
                  </div>
                  {showErrors && formErrors.loginUsername && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.loginUsername}
                    </span>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.5px' }}>{t('password')}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input 
                      type={showLoginPassword ? 'text' : 'password'} 
                      placeholder={t('password')} 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={getFieldStyle('loginPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
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
                        alignItems: 'center',
                        padding: 0
                      }}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {showErrors && formErrors.loginPassword && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.loginPassword}
                    </span>
                  )}
                </div>

                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ 
                    width: '100%', 
                    height: '42px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: theme === 'dark' ? '0 4px 14px rgba(245, 166, 35, 0.25)' : 'none'
                  }} 
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : t('login')}
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
              <form onSubmit={handleRegisterSubmit} noValidate>
                <div style={{ position: 'relative', marginBottom: '24px', textAlign: 'center' }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text)', letterSpacing: '0.5px' }}>
                    {t('register')}
                  </h2>
                  <div style={{ width: '32px', height: '3px', background: 'var(--accent-mfr)', margin: '0 auto', borderRadius: '2px' }} />
                </div>

                {/* Name Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>{language === 'tr' ? 'İSİM' : 'FIRST NAME'}</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type="text" 
                        placeholder={language === 'tr' ? 'Adınız' : 'First Name'} 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={getFieldStyle('firstName')}
                      />
                    </div>
                    {showErrors && formErrors.firstName && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '3px', display: 'block' }}>
                        {formErrors.firstName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>{language === 'tr' ? 'SOYİSİM' : 'LAST NAME'}</label>
                    <div style={{ position: 'relative' }}>
                      <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type="text" 
                        placeholder={language === 'tr' ? 'Soyadınız' : 'Last Name'} 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={getFieldStyle('lastName')}
                      />
                    </div>
                    {showErrors && formErrors.lastName && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '3px', display: 'block' }}>
                        {formErrors.lastName}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Username Field */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700' }}>{t('username')}</label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input 
                      type="text" 
                      placeholder={t('username')} 
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      style={getFieldStyle('regUsername')}
                    />
                  </div>
                  {showErrors && formErrors.regUsername && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.regUsername}
                    </span>
                  )}
                </div>

                {/* Email Field */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700' }}>{language === 'tr' ? 'E-POSTA ADRESİ' : 'EMAIL ADDRESS'}</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                    <input 
                      type="email" 
                      placeholder={language === 'tr' ? 'E-posta adresinizi girin' : 'Enter email address'} 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      style={getFieldStyle('regEmail')}
                    />
                  </div>
                  {showErrors && formErrors.regEmail && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.regEmail}
                    </span>
                  )}
                </div>

                {/* Phone Field */}
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700' }}>{t('phone')}</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', position: 'relative' }}>
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      style={getSelectStyle('phoneBody')}
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
                    <div style={{ position: 'relative', flexGrow: 1 }}>
                      <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type="text" 
                        placeholder="555 123 4567" 
                        value={phoneBody}
                        onChange={(e) => setPhoneBody(e.target.value)}
                        style={getFieldStyle('phoneBody')}
                      />
                    </div>
                  </div>
                  {showErrors && formErrors.phoneBody && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.phoneBody}
                    </span>
                  )}
                </div>

                {/* Passwords Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>{t('password')}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type={showRegPassword ? 'text' : 'password'} 
                        placeholder={t('password')} 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={getFieldStyle('regPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: 0
                        }}
                      >
                        {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {showErrors && formErrors.regPassword && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '3px', display: 'block' }}>
                        {formErrors.regPassword}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '11px', fontWeight: '700' }}>{t('confirmPassword')}</label>
                    <div style={{ position: 'relative' }}>
                      <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type={showRegPassword ? 'text' : 'password'} 
                        placeholder={t('confirmPassword')} 
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        style={getFieldStyle('regConfirm')}
                      />
                    </div>
                    {showErrors && formErrors.regConfirm && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '3px', display: 'block' }}>
                        {formErrors.regConfirm}
                      </span>
                    )}
                  </div>
                </div>

                {/* Role Field */}
                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700' }}>{t('selectRole')}</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Shield size={16} style={{ position: 'absolute', left: '12px', color: 'var(--muted)', zIndex: 10 }} />
                    <select 
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'seller' | 'mfr')}
                      style={{
                        ...getSelectStyle('regRole'),
                        width: '100%',
                        paddingLeft: '38px',
                      }}
                    >
                      <option value="seller">
                        {t('seller')} {language === 'tr' ? '(🛍️ Sipariş Veren)' : '(🛍️ Order Placement)'}
                      </option>
                      <option value="mfr">
                        {t('mfr')} {language === 'tr' ? '(🏭 Üretici / Atölye)' : '(🏭 Manufacturer / Workshop)'}
                      </option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary mfr" 
                  style={{ 
                    width: '100%', 
                    height: '42px', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    boxShadow: theme === 'dark' ? '0 4px 14px rgba(6, 182, 212, 0.25)' : 'none'
                  }} 
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : t('register')}
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
