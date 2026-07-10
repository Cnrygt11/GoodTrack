import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { TranslationKey } from '../../services/translations';

interface RegisterFormProps {
  t: (key: TranslationKey) => string;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  regUsername: string;
  setRegUsername: (v: string) => void;
  regEmail: string;
  setRegEmail: (v: string) => void;
  countryCode: string;
  setCountryCode: (v: string) => void;
  phoneBody: string;
  setPhoneBody: (v: string) => void;
  regPassword: string;
  setRegPassword: (v: string) => void;
  regConfirm: string;
  setRegConfirm: (v: string) => void;
  regRole: 'seller' | 'mfr' | 'admin';
  setRegRole: (v: 'seller' | 'mfr' | 'admin') => void;
  adminSecret: string;
  setAdminSecret: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  getFieldClassName: (fieldName: string) => string;
  getSelectClassName: (fieldName: string) => string;
  formErrors: Record<string, string>;
  showErrors: boolean;
}

export default function RegisterForm({
  t,
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
  onSubmit,
  submitting,
  getFieldClassName,
  getSelectClassName,
  formErrors,
  showErrors,
}: RegisterFormProps) {
  const [searchParams] = useSearchParams();
  const adminMode = searchParams.get('adminMode') === 'true';
  const [showRegPassword, setShowRegPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate className="auth-form">
      <div className="auth-heading">
        <h1>{t('registerTitle')}</h1>
        <p>{t('registerSubtitle')}</p>
      </div>

      {/* Name Row */}
      <div className="auth-grid-2">
        <div className="auth-field">
          <label htmlFor="reg-firstname">{t('firstNameLabel')}</label>
          <input
            id="reg-firstname"
            type="text"
            autoComplete="given-name"
            placeholder={t('firstNamePlaceholder')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={getFieldClassName('firstName')}
          />
          {showErrors && formErrors.firstName && (
            <span className="auth-field-error">{formErrors.firstName}</span>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="reg-lastname">{t('lastNameLabel')}</label>
          <input
            id="reg-lastname"
            type="text"
            autoComplete="family-name"
            placeholder={t('lastNamePlaceholder')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={getFieldClassName('lastName')}
          />
          {showErrors && formErrors.lastName && (
            <span className="auth-field-error">{formErrors.lastName}</span>
          )}
        </div>
      </div>

      {/* Username Field */}
      <div className="auth-field">
        <label htmlFor="reg-username">{t('username')}</label>
        <input
          id="reg-username"
          type="text"
          autoComplete="username"
          placeholder={t('username')}
          value={regUsername}
          onChange={(e) => setRegUsername(e.target.value)}
          className={getFieldClassName('regUsername')}
        />
        {showErrors && formErrors.regUsername && (
          <span className="auth-field-error">{formErrors.regUsername}</span>
        )}
      </div>

      {/* Email Field */}
      <div className="auth-field">
        <label htmlFor="reg-email">{t('emailAddressLabel')}</label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder={t('emailAddressPlaceholder')}
          value={regEmail}
          onChange={(e) => setRegEmail(e.target.value)}
          className={getFieldClassName('regEmail')}
        />
        {showErrors && formErrors.regEmail && (
          <span className="auth-field-error">{formErrors.regEmail}</span>
        )}
      </div>

      {/* Phone Field */}
      <div className="auth-field">
        <label htmlFor="reg-phone">{t('phone')}</label>
        <div className="auth-phone-row">
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className={getSelectClassName('phoneBody')}
            aria-label={t('phone')}
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
            id="reg-phone"
            type="text"
            autoComplete="tel-national"
            placeholder="555 123 4567"
            value={phoneBody}
            onChange={(e) => setPhoneBody(e.target.value)}
            className={getFieldClassName('phoneBody')}
          />
        </div>
        {showErrors && formErrors.phoneBody && (
          <span className="auth-field-error">{formErrors.phoneBody}</span>
        )}
      </div>

      {/* Passwords Row */}
      <div className="auth-grid-2">
        <div className="auth-field">
          <label htmlFor="reg-password">{t('password')}</label>
          <div className="auth-input-wrap">
            <input
              id="reg-password"
              type={showRegPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('password')}
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className={getFieldClassName('regPassword')}
            />
            <button
              type="button"
              onClick={() => setShowRegPassword(!showRegPassword)}
              className="auth-password-toggle"
              aria-label={t('password')}
            >
              {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {showErrors && formErrors.regPassword && (
            <span className="auth-field-error">{formErrors.regPassword}</span>
          )}
        </div>
        <div className="auth-field">
          <label htmlFor="reg-confirm">{t('confirmPassword')}</label>
          <input
            id="reg-confirm"
            type={showRegPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder={t('confirmPassword')}
            value={regConfirm}
            onChange={(e) => setRegConfirm(e.target.value)}
            className={getFieldClassName('regConfirm')}
          />
          {showErrors && formErrors.regConfirm && (
            <span className="auth-field-error">{formErrors.regConfirm}</span>
          )}
        </div>
      </div>

      {/* Role Field */}
      <div className="auth-field">
        <label htmlFor="reg-role">{t('selectRole')}</label>
        <select
          id="reg-role"
          value={regRole}
          onChange={(e) => setRegRole(e.target.value as 'seller' | 'mfr' | 'admin')}
          className={getSelectClassName('regRole')}
        >
          <option value="seller">
            {t('seller')} {t('roleSellerInfo')}
          </option>
          <option value="mfr">
            {t('mfr')} {t('roleMfrInfo')}
          </option>
          {adminMode && <option value="admin">{t('roleAdminLabel')}</option>}
        </select>
      </div>

      {/* Admin Secret Field */}
      {regRole === 'admin' && (
        <div className="auth-field">
          <label htmlFor="admin-secret">{t('adminSecretLabel')}</label>
          <input
            id="admin-secret"
            type="password"
            value={adminSecret}
            onChange={(e) => setAdminSecret(e.target.value)}
            placeholder={t('adminSecretPlaceholder')}
            className={getFieldClassName('adminSecret')}
            required
          />
        </div>
      )}

      <button type="submit" className="auth-submit mfr" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" size={18} /> : t('register')}
      </button>

      <p className="auth-alt-action">
        {t('alreadyHaveAccount')}{' '}
        <Link to="/login" className="auth-alt-link mfr">
          {t('login')}
        </Link>
      </p>
    </form>
  );
}
