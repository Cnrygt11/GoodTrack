import { Store, CheckCircle2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { EtsyConnectionInfo } from '../../../hooks/useEtsyIntegration';
import styles from '../EtsyIntegration.module.css';

/**
 * Bağlı Etsy mağazaları ve eşitleme işlemleri. Sipariş aktarımı Etsy Open API üzerinden
 * PERİYODİK EŞİTLEME (polling) ile yapılır — Etsy'nin genel kullanıma açık webhook'u yoktur;
 * bu yüzden arayüzde webhook/anahtar yapılandırması sunulmaz. (Platform düzeyinde bir
 * bildirim altyapısı yapılandırıldıysa yalnız bilgi notu gösterilir.)
 */
interface EtsyActiveStoresListProps {
  connections: EtsyConnectionInfo[];
  platformWebhookConfigured: boolean;
  syncListingsLoading: boolean;
  syncOrdersLoading: boolean;
  handleDisconnect: (shopId: string) => Promise<void>;
  handleSyncListings: () => Promise<void>;
  handleSyncOrders: () => Promise<void>;
}

export function EtsyActiveStoresList({
  connections,
  platformWebhookConfigured,
  syncListingsLoading,
  syncOrdersLoading,
  handleDisconnect,
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
                  Mağaza No: {conn.shopId} • Bağlantı yenilenme tarihi:{' '}
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

          {platformWebhookConfigured && (
            <div className={styles.webhookSection}>
              <div className={styles.webhookInfoNote}>
                <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <span>
                  Sipariş bildirimleri otomatik olarak yapılandırıldı; ek bir işlem yapmanıza gerek
                  yok.
                </span>
              </div>
            </div>
          )}
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
