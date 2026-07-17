import React from 'react';
import { Store, CheckCircle2, Settings, Copy, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { EtsyConnectionInfo } from '../../../hooks/useEtsyIntegration';
import styles from '../EtsyIntegration.module.css';

interface EtsyActiveStoresListProps {
  connections: EtsyConnectionInfo[];
  platformWebhookConfigured: boolean;
  webhookSecrets: Record<string, string>;
  setWebhookSecrets: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  webhookLoadings: Record<string, boolean>;
  webhookSuccesses: Record<string, boolean>;
  syncListingsLoading: boolean;
  syncOrdersLoading: boolean;
  copied: boolean;
  getWebhookUrl: () => string;
  copyToClipboard: (text: string) => void;
  handleDisconnect: (shopId: string) => Promise<void>;
  handleUpdateWebhookSecret: (shopId: string) => Promise<void>;
  handleSyncListings: () => Promise<void>;
  handleSyncOrders: () => Promise<void>;
}

export function EtsyActiveStoresList({
  connections,
  platformWebhookConfigured,
  webhookSecrets,
  setWebhookSecrets,
  webhookLoadings,
  webhookSuccesses,
  syncListingsLoading,
  syncOrdersLoading,
  copied,
  getWebhookUrl,
  copyToClipboard,
  handleDisconnect,
  handleUpdateWebhookSecret,
  handleSyncListings,
  handleSyncOrders,
}: EtsyActiveStoresListProps) {
  return (
    <div className={styles.connectionList}>
      <h4 className={styles.listHeader}>Bağlı Etsy Mağazalarınız ({connections.length})</h4>

      {connections.map((conn) => (
        <div key={conn.shopId} className={styles.storeCard}>
          <div className={styles.storeHeader}>
            <div className={styles.storeInfoContainer}>
              <div className={styles.storeIconCircle}>
                <Store size={24} style={{ color: 'var(--success)' }} />
              </div>
              <div>
                <h4 className={styles.storeTitle}>
                  <CheckCircle2 size={16} />
                  {conn.shopName} Bağlandı
                </h4>
                <span className={styles.storeMeta}>
                  Mağaza ID: {conn.shopId} • Token Bitiş:{' '}
                  {new Date(conn.tokenExpiresAt).toLocaleDateString('tr-TR')}
                </span>
              </div>
            </div>
            <button
              className="btn-secondary"
              onClick={() => handleDisconnect(conn.shopId)}
              style={{ fontSize: '13px' }}
            >
              Bağlantıyı Kes
            </button>
          </div>

          <div className={styles.webhookSection}>
            <h6 className={styles.webhookTitle}>
              <Settings size={12} />
              Sipariş Bildirim Ayarları ({conn.shopName})
            </h6>
            {platformWebhookConfigured ? (
              <div className={styles.webhookInfoNote}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span>
                  Sipariş bildirimleri otomatik olarak yapılandırıldı; ek bir işlem yapmanıza gerek
                  yok.
                </span>
              </div>
            ) : (
              <div className={styles.webhookRow}>
                <div>
                  <label className={styles.label}>Bildirim Adresi (Etsy paneline eklenecek)</label>
                  <div className={styles.inputGroup}>
                    <input
                      readOnly
                      type="text"
                      value={getWebhookUrl()}
                      className={styles.webhookUrlInput}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => copyToClipboard(getWebhookUrl())}
                      style={{
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                      }}
                    >
                      {copied ? (
                        <CheckCircle2 size={12} style={{ color: 'var(--success)' }} />
                      ) : (
                        <Copy size={12} />
                      )}
                      {copied ? 'Kopyalandı' : 'Kopyala'}
                    </button>
                  </div>
                </div>

                <div className={styles.secretForm}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label className={styles.label}>Bildirim İmza Anahtarı</label>
                    {/* Secret sunucudan geri okunamaz; kayıtlıysa maskeli placeholder gösterilir,
                        yeni değer girilirse üzerine yazılır. */}
                    <input
                      type="password"
                      placeholder={conn.hasWebhookSecret ? '•••••••• (kayıtlı)' : 'whsec_...'}
                      value={webhookSecrets[conn.shopId] || ''}
                      onChange={(e) =>
                        setWebhookSecrets((prev) => ({ ...prev, [conn.shopId]: e.target.value }))
                      }
                      className={styles.secretInput}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={webhookLoadings[conn.shopId]}
                    onClick={() => handleUpdateWebhookSecret(conn.shopId)}
                    style={{
                      fontSize: '12px',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {webhookLoadings[conn.shopId] && <Loader2 className="animate-spin" size={12} />}
                    {webhookSuccesses[conn.shopId] ? 'Kaydedildi!' : 'Kaydet'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      <div className={styles.syncGrid}>
        <div className={styles.syncCard}>
          <h5 className={styles.syncTitle}>Kataloğu Eşitle</h5>
          <button
            className={`btn-primary ${styles.etsyButton}`}
            onClick={handleSyncListings}
            disabled={syncListingsLoading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {syncListingsLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            Tümü Kataloğa Çek
          </button>
        </div>

        <div className={styles.syncCard}>
          <h5 className={styles.syncTitle}>Siparişleri Tara</h5>
          <button
            className="btn-secondary"
            onClick={handleSyncOrders}
            disabled={syncOrdersLoading}
            style={{
              width: '100%',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            {syncOrdersLoading ? (
              <Loader2 className="animate-spin" size={14} />
            ) : (
              <RefreshCw size={14} />
            )}
            Şimdi Eşitle
          </button>
        </div>
      </div>
    </div>
  );
}
