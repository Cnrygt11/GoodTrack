import { Link } from 'react-router-dom';
import useAuthPage from '../../hooks/useAuthPage';
import { Sun, Moon } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import VerificationPending from './VerificationPending';

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
    adminSecret,
    setAdminSecret,
    verificationPending,
    setVerificationPending,
    verificationUsername,
    submitting,
    handleLoginSubmit,
    handleRegisterSubmit,
    formErrors,
    showErrors
  } = useAuthPage(mode);

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
          {t('langToggleLabel')}
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
          <VerificationPending 
            t={t}
            verificationUsername={verificationUsername}
            setVerificationPending={setVerificationPending}
          />
        ) : (
          <>
            {activeTab === 'login' ? (
              <LoginForm
                t={t}
                loginUsername={loginUsername}
                setLoginUsername={setLoginUsername}
                loginPassword={loginPassword}
                setLoginPassword={setLoginPassword}
                onSubmit={handleLoginSubmit}
                submitting={submitting}
                getFieldClassName={getFieldClassName}
                formErrors={formErrors}
                showErrors={showErrors}
              />
            ) : (
              <RegisterForm
                t={t}
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                regUsername={regUsername}
                setRegUsername={setRegUsername}
                regEmail={regEmail}
                setRegEmail={setRegEmail}
                countryCode={countryCode}
                setCountryCode={setCountryCode}
                phoneBody={phoneBody}
                setPhoneBody={setPhoneBody}
                regPassword={regPassword}
                setRegPassword={setRegPassword}
                regConfirm={regConfirm}
                setRegConfirm={setRegConfirm}
                regRole={regRole}
                setRegRole={setRegRole}
                adminSecret={adminSecret}
                setAdminSecret={setAdminSecret}
                onSubmit={handleRegisterSubmit}
                submitting={submitting}
                getFieldClassName={getFieldClassName}
                getSelectClassName={getSelectClassName}
                formErrors={formErrors}
                showErrors={showErrors}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
