import React from 'react';
import { Factory, Package, Info } from 'lucide-react';
import useMfrOrders, { MfrTab } from '../../hooks/useMfrOrders';
import MfrOrderCard from './MfrOrderCard';
import DefectDetailsModal from './DefectDetailsModal';
import { TranslationKey } from '../../services/translations';
import { Product } from '../../services/api';

export default function MfrPage() {
  const {
    language,
    t,
    activeTab,
    setActiveTab,
    sortOrder,
    setSortOrder,
    selectedDefectProduct,
    isDetailsModalOpen,
    selectedTimelineProduct,
    isTimelineModalOpen,
    unseenIds,
    badgeCounts,
    openTimeline,
    closeTimeline,
    handleUpdateStatus,
    handleMarkSingleAsSeen,
    openDefectDetails,
    closeDefectDetails,
    filteredProducts
  } = useMfrOrders();

  const tabs = [
    { key: 'awaiting' as const, label: t('tabAwaiting') },
    { key: 'corrected' as const, label: t('tabCorrected') },
    { key: 'production' as const, label: t('tabProduction') },
    { key: 'completed' as const, label: t('tabCompleted') },
    { key: 'delivered' as const, label: t('tabDelivered') },
    { key: 'defective' as const, label: t('tabIssuesMfr') },
    { key: 'shipped' as const, label: t('tabArchiveMfr') }
  ];

  const titleMap = {
    awaiting: language === 'tr' ? <><span>GELEN </span><span>SİPARİŞLER</span></> : <><span>INCOMING </span><span>ORDERS</span></>,
    corrected: language === 'tr' ? <><span>DÜZELTİLMİŞ </span><span>SİPARİŞLER</span></> : <><span>CORRECTED </span><span>ORDERS</span></>,
    production: language === 'tr' ? <><span>ÜRETİMDEKİ </span><span>SİPARİŞLER</span></> : <><span>ORDERS </span><span>IN PRODUCTION</span></>,
    completed: language === 'tr' ? <><span>ÜRETİMİ </span><span>TAMAMLANANLAR</span></> : <><span>COMPLETED </span><span>PRODUCTION</span></>,
    delivered: language === 'tr' ? <><span>TESLİM </span><span>EDİLENLER</span></> : <><span>DELIVERED </span><span>ORDERS</span></>,
    defective: language === 'tr' ? <><span>SİPARİŞ </span><span>SORUNLARI</span></> : <><span>ORDER </span><span>PROBLEMS</span></>,
    shipped: language === 'tr' ? <><span>ARŞİVDEKİ </span><span>SİPARİŞLER</span></> : <><span>ARCHIVED </span><span>ORDERS</span></>
  };

  return (
    <div id="mfr-screen" className="mfr-theme" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="list-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{titleMap[activeTab]}</h2>

          {/* Sort Selector */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
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
        </div>

        {/* 7 Mfr Tabs */}
        <div className="segmented-control" style={{ overflowX: 'auto', paddingBottom: '6px', display: 'flex', gap: '8px', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`segmented-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {tab.label}
              {badgeCounts[tab.key] > 0 && (
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
                  {badgeCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="product-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
            <div className="empty-icon">
              <Factory size={36} style={{ color: 'var(--muted)' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>
              {language === 'tr' ? 'Bu sekmede sipariş bulunamadı.' : 'No orders found for this tab.'}
            </p>
          </div>
        ) : (
          filteredProducts.map(p => (
            <MfrOrderCard
              key={p.id}
              product={p}
              activeTab={activeTab}
              isUnseen={unseenIds[activeTab]?.includes(p.id) ?? false}
              language={language}
              t={t}
              onUpdateStatus={handleUpdateStatus}
              onMarkAsSeen={handleMarkSingleAsSeen}
              onOpenDefectDetails={openDefectDetails}
              onOpenTimeline={openTimeline}
            />
          ))
        )}
      </div>

      <DefectDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDefectDetails}
        product={selectedDefectProduct}
        language={language}
        t={t}
      />

      {/* Timeline Modal */}
      <TimelineModal
        isOpen={isTimelineModalOpen}
        onClose={closeTimeline}
        product={selectedTimelineProduct}
        language={language}
        t={t}
      />
    </div>
  );
}

// --- Timeline Modal Helper Component ---
interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  language: string;
  t: (key: TranslationKey) => string;
}

function TimelineModal({ isOpen, onClose, product, language, t }: TimelineModalProps) {
  if (!isOpen || !product) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '550px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
        maxHeight: '80vh', overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
            {t('timelineTitle')}
          </h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            &times;
          </button>
        </div>

        {/* Product Summary */}
        <div style={{ display: 'flex', gap: '16px', background: 'var(--surface2)', padding: '12px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border)' }}>
          {product.image ? (
            <img src={product.image} alt="ürün" style={{ width: '60px', height: '60px', borderRadius: '6px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '60px', height: '60px', borderRadius: '6px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={20} style={{ color: 'var(--muted)' }} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{product.code}</div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' }}>
              {product.sellerName && <span>{t('sellerLabel')}: {product.sellerName}</span>}
              {product.text && <span style={{ marginLeft: '8px' }}>| {product.text}</span>}
            </div>
          </div>
        </div>

        {/* Timeline Log List */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
          
          {/* Vertical line indicator */}
          <div style={{ position: 'absolute', top: '8px', bottom: '8px', left: '11px', width: '2px', background: 'var(--border)', zIndex: 1 }} />

          {(product.logs || []).map((log, index) => {
            const dateStr = new Date(log.timestamp).toLocaleString('tr-TR');
            const isActive = index === (product.logs || []).length - 1;

            return (
              <div key={index} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}>
                {/* Timeline Dot */}
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: isActive ? 'var(--accent-mfr)' : 'var(--border)',
                  border: isActive ? '4px solid var(--surface2)' : '4px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 10px var(--accent-mfr)' : 'none'
                }} />

                {/* Log Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text)' : 'var(--muted)', fontSize: '13.5px' }}>
                      {log.message}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{dateStr}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '8px' }}>
                    <span><strong>Kim:</strong> {log.userName}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {(product.logs || []).length === 0 && (
            <p style={{ margin: 0, padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
              {language === 'tr' ? 'Hareket günlüğü bulunamadı.' : 'No timeline logs found.'}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface2)'}
          >
            {language === 'tr' ? 'Kapat' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
