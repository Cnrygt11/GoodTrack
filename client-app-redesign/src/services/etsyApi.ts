import { apiCall } from './apiClient';
import { EtsyConnectionInfo } from '../hooks/useEtsyIntegration';

/**
 * Etsy entegrasyon API çağrıları. Sipariş aktarımı polling iledir (Etsy'nin genel
 * kullanıma açık webhook'u yoktur); bu yüzden webhook imza-anahtarı / mock-test
 * uçları arayüzden kaldırılmıştır.
 */
export const etsyApi = {
  getConnections(): Promise<EtsyConnectionInfo[]> {
    return apiCall<EtsyConnectionInfo[]>('/etsysync/connections');
  },
  getWebhookConfig(): Promise<{ platformConfigured: boolean }> {
    return apiCall<{ platformConfigured: boolean }>('/etsysync/webhook-config');
  },
  connect(request: { callbackUrl: string; frontendUrl: string }): Promise<{ oauthUrl: string }> {
    return apiCall<{ oauthUrl: string }>('/etsyauth/connect', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
  disconnect(shopId: string): Promise<void> {
    return apiCall<void>('/etsysync/connection/disconnect', {
      method: 'POST',
      body: JSON.stringify({ etsyShopId: shopId }),
    });
  },
  syncListings(): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/sync-listings', { method: 'POST' });
  },
  syncOrders(): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/sync-orders', { method: 'POST' });
  },
};
