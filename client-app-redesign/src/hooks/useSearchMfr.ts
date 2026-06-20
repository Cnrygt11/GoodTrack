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
  const { connections, sentRequests, loadSentRequests, refreshConnections, optimisticAddSentRequest, optimisticRemoveSentRequest, rollbackSentRequests } = useData();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      
      let allItems: UserProfile[] = [];
      let currentCursor: string | undefined = undefined;
      let hasMoreItems = true;

      while (hasMoreItems) {
        const data = await api.searchManufacturers(
          undefined,
          undefined,
          currentCursor,
          50
        );
        allItems = [...allItems, ...data.items];
        currentCursor = data.nextCursor || undefined;
        hasMoreItems = data.nextCursor !== null;
      }

      setManufacturers(allItems);
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'Üreticiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Filter client side
  const filteredAndSortedManufacturers = useMemo(() => {
    let list = [...manufacturers];

    if (selectedCities.length > 0) {
      list = list.filter(m => m.city && selectedCities.includes(m.city));
    }

    if (selectedCategories.length > 0) {
      list = list.filter(m => m.keywords && m.keywords.some(kw => selectedCategories.includes(kw)));
      // Sort by best match (highest number of matching categories first)
      list.sort((a, b) => {
        const matchesA = (a.keywords || []).filter(kw => selectedCategories.includes(kw)).length;
        const matchesB = (b.keywords || []).filter(kw => selectedCategories.includes(kw)).length;
        return matchesB - matchesA;
      });
    }

    if (mustHaveGallery) {
      list = list.filter((m) => m.productImages && m.productImages.length > 0);
    }
    if (mustHaveAvatar) {
      list = list.filter((m) => !!m.profilePicture);
    }

    return list;
  }, [manufacturers, selectedCities, selectedCategories, mustHaveGallery, mustHaveAvatar]);

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
    hasMore: false,
    handleToggleCity,
    handleToggleCategory,
    handleResetFilters,
    handleSendConnection,
    handleCancelConnection,
    fetchManufacturers,
    loadMore: () => {},
    language,
    t
  };
}
