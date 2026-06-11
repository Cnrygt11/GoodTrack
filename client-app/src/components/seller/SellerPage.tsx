import React from 'react';
import { ClipboardList, PlusCircle, Package, Clock, AlertTriangle, CheckCircle2, XCircle, Send, Archive, Ban } from 'lucide-react';
import useSellerOrders from '../../hooks/useSellerOrders';
import OrderForm from './OrderForm';
import SellerOrderCard from './SellerOrderCard';
import AddFieldModal from './AddFieldModal';
import DefectReportModal from './DefectReportModal';
import BrokenDetailsModal from './BrokenDetailsModal';
import CatalogPage from '../catalog/CatalogPage';
import { ListFilter, SellerTabId } from '../../types/orders';

function getTabIcon(tab: ListFilter, active: boolean) {
  const size = 20;
  const c = active ? 'var(--accent-seller)' : 'var(--muted)';
  switch (tab) {
    case 'awaiting':    return <Clock size={size} style={{ color: c }} />;
    case 'broken':      return <AlertTriangle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;
    case 'production':  return <Clock size={size} style={{ color: c }} />;
    case 'completed':   return <CheckCircle2 size={size} style={{ color: active ? 'var(--success)' : 'var(--muted)' }} />;
    case 'delivered':   return <CheckCircle2 size={size} style={{ color: active ? '#8bc34a' : 'var(--muted)' }} />;
    case 'defective':   return <XCircle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;
    case 'to_ship':     return <Send size={size} style={{ color: active ? '#9c27b0' : 'var(--muted)' }} />;
    case 'shipped':     return <Archive size={size} style={{ color: c }} />;
    default:            return <Package size={size} style={{ color: c }} />;
  }
}

export default function SellerPage() {
  const {
    language, t, connections, extraFieldDefs,
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
    { key: 'awaiting'   as const, label: t('tabAwaiting') },
    { key: 'broken'     as const, label: t('tabBroken') },
    { key: 'production' as const, label: t('tabProduction') },
    { key: 'completed'  as const, label: t('tabCompleted') },
    { key: 'delivered'  as const, label: t('tabDelivered') },
    { key: 'defective'  as const, label: t('tabReportedIssues') },
    { key: 'to_ship'    as const, label: t('tabToShip') },
    { key: 'shipped'    as const, label: t('tabShipped') },
  ];

  return (
    <div id="seller-screen">

      {/* Sub-tab navigation */}
      <div className="seller-tab-nav">
        <TabButton active={activeTab === 'list'}    onClick={() => setActiveTab('list')}    icon={<ClipboardList size={16} />} label={language === 'tr' ? 'Gönderilen Siparişler' : 'Sent Orders'} />
        <TabButton active={activeTab === 'create'}  onClick={() => setActiveTab('create')}  icon={<PlusCircle size={16} />}   label={language === 'tr' ? 'Yeni Sipariş Oluştur' : 'Create New Order'} />
        <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} icon={<Package size={16} />}      label={t('btnMyProducts')} />
      </div>

      {/* Tab panels */}
      {activeTab === 'create' ? (
        <OrderForm
          language={language} t={t}
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
          <h2 className="seller-dashboard-title">
            {language === 'tr' ? <><>SİPARİŞ </><span>PANELİ</span></> : <><>ORDER </><span>DASHBOARD</span></>}
          </h2>

          {/* Status filter grid */}
          <div className="seller-stat-grid">
            {tabs.map((tab) => {
              const isActive = listFilter === tab.key;
              const count = badgeCounts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  className={`seller-stat-card${isActive ? ' seller-stat-card--active' : ''}`}
                  onClick={() => setListFilter(tab.key)}
                >
                  <div className={`seller-stat-icon${isActive ? ' seller-stat-icon--active' : ' seller-stat-icon--inactive'}`}>
                    {getTabIcon(tab.key, isActive)}
                  </div>
                  <span className={`seller-stat-label${isActive ? ' seller-stat-label--active' : ''}`}>
                    {tab.label}
                  </span>
                  {count > 0 && <span className="seller-stat-badge">{count}</span>}
                </button>
              );
            })}
          </div>

          {/* List header */}
          <div className="seller-list-header">
            <h3>
              {language === 'tr' ? 'Sipariş Listesi:' : 'Order List:'}{' '}
              <span className="seller-list-filter-name">
                {tabs.find((tab) => tab.key === listFilter)?.label}
              </span>
            </h3>
            <div className="seller-sort-row">
              <span className="seller-sort-label">{t('sortByDate')}:</span>
              <select
                className="seller-sort-select"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              >
                <option value="desc">{t('newestFirst')}</option>
                <option value="asc">{t('oldestFirst')}</option>
              </select>
            </div>
          </div>

          {/* Product list */}
          <div className="seller-product-list">
            {filteredProducts.length === 0 ? (
              <div className="seller-empty-state">
                <Package size={36} />
                <p style={{ margin: 0 }}>
                  {language === 'tr' ? 'Aradığınız kritere uygun sipariş bulunamadı.' : 'No orders found for this tab.'}
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
        language={language} t={t}
        newFieldName={newFieldName} setNewFieldName={setNewFieldName}
        newFieldType={newFieldType} setNewFieldType={setNewFieldType}
        newFieldOptions={newFieldOptions} setNewFieldOptions={setNewFieldOptions}
        actionLoading={actionLoading} onSubmit={handleAddFieldSubmit}
      />

      <DefectReportModal
        isOpen={isDefectModalOpen} onClose={() => setIsDefectModalOpen(false)}
        language={language} t={t}
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
      className={`seller-tab-btn${active ? ' seller-tab-btn--active' : ''}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
