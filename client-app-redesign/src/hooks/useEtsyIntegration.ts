import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, BASE_URL } from '../services/apiClient';
import { EtsyConnectionInfo } from '../types/api';
import { extractErrorMessage } from '../utils/errorUtils';

export type { EtsyConnectionInfo };

/** React Query anahtarı — Etsy bağlantıları + platform webhook yapılandırması. */
export const etsyKeys = {
  integration: ['etsyIntegration'] as const,
};

/**
 * Etsy entegrasyon durumunu yöneten hook. Sipariş aktarımı Etsy Open API üzerinden
 * PERİYODİK EŞİTLEME (polling) ile yapılır; Etsy'nin genel kullanıma açık webhook'u
 * bulunmadığından arayüzde webhook/imza-anahtarı yapılandırması sunulmaz.
 */
export function useEtsyIntegration() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [connectLoading, setConnectLoading] = useState(false);
  const [syncListingsLoading, setSyncListingsLoading] = useState(false);
  const [syncOrdersLoading, setSyncOrdersLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const integrationQuery = useQuery({
    queryKey: etsyKeys.integration,
    queryFn: async () => {
      const [connections, config] = await Promise.all([
        api.getEtsyConnections(),
        api.getEtsyWebhookConfig(),
      ]);
      return { connections: connections ?? [], platformConfigured: config?.platformConfigured ?? false };
    },
  });

  const connections = integrationQuery.data?.connections ?? [];
  const platformWebhookConfigured = integrationQuery.data?.platformConfigured ?? false;
  const loading = integrationQuery.isPending;

  // Sorgu hatası, aksiyon hatalarıyla aynı banner'da gösterilir.
  const displayError = error
    ?? (integrationQuery.isError
      ? 'Bağlantı bilgileri yüklenirken hata oluştu: ' + extractErrorMessage(integrationQuery.error)
      : null);

  const fetchConnectionInfo = useCallback(
    () => queryClient.invalidateQueries({ queryKey: etsyKeys.integration }).then(() => {}),
    [queryClient],
  );

  useEffect(() => {
    // Check URL parameters for OAuth result
    const params = new URLSearchParams(window.location.search);
    const hasError = params.get('etsy_connected') === 'false';
    const errorMsg = params.get('error');
    if (hasError && errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + '?tab=integrations',
      );
    } else if (params.get('etsy_connected') === 'true') {
      const shopName = params.get('shop_name');
      setActionSuccessMessage(
        shopName
          ? `${decodeURIComponent(shopName)} mağazası başarıyla bağlandı!`
          : 'Etsy mağazası başarıyla bağlandı!',
      );
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname + '?tab=integrations',
      );
    }
  }, []);

  const connectEtsy = useCallback(async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const callbackUrl = `${BASE_URL}/etsyauth/callback`; // must match Etsy developer dashboard's registered redirect_uri
      const frontendUrl = `${window.location.origin}/seller/profile?tab=integrations`;

      const result = await api.connectEtsy({ callbackUrl, frontendUrl });

      if (result && result.oauthUrl) {
        window.location.href = result.oauthUrl;
      } else {
        throw new Error('OAuth URL alınamadı.');
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err) || 'OAuth yönlendirmesi başarısız oldu.');
      setConnectLoading(false);
    }
  }, []);

  const disconnectShop = useCallback(async (shopId: string) => {
    if (window.confirm('Etsy mağaza bağlantısını kesmek istediğinize emin misiniz?')) {
      try {
        await api.disconnectEtsyShop(shopId);
        await fetchConnectionInfo();
        setActionSuccessMessage('Etsy mağaza bağlantısı başarıyla kesildi.');
        setTimeout(() => setActionSuccessMessage(null), 3000);
      } catch (err: unknown) {
        setError('Bağlantı kesilirken hata oluştu: ' + extractErrorMessage(err));
      }
    }
  }, [fetchConnectionInfo]);

  const syncListings = useCallback(async () => {
    setSyncListingsLoading(true);
    setActionSuccessMessage(null);
    setError(null);

    try {
      const res = await api.syncEtsyListings();
      setActionSuccessMessage(res.message);
      await fetchConnectionInfo();
    } catch (err: unknown) {
      setError('Ürün eşitleme başarısız: ' + extractErrorMessage(err));
    } finally {
      setSyncListingsLoading(false);
    }
  }, [fetchConnectionInfo]);

  const syncOrders = useCallback(async () => {
    setSyncOrdersLoading(true);
    setActionSuccessMessage(null);
    setError(null);

    try {
      const res = await api.syncEtsyOrders();
      setActionSuccessMessage(res.message || 'Sipariş tarama tamamlandı.');
    } catch (err: unknown) {
      setError('Sipariş eşitleme başarısız: ' + extractErrorMessage(err));
    } finally {
      setSyncOrdersLoading(false);
    }
  }, []);

  return {
    loading,
    connections,
    error: displayError,
    setError,
    connectLoading,
    platformWebhookConfigured,
    syncListingsLoading,
    syncOrdersLoading,
    actionSuccessMessage,
    setActionSuccessMessage,
    connectEtsy,
    disconnectShop,
    syncListings,
    syncOrders,
  };
}
