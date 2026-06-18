import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Lock, Mail, Phone, Shield, Eye, EyeOff, Loader2 } from 'lucide-react';
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
  regRole: 'seller' | 'mfr';
  setRegRole: (v: 'seller' | 'mfr') => void;
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
  onSubmit,
  submitting,
  getFieldClassName,
  getSelectClassName,
  formErrors,
  showErrors,
}: RegisterFormProps) {
  const [showRegPassword, setShowRegPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="auth-form-title-wrapper">
        <h2>{t('register')}</h2>
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
            <option value="+34">🇪span +34</option>
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
  );
}
