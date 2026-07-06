import React, { useState, useEffect } from 'react';
import { api, BASE_URL } from '../../services/api';
import { 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  RefreshCw, 
  Settings, 
  Loader2, 
  PlusCircle, 
  Sparkles, 
  AlertTriangle 
} from 'lucide-react';

interface EtsyConnectionInfo {
  shopId: string;
  shopName: string;
  isActive: boolean;
  tokenExpiresAt: string;
  webhookSigningSecret: string | null;
}

export default function EtsyIntegration() {
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<EtsyConnectionInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form states for connection
  const [connectLoading, setConnectLoading] = useState(false);

  // Webhook settings states per shop
  const [webhookSecrets, setWebhookSecrets] = useState<Record<string, string>>({});
  const [webhookLoadings, setWebhookLoadings] = useState<Record<string, boolean>>({});
  const [webhookSuccesses, setWebhookSuccesses] = useState<Record<string, boolean>>({});

  // Sync actions states
  const [syncListingsLoading, setSyncListingsLoading] = useState(false);
  const [syncOrdersLoading, setSyncOrdersLoading] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Mock test states
  const [mockListingId, setMockListingId] = useState('');
  const [mockReceiptId, setMockReceiptId] = useState('');
  const [mockCustomerName, setMockCustomerName] = useState('John Doe');
  const [mockAddress, setMockAddress] = useState('Test St. 123');
  const [mockCity, setMockCity] = useState('Istanbul');
  const [mockCountry, setMockCountry] = useState('TR');
  const [mockPersonalization, setMockPersonalization] = useState('Yazı: "Etsy Test"');
  const [mockLoading, setMockLoading] = useState(false);
  const [mockSuccess, setMockSuccess] = useState<string | null>(null);

  // Copy status
  const [copied, setCopied] = useState(false);

  const getAbsoluteApiUrl = () => {
    if (BASE_URL.startsWith('http')) {
      return BASE_URL;
    }
    const origin = window.location.origin;
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'http://localhost:5244/api';
    }
    return `${origin}/api`;
  };

  const getCallbackUrl = () => {
    return `${getAbsoluteApiUrl()}/etsyauth/callback`;
  };

  const getWebhookUrl = () => {
    return `${getAbsoluteApiUrl()}/etsywebhook/webhook`;
  };

  const fetchConnectionInfo = async () => {
    setLoading(true);
    try {
      const data = await api.getEtsyConnections();
      setConnections(data || []);
      
      const secrets: Record<string, string> = {};
      (data || []).forEach(conn => {
        secrets[conn.shopId] = conn.webhookSigningSecret || '';
      });
      setWebhookSecrets(secrets);
      
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Bağlantı bilgileri yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnectionInfo();

    // URL parametrelerini kontrol et (Hata/Başarı durumlarını arayüzde göstermek için)
    const params = new URLSearchParams(window.location.search);
    const hasError = params.get('etsy_connected') === 'false';
    const errorMsg = params.get('error');
    if (hasError && errorMsg) {
      setError(decodeURIComponent(errorMsg));
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations');
    } else if (params.get('etsy_connected') === 'true') {
      const shopName = params.get('shop_name');
      setActionSuccessMessage(shopName ? `${decodeURIComponent(shopName)} mağazası başarıyla bağlandı!` : 'Etsy mağazası başarıyla bağlandı!');
      window.history.replaceState({}, document.title, window.location.pathname + '?tab=integrations');
    }
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectLoading(true);
    setError(null);

    try {
      const callbackUrl = getCallbackUrl();
      const frontendUrl = `${window.location.origin}/seller/profile?tab=integrations`;

      const result = await api.connectEtsy({
        keystring: '',
        sharedSecret: '',
        callbackUrl,
        frontendUrl
      });

      if (result && result.oauthUrl) {
        window.location.href = result.oauthUrl;
      } else {
        throw new Error('OAuth URL alınamadı.');
      }
    } catch (err: any) {
      setError(err.message || 'OAuth yönlendirmesi başarısız oldu.');
      setConnectLoading(false);
    }
  };

  const handleUpdateWebhookSecret = async (shopId: string) => {
    setWebhookLoadings(prev => ({ ...prev, [shopId]: true }));
    setWebhookSuccesses(prev => ({ ...prev, [shopId]: false }));
    setActionSuccessMessage(null);

    try {
      const secret = webhookSecrets[shopId] || '';
      await api.updateEtsyWebhookSecret(shopId, secret || null);
      
      setWebhookSuccesses(prev => ({ ...prev, [shopId]: true }));
      setConnections(prev => prev.map(c => c.shopId === shopId ? { ...c, webhookSigningSecret: secret || null } : c));
      
      setActionSuccessMessage('Webhook imza doğrulama anahtarı başarıyla güncellendi.');
      setTimeout(() => {
        setWebhookSuccesses(prev => ({ ...prev, [shopId]: false }));
        setActionSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      setError('Webhook Signing Secret güncellenemedi: ' + err.message);
    } finally {
      setWebhookLoadings(prev => ({ ...prev, [shopId]: false }));
    }
  };

  const handleDisconnect = async (shopId: string) => {
    if (confirm('Etsy mağaza bağlantısını kesmek istediğinize emin misiniz?')) {
      try {
        await api.disconnectEtsyShop(shopId);
        setConnections(prev => prev.filter(c => c.shopId !== shopId));
        setActionSuccessMessage('Etsy mağaza bağlantısı başarıyla kesildi.');
        setTimeout(() => setActionSuccessMessage(null), 3000);
      } catch (err: any) {
        setError('Bağlantı kesilirken hata oluştu: ' + err.message);
      }
    }
  };

  const handleSyncListings = async () => {
    setSyncListingsLoading(true);
    setActionSuccessMessage(null);
    setError(null);

    try {
      const res = await api.syncEtsyListings();
      setActionSuccessMessage(res.message);
      fetchConnectionInfo();
    } catch (err: any) {
      setError('Ürün eşitleme başarısız: ' + err.message);
    } finally {
      setSyncListingsLoading(false);
    }
  };

  const handleSyncOrders = async () => {
    setSyncOrdersLoading(true);
    setActionSuccessMessage(null);
    setError(null);

    try {
      const res = await api.syncEtsyOrders();
      setActionSuccessMessage(res.message || 'Sipariş tarama tamamlandı.');
    } catch (err: any) {
      setError('Sipariş eşitleme başarısız: ' + err.message);
    } finally {
      setSyncOrdersLoading(false);
    }
  };

  const handleSendMockWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockListingId) {
      setError('Lütfen test edilecek Listing ID bilgisini girin.');
      return;
    }

    setMockLoading(true);
    setMockSuccess(null);
    setError(null);

    const generatedReceiptId = mockReceiptId || Math.floor(100000000 + Math.random() * 900000000).toString();

    const payload = {
      event_type: 'order.paid',
      shop_id: connections[0]?.shopId || 'test-shop',
      mock_receipt: {
        receipt_id: parseInt(generatedReceiptId),
        name: mockCustomerName,
        first_line: mockAddress,
        second_line: '',
        city: mockCity,
        country_iso: mockCountry,
        transactions: [
          {
            listing_id: parseInt(mockListingId),
            quantity: 1,
            title: 'Test Etsy Ürünü',
            variations: [
              { formatted_name: 'Boyut', formatted_value: 'Standart' },
              { formatted_name: 'Renk', formatted_value: 'Özel' }
            ],
            personalization: mockPersonalization
          }
        ]
      }
    };

    try {
      const res = await api.testMockEtsyWebhook(payload);
      setMockSuccess(`${res.message} (Sipariş No: ${generatedReceiptId})`);
      setMockReceiptId('');
    } catch (err: any) {
      setError('Mock webhook testi başarısız: ' + err.message);
    } finally {
      setMockLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--accent-seller)', marginRight: '8px' }} />
        <span>Etsy entegrasyonu yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className="etsy-integration-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          backgroundColor: 'rgba(241, 100, 30, 0.1)',
          padding: '10px',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Store size={24} style={{ color: '#F1641E' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Etsy Entegrasyonu</h3>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Etsy mağazanızdan siparişlerinizi ve ürünlerinizi otomatik eşitleyin.
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <AlertCircle size={16} style={{ color: 'var(--danger)', marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{error}</span>
        </div>
      )}

      {actionSuccessMessage && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px', padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--success)', marginTop: '2px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text)' }}>{actionSuccessMessage}</span>
        </div>
      )}
      <div className="card" style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '24px', backgroundColor: 'var(--bg-card)' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PlusCircle size={18} style={{ color: '#F1641E' }} />
          Yeni Etsy Mağazası Bağla
        </h4>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 16px 0' }}>
            GoodTrack sunucuları aracılığıyla yeni bir Etsy mağazasını saniyeler içinde bağlayabilirsiniz.
            Aşağıdaki butona tıkladığınızda güvenli bir şekilde Etsy izin ekranına yönlendirileceksiniz.
          </p>

          <form onSubmit={handleConnect} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                type="submit" 
                className="btn-primary" 
                disabled={connectLoading}
                style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1641E', borderColor: '#F1641E', padding: '10px 20px' }}
              >
                {connectLoading ? <Loader2 className="animate-spin" size={14} /> : <Store size={14} />}
                Yeni Mağaza Bağla (OAuth)
              </button>
            </div>
          </form>
        </div>
      </div>

      {connections.length > 0 ? (
        // ── BAĞLI MAĞAZALAR ARAYÜZÜ ──────────────────────────────────────────────
        <div className="etsy-connected-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Bağlı Etsy Mağazalarınız ({connections.length})</h4>

          {connections.map((conn) => (
            <div key={conn.shopId} className="card" style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px', backgroundColor: 'var(--bg-card-glow)' }}>
              
              {/* Bağlantı Bilgi Satırı */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Store size={24} style={{ color: 'var(--success)' }} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={16} />
                        {conn.shopName} Bağlandı
                      </h4>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '6px' }}>
                      Mağaza ID: {conn.shopId} • Token Bitiş: {new Date(conn.tokenExpiresAt).toLocaleDateString('tr-TR')} {new Date(conn.tokenExpiresAt).toLocaleTimeString('tr-TR')}
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

              {/* Bu Mağazaya Özel Webhook Ayarı */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                <h6 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Settings size={12} />
                  Gerçek Zamanlı Webhook Yapılandırması ({conn.shopName})
                </h6>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Etsy Webhook Gönderim URL'i</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        readOnly 
                        value={getWebhookUrl()} 
                        style={{ flex: 1, fontSize: '12px', fontFamily: 'monospace', backgroundColor: 'var(--bg-input-disabled)', padding: '6px 10px', borderRadius: '6px' }}
                      />
                      <button 
                        type="button" 
                        className="btn-secondary" 
                        onClick={() => copyToClipboard(getWebhookUrl())}
                        style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        {copied ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                        {copied ? 'Kopyalandı' : 'Kopyala'}
                      </button>
                    </div>
                    <small style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginTop: '4px', lineHeight: 1.4 }}>
                      Etsy Developer portalınızda bu mağaza için webhook oluşturup <strong>order.paid</strong> event'ine abone olun.
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginTop: '8px' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>Webhook Signing Secret (İmza Doğrulama Anahtarı)</label>
                      <input 
                        type="password" 
                        placeholder="whsec_..."
                        value={webhookSecrets[conn.shopId] || ''}
                        onChange={(e) => setWebhookSecrets(prev => ({ ...prev, [conn.shopId]: e.target.value }))}
                        style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '6px' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      disabled={webhookLoadings[conn.shopId]}
                      onClick={() => handleUpdateWebhookSecret(conn.shopId)}
                      style={{ fontSize: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      {webhookLoadings[conn.shopId] && <Loader2 className="animate-spin" size={12} />}
                      {webhookSuccesses[conn.shopId] ? 'Kaydedildi!' : 'Anahtarı Kaydet'}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}

          {/* Hızlı İşlemler */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>1. Tüm Mağazaların Ürünlerini Eşitle</h5>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Bağlı tüm Etsy mağazalarınızdaki aktif ürünleri GoodTrack Kataloğuna aktarır. Eşitlenen tüm ürünlerin üretici atamalarını katalog sayfasından yapabilirsiniz.
              </p>
              <button 
                className="btn-primary" 
                onClick={handleSyncListings} 
                disabled={syncListingsLoading}
                style={{ width: '100%', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: '#F1641E', borderColor: '#F1641E' }}
              >
                {syncListingsLoading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                Tüm Ürünleri Kataloğa Çek
              </button>
            </div>

            <div className="card" style={{ padding: '20px', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>2. Son Siparişleri Kontrol Et</h5>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                Tüm bağlı Etsy mağazalarınızda son 24 saat içinde gerçekleşen siparişleri tarar ve henüz panele düşmemiş olanları otomatik olarak panele aktarır.
              </p>
              <button 
                className="btn-secondary" 
                onClick={handleSyncOrders} 
                disabled={syncOrdersLoading}
                style={{ width: '100%', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {syncOrdersLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                Siparişleri Şimdi Eşitle
              </button>
            </div>
          </div>

        </div>
      ) : (
        // ── BAĞLI OLMAYAN DURUM BİLGİSİ ───────────────────────────
        <div className="etsy-disconnected-panel">
          <div className="card" style={{ padding: '20px', border: '1px dashed var(--border)', borderRadius: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            Henüz bağlanmış bir Etsy mağazası bulunmuyor. Yukarıdaki butonu kullanarak ilk mağazanızı bağlayabilirsiniz.
          </div>
        </div>
      )}

      {/* MOCK WEBHOOK TEST ALANI */}
      <div className="card" style={{ padding: '20px', border: '1px solid rgba(241, 100, 30, 0.2)', borderRadius: '12px', backgroundColor: 'rgba(241, 100, 30, 0.02)', marginTop: '24px' }}>
        <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#F1641E', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={14} />
          Simüle Sipariş Test Aracı (Mock Webhook)
        </h5>
        <p style={{ fontSize: '12px', color: 'var(--muted)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
          Etsy'den gerçek bir satın alım yapmadan, siparişin otomatik olarak GoodTrack paneline düştüğünü doğrulamak için bir satın alma olayını simüle edin.
        </p>

        {mockSuccess && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '12px' }}>
            <CheckCircle2 size={14} style={{ color: 'var(--success)', marginTop: '2px' }} />
            <span style={{ color: 'var(--text)' }}>{mockSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSendMockWebhook} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Etsy Listing ID (Katalogdaki Ürün ID)</label>
            <input 
              type="text" 
              placeholder="Örn: 123456789" 
              required
              value={mockListingId}
              onChange={(e) => setMockListingId(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
            <small style={{ fontSize: '10px', color: 'var(--muted)' }}>
              Katalogda `etsy-LISTING_ID` koduyla kayıtlı ve üretici atanmış bir ürün olmalıdır.
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Kişiselleştirme Notu (Personalization)</label>
            <input 
              type="text" 
              placeholder="Boyut: XL, Renk: Mavi" 
              value={mockPersonalization}
              onChange={(e) => setMockPersonalization(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Müşteri Adı</label>
            <input 
              type="text" 
              value={mockCustomerName}
              onChange={(e) => setMockCustomerName(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Sipariş Numarası (Opsiyonel)</label>
            <input 
              type="text" 
              placeholder="Boş bırakılırsa rastgele üretilir"
              value={mockReceiptId}
              onChange={(e) => setMockReceiptId(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Adres</label>
            <input 
              type="text" 
              value={mockAddress}
              onChange={(e) => setMockAddress(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Şehir</label>
            <input 
              type="text" 
              value={mockCity}
              onChange={(e) => setMockCity(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '11px' }}>Ülke Kodu (ISO)</label>
            <input 
              type="text" 
              value={mockCountry}
              onChange={(e) => setMockCountry(e.target.value)}
              style={{ fontSize: '12px', padding: '8px' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={mockLoading}
              style={{ fontSize: '12px', backgroundColor: '#F1641E', borderColor: '#F1641E', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {mockLoading ? <Loader2 className="animate-spin" size={12} /> : <PlusCircle size={12} />}
              Sipariş Simülasyonunu Gönder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
