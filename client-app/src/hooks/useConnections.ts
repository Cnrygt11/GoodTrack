import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, UserProfile, ConnectionRequest, ConnectionUser } from '../services/api';
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
    setConnections,
    setIncomingRequests,
    setSentRequests,
    optimisticConnections,
    optimisticRemovals
  } = useData();

  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  const [addUsername, setAddUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [error, setError] = useState('');

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
      setConnectionsLoading(true);
      setError('');
      Promise.all([
        refreshConnections(),
        loadIncomingRequests(),
        loadSentRequests()
      ]).catch((err: unknown) => {
        setError(extractErrorMessage(err) || 'Veriler yüklenemedi.');
      }).finally(() => {
        setConnectionsLoading(false);
      });
    }
  }, [user, refreshConnections, loadIncomingRequests, loadSentRequests]);

  const handleAddSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const username = addUsername.trim();
    if (!username) {
      showToast(language === 'tr' ? 'Lütfen eklenecek kullanıcı adını yazın!' : 'Please write the username to add!');
      return;
    }

    // Optimistic Update
    const tempId = `temp-send-${Date.now()}`;
    const tempRequest: ConnectionRequest = {
      id: tempId,
      senderId: user?.userId || '',
      senderUsername: user?.username || '',
      receiverId: '', // temp
      receiverUsername: username,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    const prevSent = [...sentRequests];
    setSentRequests(prev => [...prev, tempRequest]);
    setAddUsername('');

    try {
      await api.sendConnectionRequest(username);
    } catch (err: unknown) {
      // Rollback on failure
      setSentRequests(prevSent);
      setAddUsername(username);
      showToast(extractErrorMessage(err));
    }
  }, [addUsername, language, showToast, user, sentRequests, setSentRequests]);

  const handleAccept = useCallback(async (requestId: string) => {
    // Find the request to get sender username/id
    const req = incomingRequests.find(r => r.id === requestId);
    if (!req) return;

    const prevIncoming = [...incomingRequests];
    const prevConnections = [...connections];

    // Optimistic Update
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
    const newConn: ConnectionUser = {
      id: req.senderId,
      username: req.senderUsername,
      role: user?.role === 'seller' ? 'mfr' : 'seller'
    };
    setConnections(prev => [...prev, newConn]);

    try {
      await api.acceptRequest(requestId);
    } catch (err: unknown) {
      // Rollback on failure
      optimisticConnections.current.delete(req.senderId);
      setIncomingRequests(prevIncoming);
      setConnections(prevConnections);
      showToast(extractErrorMessage(err));
    }
  }, [incomingRequests, connections, setIncomingRequests, setConnections, user, showToast, optimisticConnections]);

  const handleReject = useCallback(async (requestId: string) => {
    const accepted = await confirm({
      title: language === 'tr' ? 'İsteği Reddet' : 'Reject Request',
      message: language === 'tr' ? 'Bu bağlantı isteğini reddetmek istediğinize emin misiniz?' : 'Are you sure you want to reject this connection request?',
      confirmText: language === 'tr' ? 'Reddet' : 'Reject',
      isDestructive: true
    });
    if (!accepted) return;

    const prevIncoming = [...incomingRequests];

    // Optimistic Update
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));

    try {
      await api.rejectRequest(requestId);
    } catch (err: unknown) {
      // Rollback on failure
      setIncomingRequests(prevIncoming);
      showToast(extractErrorMessage(err));
    }
  }, [language, confirm, incomingRequests, setIncomingRequests, showToast]);

  const handleDeleteSent = useCallback(async (requestId: string) => {
    const prevSent = [...sentRequests];
    
    // Optimistic Update
    setSentRequests(prev => prev.filter(r => r.id !== requestId));

    try {
      await api.deleteSentRequest(requestId);
    } catch (err: unknown) {
      // Rollback on failure
      setSentRequests(prevSent);
      showToast(extractErrorMessage(err));
    }
  }, [sentRequests, setSentRequests, showToast]);

  const handleRemoveConnection = useCallback(async (targetId: string) => {
    const accepted = await confirm({
      title: language === 'tr' ? 'Bağlantıyı Kaldır' : 'Remove Connection',
      message: language === 'tr' ? 'Bu bağlantıyı kaldırmak istediğinize emin misiniz? (Mevcut siparişler korunacaktır)' : 'Are you sure you want to disconnect? (Current orders will be kept)',
      confirmText: language === 'tr' ? 'Bağlantıyı Kes' : 'Disconnect',
      isDestructive: true
    });
    if (!accepted) return;

    const prevConnections = [...connections];

    // Optimistic Update
    setConnections(prev => prev.filter(c => c.id !== targetId));

    try {
      await api.removeConnection(targetId);
    } catch (err: unknown) {
      // Rollback on failure
      optimisticRemovals.current.delete(targetId);
      setConnections(prevConnections);
      showToast(extractErrorMessage(err));
    }
  }, [language, confirm, connections, setConnections, showToast, optimisticRemovals]);

  // Handle B2B directory search
  const handleSearchSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSearchLoading(true);
      const data = await api.searchManufacturers(searchCity || undefined, searchKeyword || undefined);
      setSearchResults(data.items);
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
    connectionsLoading,
    error,
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
