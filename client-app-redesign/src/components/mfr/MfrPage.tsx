import { Factory, Package, Clock, CheckCircle2, XCircle, Play } from 'lucide-react';
import useMfrOrders, { MfrTab } from '../../hooks/useMfrOrders';
import usePagination from '../../hooks/usePagination';
import Pagination from '../ui/Pagination';
import MfrOrderCard from './MfrOrderCard';
import DefectDetailsModal from './DefectDetailsModal';
import BrokenReportModal from './BrokenReportModal';
import { ORDER_STATUS } from '../../utils/constants';

const PAGE_SIZE = 20;

function getTabIcon(tab: MfrTab, active: boolean) {
  const size = 20;
  const color = active ? 'var(--accent-mfr)' : 'var(--muted)';
  switch (tab) {
    case ORDER_STATUS.AWAITING:
      return <Clock size={size} style={{ color }} />;
    case ORDER_STATUS.CORRECTED:
      return <CheckCircle2 size={size} style={{ color: active ? '#00bcd4' : 'var(--muted)' }} />;
    case ORDER_STATUS.PRODUCTION:
      return <Play size={size} style={{ color }} />;
    case ORDER_STATUS.COMPLETED:
      return (
        <CheckCircle2 size={size} style={{ color: active ? 'var(--success)' : 'var(--muted)' }} />
      );
    case ORDER_STATUS.DELIVERED:
      return <CheckCircle2 size={size} style={{ color: active ? '#8bc34a' : 'var(--muted)' }} />;
    case ORDER_STATUS.DEFECTIVE:
      return <XCircle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;

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
    orderSearch,
    setOrderSearch,
    selectedDefectProduct,
    isDetailsModalOpen,
    unseenIds,
    badgeCounts,
    openTimeline,
    handleUpdateStatus,
    handleMarkSingleAsSeen,
    openDefectDetails,
    closeDefectDetails,
    isBrokenModalOpen,
    closeBrokenModal,
    handleBrokenSubmit,
    handleRespondCancel,
    actionLoading,
    filteredProducts,
  } = useMfrOrders();

  // Aktif durum sekmesindeki siparişleri 20'şerlik sayfalara böl.
  // Sekme veya sıralama değişince 1. sayfaya döner (resetKey).
  const { pageItems, currentPage, totalPages, setCurrentPage } = usePagination(
    filteredProducts,
    PAGE_SIZE,
    `${activeTab}|${sortOrder}|${orderSearch}`,
  );

  const tabs = [
    { key: ORDER_STATUS.AWAITING, label: t('tabAwaiting') },
    { key: ORDER_STATUS.CORRECTED, label: t('tabCorrected') },
    { key: ORDER_STATUS.PRODUCTION, label: t('tabProduction') },
    { key: ORDER_STATUS.COMPLETED, label: t('tabCompleted') },
    { key: ORDER_STATUS.DELIVERED, label: t('tabDelivered') },
    { key: ORDER_STATUS.DEFECTIVE, label: t('tabIssuesMfr') },
  ];

  return (
    <div id="mfr-screen" className="mfr-theme mfr-screen">
      {/* Dashboard Title */}
      <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
        {t('productionDashboardTitlePart1')}{' '}
        <span className="mfr-accent">{t('productionDashboardTitlePart2')}</span>
      </h2>

      {/* Dashboard Cards Grid */}
      <div className="mfr-page-tabs-grid">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = badgeCounts[tab.key] || 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`mfr-page-tab-btn ${isActive ? 'mfr-page-tab-btn--active' : ''}`}
            >
              <div className="mfr-page-tab-icon">{getTabIcon(tab.key, isActive)}</div>
              <span className="mfr-page-tab-label">{tab.label}</span>
              {count > 0 && <span className="mfr-page-tab-badge">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Orders List Header */}
      <div className="mfr-list-header">
        <h3>
          {t('orderListLabel')}{' '}
          <span style={{ color: 'var(--accent-mfr)', fontWeight: 600 }}>
            {tabs.find((t) => t.key === activeTab)?.label}
          </span>
        </h3>

        {/* Sort Selector */}
        <div className="mfr-sort-row">
          <input
            type="text"
            className="order-search-input"
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            placeholder={t('orderSearchPlaceholder')}
          />
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
            <p>{t('noOrdersInTab')}</p>
          </div>
        ) : (
          pageItems.map((p) => (
            <MfrOrderCard
              key={p.id}
              product={p}
              activeTab={activeTab}
              isUnseen={unseenIds[activeTab]?.includes(p.id) ?? false}
              onUpdateStatus={handleUpdateStatus}
              onMarkAsSeen={handleMarkSingleAsSeen}
              onOpenDefectDetails={openDefectDetails}
              onOpenTimeline={openTimeline}
              onRespondCancel={handleRespondCancel}
            />
          ))
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <DefectDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={closeDefectDetails}
        product={selectedDefectProduct}
      />

      <BrokenReportModal
        isOpen={isBrokenModalOpen}
        onClose={closeBrokenModal}
        onSubmit={handleBrokenSubmit}
        actionLoading={actionLoading}
      />
    </div>
  );
}
