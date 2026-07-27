import { useState, useEffect, useCallback, useMemo } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { api, ConnectionRequest } from '../services/apiClient';
import useCredits from './useCredits';
import { connectionKeys, useConnectionsQuery, useSentRequestsQuery } from './useConnectionsData';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';

// Şehir filtresi artık sabit "popüler şehir" listesi yerine 81 ili kapsayan
// aramalı dropdown ile seçilir (bkz. TURKISH_PROVINCES + CitySelect).

const PAGE_SIZE = 9;

export default function useSearchMfr() {
  const { connections } = useConnectionsQuery();
  const { sentRequests } = useSentRequestsQuery();
  const queryClient = useQueryClient();
  const { plan } = useCredits();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  // İsim araması (debounce'lu) + sıralama
  const [searchName, setSearchName] = useState('');
  const [debouncedName, setDebouncedName] = useState('');
  const [sortOption, setSortOption] = useState<'completeness' | 'name' | 'city'>('completeness');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedName(searchName.trim()), 300);
    return () => clearTimeout(id);
  }, [searchName]);

  const isLocked = useMemo(() => {
    const planName = (plan || 'Free').toLowerCase();
    if (planName === 'free') {
      return true;
    }
    return false;
  }, [plan]);

  const lockReason = useMemo<'upgrade' | null>(() => {
    const planName = (plan || 'Free').toLowerCase();
    if (planName === 'free') {
      return 'upgrade';
    }
    return null;
  }, [plan]);

  // (Bağlantı ve gönderilen istek verileri React Query tarafından mount'ta otomatik çekilir.)

  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const buildQuery = useCallback(
    (pageNum: number) => ({
      city: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      keyword: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
      name: debouncedName || undefined,
      sort: sortOption,
      page: pageNum,
      limit: PAGE_SIZE,
    }),
    [selectedCities, selectedCategories, debouncedName, sortOption],
  );

  // Sunucu-sayfalı dizin: filtre/sıralama anahtarın parçası olduğundan değiştiğinde
  // sorgu baştan başlar; "daha fazla" sayfaları RQ tarafından biriktirilir.
  const directoryQuery = useInfiniteQuery({
    queryKey: [
      'manufacturerDirectory',
      selectedCities,
      selectedCategories,
      debouncedName,
      sortOption,
    ] as const,
    queryFn: ({ pageParam }) => api.searchManufacturers(buildQuery(pageParam)),
    // Sayfalama 1-tabanlıdır (backend + arşivle tutarlı): ilk sayfa 1, sonraki = yüklenen sayfa sayısı + 1.
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length + 1 : undefined),
  });

  const manufacturers = useMemo(
    () => directoryQuery.data?.pages.flatMap((p) => p.items) ?? [],
    [directoryQuery.data],
  );

  const hasMore = directoryQuery.hasNextPage;
  const loading = directoryQuery.isPending || directoryQuery.isFetchingNextPage;
  const error = directoryQuery.isError
    ? extractErrorMessage(directoryQuery.error) || t('mfrLoadError')
    : '';

  const fetchManufacturers = useCallback(() => {
    directoryQuery.refetch();
  }, [directoryQuery]);

  const loadMore = useCallback(async () => {
    if (!directoryQuery.hasNextPage || directoryQuery.isFetchingNextPage) return;
    try {
      await directoryQuery.fetchNextPage({ throwOnError: true });
    } catch (err: unknown) {
      showToast(extractErrorMessage(err) || t('mfrLoadMoreError'));
    }
  }, [directoryQuery, showToast, t]);

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
  };
}
