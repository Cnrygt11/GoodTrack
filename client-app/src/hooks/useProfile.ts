import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, UserProfile } from '../services/api';
import { compressImage } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';

export default function useProfile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      setError(extractErrorMessage(err) || 'Profil yüklenemedi.');
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



  // Profile Picture File Upload Handler
  const handleProfilePictureChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setProfilePicture(compressed);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
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
      showToast(extractErrorMessage(err));
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
      showToast(extractErrorMessage(err));
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
      showToast(extractErrorMessage(err));
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
    actionLoading,
    fetchProfile,
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
