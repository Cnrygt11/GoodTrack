import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/apiClient';

/** React Query anahtarı — tek sipariş detayı (SignalR güncellemeleri bu anahtarı da tazeleyebilir). */
export const orderDetailKey = (id: string) => ['orderDetail', id] as const;

export default function useOrderDetail(id: string | undefined) {
  const { user } = useAuth();
  const { t } = useSettings();

  const query = useQuery({
    queryKey: orderDetailKey(id ?? ''),
    queryFn: () => api.getProductById(id!),
    enabled: Boolean(id),
  });

  return {
    product: query.data ?? null,
    loading: query.isPending && Boolean(id),
    error: query.isError ? t('failedToLoadOrderDetails') : '',
    user,
    t,
  };
}
