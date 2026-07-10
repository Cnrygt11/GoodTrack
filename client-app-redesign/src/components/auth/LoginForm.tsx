import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { TranslationKey } from '../../services/translations';

interface LoginFormProps {
  t: (key: TranslationKey) => string;
  loginUsername: string;
  setLoginUsername: (v: string) => void;
  loginPassword: string;
  setLoginPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  getFieldClassName: (fieldName: string) => string;
  formErrors: Record<string, string>;
  showErrors: boolean;
}

export default function LoginForm({
  t,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  onSubmit,
  submitting,
  getFieldClassName,
  formErrors,
  showErrors,
}: LoginFormProps) {
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="auth-form">
      <div className="auth-heading">
        <h1>{t('loginTitle')}</h1>
        <p>{t('loginSubtitle')}</p>
      </div>

      {/* Username Field */}
      <div className="auth-field">
        <label htmlFor="login-username">{t('username')}</label>
        <input
          id="login-username"
          type="text"
          autoComplete="username"
          placeholder={t('username')}
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
          className={getFieldClassName('loginUsername')}
        />
        {showErrors && formErrors.loginUsername && (
          <span className="auth-field-error">{formErrors.loginUsername}</span>
        )}
      </div>

      {/* Password Field */}
      <div className="auth-field">
        <label htmlFor="login-password">{t('password')}</label>
        <div className="auth-input-wrap">
          <input
            id="login-password"
            type={showLoginPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder={t('password')}
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className={getFieldClassName('loginPassword')}
          />
          <button
            type="button"
            onClick={() => setShowLoginPassword(!showLoginPassword)}
            className="auth-password-toggle"
            aria-label={t('password')}
          >
            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {showErrors && formErrors.loginPassword && (
          <span className="auth-field-error">{formErrors.loginPassword}</span>
        )}
      </div>

      <button type="submit" className="auth-submit seller" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" size={18} /> : t('login')}
      </button>

      <p className="auth-alt-action">
        {t('dontHaveAccount')}{' '}
        <Link to="/register" className="auth-alt-link seller">
          {t('register')}
        </Link>
      </p>
    </form>
  );
}
