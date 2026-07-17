import React from 'react';
import { Store, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useEtsyIntegration } from '../../hooks/useEtsyIntegration';
import { EtsyStoreConnector } from './parts/EtsyStoreConnector';
import { EtsyActiveStoresList } from './parts/EtsyActiveStoresList';
import styles from './EtsyIntegration.module.css';

export default function EtsyIntegration() {
  const { t } = useSettings();
  const {
    loading,
    connections,
    error,
    connectLoading,
    platformWebhookConfigured,
    syncListingsLoading,
    syncOrdersLoading,
    actionSuccessMessage,
    connectEtsy,
    disconnectShop,
    syncListings,
    syncOrders,
  } = useEtsyIntegration();

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    await connectEtsy();
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin" size={24} style={{ color: '#F1641E' }} />
        <span className={styles.loadingText}>Etsy entegrasyonu yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <div className={styles.headerContainer}>
        <div className={styles.iconWrapper}>
          <Store size={24} style={{ color: '#F1641E' }} />
        </div>
        <div>
          <h3 className={styles.title}>Etsy Entegrasyonu</h3>
          <span className={styles.subtitle}>
            Etsy mağazanızdan siparişlerinizi ve ürünlerinizi otomatik eşitleyin.
          </span>
        </div>
      </div>

      {error && (
        <div className={styles.alertDanger}>
          <AlertCircle
            size={16}
            style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }}
          />
          <span className={styles.alertDangerText}>{error}</span>
        </div>
      )}

      {actionSuccessMessage && (
        <div className={styles.alertSuccess}>
          <CheckCircle2
            size={16}
            style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }}
          />
          <span className={styles.alertSuccessText}>{actionSuccessMessage}</span>
        </div>
      )}

      {/* 1. Yeni Mağaza Bağlama (Form) */}
      <EtsyStoreConnector connectLoading={connectLoading} handleConnect={handleConnect} />

      {/* 2. Bağlı Mağazalar Listesi ve İşlemler (sipariş aktarımı polling ile) */}
      {connections.length > 0 ? (
        <EtsyActiveStoresList
          connections={connections}
          platformWebhookConfigured={platformWebhookConfigured}
          syncListingsLoading={syncListingsLoading}
          syncOrdersLoading={syncOrdersLoading}
          handleDisconnect={disconnectShop}
          handleSyncListings={syncListings}
          handleSyncOrders={syncOrders}
        />
      ) : (
        <div className={styles.emptyState}>Henüz bağlanmış bir Etsy mağazası bulunmuyor.</div>
      )}

      {/* Marka ayrımı — GoodTrack, Etsy'nin resmi uygulaması değildir.
          İkinci paragraf Etsy'nin ticari API başvurusunda istediği BİREBİR atıf kalıbıdır. */}
      <p className={styles.trademarkNote}>{t('etsyTrademarkNote')}</p>
      <p className={styles.trademarkNote}>{t('etsyOfficialAttribution')}</p>
    </div>
  );
}
