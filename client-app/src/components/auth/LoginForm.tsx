import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
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
    <form onSubmit={onSubmit} noValidate>
      <div className="auth-form-title-wrapper">
        <h2>{t('login')}</h2>
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
  );
}
