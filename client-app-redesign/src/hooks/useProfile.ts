import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, UserProfile } from '../services/apiClient';
import { compressImage, makeThumbnail } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';
import { MANUFACTURER_CATEGORIES } from '../utils/constants';

/**
 * Sunucu keywords'ü küçük harfle saklar ("deri", "lazer kesim"); kategori listesi ise
 * kanonik adlarla çalışır ("Deri", "Lazer Kesim"). Karşılaştırma birebir yapıldığından
 * kayıtlı seçimler profilde işaretli görünmüyordu — yüklerken kanonik ada geri eşlenir.
 */
function toCanonicalKeywords(stored: string[]): string[] {
  const trLower = (s: string) => s.toLocaleLowerCase('tr-TR');
  return stored.map((k) => MANUFACTURER_CATEGORIES.find((c) => trLower(c) === trLower(k)) ?? k);
}

/** React Query anahtarı — oturum sahibinin kendi profili. */
export const profileKeys = {
  me: ['profile', 'me'] as const,
};

export default function useProfile() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState(false);

  // Profile Edit States
  const [profilePicture, setProfilePicture] = useState('');
  const [profileThumbnail, setProfileThumbnail] = useState('');
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

  const profileQuery = useQuery({
    queryKey: profileKeys.me,
    queryFn: () => api.getProfile(),
  });

  const profile = profileQuery.data ?? null;
  const loading = profileQuery.isPending;
  const error = profileQuery.isError
    ? extractErrorMessage(profileQuery.error) || t('profileLoadError')
    : '';

  const fetchProfile = useCallback(
    () => queryClient.invalidateQueries({ queryKey: profileKeys.me }).then(() => {}),
    [queryClient],
  );

  // Sunucudan gelen profil forma yansıtılır (kullanıcı düzenlemeleri lokal state'te tutulur).
  useEffect(() => {
    if (profile) {
      setProfilePicture(profile.profilePicture || '');
      setProfileThumbnail(profile.profileThumbnail || '');
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setEmail(profile.email || '');
      setPhoneNumber(profile.phoneNumber || '');
      setAddress(profile.address || '');
      setCity(profile.city || '');
      setBio(profile.bio || '');
      setProductImages(profile.productImages || []);
      setKeywords(toCanonicalKeywords(profile.keywords || []));
      setIsVisibleToSellers(!!profile.isVisibleToSellers);
    }
  }, [profile]);

  // Profile Picture File Upload Handler
  const handleProfilePictureChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const [compressed, thumbnail] = await Promise.all([
          compressImage(file),
          makeThumbnail(file),
        ]);
        setProfilePicture(compressed);
        setProfileThumbnail(thumbnail);
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      }
    },
    [showToast],
  );

  const handleRemoveProfilePicture = useCallback(() => {
    setProfilePicture('');
    setProfileThumbnail('');
  }, []);

  // Product Presentation Images Upload Handlers
  const handleAddProductImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = 10 - productImages.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      try {
        const compressedImages = await Promise.all(
          filesToUpload.map((file) => compressImage(file)),
        );
        setProductImages((prev) => [...prev, ...compressedImages]);
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      }
    },
    [productImages, showToast],
  );

  const handleRemoveProductImage = useCallback((index: number) => {
    setProductImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleReplaceProductImage = useCallback(
    async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [showToast],
  );

  // B2B Keywords selection toggle
  const handleToggleKeyword = useCallback(
    (kw: string) => {
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
    },
    [t, showToast],
  );

  // Save profile changes
  // Not: bağımlılık dizisinde üye erişimi (profile?.role) React Compiler'ın memoization'ı
  // korumasını engelliyordu; değer önce yerel değişkene alınır.
  const profileRole = profile?.role;
  const handleSaveProfile = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!firstName.trim() || !lastName.trim()) {
        showToast(t('nameRequiredError'));
        return;
      }

      if (profileRole === 'mfr') {
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
          profileThumbnail,
          ...(profileRole === 'mfr' && {
            address,
            city,
            bio,
            productImages,
            keywords,
            isVisibleToSellers,
          }),
        };

        await api.updateProfile(payload);
        showToast(t('saveProfileSuccess'));
        await fetchProfile();
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        setActionLoading(false);
      }
    },
    [
      firstName,
      lastName,
      email,
      phoneNumber,
      profilePicture,
      profileThumbnail,
      address,
      city,
      bio,
      productImages,
      keywords,
      isVisibleToSellers,
      profileRole,
      t,
      showToast,
      fetchProfile,
    ],
  );

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
    handleSaveProfile,
  };
}
