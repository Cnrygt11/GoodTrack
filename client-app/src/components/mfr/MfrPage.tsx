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

  return (
    <div id="mfr-screen" className="mfr-theme mfr-screen">
      {/* Dashboard Title */}
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
        {t('productionDashboardTitlePart1')} <span className="mfr-accent">{t('productionDashboardTitlePart2')}</span>
      </h2>

      {/* Dashboard Cards Grid */}
      <div className="mfr-page-tabs-grid">
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          const count = badgeCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`mfr-page-tab-btn ${isActive ? 'mfr-page-tab-btn--active' : ''}`}
            >
              <div className="mfr-page-tab-icon">
                {getTabIcon(tab.key, isActive)}
              </div>
              <span className="mfr-page-tab-label">
                {tab.label}
              </span>
              {count > 0 && (
                <span className="mfr-page-tab-badge">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Orders List Header */}
      <div className="mfr-list-header">
        <h3>
          {t('orderListLabel')}{' '}
          <span style={{ color: 'var(--accent-mfr)', fontWeight: 600 }}>{tabs.find(t => t.key === activeTab)?.label}</span>
        </h3>

        {/* Sort Selector */}
        <div className="mfr-sort-row">
          <span className="mfr-sort-label">{t('sortByDate')}:</span>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
            className="mfr-sort-select"
          >
            <option value="desc">{t('newestFirst')}</option>
            <option value="asc">{t('oldestFirst')}</option>
          </select>
        </div>
      </div>

      <div className="product-list">
        {filteredProducts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Factory size={36} />
            </div>
            <p>
              {t('noOrdersInTab')}
            </p>
          </div>
        ) : (
          filteredProducts.map(p => (
            <MfrOrderCard
              key={p.id}
              product={p}
              activeTab={activeTab}
              isUnseen={unseenIds[activeTab]?.includes(p.id) ?? false}
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
      />

    </div>
  );
}

