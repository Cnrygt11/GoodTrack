import React from 'react';
import { Factory, Package, Info, Clock, AlertTriangle, CheckCircle2, XCircle, Archive, Play } from 'lucide-react';
import useMfrOrders, { MfrTab } from '../../hooks/useMfrOrders';
import MfrOrderCard from './MfrOrderCard';
import DefectDetailsModal from './DefectDetailsModal';
import { TranslationKey } from '../../services/translations';
import { Product } from '../../services/api';

function getTabIcon(tab: MfrTab, active: boolean) {
  const size = 20;
  const color = active ? 'var(--accent-mfr)' : 'var(--muted)';
  switch (tab) {
    case 'awaiting':
      return <Clock size={size} style={{ color }} />;
    case 'corrected':
      return <CheckCircle2 size={size} style={{ color: active ? '#00bcd4' : 'var(--muted)' }} />;
    case 'production':
      return <Play size={size} style={{ color }} />;
    case 'completed':
      return <CheckCircle2 size={size} style={{ color: active ? 'var(--success)' : 'var(--muted)' }} />;
    case 'delivered':
      return <CheckCircle2 size={size} style={{ color: active ? '#8bc34a' : 'var(--muted)' }} />;
    case 'defective':
      return <XCircle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;
    case 'shipped':
      return <Archive size={size} style={{ color }} />;
    default:
      return <Package size={size} style={{ color }} />;
  }
}

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
    unseenIds,
    badgeCounts,
    openTimeline,
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
      
      {/* Dashboard Title */}
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
        {language === 'tr' ? <>ÜRETİM <span>PANELİ</span></> : <>PRODUCTION <span>DASHBOARD</span></>}
      </h2>

      {/* Dashboard Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
        gap: '12px',
        marginBottom: '28px'
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const count = badgeCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                background: isActive ? 'var(--accent-mfr-glow)' : 'var(--surface)',
                border: isActive ? '2px solid var(--accent-mfr)' : '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px 12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isActive ? '0 8px 20px var(--accent-mfr-glow)' : 'none',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--accent-mfr)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }
              }}
            >
              <div style={{
                color: isActive ? 'var(--accent-mfr)' : 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getTabIcon(tab.key, isActive)}
              </div>
              <span style={{
                fontSize: '12px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--text)' : 'var(--muted)',
                textAlign: 'center'
              }}>
                {tab.label}
              </span>
              {count > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'var(--danger)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List Header */}
      <div className="list-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {language === 'tr' ? 'Sipariş Listesi:' : 'Order List:'}{' '}
          <span style={{ color: 'var(--accent-mfr)', fontWeight: 600 }}>{tabs.find(t => t.key === activeTab)?.label}</span>
        </h3>

        {/* Sort Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

    </div>
  );
}


