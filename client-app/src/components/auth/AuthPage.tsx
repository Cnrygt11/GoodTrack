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

  // Helper function to dynamically calculate input classes based on error presence
  const getFieldClassName = (fieldName: string) => {
    const hasError = showErrors && formErrors[fieldName];
    const isPassword = fieldName.toLowerCase().includes('password');
    return `auth-input-field${isPassword ? ' password-input' : ''}${hasError ? ' has-error' : ''}`;
  };

  const getSelectClassName = (fieldName: string) => {
    const hasError = showErrors && formErrors[fieldName];
    return `auth-select-field${hasError ? ' has-error' : ''}`;
  };

  return (
    <div
      id="splash"
      className={`auth-splash-container ${theme === 'dark' ? 'dark-bg' : 'light-bg'}`}
    >
      {/* Theme & Language Switchers */}
      <div className="auth-switchers-row">
        {/* Theme Toggle */}
        <button
          type="button"
          className="btn-secondary auth-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        {/* Language Toggle */}
        <button
          type="button"
          className="btn-secondary auth-lang-btn"
          onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
        >
          {language === 'tr' ? 'EN' : 'TR'}
        </button>
      </div>

      <div className="auth-title-container">
        <Link to="/" className="auth-title-link">
          <div className="splash-title auth-logo-title">
            GOOD<span style={{ color: 'var(--accent-seller)' }}>TRACK</span>
          </div>
        </Link>
        <p className="splash-sub auth-splash-subtitle">
          {activeTab === 'login' ? t('welcomeBack') : t('joinUs')}
        </p>
      </div>

      <div className="auth-card">
        {verificationPending ? (
          <div className="auth-verification-pending">
            <div className="verification-pending-icon">
              ✉️
            </div>
            <h3>
              {t('verificationEmailSent')}
            </h3>
            <p>
              {t('verificationEmailInstruction').replace('{username}', verificationUsername)}
            </p>
            <button 
              type="button" 
              className="btn-primary auth-width-full" 
              onClick={() => {
                setVerificationPending(false);
              }}
            >
              {t('backToLogin')}
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit} noValidate>
                <div className="auth-form-title-wrapper">
                  <h2>
                    {t('login')}
                  </h2>
                  <div className="auth-form-title-underline" />
                </div>
                
                {/* Username Field */}
                <div className="form-group">
                  <label>{t('username')}</label>
                  <div className="auth-relative-flex-center">
                    <User size={16} />
                    <input 
                      type="text" 
                      placeholder={t('username')} 
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className={getFieldClassName('loginUsername')}
                    />
                  </div>
                  {showErrors && formErrors.loginUsername && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.loginUsername}
                    </span>
                  )}
                </div>

                {/* Password Field */}
                <div className="form-group mb-24">
                  <label>{t('password')}</label>
                  <div className="auth-relative-flex-center">
                    <Lock size={16} />
                    <input 
                      type={showLoginPassword ? 'text' : 'password'} 
                      placeholder={t('password')} 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={getFieldClassName('loginPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="auth-password-toggle"
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
                  className="btn-primary auth-submit-btn seller" 
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : t('login')}
                </button>

                <div className="auth-footer-link-wrapper">
                  <span style={{ color: 'var(--muted)' }}>
                    {t('dontHaveAccount')}{' '}
                  </span>
                  <Link to="/register" style={{ color: 'var(--accent-seller)', fontWeight: '600', textDecoration: 'none' }}>
                    {t('register')}
                  </Link>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} noValidate>
                <div className="auth-form-title-wrapper">
                  <h2>
                    {t('register')}
                  </h2>
                  <div className="auth-form-title-underline mfr" />
                </div>

                {/* Name Row */}
                <div className="auth-grid-2">
                  <div className="form-group">
                    <label>{t('firstNameLabel')}</label>
                    <div className="auth-relative-flex-center">
                      <User size={14} />
                      <input 
                        type="text" 
                        placeholder={t('firstNamePlaceholder')} 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={getFieldClassName('firstName')}
                      />
                    </div>
                    {showErrors && formErrors.firstName && (
                      <span style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '3px', display: 'block' }}>
                        {formErrors.firstName}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>{t('lastNameLabel')}</label>
                    <div className="auth-relative-flex-center">
                      <User size={14} />
                      <input 
                        type="text" 
                        placeholder={t('lastNamePlaceholder')} 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={getFieldClassName('lastName')}
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
                <div className="form-group mb-14">
                  <label>{t('username')}</label>
                  <div className="auth-relative-flex-center">
                    <User size={16} />
                    <input 
                      type="text" 
                      placeholder={t('username')} 
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className={getFieldClassName('regUsername')}
                    />
                  </div>
                  {showErrors && formErrors.regUsername && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.regUsername}
                    </span>
                  )}
                </div>

                {/* Email Field */}
                <div className="form-group mb-14">
                  <label>{t('emailAddressLabel')}</label>
                  <div className="auth-relative-flex-center">
                    <Mail size={16} />
                    <input 
                      type="email" 
                      placeholder={t('emailAddressPlaceholder')} 
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className={getFieldClassName('regEmail')}
                    />
                  </div>
                  {showErrors && formErrors.regEmail && (
                    <span style={{ color: 'var(--danger)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      {formErrors.regEmail}
                    </span>
                  )}
                </div>

                {/* Phone Field */}
                <div className="form-group mb-14">
                  <label>{t('phone')}</label>
                  <div className="auth-phone-row">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className={getSelectClassName('phoneBody')}
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
                    <div className="auth-flex-grow-relative">
                      <Phone size={14} />
                      <input 
                        type="text" 
                        placeholder="555 123 4567" 
                        value={phoneBody}
                        onChange={(e) => setPhoneBody(e.target.value)}
                        className={getFieldClassName('phoneBody')}
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
                <div className="auth-grid-2">
                  <div className="form-group">
                    <label>{t('password')}</label>
                    <div className="auth-relative-flex-center">
                      <Lock size={14} />
                      <input 
                        type={showRegPassword ? 'text' : 'password'} 
                        placeholder={t('password')} 
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className={getFieldClassName('regPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="auth-password-toggle small-right"
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
                    <label>{t('confirmPassword')}</label>
                    <div className="auth-relative-flex-center">
                      <Lock size={14} />
                      <input 
                        type={showRegPassword ? 'text' : 'password'} 
                        placeholder={t('confirmPassword')} 
                        value={regConfirm}
                        onChange={(e) => setRegConfirm(e.target.value)}
                        className={getFieldClassName('regConfirm')}
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
                <div className="form-group mb-24">
                  <label>{t('selectRole')}</label>
                  <div className="auth-relative-flex-center">
                    <Shield size={16} />
                    <select 
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as 'seller' | 'mfr')}
                      className={`${getSelectClassName('regRole')} full-width-icon`}
                    >
                      <option value="seller">
                        {t('seller')} {t('roleSellerInfo')}
                      </option>
                      <option value="mfr">
                        {t('mfr')} {t('roleMfrInfo')}
                      </option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn-primary auth-submit-btn mfr" 
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : t('register')}
                </button>

                <div className="auth-footer-link-wrapper">
                  <span style={{ color: 'var(--muted)' }}>
                    {t('alreadyHaveAccount')}{' '}
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
