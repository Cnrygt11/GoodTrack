import React from 'react';
import { ClipboardList, PlusCircle, Package, Clock, AlertTriangle, CheckCircle2, XCircle, Send, Archive } from 'lucide-react';
import useSellerOrders from '../../hooks/useSellerOrders';
import OrderForm from './OrderForm';
import SellerOrderCard from './SellerOrderCard';
import AddFieldModal from './AddFieldModal';
import DefectReportModal from './DefectReportModal';
import BrokenDetailsModal from './BrokenDetailsModal';
import CatalogPage from '../catalog/CatalogPage';
import { ListFilter } from '../../types/orders';
import { ORDER_STATUS } from '../../utils/constants';
import styles from './SellerPage.module.css';

function getTabIcon(tab: ListFilter) {
  const size = 20;
  switch (tab) {
    case ORDER_STATUS.AWAITING:    return <Clock size={size} />;
    case ORDER_STATUS.BROKEN:      return <AlertTriangle size={size} />;
    case ORDER_STATUS.PRODUCTION:  return <Clock size={size} />;
    case ORDER_STATUS.COMPLETED:   return <CheckCircle2 size={size} />;
    case ORDER_STATUS.DELIVERED:   return <CheckCircle2 size={size} />;
    case ORDER_STATUS.DEFECTIVE:   return <XCircle size={size} />;
    case ORDER_STATUS.TO_SHIP:     return <Send size={size} />;
    case ORDER_STATUS.SHIPPED:     return <Archive size={size} />;
    default:                       return <Package size={size} />;
  }
}

export default function SellerPage() {
  const {
    t, connections, extraFieldDefs,
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,
    productCode, setProductCode, orderText, setOrderText,
    mfrId, setMfrId, orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct, actionLoading,
    isFieldModalOpen, setIsFieldModalOpen, newFieldName, setNewFieldName,
    newFieldType, setNewFieldType, newFieldOptions, setNewFieldOptions,
    isDefectModalOpen, setIsDefectModalOpen, defectNote, setDefectNote, defectImage, defectImageFileName,
    openTimeline, activeDropdownId, setActiveDropdownId,
    unseenIds, badgeCounts, filteredProducts,
    handleImageChange, handleClearForm, handleEditClick, handleExtraValueChange,
    handleSubmit, handleAddFieldSubmit, handleRemoveField, handleDeleteClick,
    handleCancelOrder, handleRequestCancel, handleVerifyOrder, handleShipOrder,
    handleDefectImageChange, handleDefectReportSubmit,
    handleMarkSingleAsSeen,
    isBrokenModalOpen, selectedBrokenProduct, openBrokenDetails, closeBrokenDetails,
  } = useSellerOrders();

  const tabs = [
    { key: ORDER_STATUS.AWAITING, label: t('tabAwaiting') },
    { key: ORDER_STATUS.BROKEN, label: t('tabBroken') },
    { key: ORDER_STATUS.PRODUCTION, label: t('tabProduction') },
    { key: ORDER_STATUS.COMPLETED, label: t('tabCompleted') },
    { key: ORDER_STATUS.DELIVERED, label: t('tabDeliveredSeller') },
    { key: ORDER_STATUS.DEFECTIVE, label: t('tabReportedIssues') },
    { key: ORDER_STATUS.TO_SHIP, label: t('tabToShip') },
    { key: ORDER_STATUS.SHIPPED, label: t('tabShipped') },
  ];

  return (
    <div id="seller-screen">

      {/* Sub-tab navigation */}
      <div className={styles['seller-tab-nav']}>
        <TabButton active={activeTab === 'list'}    onClick={() => setActiveTab('list')}    icon={<ClipboardList size={16} />} label={t('tabSentOrders')} />
        <TabButton active={activeTab === 'create'}  onClick={() => setActiveTab('create')}  icon={<PlusCircle size={16} />}   label={t('tabCreateOrder')} />
        <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} icon={<Package size={16} />}      label={t('btnMyProducts')} />
      </div>

      {/* Tab panels */}
      {activeTab === 'create' ? (
        <OrderForm
          t={t}
          editingProduct={editingProduct}
          productCode={productCode} setProductCode={setProductCode}
          autofillSuccess={autofillSuccess}
          orderImage={orderImage} imageFileName={imageFileName} onImageChange={handleImageChange}
          orderText={orderText} setOrderText={setOrderText}
          mfrId={mfrId} setMfrId={setMfrId}
          connections={connections}
          extraFieldDefs={extraFieldDefs} extraValues={extraValues}
          onExtraValueChange={handleExtraValueChange}
          onRemoveField={handleRemoveField}
          onOpenFieldModal={() => setIsFieldModalOpen(true)}
          actionLoading={actionLoading}
          onClearForm={handleClearForm}
          onSetActiveTab={setActiveTab}
          onSubmit={handleSubmit}
        />
      ) : activeTab === 'catalog' ? (
        <CatalogPage
          extraFieldDefs={extraFieldDefs}
          onOpenFieldModal={() => setIsFieldModalOpen(true)}
          onRemoveField={handleRemoveField}
        />
      ) : (
        <>
          {/* Dashboard title */}
          <h2 className={styles['seller-dashboard-title']}>
            <>{t('sellerDashboardTitlePart1')} <span>{t('sellerDashboardTitlePart2')}</span></>
          </h2>

          {/* Status filter grid */}
          <div className={styles['seller-stat-grid']}>
            {tabs.map((tab) => {
              const isActive = listFilter === tab.key;
              const count = badgeCounts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`${styles['seller-stat-card']}${isActive ? ' ' + styles['seller-stat-card--active'] : ''}`}
                  onClick={() => setListFilter(tab.key)}
                >
                  <div className={`${styles['seller-stat-icon']} status-${tab.key} ${isActive ? styles['seller-stat-icon--active'] : styles['seller-stat-icon--inactive']}`}>
                    {getTabIcon(tab.key)}
                  </div>
                  <span className={`${styles['seller-stat-label']}${isActive ? ' ' + styles['seller-stat-label--active'] : ''}`}>
                    {tab.label}
                  </span>
                  {count > 0 && <span className={styles['seller-stat-badge']}>{count}</span>}
                </button>
              );
            })}
          </div>

          {/* List header */}
          <div className={styles['seller-list-header']}>
            <h3>
              {t('orderListLabel')}{' '}
              <span className={styles['seller-list-filter-name']}>
                {tabs.find((tab) => tab.key === listFilter)?.label}
              </span>
            </h3>
            <div className={styles['seller-sort-row']}>
              <span className={styles['seller-sort-label']}>{t('sortByDate')}:</span>
              <select
                className={styles['seller-sort-select']}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              >
                <option value="desc">{t('newestFirst')}</option>
                <option value="asc">{t('oldestFirst')}</option>
              </select>
            </div>
          </div>

          {/* Product list */}
          <div className={styles['seller-product-list']}>
            {filteredProducts.length === 0 ? (
              <div className={styles['seller-empty-state']}>
                <Package size={36} />
                <p>
                  {t('noOrdersFoundInTab')}
                </p>
              </div>
            ) : (
              filteredProducts.map((p) => (
                <SellerOrderCard
                  key={p.id}
                  product={p}
                  listFilter={listFilter}
                  isUnseen={unseenIds[listFilter]?.includes(p.id) ?? false}
                  isDropdownOpen={activeDropdownId === p.id}
                  onDropdownToggle={setActiveDropdownId}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onCancel={handleCancelOrder}
                  onRequestCancel={handleRequestCancel}
                  onVerify={handleVerifyOrder}
                  onShip={handleShipOrder}
                  onViewTimeline={openTimeline}
                  onMarkSeen={handleMarkSingleAsSeen}
                  onViewBrokenNote={openBrokenDetails}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <AddFieldModal
        isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)}
        t={t}
        newFieldName={newFieldName} setNewFieldName={setNewFieldName}
        newFieldType={newFieldType} setNewFieldType={setNewFieldType}
        newFieldOptions={newFieldOptions} setNewFieldOptions={setNewFieldOptions}
        actionLoading={actionLoading} onSubmit={handleAddFieldSubmit}
      />

      <DefectReportModal
        isOpen={isDefectModalOpen} onClose={() => setIsDefectModalOpen(false)}
        t={t}
        defectNote={defectNote} setDefectNote={setDefectNote}
        defectImage={defectImage} defectImageFileName={defectImageFileName}
        actionLoading={actionLoading}
        onImageChange={handleDefectImageChange} onSubmit={handleDefectReportSubmit}
      />

      <BrokenDetailsModal
        isOpen={isBrokenModalOpen}
        onClose={closeBrokenDetails}
        product={selectedBrokenProduct}
      />

    </div>
  );
}

// --- Internal helper components ---

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      type="button"
      className={`${styles['seller-tab-btn']}${active ? ' ' + styles['seller-tab-btn--active'] : ''}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
