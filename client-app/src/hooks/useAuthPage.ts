import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';

export default function useAuthPage(initialMode?: 'login' | 'register') {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialMode || 'login');

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
      setFormErrors({});
      setShowErrors(false);
    }
  }, [initialMode]);

  // Login inputs
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneBody, setPhoneBody] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regRole, setRegRole] = useState<'seller' | 'mfr'>('seller');

  // Form error state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showErrors, setShowErrors] = useState(false);

  // Email verification state
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationUsername, setVerificationUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSubmitting = useRef(false);

  // Real-time validations (derived with useMemo)
  const phoneValid = useMemo(() => {
    if (!regPhone) return { valid: true, dirty: false };
    const regex = /^\+?[0-9\s\-()]{10,20}$/;
    return { valid: regex.test(regPhone), dirty: true };
  }, [regPhone]);

  const usernameValid = useMemo(() => {
    if (!regUsername) return { valid: true, dirty: false };
    const regex = /^[a-z0-9_]{3,15}$/;
    return { valid: regex.test(regUsername), dirty: true };
  }, [regUsername]);

  const emailValid = useMemo(() => {
    if (!regEmail) return { valid: true, dirty: false };
    const regex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    return { valid: regex.test(regEmail), dirty: true };
  }, [regEmail]);

  const passwordValid = useMemo(() => {
    if (!regPassword) return { valid: true, dirty: false };
    return { valid: regPassword.length >= 6 && regPassword.length <= 20, dirty: true };
  }, [regPassword]);

  const confirmValid = useMemo(() => {
    if (!regConfirm) return { valid: true, dirty: false };
    return { valid: regPassword === regConfirm, dirty: true };
  }, [regConfirm, regPassword]);

  // Combine countryCode and phoneBody to update regPhone
  useEffect(() => {
    const cleanBody = phoneBody.replace(/\s+/g, '');
    setRegPhone(cleanBody ? `${countryCode}${cleanBody}` : '');
  }, [countryCode, phoneBody]);

  // Read email verification query parameters from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const verificationError = params.get('verificationError');

    if (verified === 'true') {
      showToast(t('verificationSuccess'));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verificationError) {
      showToast(verificationError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [showToast, t]);

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!loginUsername.trim()) {
      errors.loginUsername = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!loginPassword) {
      errors.loginPassword = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast(t('fillAllFields'));
      return;
    }

    if (isSubmitting.current) return;
    try {
      isSubmitting.current = true;
      setSubmitting(true);
      const data = await api.login(loginUsername.trim(), loginPassword);
      showToast(t('loginSuccess'));
      login(data.token, data.username, data.role, data.userId);
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err);
      if (errorMessage.includes('doğrulayın') || errorMessage.includes('verify your email')) {
        setVerificationUsername(loginUsername.trim());
        setVerificationPending(true);
      }
      showToast(errorMessage);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  }, [loginUsername, loginPassword, t, login, showToast, language]);

  const handleRegisterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);

    const errors: Record<string, string> = {};
    if (!firstName.trim()) {
      errors.firstName = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!lastName.trim()) {
      errors.lastName = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!regUsername.trim()) {
      errors.regUsername = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!regEmail.trim()) {
      errors.regEmail = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!phoneBody.trim()) {
      errors.phoneBody = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!regPassword) {
      errors.regPassword = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }
    if (!regConfirm) {
      errors.regConfirm = language === 'tr' ? 'Bu alan boş bırakılamaz.' : 'This field cannot be empty.';
    }

    // Regex / length / match checks
    const usernameRegex = /^[a-z0-9_]{3,15}$/;
    if (regUsername.trim() && !usernameRegex.test(regUsername.trim())) {
      errors.regUsername = t('usernameInvalid');
    }

    const emailRegex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    if (regEmail.trim() && !emailRegex.test(regEmail.trim())) {
      errors.regEmail = t('emailInvalid');
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    if (regPhone && !phoneRegex.test(regPhone)) {
      errors.phoneBody = t('phoneInvalid');
    }

    if (regPassword && (regPassword.length < 6 || regPassword.length > 20)) {
      errors.regPassword = t('passwordLengthError');
    }

    if (regConfirm && regPassword !== regConfirm) {
      errors.regConfirm = t('passwordMismatch');
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showToast(t('fillFormCorrectly'));
      return;
    }

    try {
      isSubmitting.current = true;
      setSubmitting(true);
      const data = await api.register({
        firstname: firstName.trim(),
        lastname: lastName.trim(),
        username: regUsername.trim(),
        email: regEmail.trim(),
        phoneNumber: regPhone.trim(),
        password: regPassword,
        confirmPassword: regConfirm,
        role: regRole,
      });

      showToast(data.message || t('registerSuccess'));
      navigate('/login');
      setLoginUsername(regUsername.trim());
      
      // Clear inputs
      setFirstName('');
      setLastName('');
      setRegUsername('');
      setRegEmail('');
      setCountryCode('+90');
      setPhoneBody('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirm('');
      setRegRole('seller');
      setFormErrors({});
      setShowErrors(false);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  }, [
    regUsername, regEmail, regPhone, regPassword, regConfirm, firstName, lastName, regRole, phoneBody, countryCode,
    language, t, showToast, navigate
  ]);

  const getInputStyle = useCallback((validationState: { valid: boolean; dirty: boolean }) => {
    if (!validationState.dirty) return {};
    return {
      borderColor: validationState.valid ? 'var(--success)' : 'var(--danger)',
    };
  }, []);

  return {
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
    getInputStyle,
    formErrors,
    showErrors
  };
}
