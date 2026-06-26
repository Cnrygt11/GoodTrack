import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, UserProfile, ConnectionRequest } from '../services/api';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';

// Static list of popular manufacturing/production cities in Turkey
export const PRODUCTION_CITIES = [
  'Adana',
  'Ankara',
  'Antalya',
  'Bolu',
  'Bursa',
  'Denizli',
  'Gaziantep',
  'İstanbul',
  'İzmir',
  'Kahramanmaraş',
  'Kayseri',
  'Kocaeli',
  'Konya'
];

export default function useSearchMfr() {
  const { products, plan, connections, sentRequests, loadSentRequests, refreshConnections, optimisticAddSentRequest, optimisticRemoveSentRequest, rollbackSentRequests } = useData();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const completedCount = useMemo(() => 
    products.filter(p => p.status === 'delivered').length
  , [products]);

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

  // Load B2B connections and sent requests on mount to ensure fresh state
  useEffect(() => {
    refreshConnections().catch(console.error);
    loadSentRequests().catch(console.error);
  }, [refreshConnections, loadSentRequests]);
  
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Toggle Filters (applied client-side)
  const [mustHaveGallery, setMustHaveGallery] = useState(false);
  const [mustHaveAvatar, setMustHaveAvatar] = useState(false);

  const fetchManufacturers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const cityQuery = selectedCities.length > 0 ? selectedCities.join(',') : undefined;
      const catQuery = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined;

      const data = await api.searchManufacturers(
        cityQuery,
        catQuery,
        undefined,
        6,
        mustHaveGallery,
        mustHaveAvatar
      );
      setManufacturers(data.items);
      setNextCursor(data.nextCursor || null);
      setHasMore(data.nextCursor !== null);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Üreticiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [selectedCities, selectedCategories, mustHaveGallery, mustHaveAvatar]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return;
    try {
      setLoading(true);
      const cityQuery = selectedCities.length > 0 ? selectedCities.join(',') : undefined;
      const catQuery = selectedCategories.length > 0 ? selectedCategories.join(',') : undefined;

      const data = await api.searchManufacturers(
        cityQuery,
        catQuery,
        nextCursor,
        6,
        mustHaveGallery,
        mustHaveAvatar
      );
      setManufacturers(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor || null);
      setHasMore(data.nextCursor !== null);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err) || 'Daha fazla üretici yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [nextCursor, loading, showToast, selectedCities, selectedCategories, mustHaveGallery, mustHaveAvatar]);

  // Initial fetch
  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  const handleToggleCity = useCallback((city: string) => {
    setSelectedCities(prev =>
      prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
    );
  }, []);

  const handleToggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedCities([]);
    setSelectedCategories([]);
    setMustHaveGallery(false);
    setMustHaveAvatar(false);
  }, []);

  // Filtered list (delegated fully to server side pagination)
  const filteredAndSortedManufacturers = useMemo(() => {
    return manufacturers;
  }, [manufacturers]);

  const handleSendConnection = useCallback(async (username: string) => {
    const tempId = `temp-send-${Date.now()}`;
    const tempRequest: ConnectionRequest = {
      id: tempId,
      senderId: '', // temp
      senderUsername: '', // temp
      receiverId: '', // temp
      receiverUsername: username,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const prevSent = [...sentRequests];
    
    // Optimistic Update
    optimisticAddSentRequest(tempRequest);

    try {
      await api.sendConnectionRequest(username);
    } catch (err: unknown) {
      // Rollback on failure
      rollbackSentRequests(prevSent);
      showToast(extractErrorMessage(err));
    }
  }, [showToast, sentRequests, optimisticAddSentRequest, rollbackSentRequests]);

  const handleCancelConnection = useCallback(async (requestId: string) => {
    const prevSent = [...sentRequests];

    // Optimistic Update
    optimisticRemoveSentRequest(requestId);

    try {
      await api.deleteSentRequest(requestId);
    } catch (err: unknown) {
      // Rollback on failure
      rollbackSentRequests(prevSent);
      showToast(extractErrorMessage(err));
    }
  }, [showToast, sentRequests, optimisticRemoveSentRequest, rollbackSentRequests]);

  return {
    loading,
    error,
    selectedCities,
    selectedCategories,
    mustHaveGallery,
    setMustHaveGallery,
    mustHaveAvatar,
    setMustHaveAvatar,
    availableCities: PRODUCTION_CITIES,
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
    completedCount
  };
}
