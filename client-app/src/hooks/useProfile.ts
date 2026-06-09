import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, UserProfile } from '../services/api';
import { compressImage } from '../utils/imageHelper';

export default function useProfile() {
  const { user } = useAuth();
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

  // Profile Edit States
  const [profilePicture, setProfilePicture] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [productImages, setProductImages] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isVisibleToSellers, setIsVisibleToSellers] = useState(false);

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

  useEffect(() => {
    if (profile) {
      setProfilePicture(profile.profilePicture || '');
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setEmail(profile.email || '');
      setPhoneNumber(profile.phoneNumber || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setBio(profile.bio || '');
      setProductImages(profile.productImages || []);
      setKeywords(profile.keywords || []);
      setIsVisibleToSellers(!!profile.isVisibleToSellers);
    }
  }, [profile]);

  const handleVerifyPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword.trim()) {
      showToast(language === 'tr' ? 'Lütfen mevcut şifrenizi girin!' : 'Please enter your current password!');
      return;
    }

    try {
      setActionLoading(true);
      await api.verifyPassword(oldPassword);
      setFlowStep('new-password');
      showToast(language === 'tr' ? 'Şifre doğrulandı, yeni şifre belirleyebilirsiniz.' : 'Password verified, you can now set your new password.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [oldPassword, language, showToast]);

  const handleChangePassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmNewPassword) {
      showToast(language === 'tr' ? 'Lütfen tüm alanları doldurun!' : 'Please fill in all fields!');
      return;
    }

    if (newPassword.length < 6 || newPassword.length > 20) {
      showToast(language === 'tr' ? 'Yeni şifre en az 6, en fazla 20 karakter uzunluğunda olmalıdır!' : 'New password must be between 6 and 20 characters long!');
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
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
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

  // Profile Picture File Upload Handler
  const handleProfilePictureChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setProfilePicture(compressed);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [showToast]);

  const handleRemoveProfilePicture = useCallback(() => {
    setProfilePicture('');
  }, []);

  // Product Presentation Images Upload Handlers
  const handleAddProductImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - productImages.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    try {
      const compressedImages = await Promise.all(
        filesToUpload.map((file) => compressImage(file))
      );
      setProductImages((prev) => [...prev, ...compressedImages]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [productImages, showToast]);

  const handleRemoveProductImage = useCallback((index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReplaceProductImage = useCallback(async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setProductImages((prev) => {
        const next = [...prev];
        next[index] = compressed;
        return next;
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [showToast]);

  // B2B Keywords selection toggle
  const handleToggleKeyword = useCallback((kw: string) => {
    setKeywords((prev) => {
      if (prev.includes(kw)) {
        return prev.filter((k) => k !== kw);
      } else {
        if (prev.length >= 3) {
          showToast(t('keywordLimitError'));
          return prev;
        }
        return [...prev, kw];
      }
    });
  }, [t, showToast]);

  // Save profile changes
  const handleSaveProfile = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast(language === 'tr' ? 'Ad ve soyadı boş bırakılamaz!' : 'First name and last name cannot be empty!');
      return;
    }

    if (profile?.role === 'mfr') {
      if (bio.length > 500) {
        showToast(t('bioLimitError'));
        return;
      }
      if (productImages.length > 0 && (productImages.length < 3 || productImages.length > 10)) {
        showToast(t('imageLimitError'));
        return;
      }
      if (isVisibleToSellers && productImages.length < 3) {
        showToast(t('imageLimitError'));
        return;
      }
    }

    try {
      setActionLoading(true);
      const payload: Partial<UserProfile> = {
        firstName,
        lastName,
        email,
        phoneNumber,
        profilePicture,
        ...(profile?.role === 'mfr' && {
          address,
          city,
          bio,
          productImages,
          keywords,
          isVisibleToSellers
        })
      };

      await api.updateProfile(payload);
      showToast(t('saveProfileSuccess'));
      await fetchProfile();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [
    firstName,
    lastName,
    email,
    phoneNumber,
    profilePicture,
    address,
    city,
    bio,
    productImages,
    keywords,
    isVisibleToSellers,
    profile?.role,
    language,
    t,
    showToast,
    fetchProfile
  ]);

  return {
    user,
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
    t,

    // Profile States & Handlers
    profilePicture,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    address,
    setAddress,
    city,
    setCity,
    bio,
    setBio,
    productImages,
    keywords,
    isVisibleToSellers,
    setIsVisibleToSellers,
    handleProfilePictureChange,
    handleRemoveProfilePicture,
    handleAddProductImage,
    handleRemoveProductImage,
    handleReplaceProductImage,
    handleToggleKeyword,
    handleSaveProfile
  };
}
