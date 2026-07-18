import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';

/** React Query anahtarı — kullanıcı adına göre profil detayı. */
export const userProfileKey = (username: string) => ['userProfile', username] as const;

export default function useUserProfileDetail(username: string | undefined) {
  const { user: currentUser } = useAuth();
  const { t } = useSettings();

  // Profil verisi dile bağlı değildir; dil değişiminde yeniden çekilmez (eski effect
  // language'a bağlıydı ve aynı veriyi gereksiz yere tekrar istiyordu).
  const query = useQuery({
    queryKey: userProfileKey(username ?? ''),
    queryFn: () => api.getProfileByUsername(username!),
    enabled: Boolean(username),
  });

  return {
    profile: query.data ?? null,
    loading: query.isPending && Boolean(username),
    error: query.isError ? extractErrorMessage(query.error) : '',
    currentUser,
    t,
  };
}
