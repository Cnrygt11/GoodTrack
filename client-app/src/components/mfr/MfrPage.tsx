import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api, Product } from '../../services/api';
import { Factory, Package, CheckCircle2, Circle, X, Info, Clock } from 'lucide-react';
import Modal from '../ui/Modal';

export default function MfrPage() {
  const { products, setProducts } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [selectedDefectProduct, setSelectedDefectProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Unseen orders notification states for each list filter tab
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>({
    pending: [],
    completed: [],
    defective: [],
    approval: []
  });
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    pending: 0,
    completed: 0,
    defective: 0,
    approval: 0
  });

  useEffect(() => {
    // Group products by status
    const groupedIds: Record<string, string[]> = {
      pending: products.filter(p => !p.completed && !p.isDefective && !p.isPendingApproval).map(p => p.id),
      completed: products.filter(p => !!p.completed && !p.isDefective && !p.isPendingApproval).map(p => p.id),
      defective: products.filter(p => !!p.isDefective && !p.isPendingApproval).map(p => p.id),
      approval: products.filter(p => !!p.isPendingApproval).map(p => p.id)
    };

    const nextUnseen: Record<string, string[]> = { pending: [], completed: [], defective: [], approval: [] };
    const nextBadgeCounts: Record<string, number> = { pending: 0, completed: 0, defective: 0, approval: 0 };

    const tabs: ('pending' | 'completed' | 'defective' | 'approval')[] = ['pending', 'completed', 'defective', 'approval'];

    tabs.forEach(tab => {
      const storageKey = `seen_mfr_${tab}`;
      const seenRaw = localStorage.getItem(storageKey);
      
      let seen: string[] = [];
      if (seenRaw === null) {
        // First run: mark existing as seen so we only notify on new changes
        seen = groupedIds[tab];
        localStorage.setItem(storageKey, JSON.stringify(seen));
      } else {
        seen = JSON.parse(seenRaw);
      }

      const unseen = groupedIds[tab].filter(id => !seen.includes(id));
      nextUnseen[tab] = unseen;

      if (activeTab !== tab) {
        nextBadgeCounts[tab] = unseen.length;
      } else {
        nextBadgeCounts[tab] = 0;
        if (unseen.length > 0) {
          const newSeen = Array.from(new Set([...seen, ...unseen]));
          localStorage.setItem(storageKey, JSON.stringify(newSeen));
        }
      }
    });

    setUnseenIds(nextUnseen);
    setBadgeCounts(nextBadgeCounts);
  }, [products, activeTab]);

  const handleMarkSingleAsSeen = (productId: string, tab: 'pending' | 'completed' | 'defective' | 'approval') => {
    setUnseenIds(prev => ({
      ...prev,
      [tab]: prev[tab].filter(id => id !== productId)
    }));
    const storageKey = `seen_mfr_${tab}`;
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!seen.includes(productId)) {
      localStorage.setItem(storageKey, JSON.stringify([...seen, productId]));
    }
  };

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

  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'defective' | 'approval'>('pending');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const sortedProducts = [...products].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });
  const filteredProducts = sortedProducts.filter(p => {
    if (activeTab === 'pending') return !p.completed && !p.isDefective && !p.isPendingApproval;
    if (activeTab === 'completed') return p.completed && !p.isDefective && !p.isPendingApproval;
    if (activeTab === 'defective') return !!p.isDefective && !p.isPendingApproval;
    if (activeTab === 'approval') return !!p.isPendingApproval;
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
          ) : activeTab === 'approval' ? (
            language === 'tr' ? <>ONAY <span>BEKLEYENLER</span></> : <>AWAITING <span>APPROVAL</span></>
          ) : (
            language === 'tr' ? <>BEKLEYEN <span>SİPARİŞLER</span></> : <>PENDING <span>ORDERS</span></>
          )}
        </h2>
        
        <div className="auth-tabs" style={{ margin: 0, width: '560px', maxWidth: '100%', display: 'flex', gap: '8px' }}>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              ...(activeTab === 'pending' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {})
            }}
          >
            {t('btnPendingOrders')}
            {badgeCounts.pending > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
                lineHeight: 1,
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
              }}>
                {badgeCounts.pending}
              </span>
            )}
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              ...(activeTab === 'completed' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {})
            }}
          >
            {t('btnCompletedOrders')}
            {badgeCounts.completed > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
                lineHeight: 1,
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
              }}>
                {badgeCounts.completed}
              </span>
            )}
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'defective' ? 'active' : ''}`}
            onClick={() => setActiveTab('defective')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              ...(activeTab === 'defective' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {})
            }}
          >
            {t('btnDefectiveOrders')}
            {badgeCounts.defective > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
                lineHeight: 1,
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
              }}>
                {badgeCounts.defective}
              </span>
            )}
          </button>
          <button 
            type="button"
            className={`auth-tab ${activeTab === 'approval' ? 'active' : ''}`}
            onClick={() => setActiveTab('approval')}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              ...(activeTab === 'approval' ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {})
            }}
          >
            {t('btnPendingApprovalOrders')}
            {badgeCounts.approval > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '10px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '16px',
                height: '16px',
                lineHeight: 1,
                boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
              }}>
                {badgeCounts.approval}
              </span>
            )}
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
              {activeTab === 'completed' 
                ? t('noCompletedOrders') 
                : activeTab === 'defective' 
                ? t('noDefectiveOrders') 
                : activeTab === 'approval' 
                ? t('noPendingApprovalOrders') 
                : t('noPendingOrders')}
            </p>
          </div>
        ) : (
          filteredProducts.map(p => {
            const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';
            return (
              <div key={p.id} className={`product-card ${p.isDefective ? 'defective' : p.completed ? 'completed' : ''}`}>
                {unseenIds[activeTab]?.includes(p.id) && (
                  <div 
                    className="new-completed-dot"
                    style={activeTab === 'defective' ? { backgroundColor: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' } : activeTab === 'approval' ? { backgroundColor: 'var(--accent-mfr)', boxShadow: '0 0 8px var(--accent-mfr)' } : {}}
                    title={language === 'tr' ? 'Yeni Sipariş/Durum! Okundu olarak işaretlemek için tıklayın.' : 'New Order/Status! Click to mark as read.'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkSingleAsSeen(p.id, activeTab);
                    }}
                    onMouseEnter={() => {
                      setTimeout(() => handleMarkSingleAsSeen(p.id, activeTab), 1500);
                    }}
                  />
                )}
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

                <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', padding: '4px 0', lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginRight: '24px' }}>
                  {p.completed ? (
                    <>
                      <span><strong>{t('sentDateLabel')}:</strong> {p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—'}</span>
                      <span style={{ marginTop: '2px', color: 'var(--success)' }}><strong>{t('completedDateLabel')}:</strong> {p.completedAt ? new Date(p.completedAt).toLocaleString('tr-TR') : '—'}</span>
                    </>
                  ) : (
                    <span><strong>{t('sentDateLabel')}:</strong> {dateStr}</span>
                  )}
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
                  {p.isPendingApproval ? (
                    <>
                      <span className="pending-approval-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(230, 126, 34, 0.15)', color: 'var(--accent-mfr)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                        <Clock size={12} style={{ color: 'var(--accent-mfr)' }} />
                        {t('statusPendingApproval')}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const data = await api.toggleProductApproval(p.id, false);
                            showToast(data.message || t('statusUpdatedSuccess'));
                            setProducts((prev: Product[]) => prev.map(item => item.id === p.id ? { ...item, isPendingApproval: false } : item));
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(52, 152, 219, 0.15)',
                          border: '1px solid rgba(52, 152, 219, 0.3)',
                          color: 'var(--accent-mfr)',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.25)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)'}
                      >
                        {language === 'tr' ? 'Üretime Al' : 'Put to Production'}
                      </button>
                    </>
                  ) : p.isDefective ? (
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
                  ) : p.completed ? (
                    <span className="completed-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(46, 204, 113, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                      <CheckCircle2 size={12} />
                      {t('statusCompleted')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const data = await api.toggleProductApproval(p.id, true);
                          showToast(data.message || t('statusUpdatedSuccess'));
                          setProducts((prev: Product[]) => prev.map(item => item.id === p.id ? { ...item, isPendingApproval: true } : item));
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(230, 126, 34, 0.15)',
                        border: '1px solid rgba(230, 126, 34, 0.3)',
                        color: 'var(--accent-mfr)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 0.2s',
                        marginLeft: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.25)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.15)'}
                    >
                      <Info size={11} />
                      {t('btnSendToApproval')}
                    </button>
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

