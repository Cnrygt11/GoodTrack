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
    showErrors,
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
    <div className="auth-page">
      <header className="auth-topbar">
        <Link to="/" className="auth-wordmark">
          <span className="auth-wordmark-mark" aria-hidden="true">
            G
          </span>
          Good<span className="auth-wordmark-accent">Track</span>
        </Link>

        <div className="auth-topbar-actions">
          <button
            type="button"
            className="auth-topbar-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <button
            type="button"
            className="auth-topbar-btn"
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
          >
            {t('langToggleLabel')}
          </button>
        </div>
      </header>

      <main className="auth-content">
        <div className="auth-panel">
          {verificationPending ? (
            <VerificationPending
              t={t}
              verificationUsername={verificationUsername}
              setVerificationPending={setVerificationPending}
            />
          ) : activeTab === 'login' ? (
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
        </div>
      </main>

      <footer className="auth-page-footer">© {new Date().getFullYear()} GoodTrack</footer>
    </div>
  );
}
