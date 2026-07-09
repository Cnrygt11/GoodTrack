import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, UserProfile, ConnectionRequest, ConnectionUser } from '../services/apiClient';
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
    optimisticAddSentRequest,
    optimisticRemoveSentRequest,
    rollbackSentRequests,
    optimisticAddConnection,
    optimisticRemoveConnection,
    rollbackConnections,
    optimisticRemoveIncoming,
    rollbackIncomingRequests,
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
      showToast(t('addUsernamePrompt'));
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
    optimisticAddSentRequest(tempRequest);
    setAddUsername('');

    try {
      await api.sendConnectionRequest(username);
      await loadSentRequests();
    } catch (err: unknown) {
      // Rollback on failure
      rollbackSentRequests(prevSent);
      setAddUsername(username);
      showToast(extractErrorMessage(err));
    }
  }, [addUsername, t, showToast, user, sentRequests, optimisticAddSentRequest, rollbackSentRequests, loadSentRequests]);

  const handleAccept = useCallback(async (requestId: string) => {
    // Find the request to get sender username/id
    const req = incomingRequests.find(r => r.id === requestId);
    if (!req) return;

    const prevIncoming = [...incomingRequests];
    const prevConnections = [...connections];

    // Optimistic Update
    optimisticRemoveIncoming(requestId);
    const newConn: ConnectionUser = {
      id: req.senderId,
      username: req.senderUsername,
      role: user?.role === 'seller' ? 'mfr' : 'seller'
    };
    optimisticAddConnection(newConn);

    try {
      await api.acceptRequest(requestId);
      await refreshConnections();
      await loadIncomingRequests();
    } catch (err: unknown) {
      // Rollback on failure
      rollbackIncomingRequests(prevIncoming);
      rollbackConnections(prevConnections);
      showToast(extractErrorMessage(err));
    }
  }, [incomingRequests, connections, optimisticRemoveIncoming, optimisticAddConnection, rollbackIncomingRequests, rollbackConnections, user, showToast, refreshConnections, loadIncomingRequests]);

  const handleReject = useCallback(async (requestId: string) => {
    const accepted = await confirm({
      title: t('rejectRequestTitle'),
      message: t('rejectRequestConfirm'),
      confirmText: t('rejectBtn'),
      isDestructive: true
    });
    if (!accepted) return;

    const prevIncoming = [...incomingRequests];

    // Optimistic Update
    optimisticRemoveIncoming(requestId);

    try {
      await api.rejectRequest(requestId);
      await loadIncomingRequests();
    } catch (err: unknown) {
      // Rollback on failure
      rollbackIncomingRequests(prevIncoming);
      showToast(extractErrorMessage(err));
    }
  }, [confirm, incomingRequests, optimisticRemoveIncoming, rollbackIncomingRequests, showToast, loadIncomingRequests]);

  const handleDeleteSent = useCallback(async (requestId: string) => {
    const prevSent = [...sentRequests];

    // Optimistic Update
    optimisticRemoveSentRequest(requestId);

    try {
      await api.deleteSentRequest(requestId);
      await loadSentRequests();
    } catch (err: unknown) {
      // Rollback on failure
      rollbackSentRequests(prevSent);
      showToast(extractErrorMessage(err));
    }
  }, [sentRequests, optimisticRemoveSentRequest, rollbackSentRequests, showToast, loadSentRequests]);

  const handleRemoveConnection = useCallback(async (targetId: string) => {
    const accepted = await confirm({
      title: t('removeConnectionTitle'),
      message: t('removeConnectionConfirm'),
      confirmText: t('disconnectConfirmBtn'),
      isDestructive: true
    });
    if (!accepted) return;

    const prevConnections = [...connections];

    // Optimistic Update
    optimisticRemoveConnection(targetId);

    try {
      await api.removeConnection(targetId);
      await refreshConnections();
    } catch (err: unknown) {
      // Rollback on failure
      rollbackConnections(prevConnections);
      showToast(extractErrorMessage(err));
    }
  }, [confirm, t, connections, optimisticRemoveConnection, rollbackConnections, showToast, refreshConnections]);

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

