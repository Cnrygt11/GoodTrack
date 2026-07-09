import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';

/**
 * React Query anahtarları — bağlantılar ve bağlantı istekleri için paylaşılır.
 * Optimistic güncellemeler queryClient.setQueryData ile bu anahtarlar üzerinden yapılır;
 * böylece DataContext'in elle yazılmış 15sn-TTL merge motoruna gerek kalmaz.
 */
export const connectionKeys = {
  connections: ['connections'] as const,
  incoming: ['connections', 'incoming'] as const,
  sent: ['connections', 'sent'] as const,
};

export function useConnectionsQuery() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: connectionKeys.connections,
    queryFn: () => api.getConnections(),
    enabled: !!user,
  });
  return { connections: query.data ?? [], isLoading: query.isLoading };
}

export function useIncomingRequestsQuery() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: connectionKeys.incoming,
    queryFn: () => api.getIncomingRequests(),
    enabled: !!user,
  });
  return { incomingRequests: query.data ?? [], isLoading: query.isLoading };
}

export function useSentRequestsQuery() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: connectionKeys.sent,
    queryFn: () => api.getSentRequests(),
    enabled: !!user,
  });
  return { sentRequests: query.data ?? [], isLoading: query.isLoading };
}
