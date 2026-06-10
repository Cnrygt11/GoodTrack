import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, UserProfile } from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';

export default function useConnections() {
  const {
    user
  } = useAuth();

  const {
    connections,
    incomingRequests,
    sentRequests,
    refreshConnections,
    loadIncomingRequests,
    loadSentRequests,
    loadProducts
  } = useData();

  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  const [addUsername, setAddUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoading = useRef(false);

  // Sub-tab state inside Connections Modal ('manage' vs 'search')
  const [activeTab, setActiveTab] = useState<'manage' | 'search'>('manage');

  // Search states for B2B directory
  const [searchCity, setSearchCity] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch data automatically on mount
  useEffect(() => {
    if (user) {
      refreshConnections();
      loadIncomingRequests();
      loadSentRequests();
    }
  }, [user, refreshConnections, loadIncomingRequests, loadSentRequests]);

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionLoading.current) return;
    const username = addUsername.trim();
    if (!username) {
      showToast(language === 'tr' ? 'Lütfen eklenecek kullanıcı adını yazın!' : 'Please write the username to add!');
      return;
    }

    try {
      isActionLoading.current = true;
      setActionLoading(true);
      const data = await api.sendConnectionRequest(username);
      showToast(data.message || t('connReqSuccess'));
      setAddUsername('');
      await Promise.all([loadIncomingRequests(), loadSentRequests()]);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [addUsername, language, t, loadIncomingRequests, loadSentRequests, showToast]);

  const handleAccept = useCallback(async (requestId: string) => {
    if (isActionLoading.current) return;
    try {
      isActionLoading.current = true;
      setActionLoading(true);
      const data = await api.acceptRequest(requestId);
      showToast(data.message || t('connReqAccepted'));
      await Promise.all([
        refreshConnections(),
        loadIncomingRequests(),
        loadSentRequests(),
        loadProducts()
      ]);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [t, refreshConnections, loadIncomingRequests, loadSentRequests, loadProducts, showToast]);

  const handleReject = useCallback(async (requestId: string) => {
    if (isActionLoading.current) return;
    const accepted = await confirm({
      title: language === 'tr' ? 'İsteği Reddet' : 'Reject Request',
      message: language === 'tr' ? 'Bu bağlantı isteğini reddetmek istediğinize emin misiniz?' : 'Are you sure you want to reject this connection request?',
      confirmText: language === 'tr' ? 'Reddet' : 'Reject',
      isDestructive: true
    });
    if (!accepted) return;
    try {
      isActionLoading.current = true;
      setActionLoading(true);
      const data = await api.rejectRequest(requestId);
      showToast(data.message || t('connReqRejected'));
      await Promise.all([loadIncomingRequests(), loadSentRequests()]);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [language, t, loadIncomingRequests, loadSentRequests, showToast]);

  const handleDeleteSent = useCallback(async (requestId: string) => {
    try {
      const data = await api.deleteSentRequest(requestId);
      showToast(data.message || t('connReqDeleted'));
      await loadSentRequests();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    }
  }, [t, loadSentRequests, showToast]);

  const handleRemoveConnection = useCallback(async (targetId: string) => {
    const accepted = await confirm({
      title: language === 'tr' ? 'Bağlantıyı Kaldır' : 'Remove Connection',
      message: language === 'tr' ? 'Bu bağlantıyı kaldırmak istediğinize emin misiniz? (Mevcut siparişler korunacaktır)' : 'Are you sure you want to disconnect? (Current orders will be kept)',
      confirmText: language === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect',
      isDestructive: true
    });
    if (!accepted) return;
    try {
      const data = await api.removeConnection(targetId);
      showToast(data.message || t('connRemoved'));
      await Promise.all([refreshConnections(), loadProducts()]);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    }
  }, [language, t, refreshConnections, loadProducts, showToast]);

  // Handle B2B directory search
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSearchLoading(true);
      const data = await api.searchManufacturers(searchCity, searchKeyword);
      setSearchResults(data);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  }, [searchCity, searchKeyword]);

  // Send B2B connection from search list
  const handleSendConnectionFromSearch = useCallback(async (username: string) => {
    try {
      setActionLoading(true);
      const data = await api.sendConnectionRequest(username);
      showToast(data.message || t('connReqSuccess'));
      await loadSentRequests();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [t, loadSentRequests, showToast]);

  return {
    user,
    connections,
    incomingRequests,
    sentRequests,
    language,
    t,
    addUsername,
    setAddUsername,
    actionLoading,
    handleAddSubmit,
    handleAccept,
    handleReject,
    handleDeleteSent,
    handleRemoveConnection,

    // B2B search exports
    activeTab,
    setActiveTab,
    searchCity,
    setSearchCity,
    searchKeyword,
    setSearchKeyword,
    searchResults,
    searchLoading,
    handleSearchSubmit,
    handleSendConnectionFromSearch
  };
}
