import { useState, useEffect, useCallback, useMemo } from 'react';
import { api, UserProfile } from '../services/api';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';

export default function useSearchMfr() {
  const { connections, sentRequests, loadSentRequests } = useData();
  const { showToast } = useToast();
  const { t, language } = useSettings();

  const [manufacturers, setManufacturers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Toggle Filters
  const [mustHaveGallery, setMustHaveGallery] = useState(false);
  const [mustHaveAvatar, setMustHaveAvatar] = useState(false);

  const fetchManufacturers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Calling without parameters fetches all visible manufacturers
      const data = await api.searchManufacturers();
      setManufacturers(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || 'Üreticiler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManufacturers();
  }, [fetchManufacturers]);

  // Extract all unique cities available among the visible manufacturers to build the filter options dynamically
  const availableCities = useMemo(() => {
    const cities = manufacturers
      .map((m) => m.city?.trim())
      .filter((c): c is string => !!c);
    // Unique list, sorted alphabetically
    return Array.from(new Set(cities)).sort();
  }, [manufacturers]);

  // Handle City Selection
  const handleToggleCity = useCallback((city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }, []);

  // Handle Category Selection
  const handleToggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCities([]);
    setSelectedCategories([]);
    setMustHaveGallery(false);
    setMustHaveAvatar(false);
  }, []);

  // Filter and Sort manufacturers list
  const filteredAndSortedManufacturers = useMemo(() => {
    let list = [...manufacturers];

    // 1. Text Search Filter (name, username, bio, address)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.firstName?.toLowerCase().includes(query) ||
          m.lastName?.toLowerCase().includes(query) ||
          m.username?.toLowerCase().includes(query) ||
          m.bio?.toLowerCase().includes(query) ||
          m.address?.toLowerCase().includes(query)
      );
    }

    // 2. City Absolute Filter (Strict match)
    // Selected cities list is absolute. Manufacturers outside these cities must NOT be visible.
    if (selectedCities.length > 0) {
      list = list.filter((m) => {
        if (!m.city) return false;
        const mCity = m.city.trim().toLowerCase();
        return selectedCities.some((c) => c.toLowerCase() === mCity);
      });
    }

    // 3. Category Filter
    // If categories are selected, the manufacturer must have at least one of them.
    if (selectedCategories.length > 0) {
      list = list.filter((m) => {
        if (!m.keywords || m.keywords.length === 0) return false;
        return m.keywords.some((k) => selectedCategories.includes(k));
      });
    }

    // 4. Showcase gallery & avatar toggle filters
    if (mustHaveGallery) {
      list = list.filter((m) => m.productImages && m.productImages.length > 0);
    }
    if (mustHaveAvatar) {
      list = list.filter((m) => !!m.profilePicture);
    }

    // 5. Ranking Logic (Sort by count of matching selected categories)
    // If multiple categories are selected, the one having the most of the selected categories should appear first.
    if (selectedCategories.length > 0) {
      list.sort((a, b) => {
        const matchesA = (a.keywords || []).filter((k) =>
          selectedCategories.includes(k)
        ).length;
        const matchesB = (b.keywords || []).filter((k) =>
          selectedCategories.includes(k)
        ).length;
        return matchesB - matchesA; // descending order
      });
    }

    return list;
  }, [manufacturers, searchQuery, selectedCities, selectedCategories, mustHaveGallery, mustHaveAvatar]);

  // Connection Request Sender
  const handleSendConnection = useCallback(async (username: string) => {
    try {
      setActionLoading(true);
      const data = await api.sendConnectionRequest(username);
      showToast(data.message || t('connReqSuccess'));
      await loadSentRequests();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [t, loadSentRequests, showToast]);

  return {
    loading,
    error,
    actionLoading,
    searchQuery,
    setSearchQuery,
    selectedCities,
    selectedCategories,
    mustHaveGallery,
    setMustHaveGallery,
    mustHaveAvatar,
    setMustHaveAvatar,
    availableCities,
    filteredAndSortedManufacturers,
    connections,
    sentRequests,
    handleToggleCity,
    handleToggleCategory,
    handleResetFilters,
    handleSendConnection,
    fetchManufacturers,
    language,
    t
  };
}
