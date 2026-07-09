import React from 'react';
import { Store, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useEtsyIntegration } from '../../hooks/useEtsyIntegration';
import { EtsyStoreConnector } from './parts/EtsyStoreConnector';
import { EtsyActiveStoresList } from './parts/EtsyActiveStoresList';
import { EtsyMockWebhookPanel } from './parts/EtsyMockWebhookPanel';
import styles from './EtsyIntegration.module.css';

export default function EtsyIntegration() {
  const {
    loading,
    connections,
    error,
    connectLoading,
    webhookSecrets,
    setWebhookSecrets,
    webhookLoadings,
    webhookSuccesses,
    syncListingsLoading,
    syncOrdersLoading,
    actionSuccessMessage,
    mockLoading,
    mockSuccess,
    setMockSuccess,
    getWebhookUrl,
    connectEtsy,
    updateWebhookSecret,
    disconnectShop,
    syncListings,
    syncOrders,
    sendMockWebhook
  } = useEtsyIntegration();

  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <AlertCircle size={16} style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} />
          <span className={styles.alertDangerText}>{error}</span>
        </div>
      )}

      {actionSuccessMessage && (
        <div className={styles.alertSuccess}>
          <CheckCircle2 size={16} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
          <span className={styles.alertSuccessText}>{actionSuccessMessage}</span>
        </div>
      )}

      {/* 1. Yeni Mağaza Bağlama (Form) */}
      <EtsyStoreConnector 
        connectLoading={connectLoading} 
        handleConnect={handleConnect} 
      />

      {/* 2. Bağlı Mağazalar Listesi ve İşlemler */}
      {connections.length > 0 ? (
        <EtsyActiveStoresList
          connections={connections}
          webhookSecrets={webhookSecrets}
          setWebhookSecrets={setWebhookSecrets}
          webhookLoadings={webhookLoadings}
          webhookSuccesses={webhookSuccesses}
          syncListingsLoading={syncListingsLoading}
          syncOrdersLoading={syncOrdersLoading}
          copied={copied}
          getWebhookUrl={getWebhookUrl}
          copyToClipboard={copyToClipboard}
          handleDisconnect={disconnectShop}
          handleUpdateWebhookSecret={updateWebhookSecret}
          handleSyncListings={syncListings}
          handleSyncOrders={syncOrders}
        />
      ) : (
        <div className={styles.emptyState}>
          Henüz bağlanmış bir Etsy mağazası bulunmuyor.
        </div>
      )}

      {/* 3. Simülasyon Test Aracı */}
      <EtsyMockWebhookPanel
        mockLoading={mockLoading}
        mockSuccess={mockSuccess}
        setMockSuccess={setMockSuccess}
        connections={connections}
        sendMockWebhook={sendMockWebhook}
      />
    </div>
  );
}
