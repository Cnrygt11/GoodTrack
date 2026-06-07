import { Factory } from 'lucide-react';
import useMfrOrders from '../../hooks/useMfrOrders';
import MfrOrderCard from './MfrOrderCard';
import DefectDetailsModal from './DefectDetailsModal';

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
    handleToggleComplete,
    handleToggleApproval,
    handleMarkSingleAsSeen,
    openDefectDetails,
    closeDefectDetails,
    filteredProducts
  } = useMfrOrders();

  const tabs = [
    { key: 'pending' as const, label: t('btnPendingOrders') },
    { key: 'completed' as const, label: t('btnCompletedOrders') },
    { key: 'defective' as const, label: t('btnDefectiveOrders') },
    { key: 'approval' as const, label: t('btnPendingApprovalOrders') }
  ];

  const titleMap = {
    completed: language === 'tr' ? <><span>TAMAMLANMIŞ </span><span>SİPARİŞLER</span></> : <><span>COMPLETED </span><span>ORDERS</span></>,
    defective: language === 'tr' ? <><span>HATALI </span><span>SİPARİŞLER</span></> : <><span>DEFECTIVE </span><span>ORDERS</span></>,
    approval: language === 'tr' ? <><span>ONAY </span><span>BEKLEYENLER</span></> : <><span>AWAITING </span><span>APPROVAL</span></>,
    pending: language === 'tr' ? <><span>BEKLEYEN </span><span>SİPARİŞLER</span></> : <><span>PENDING </span><span>ORDERS</span></>
  };

  const emptyMessageMap: Record<string, string> = {
    completed: t('noCompletedOrders'),
    defective: t('noDefectiveOrders'),
    approval: t('noPendingApprovalOrders'),
    pending: t('noPendingOrders')
  };

  return (
    <div id="mfr-screen" className="mfr-theme" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="list-header">
        <h2 style={{ margin: 0 }}>{titleMap[activeTab]}</h2>

        <div className="auth-tabs list-tabs">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              className={`auth-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              style={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                ...(activeTab === tab.key ? { borderBottomColor: 'var(--accent-mfr)', color: 'var(--text)' } : {})
              }}
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
              {emptyMessageMap[activeTab]}
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
              onToggleComplete={handleToggleComplete}
              onToggleApproval={handleToggleApproval}
              onMarkAsSeen={handleMarkSingleAsSeen}
              onOpenDefectDetails={openDefectDetails}
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
