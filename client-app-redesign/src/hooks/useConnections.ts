import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, UserProfile, ConnectionRequest, ConnectionUser } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';
import {
  connectionKeys,
  useConnectionsQuery,
  useIncomingRequestsQuery,
  useSentRequestsQuery,
} from './useConnectionsData';

export default function useConnections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { connections, isLoading: connLoading } = useConnectionsQuery();
  const { incomingRequests, isLoading: incLoading } = useIncomingRequestsQuery();
  const { sentRequests, isLoading: sentLoading } = useSentRequestsQuery();
  const connectionsLoading = connLoading || incLoading || sentLoading;

  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  const [addUsername, setAddUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Sub-tab state inside Connections Modal ('manage' vs 'search')
  const [activeTab, setActiveTab] = useState<'manage' | 'search'>('manage');

  // Search states for B2B directory
  const [searchCity, setSearchCity] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // ─── React Query cache helpers (optimistic updates + refetch) ────────────────
  const snapshot = useCallback(
    <T,>(key: readonly unknown[]) => queryClient.getQueryData<T>(key),
    [queryClient]
  );
  const setSent = useCallback(
    (updater: (old: ConnectionRequest[]) => ConnectionRequest[]) =>
      queryClient.setQueryData<ConnectionRequest[]>(connectionKeys.sent, (old) => updater(old ?? [])),
    [queryClient]
  );
  const setIncoming = useCallback(
    (updater: (old: ConnectionRequest[]) => ConnectionRequest[]) =>
      queryClient.setQueryData<ConnectionRequest[]>(connectionKeys.incoming, (old) => updater(old ?? [])),
    [queryClient]
  );
  const setConnections = useCallback(
    (updater: (old: ConnectionUser[]) => ConnectionUser[]) =>
      queryClient.setQueryData<ConnectionUser[]>(connectionKeys.connections, (old) => updater(old ?? [])),
    [queryClient]
  );

  const handleAddSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        createdAt: new Date().toISOString(),
      };
      const prevSent = snapshot<ConnectionRequest[]>(connectionKeys.sent);
      setSent((old) => [...old, tempRequest]);
      setAddUsername('');

      try {
        await api.sendConnectionRequest(username);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.sent, prevSent);
        setAddUsername(username);
        showToast(extractErrorMessage(err));
      }
    },
    [addUsername, t, showToast, user, snapshot, setSent, queryClient]
  );

  const handleAccept = useCallback(
    async (requestId: string) => {
      // Find the request to get sender username/id
      const req = incomingRequests.find((r) => r.id === requestId);
      if (!req) return;

      const prevIncoming = snapshot<ConnectionRequest[]>(connectionKeys.incoming);
      const prevConnections = snapshot<ConnectionUser[]>(connectionKeys.connections);

      // Optimistic Update
      setIncoming((old) => old.filter((r) => r.id !== requestId));
      const newConn: ConnectionUser = {
        id: req.senderId,
        username: req.senderUsername,
        role: user?.role === 'seller' ? 'mfr' : 'seller',
      };
      setConnections((old) => [...old, newConn]);

      try {
        await api.acceptRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.connections });
        await queryClient.invalidateQueries({ queryKey: connectionKeys.incoming });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.incoming, prevIncoming);
        queryClient.setQueryData(connectionKeys.connections, prevConnections);
        showToast(extractErrorMessage(err));
      }
    },
    [incomingRequests, snapshot, setIncoming, setConnections, user, showToast, queryClient]
  );

  const handleReject = useCallback(
    async (requestId: string) => {
      const accepted = await confirm({
        title: t('rejectRequestTitle'),
        message: t('rejectRequestConfirm'),
        confirmText: t('rejectBtn'),
        isDestructive: true,
      });
      if (!accepted) return;

      const prevIncoming = snapshot<ConnectionRequest[]>(connectionKeys.incoming);

      // Optimistic Update
      setIncoming((old) => old.filter((r) => r.id !== requestId));

      try {
        await api.rejectRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.incoming });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.incoming, prevIncoming);
        showToast(extractErrorMessage(err));
      }
    },
    [confirm, t, snapshot, setIncoming, showToast, queryClient]
  );

  const handleDeleteSent = useCallback(
    async (requestId: string) => {
      const prevSent = snapshot<ConnectionRequest[]>(connectionKeys.sent);

      // Optimistic Update
      setSent((old) => old.filter((r) => r.id !== requestId));

      try {
        await api.deleteSentRequest(requestId);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.sent, prevSent);
        showToast(extractErrorMessage(err));
      }
    },
    [snapshot, setSent, showToast, queryClient]
  );

  const handleRemoveConnection = useCallback(
    async (targetId: string) => {
      const accepted = await confirm({
        title: t('removeConnectionTitle'),
        message: t('removeConnectionConfirm'),
        confirmText: t('disconnectConfirmBtn'),
        isDestructive: true,
      });
      if (!accepted) return;

      const prevConnections = snapshot<ConnectionUser[]>(connectionKeys.connections);

      // Optimistic Update
      setConnections((old) => old.filter((c) => c.id !== targetId));

      try {
        await api.removeConnection(targetId);
        await queryClient.invalidateQueries({ queryKey: connectionKeys.connections });
      } catch (err: unknown) {
        // Rollback on failure
        queryClient.setQueryData(connectionKeys.connections, prevConnections);
        showToast(extractErrorMessage(err));
      }
    },
    [confirm, t, snapshot, setConnections, showToast, queryClient]
  );

  // Handle B2B directory search
  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        setSearchLoading(true);
        const data = await api.searchManufacturers({
          city: searchCity || undefined,
          keyword: searchKeyword || undefined,
        });
        setSearchResults(data.items);
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        setSearchLoading(false);
      }
    },
    [searchCity, searchKeyword, showToast]
  );

  // Send B2B connection from search list
  const handleSendConnectionFromSearch = useCallback(
    async (username: string) => {
      try {
        setActionLoading(true);
        const data = await api.sendConnectionRequest(username);
        showToast(data.message || t('connReqSuccess'));
        await queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        setActionLoading(false);
      }
    },
    [t, showToast, queryClient]
  );

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
    error: '',
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
    handleSendConnectionFromSearch,
  };
}
