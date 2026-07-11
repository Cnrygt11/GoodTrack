import { apiCall } from './apiClient';
import { EtsyConnectionInfo } from '../hooks/useEtsyIntegration';
import { EtsyWebhookMockPayload } from './apiClient';

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
  updateWebhookSecret(shopId: string, secret: string | null): Promise<void> {
    return apiCall<void>('/etsysync/connection/webhook-secret', {
      method: 'POST',
      body: JSON.stringify({ etsyShopId: shopId, webhookSigningSecret: secret }),
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
  testMockWebhook(payload: EtsyWebhookMockPayload): Promise<{ message: string }> {
    return apiCall<{ message: string }>('/etsysync/webhook/test-mock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
