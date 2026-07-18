import React, { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';

export default function usePasswordChange() {
  const { showToast } = useToast();
  const { t } = useSettings();

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

  const handleVerifyPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      showToast(t('enterCurrentPasswordError'));
      return;
    }

    try {
      setActionLoading(true);
      await api.verifyPassword(oldPassword);
      setFlowStep('new-password');
      showToast(t('passwordVerifiedMsg'));
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [oldPassword, t, showToast]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      showToast(t('fillAllFieldsError'));
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      showToast(t('newPasswordLengthError'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast(t('passwordMismatch'));
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
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [newPassword, confirmNewPassword, oldPassword, t, showToast]);

  const handleCancelFlow = useCallback(() => {
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setFlowStep('profile');
  }, []);

  return {
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
    handleVerifyPassword,
    handleChangePassword,
    handleCancelFlow,
  };
}

