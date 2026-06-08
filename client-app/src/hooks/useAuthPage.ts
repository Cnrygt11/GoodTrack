import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

export default function useAuthPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

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

  // Email verification state
  const [verificationPending, setVerificationPending] = useState(false);
  const [verificationUsername, setVerificationUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSubmitting = useRef(false);

  // Real-time validations
  const [usernameValid, setUsernameValid] = useState({ valid: true, dirty: false });
  const [emailValid, setEmailValid] = useState({ valid: true, dirty: false });
  const [phoneValid, setPhoneValid] = useState({ valid: true, dirty: false });
  const [passwordValid, setPasswordValid] = useState({ valid: true, dirty: false });
  const [confirmValid, setConfirmValid] = useState({ valid: true, dirty: false });

  // Validate Phone Number
  useEffect(() => {
    if (!regPhone) {
      setPhoneValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^\+?[0-9\s\-()]{10,20}$/;
    setPhoneValid({ valid: regex.test(regPhone), dirty: true });
  }, [regPhone]);

  // Combine countryCode and phoneBody to update regPhone
  useEffect(() => {
    const cleanBody = phoneBody.replace(/\s+/g, '');
    setRegPhone(cleanBody ? `${countryCode}${cleanBody}` : '');
  }, [countryCode, phoneBody]);

  // Validate Username
  useEffect(() => {
    if (!regUsername) {
      setUsernameValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^[a-z0-9_]{3,15}$/;
    setUsernameValid({ valid: regex.test(regUsername), dirty: true });
  }, [regUsername]);

  // Validate Email
  useEffect(() => {
    if (!regEmail) {
      setEmailValid({ valid: true, dirty: false });
      return;
    }
    const regex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    setEmailValid({ valid: regex.test(regEmail), dirty: true });
  }, [regEmail]);

  // Validate Password Length
  useEffect(() => {
    if (!regPassword) {
      setPasswordValid({ valid: true, dirty: false });
      return;
    }
    setPasswordValid({ valid: regPassword.length >= 6 && regPassword.length <= 20, dirty: true });
  }, [regPassword]);

  // Validate Password Match
  useEffect(() => {
    if (!regConfirm) {
      setConfirmValid({ valid: true, dirty: false });
      return;
    }
    setConfirmValid({ valid: regPassword === regConfirm, dirty: true });
  }, [regConfirm, regPassword]);

  // Read email verification query parameters from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const verificationError = params.get('verificationError');

    if (verified === 'true') {
      showToast(language === 'tr' 
        ? 'Hesabınız başarıyla doğrulandı! Giriş yapabilirsiniz.' 
        : 'Account verified successfully! You can now log in.');
      // Clean query parameters from URL without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verificationError) {
      showToast(verificationError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [language, showToast]);

  const handleLoginSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;
    try {
      isSubmitting.current = true;
      setSubmitting(true);
      const data = await api.login(loginUsername.trim(), loginPassword);
      showToast(t('loginSuccess'));
      login(data.token, data.username, data.role, data.userId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('doğrulayın') || errorMessage.includes('verify your email')) {
        setVerificationUsername(loginUsername.trim());
        setVerificationPending(true);
      }
      showToast(errorMessage);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  }, [loginUsername, loginPassword, t, login, showToast]);

  const handleRegisterSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting.current) return;

    // Final checks
    const usernameRegex = /^[a-z0-9_]{3,15}$/;
    if (!usernameRegex.test(regUsername)) {
      showToast(language === 'tr' ? 'Kullanıcı adı sadece İngilizce küçük harfler, rakamlar ve alt çizgi (_) içerebilir, 3-15 karakter uzunluğunda olmalıdır!' : 'Username can only contain English lowercase letters, numbers and underscore (_), and must be 3-15 characters long!');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9]+(?:[._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:[.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(regEmail)) {
      showToast(language === 'tr' ? 'Geçersiz veya şüpheli e-posta formatı!' : 'Invalid or suspicious email format!');
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{10,20}$/;
    if (!phoneRegex.test(regPhone)) {
      showToast(t('phoneRequired'));
      return;
    }

    if (regPassword.length < 6 || regPassword.length > 20) {
      showToast(language === 'tr' ? 'Şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!' : 'Password must be between 6 and 20 characters long!');
      return;
    }

    if (regPassword !== regConfirm) {
      showToast(t('passwordMismatch'));
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
        confirmpassword: regConfirm,
        role: regRole,
      });

      showToast(data.message || t('registerSuccess'));
      setActiveTab('login');
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      isSubmitting.current = false;
      setSubmitting(false);
    }
  }, [
    regUsername, regEmail, regPhone, regPassword, regConfirm, firstName, lastName, regRole,
    language, t, showToast
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
    getInputStyle
  };
}
