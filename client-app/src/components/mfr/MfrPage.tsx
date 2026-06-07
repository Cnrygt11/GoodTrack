import React from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { api, Product } from '../../services/api';
import { Factory, Package, CheckCircle2, Circle } from 'lucide-react';

export default function MfrPage() {
  const { products, setProducts } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const handleToggleComplete = async (productId: string, checked: boolean) => {
    try {
      const data = await api.toggleProductComplete(productId, checked);
      showToast(data.message || t('statusUpdatedSuccess'));
      
      // Update local state
      setProducts((prev: Product[]) => prev.map(p => {
        if (p.id === productId) {
          return { ...p, completed: checked };
        }
        return p;
      }));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const { activeScreen } = useAuth();
  const isCompletedView = activeScreen === 'mfr-completed';
  const sortedProducts = [...products].reverse();
  const filteredProducts = sortedProducts.filter(p => p.completed === isCompletedView);

  return (
    <div id="mfr-screen" className="mfr-theme">
      <h2>
        {isCompletedView ? (
          language === 'tr' ? <>TAMAMLANMIŞ <span>SİPARİŞLER</span></> : <>COMPLETED <span>ORDERS</span></>
        ) : (
          language === 'tr' ? <>BEKLEYEN <span>SİPARİŞLER</span></> : <>PENDING <span>ORDERS</span></>
        )}
      </h2>
      <div className="product-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
            <div className="empty-icon">
              <Factory size={36} style={{ color: 'var(--muted)' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              {isCompletedView ? t('noCompletedOrders') : t('noPendingOrders')}
            </p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';
            return (
              <div key={p.id} className={`product-card ${p.completed ? 'completed' : ''}`}>
                {p.image ? (
                  <div className="product-thumb">
                    <img src={p.image} alt="ürün" />
                  </div>
                ) : (
                  <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={24} style={{ color: 'var(--muted)' }} />
                  </div>
                )}
                
                <div className="product-info">
                  <div className="product-code">{p.code}</div>
                  <div className="product-fields">
                    {p.text && (
                      <div className="product-field-chip">
                        <strong>{t('textLabel')}:</strong> {p.text}
                      </div>
                    )}
                    {p.length && (
                      <div className="product-field-chip">
                        <strong>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'inches'}
                      </div>
                    )}
                    {p.sellerName && (
                      <div className="product-field-chip" style={{ border: '1px solid var(--accent-seller)', color: 'var(--accent-seller)' }}>
                        <strong>{t('sellerLabel')}:</strong> {p.sellerName}
                      </div>
                    )}
                    {Object.entries(p.extras || {}).map(([key, item]) => {
                      if (!item.value) return null;
                      return (
                        <div key={key} className="product-field-chip">
                          <strong>{item.name}:</strong> {item.value}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="complete-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input 
                    type="checkbox" 
                    id={`cb-${p.id}`}
                    checked={p.completed}
                    onChange={(e) => handleToggleComplete(p.id, e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor={`cb-${p.id}`} style={{ cursor: 'pointer', fontSize: '13px' }}>{t('statusCompleted')}</label>
                  {p.completed && (
                    <span className="completed-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(46, 204, 113, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      <CheckCircle2 size={12} />
                      {t('statusCompleted')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

