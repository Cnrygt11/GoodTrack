import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, UserProfile } from '../services/api';

export default function useProfile() {
  const { user, setActiveScreen } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Flow State: 'profile' | 'verify-password' | 'new-password'
  const [flowStep, setFlowStep] = useState<'profile' | 'verify-password' | 'new-password'>('profile');

  // Password Input Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Show/Hide Password States
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.getProfile();
      setProfile(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Profil yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleVerifyPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      alert(language === 'tr' ? 'Lütfen mevcut şifrenizi girin!' : 'Please enter your current password!');
      return;
    }

    try {
      setActionLoading(true);
      await api.verifyPassword(oldPassword);
      setFlowStep('new-password');
      showToast(language === 'tr' ? 'Şifre doğrulandı, yeni şifre belirleyebilirsiniz.' : 'Password verified, you can now set your new password.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [oldPassword, language, showToast]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      alert(language === 'tr' ? 'Lütfen tüm alanları doldurun!' : 'Please fill in all fields!');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      alert(language === 'tr' ? 'Yeni şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!' : 'New password must be between 6 and 20 characters long!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      alert(t('passwordMismatch'));
      return;
    }

    try {
      setActionLoading(true);
      await api.changePassword(oldPassword, newPassword, confirmNewPassword);
      showToast(t('passwordChangeSuccess'));
      // Reset flow
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFlowStep('profile');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [newPassword, confirmNewPassword, oldPassword, language, t, showToast]);

  const handleCancelFlow = useCallback(() => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFlowStep('profile');
  }, []);

  return {
    user,
    setActiveScreen,
    profile,
    loading,
    error,
    flowStep,
    setFlowStep,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    showOld,
    setShowOld,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
    actionLoading,
    fetchProfile,
    handleVerifyPassword,
    handleChangePassword,
    handleCancelFlow,
    language,
    t
  };
}
