import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api, Product } from '../../services/api';
import { Factory, Package, CheckCircle2, Circle, X, Info } from 'lucide-react';
import Modal from '../ui/Modal';

export default function MfrPage() {
  const { products, setProducts } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [selectedDefectProduct, setSelectedDefectProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

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

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'defective'>('pending');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const sortedProducts = [...products].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });
  const filteredProducts = sortedProducts.filter(p => {
    if (activeTab === 'pending') return !p.completed && !p.isDefective;
    if (activeTab === 'completed') return p.completed && !p.isDefective;
    if (activeTab === 'defective') return !!p.isDefective;
    return true;
  });

  return (
    <div id="mfr-screen" className="mfr-theme" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ margin: 0 }}>
          {activeTab === 'completed' ? (
            language === 'tr' ? <>TAMAMLANMIŞ <span>SİPARİŞLER</span></> : <>COMPLETED <span>ORDERS</span></>
          ) : activeTab === 'defective' ? (
            language === 'tr' ? <>HATALI <span>SİPARİŞLER</span></> : <>DEFECTIVE <span>ORDERS</span></>
          ) : (
            language === 'tr' ? <>BEKLEYEN <span>SİPARİŞLER</span></> : <>PENDING <span>ORDERS</span></>
          )}
        </h2>
        
        <div className="auth-tabs" style={{ margin: 0, width: '420px', maxWidth: '100%' }}>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={activeTab === 'pending' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {}}
          >
            {t('btnPendingOrders')}
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
            style={activeTab === 'completed' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {}}
          >
            {t('btnCompletedOrders')}
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'defective' ? 'active' : ''}`}
            onClick={() => setActiveTab('defective')}
            style={activeTab === 'defective' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {}}
          >
            {t('btnDefectiveOrders')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', margin: '-8px 0 4px' }}>
        <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>{t('sortByDate')}:</span>
        <select 
          value={sortOrder} 
          onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
          style={{ width: '160px', padding: '6px 10px', fontSize: '12.5px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <option value="desc">{t('newestFirst')}</option>
          <option value="asc">{t('oldestFirst')}</option>
        </select>
      </div>

      <div className="product-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
            <div className="empty-icon">
              <Factory size={36} style={{ color: 'var(--muted)' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              {activeTab === 'completed' ? t('noCompletedOrders') : activeTab === 'defective' ? t('noDefectiveOrders') : t('noPendingOrders')}
            </p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';
            return (
              <div key={p.id} className={`product-card ${p.isDefective ? 'defective' : p.completed ? 'completed' : ''}`}>
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
                  {p.isDefective ? (
                    <>
                      <span className="defective-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        <X size={12} />
                        {language === 'tr' ? 'Hatalı' : 'Defective'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDefectProduct(p);
                          setIsDetailsModalOpen(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: 'var(--danger)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                      >
                        <Info size={11} />
                        {t('btnDetails')}
                      </button>
                    </>
                  ) : p.completed && (
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

      {/* Defect details modal */}
      <Modal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={20} />
            {t('defectDetailsTitle')}
          </h3>
          <button 
            onClick={() => setIsDetailsModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        {selectedDefectProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('defectNoteLabel')}
              </span>
              <div style={{
                background: 'var(--surface2)',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '14px',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap'
              }}>
                {selectedDefectProduct.defectNote || (language === 'tr' ? 'Açıklama belirtilmemiş.' : 'No description provided.')}
              </div>
            </div>

            {selectedDefectProduct.defectImage ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {language === 'tr' ? 'Hata Fotoğrafı' : 'Defect Image'}
                </span>
                <div style={{
                  background: 'var(--surface2)',
                  padding: '8px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden'
                }}>
                  <img 
                    src={selectedDefectProduct.defectImage} 
                    alt="Hata Görseli" 
                    style={{
                      maxWidth: '100%',
                      maxHeight: '350px',
                      borderRadius: '6px',
                      objectFit: 'contain',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }} 
                  />
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--muted)',
                fontSize: '13px',
                padding: '8px 0'
              }}>
                <Package size={16} />
                <span>{t('noDefectImage')}</span>
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn-primary" 
                onClick={() => setIsDetailsModalOpen(false)}
                style={{
                  background: 'var(--accent-mfr)',
                  color: '#111',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {language === 'tr' ? 'Kapat' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

