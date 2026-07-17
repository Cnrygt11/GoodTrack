import { useState, useEffect, useCallback } from 'react';
import { etsyApi } from '../services/etsyApi';
import { EtsyWebhookMockPayload } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';

export interface EtsyConnectionInfo {
  shopId: string;
  shopName: string;
  isActive: boolean;
  tokenExpiresAt: string;
  /** Secret istemciye asla dönmez; yalnız kayıtlı olup olmadığı bildirilir. */
  hasWebhookSecret: boolean;
}

export function useEtsyIntegration() {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<EtsyConnectionInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Connection and actions loading states
  const [connectLoading, setConnectLoading] = useState(false);
  const [platformWebhookConfigured, setPlatformWebhookConfigured] = useState(false);
  const [webhookSecrets, setWebhookSecrets] = useState<Record<string, string>>({});
  const [webhookLoadings, setWebhookLoadings] = useState<Record<string, boolean>>({});
  const [webhookSuccesses, setWebhookSuccesses] = useState<Record<string, boolean>>({});
  const [syncListingsLoading, setSyncListingsLoading] = useState(false);
  const [syncOrdersLoading, setSyncOrdersLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Mock test states
  const [mockLoading, setMockLoading] = useState(false);
  const [mockSuccess, setMockSuccess] = useState<string | null>(null);

  const getWebhookUrl = () => {
    const origin = window.location.origin;
    return `${origin}/api/etsysync/webhook/events`;
  };

  const fetchConnectionInfo = useCallback(async () => {
    setLoading(true);
    try {
      const [data, config] = await Promise.all([
        etsyApi.getConnections(),
        etsyApi.getWebhookConfig(),
      ]);
      setConnections(data || []);
      setPlatformWebhookConfigured(config?.platformConfigured ?? false);

      // Secret sunucudan geri okunamaz; input alanları boş başlar, kayıtlı olduğu
      // hasWebhookSecret bayrağıyla (maskeli placeholder) gösterilir.
      setWebhookSecrets({});
      setError(null);
    } catch (err: unknown) {
      console.error(err);
      setError('Bağlantı bilgileri yüklenirken hata oluştu: ' + extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectionInfo();

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
  }, [fetchConnectionInfo]);

  const connectEtsy = useCallback(async () => {
    setConnectLoading(true);
    setError(null);
    try {
      const callbackUrl = `${window.location.origin}/seller/profile?tab=integrations`; // matching frontendUrl's callback redirection
      const frontendUrl = `${window.location.origin}/seller/profile?tab=integrations`;

      const result = await etsyApi.connect({
        callbackUrl,
        frontendUrl,
      });

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

  const updateWebhookSecret = useCallback(
    async (shopId: string) => {
      // Input boş başlar (secret geri okunamaz); kayıtlı secret varken boş kaydetmek
      // yanlışlıkla silmeye yol açar — yeni değer girilmesini iste.
      const secret = webhookSecrets[shopId] || '';
      const existing = connections.find((c) => c.shopId === shopId);
      if (!secret && existing?.hasWebhookSecret) {
        setError('Kayıtlı imza anahtarı korunuyor. Değiştirmek için yeni bir değer girin.');
        return;
      }

      setWebhookLoadings((prev) => ({ ...prev, [shopId]: true }));
      setWebhookSuccesses((prev) => ({ ...prev, [shopId]: false }));
      setActionSuccessMessage(null);

      try {
        await etsyApi.updateWebhookSecret(shopId, secret || null);

        setWebhookSuccesses((prev) => ({ ...prev, [shopId]: true }));
        setConnections((prev) =>
          prev.map((c) => (c.shopId === shopId ? { ...c, hasWebhookSecret: !!secret } : c)),
        );

        setActionSuccessMessage('Bildirim imza anahtarı başarıyla güncellendi.');
        setTimeout(() => {
          setWebhookSuccesses((prev) => ({ ...prev, [shopId]: false }));
          setActionSuccessMessage(null);
        }, 3000);
      } catch (err: unknown) {
        setError('Bildirim imza anahtarı güncellenemedi: ' + extractErrorMessage(err));
      } finally {
        setWebhookLoadings((prev) => ({ ...prev, [shopId]: false }));
      }
    },
    [webhookSecrets, connections],
  );

  const disconnectShop = useCallback(async (shopId: string) => {
    if (window.confirm('Etsy mağaza bağlantısını kesmek istediğinize emin misiniz?')) {
      try {
        await etsyApi.disconnect(shopId);
        setConnections((prev) => prev.filter((c) => c.shopId !== shopId));
        setActionSuccessMessage('Etsy mağaza bağlantısı başarıyla kesildi.');
        setTimeout(() => setActionSuccessMessage(null), 3000);
      } catch (err: unknown) {
        setError('Bağlantı kesilirken hata oluştu: ' + extractErrorMessage(err));
      }
    }
  }, []);

  const syncListings = useCallback(async () => {
    setSyncListingsLoading(true);
    setActionSuccessMessage(null);
    setError(null);

    try {
      const res = await etsyApi.syncListings();
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
      const res = await etsyApi.syncOrders();
      setActionSuccessMessage(res.message || 'Sipariş tarama tamamlandı.');
    } catch (err: unknown) {
      setError('Sipariş eşitleme başarısız: ' + extractErrorMessage(err));
    } finally {
      setSyncOrdersLoading(false);
    }
  }, []);

  const sendMockWebhook = useCallback(async (payload: EtsyWebhookMockPayload) => {
    setMockLoading(true);
    setMockSuccess(null);
    setError(null);

    try {
      const res = await etsyApi.testMockWebhook(payload);
      setMockSuccess(res.message);
      return res.message;
    } catch (err: unknown) {
      setError('Mock webhook testi başarısız: ' + extractErrorMessage(err));
      throw err;
    } finally {
      setMockLoading(false);
    }
  }, []);

  return {
    loading,
    connections,
    error,
    setError,
    connectLoading,
    platformWebhookConfigured,
    webhookSecrets,
    setWebhookSecrets,
    webhookLoadings,
    webhookSuccesses,
    syncListingsLoading,
    syncOrdersLoading,
    actionSuccessMessage,
    setActionSuccessMessage,
    mockLoading,
    mockSuccess,
    setMockSuccess,
    getWebhookUrl,
    connectEtsy,
    updateWebhookSecret,
    disconnectShop,
    syncListings,
    syncOrders,
    sendMockWebhook,
  };
}
