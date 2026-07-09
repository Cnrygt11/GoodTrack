import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/adminApi';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { extractErrorMessage } from '../utils/errorUtils';

export function useAdminUsers() {
  const { t } = useSettings();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // 1. Veri Çekme (Otomatik Caching ve Refresh)
  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminApi.getUsers,
    select: (data) => [...data].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.username.localeCompare(b.username);
    })
  });

  // 2. Kullanıcı Silme Mutasyonu
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: (res) => {
      showToast(res.message || t('deleteSuccess'));
      // Listeyi otomatik yenile
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
    },
    onError: (err) => {
      showToast(extractErrorMessage(err));
    }
  });

  const deleteUser = async (userId: string, username: string) => {
    const confirmMessage = `${username} ${t('userDeleteConfirm')}`;
    if (window.confirm(confirmMessage)) {
      deleteMutation.mutate(userId);
    }
  };

  return {
    users,
    loading: isLoading,
    error: error ? extractErrorMessage(error) : null,
    actionLoading: deleteMutation.isPending ? deleteMutation.variables : null, // Silinen user'ın id'sini döner
    fetchUsers: refetch,
    deleteUser
  };
}
