import React from 'react';
import { PlusCircle, Loader2, Store } from 'lucide-react';
import styles from '../EtsyIntegration.module.css';

interface EtsyStoreConnectorProps {
  connectLoading: boolean;
  handleConnect: (e: React.FormEvent) => Promise<void>;
}

export function EtsyStoreConnector({ connectLoading, handleConnect }: EtsyStoreConnectorProps) {
  return (
    <div className={styles.card}>
      <h4 className={styles.cardTitle}>
        <PlusCircle size={18} style={{ color: '#F1641E' }} />
        Yeni Etsy Mağazası Bağla
      </h4>
      <div>
        <p className={styles.cardDescription}>
          GoodTrack sunucuları aracılığıyla yeni bir Etsy mağazasını saniyeler içinde bağlayabilirsiniz.
          Aşağıdaki butona tıkladığınızda güvenli bir şekilde Etsy izin ekranına yönlendirileceksiniz.
        </p>

        <form onSubmit={handleConnect} className={styles.formActions}>
          <button 
            type="submit" 
            className={`btn-primary ${styles.etsyButton}`} 
            disabled={connectLoading}
          >
            {connectLoading ? <Loader2 className="animate-spin" size={14} /> : <Store size={14} />}
            Yeni Mağaza Bağla (OAuth)
          </button>
        </form>
      </div>
    </div>
  );
}
