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
  const { connections, sentRequests, loadSentRequests, refreshConnections, setSentRequests } = useData();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  // Pagination & Cursor State
  const [lastCursor, setLastCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);



  // Load B2B connections and sent requests on mount to ensure fresh state
  useEffect(() => {
    refreshConnections().catch(console.error);
    loadSentRequests().catch(console.error);
  }, [refreshConnections, loadSentRequests]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Toggle Filters (applied client-side on paginated list)
  const [mustHaveGallery, setMustHaveGallery] = useState(false);
  const [mustHaveAvatar, setMustHaveAvatar] = useState(false);

  const fetchManufacturers = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError('');
      if (reset) {
        setManufacturers([]);
      }
      
      const currentCursor = reset ? null : lastCursor;
      const data = await api.searchManufacturers(
        selectedCity || undefined,
        selectedCategory || undefined,
        currentCursor || undefined,
        10
      );

      setManufacturers(prev => reset ? data.items : [...prev, ...data.items]);
      setLastCursor(data.nextCursor);
      setHasMore(data.items.length === 10);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Üreticiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [selectedCity, selectedCategory, lastCursor]);

  // Initial fetch or fetch on filter change
  useEffect(() => {
    fetchManufacturers(true);
  }, [selectedCity, selectedCategory]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchManufacturers(false);
    }
  }, [fetchManufacturers, loading, hasMore]);

  const handleToggleCity = useCallback((city: string) => {
    setSelectedCity(prev => prev === city ? '' : city);
  }, []);

  const handleToggleCategory = useCallback((cat: string) => {
    setSelectedCategory(prev => prev === cat ? '' : cat);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSelectedCity('');
    setSelectedCategory('');
    setMustHaveGallery(false);
    setMustHaveAvatar(false);
  }, []);

  // Filter client side only for toggles (gallery, avatar)
  const filteredAndSortedManufacturers = useMemo(() => {
    let list = [...manufacturers];

    if (mustHaveGallery) {
      list = list.filter((m) => m.productImages && m.productImages.length > 0);
    }
    if (mustHaveAvatar) {
      list = list.filter((m) => !!m.profilePicture);
    }

    return list;
  }, [manufacturers, mustHaveGallery, mustHaveAvatar]);

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
    setSentRequests(prev => [...prev, tempRequest]);

    try {
      setActionLoadingMap(prev => ({ ...prev, [username]: true }));
      await api.sendConnectionRequest(username);
      setActionLoadingMap(prev => ({ ...prev, [username]: false }));
    } catch (err: unknown) {
      // Rollback on failure
      setSentRequests(prevSent);
      showToast(extractErrorMessage(err));
      setActionLoadingMap(prev => ({ ...prev, [username]: false }));
    }
  }, [t, loadSentRequests, showToast, sentRequests, setSentRequests]);

  const handleCancelConnection = useCallback(async (requestId: string, username: string) => {
    const prevSent = [...sentRequests];

    // Optimistic Update
    setSentRequests(prev => prev.filter(r => r.id !== requestId));

    try {
      setActionLoadingMap(prev => ({ ...prev, [username]: true }));
      await api.deleteSentRequest(requestId);
      setActionLoadingMap(prev => ({ ...prev, [username]: false }));
    } catch (err: unknown) {
      // Rollback on failure
      setSentRequests(prevSent);
      showToast(extractErrorMessage(err));
      setActionLoadingMap(prev => ({ ...prev, [username]: false }));
    }
  }, [t, loadSentRequests, showToast, sentRequests, setSentRequests]);

  return {
    loading,
    error,
    actionLoadingMap,

    selectedCity,
    selectedCategory,
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
    fetchManufacturers: () => fetchManufacturers(true),
    loadMore,
    language,
    t
  };
}
