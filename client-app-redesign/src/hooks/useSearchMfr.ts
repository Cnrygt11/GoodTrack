import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, UserProfile, ConnectionRequest } from '../services/apiClient';
import { useProductsQuery } from './useProductsData';
import useCredits from './useCredits';
import { connectionKeys, useConnectionsQuery, useSentRequestsQuery } from './useConnectionsData';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';

// Şehir filtresi artık sabit "popüler şehir" listesi yerine 81 ili kapsayan
// aramalı dropdown ile seçilir (bkz. TURKISH_PROVINCES + CitySelect).

const PAGE_SIZE = 9;

export default function useSearchMfr() {
  const { products } = useProductsQuery();
  const { connections } = useConnectionsQuery();
  const { sentRequests } = useSentRequestsQuery();
  const queryClient = useQueryClient();
  const { plan } = useCredits();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // İsim araması (debounce'lu) + sıralama
  const [searchName, setSearchName] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [sortOption, setSortOption] = useState<'completeness' | 'name' | 'city'>('completeness');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedName(searchName.trim()), 300);
    return () => clearTimeout(id);
  }, [searchName]);

  const completedCount = useMemo(
    () => products.filter((p) => p.status === 'delivered').length,
    [products],
  );

  const isLocked = useMemo(() => {
    const planName = (plan || 'Free').toLowerCase();
    if (planName === 'free') {
      return true;
    }
    return false;
  }, [plan]);

  const lockReason = useMemo<'upgrade' | 'orders' | null>(() => {
    const planName = (plan || 'Free').toLowerCase();
    if (planName === 'free') {
      return 'upgrade';
    }
    return null;
  }, [plan]);

  // (Bağlantı ve gönderilen istek verileri React Query tarafından mount'ta otomatik çekilir.)

  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Toggle Filters (applied client-side)
  const [mustHaveGallery, setMustHaveGallery] = useState(false);
  const [mustHaveAvatar, setMustHaveAvatar] = useState(false);

  const buildQuery = useCallback(
    (pageNum: number) => ({
      city: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      keyword: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
      name: debouncedName || undefined,
      sort: sortOption,
      page: pageNum,
      limit: PAGE_SIZE,
      mustHaveGallery,
      mustHaveAvatar,
    }),
    [
      selectedCities,
      selectedCategories,
      debouncedName,
      sortOption,
      mustHaveGallery,
      mustHaveAvatar,
    ],
  );

  const fetchManufacturers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.searchManufacturers(buildQuery(0));
      setManufacturers(data.items);
      setPage(0);
      setHasMore(data.hasMore);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Üreticiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const data = await api.searchManufacturers(buildQuery(nextPage));
      setManufacturers((prev) => [...prev, ...data.items]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err) || 'Daha fazla üretici yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, buildQuery, showToast]);

  // Initial fetch
  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  const handleToggleCity = useCallback((city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city],
    );
  }, []);

  const handleToggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedCities([]);
    setSelectedCategories([]);
    setMustHaveGallery(false);
    setMustHaveAvatar(false);
    setSearchName('');
    setSortOption('completeness');
  }, []);

  // Filtered list (delegated fully to server side pagination)
  const filteredAndSortedManufacturers = useMemo(() => {
    return manufacturers;
  }, [manufacturers]);

  const handleSendConnection = useCallback(
    async (username: string) => {
      const tempId = `temp-send-${Date.now()}`;
      const tempRequest: ConnectionRequest = {
        id: tempId,
        senderId: '', // temp
        senderUsername: '', // temp
        receiverId: '', // temp
        receiverUsername: username,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const prevSent = queryClient.getQueryData<ConnectionRequest[]>(connectionKeys.sent);

      // Optimistic Update
      queryClient.setQueryData<ConnectionRequest[]>(connectionKeys.sent, (old) => [
        ...(old ?? []),
        tempRequest,
      ]);

      try {
        await api.sendConnectionRequest(username);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.sent, prevSent);
        showToast(extractErrorMessage(err));
      }
    },
    [showToast, queryClient],
  );

  const handleCancelConnection = useCallback(
    async (requestId: string) => {
      const prevSent = queryClient.getQueryData<ConnectionRequest[]>(connectionKeys.sent);

      // Optimistic Update
      queryClient.setQueryData<ConnectionRequest[]>(connectionKeys.sent, (old) =>
        (old ?? []).filter((r) => r.id !== requestId),
      );

      try {
        await api.deleteSentRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.sent, prevSent);
        showToast(extractErrorMessage(err));
      }
    },
    [showToast, queryClient],
  );

  return {
    loading,
    error,
    selectedCities,
    selectedCategories,
    mustHaveGallery,
    setMustHaveGallery,
    mustHaveAvatar,
    setMustHaveAvatar,
    searchName,
    setSearchName,
    sortOption,
    setSortOption,
    filteredAndSortedManufacturers,
    connections,
    sentRequests,
    hasMore,
    handleToggleCity,
    handleToggleCategory,
    handleResetFilters,
    handleSendConnection,
    handleCancelConnection,
    fetchManufacturers,
    loadMore,
    language,
    t,
    isLocked,
    lockReason,
    completedCount,
  };
}
