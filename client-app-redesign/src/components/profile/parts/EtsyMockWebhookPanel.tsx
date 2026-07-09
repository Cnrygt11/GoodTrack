import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, PlusCircle, Loader2 } from 'lucide-react';
import { EtsyWebhookMockPayload } from '../../../services/apiClient';
import styles from '../EtsyIntegration.module.css';

interface EtsyMockWebhookPanelProps {
  mockLoading: boolean;
  mockSuccess: string | null;
  setMockSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  connections: { shopId: string }[];
  sendMockWebhook: (payload: EtsyWebhookMockPayload) => Promise<string>;
}

export function EtsyMockWebhookPanel({
  mockLoading,
  mockSuccess,
  setMockSuccess,
  connections,
  sendMockWebhook
}: EtsyMockWebhookPanelProps) {
  const [mockListingId, setMockListingId] = useState('');
  const [mockReceiptId, setMockReceiptId] = useState('');
  const [mockCustomerName, setMockCustomerName] = useState('John Doe');
  const [mockAddress, setMockAddress] = useState('Test St. 123');
  const [mockCity, setMockCity] = useState('Istanbul');
  const [mockCountry, setMockCountry] = useState('TR');
  const [mockPersonalization, setMockPersonalization] = useState('Yazı: "Etsy Test"');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mockListingId) {
      return;
    }

    const generatedReceiptId = mockReceiptId || Math.floor(100000000 + Math.random() * 900000000).toString();

    const payload: EtsyWebhookMockPayload = {
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
      const message = await sendMockWebhook(payload);
      setMockSuccess(`${message} (Sipariş No: ${generatedReceiptId})`);
      setMockReceiptId('');
    } catch {
      // Hata parent veya hook içinde yönetiliyor
    }
  };

  return (
    <div className={styles.mockCard}>
      <h5 className={styles.mockTitle}>
        <AlertTriangle size={14} />
        Simüle Sipariş Test Aracı (Mock Webhook)
      </h5>
      <p className={styles.cardDescription}>
        Etsy'den gerçek bir satın alım yapmadan, siparişin otomatik olarak GoodTrack paneline düştüğünü doğrulamak için bir satın alma olayını simüle edin.
      </p>

      {mockSuccess && (
        <div className={styles.mockAlert}>
          <CheckCircle2 size={14} style={{ color: 'var(--success)', marginTop: '2px' }} />
          <span>{mockSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSend} className={styles.mockForm}>
        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Etsy Listing ID (Katalogdaki Ürün ID)</label>
          <input 
            type="text" 
            placeholder="Örn: 123456789" 
            required 
            value={mockListingId} 
            onChange={(e) => setMockListingId(e.target.value)} 
            className={styles.mockInput} 
          />
          <small style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
            Katalogda `etsy-LISTING_ID` koduyla kayıtlı ve üretici atanmış bir ürün olmalıdır.
          </small>
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Kişiselleştirme Notu (Personalization)</label>
          <input 
            type="text" 
            placeholder="Boyut: XL, Renk: Mavi" 
            value={mockPersonalization} 
            onChange={(e) => setMockPersonalization(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Müşteri Adı</label>
          <input 
            type="text" 
            value={mockCustomerName} 
            onChange={(e) => setMockCustomerName(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Sipariş Numarası (Opsiyonel)</label>
          <input 
            type="text" 
            placeholder="Boş bırakılırsa rastgele üretilir" 
            value={mockReceiptId} 
            onChange={(e) => setMockReceiptId(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Adres</label>
          <input 
            type="text" 
            value={mockAddress} 
            onChange={(e) => setMockAddress(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Şehir</label>
          <input 
            type="text" 
            value={mockCity} 
            onChange={(e) => setMockCity(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockFormGroup}>
          <label style={{ fontSize: '11px' }}>Ülke Kodu (ISO)</label>
          <input 
            type="text" 
            value={mockCountry} 
            onChange={(e) => setMockCountry(e.target.value)} 
            className={styles.mockInput} 
          />
        </div>

        <div className={styles.mockSubmitRow}>
          <button 
            type="submit" 
            className={`btn-primary ${styles.etsyButton}`} 
            disabled={mockLoading} 
            style={{ fontSize: '12px' }}
          >
            {mockLoading ? <Loader2 className="animate-spin" size={12} /> : <PlusCircle size={12} />}
            Sipariş Simülasyonunu Gönder
          </button>
        </div>
      </form>
    </div>
  );
}

