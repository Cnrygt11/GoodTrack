import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, PlusCircle, Package, Clock, AlertTriangle, CheckCircle2, XCircle, Send, Archive, Ban } from 'lucide-react';
import useSellerOrders from '../../hooks/useSellerOrders';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import OrderForm from './OrderForm';
import SellerOrderCard from './SellerOrderCard';
import AddFieldModal from './AddFieldModal';
import DefectReportModal from './DefectReportModal';
import CatalogPage from '../catalog/CatalogPage';
import { TranslationKey } from '../../services/translations';
import { Product } from '../../services/api';

type ListFilter = 'awaiting' | 'broken' | 'production' | 'completed' | 'delivered' | 'defective' | 'to_ship' | 'shipped';

function getTabIcon(tab: ListFilter, active: boolean) {
  const size = 20;
  const color = active ? 'var(--accent-seller)' : 'var(--muted)';
  switch (tab) {
    case 'awaiting':
      return <Clock size={size} style={{ color }} />;
    case 'broken':
      return <AlertTriangle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;
    case 'production':
      return <Clock size={size} style={{ color }} />;
    case 'completed':
      return <CheckCircle2 size={size} style={{ color: active ? 'var(--success)' : 'var(--muted)' }} />;
    case 'delivered':
      return <CheckCircle2 size={size} style={{ color: active ? '#8bc34a' : 'var(--muted)' }} />;
    case 'defective':
      return <XCircle size={size} style={{ color: active ? 'var(--danger)' : 'var(--muted)' }} />;
    case 'to_ship':
      return <Send size={size} style={{ color: active ? '#9c27b0' : 'var(--muted)' }} />;
    case 'shipped':
      return <Archive size={size} style={{ color }} />;
    default:
      return <Package size={size} style={{ color }} />;
  }
}

export default function SellerPage() {
  const navigate = useNavigate();
  const {
    language, t, connections, extraFieldDefs, catalogProducts,
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,
    productCode, setProductCode, orderText, setOrderText, orderLength, setOrderLength,
    mfrId, setMfrId, orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct, actionLoading,
    isFieldModalOpen, setIsFieldModalOpen, newFieldName, setNewFieldName,
    newFieldType, setNewFieldType, newFieldOptions, setNewFieldOptions,
    isDefectModalOpen, setIsDefectModalOpen, defectType, setDefectType, defectNote, setDefectNote, defectImage, defectImageFileName,
    openTimeline,
    activeDropdownId, setActiveDropdownId,
    unseenIds, badgeCounts, filteredProducts,
    handleImageChange, handleClearForm, handleEditClick, handleExtraValueChange,
    handleSubmit, handleAddFieldSubmit, handleRemoveField, handleDeleteClick,
    handleCancelOrder, handleVerifyOrder, handleShipOrder,
    handleDefectClick, handleDefectImageChange, handleDefectReportSubmit,
    handleMarkSingleAsSeen
  } = useSellerOrders();

  const { setProducts } = useData();
  const { showToast } = useToast();

  const tabs = [
    { key: 'awaiting' as const, label: t('tabAwaiting') },
    { key: 'broken' as const, label: t('tabBroken') },
    { key: 'production' as const, label: t('tabProduction') },
    { key: 'completed' as const, label: t('tabCompleted') },
    { key: 'delivered' as const, label: t('tabDelivered') },
    { key: 'defective' as const, label: t('tabReportedIssues') },
    { key: 'to_ship' as const, label: t('tabToShip') },
    { key: 'shipped' as const, label: t('tabShipped') }
  ];

  return (
    <div id="seller-screen">
      {/* Sub-tab Navigation */}
      <div
        className="tab-navigation"
        style={{
          display: 'flex', gap: '12px', marginBottom: '28px',
          background: 'var(--surface)', padding: '6px', borderRadius: '10px',
          border: '1px solid var(--border)', width: 'fit-content'
        }}
      >
        <TabButton
          active={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
          icon={<ClipboardList size={16} />}
          label={language === 'tr' ? 'Gönderilen Siparişler' : 'Sent Orders'}
        />
        <TabButton
          active={activeTab === 'create'}
          onClick={() => setActiveTab('create')}
          icon={<PlusCircle size={16} />}
          label={language === 'tr' ? 'Yeni Sipariş Oluştur' : 'Create New Order'}
        />
        <TabButton
          active={activeTab === 'catalog'}
          onClick={() => setActiveTab('catalog')}
          icon={<Package size={16} />}
          label={t('btnMyProducts')}
        />
      </div>

      {activeTab === 'create' ? (
        <OrderForm
          language={language}
          t={t}
          editingProduct={editingProduct}
          productCode={productCode}
          setProductCode={setProductCode}
          autofillSuccess={autofillSuccess}
          orderImage={orderImage}
          imageFileName={imageFileName}
          onImageChange={handleImageChange}
          orderText={orderText}
          setOrderText={setOrderText}
          orderLength={orderLength}
          setOrderLength={setOrderLength}
          mfrId={mfrId}
          setMfrId={setMfrId}
          connections={connections}
          extraFieldDefs={extraFieldDefs}
          extraValues={extraValues}
          onExtraValueChange={handleExtraValueChange}
          onRemoveField={handleRemoveField}
          onOpenFieldModal={() => setIsFieldModalOpen(true)}
          actionLoading={actionLoading}
          onClearForm={handleClearForm}
          onSetActiveTab={setActiveTab}
          onSubmit={handleSubmit}
        />
      ) : activeTab === 'catalog' ? (
        <CatalogPage />
      ) : (
        <>
          {/* Dashboard Title */}
          <h2 style={{ marginTop: 0, marginBottom: '16px' }}>
            {language === 'tr' ? <>SİPARİŞ <span>PANELİ</span></> : <>ORDER <span>DASHBOARD</span></>}
          </h2>

          {/* Dashboard Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
            gap: '12px',
            marginBottom: '28px'
          }}>
            {tabs.map(tab => {
              const isActive = listFilter === tab.key;
              const count = badgeCounts[tab.key] || 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => setListFilter(tab.key)}
                  style={{
                    background: isActive ? 'var(--accent-seller-glow)' : 'var(--surface)',
                    border: isActive ? '2px solid var(--accent-seller)' : '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 8px 20px var(--accent-seller-glow)' : 'none',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.borderColor = 'var(--accent-seller)';
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
                    color: isActive ? 'var(--accent-seller)' : 'var(--muted)',
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
              <span style={{ color: 'var(--accent-seller)', fontWeight: 600 }}>{tabs.find(t => t.key === listFilter)?.label}</span>
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

          {/* Product List */}
          <div className="product-list" style={{ marginTop: '20px' }}>
            {filteredProducts.length === 0 ? (
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
                <div className="empty-icon">
                  <Package size={36} style={{ color: 'var(--muted)' }} />
                </div>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  {language === 'tr' ? 'Aradığınız kritere uygun sipariş bulunamadı.' : 'No orders found for this tab.'}
                </p>
              </div>
            ) : (
              filteredProducts.map(p => (
                <SellerOrderCard
                  key={p.id}
                  product={p}
                  language={language}
                  t={t}
                  listFilter={listFilter}
                  isUnseen={unseenIds[listFilter]?.includes(p.id) ?? false}
                  isDropdownOpen={activeDropdownId === p.id}
                  onDropdownToggle={setActiveDropdownId}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                  onCancel={handleCancelOrder}
                  onVerify={handleVerifyOrder}
                  onShip={handleShipOrder}
                  onViewTimeline={openTimeline}
                  onMarkSeen={handleMarkSingleAsSeen}
                  showToast={showToast}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Add Field Modal */}
      <AddFieldModal
        isOpen={isFieldModalOpen}
        onClose={() => setIsFieldModalOpen(false)}
        language={language}
        t={t}
        newFieldName={newFieldName}
        setNewFieldName={setNewFieldName}
        newFieldType={newFieldType}
        setNewFieldType={setNewFieldType}
        newFieldOptions={newFieldOptions}
        setNewFieldOptions={setNewFieldOptions}
        actionLoading={actionLoading}
        onSubmit={handleAddFieldSubmit}
      />

      {/* Defect/Missing Report Modal */}
      <DefectReportModal
        isOpen={isDefectModalOpen}
        onClose={() => setIsDefectModalOpen(false)}
        language={language}
        t={t}
        defectNote={defectNote}
        setDefectNote={setDefectNote}
        defectImage={defectImage}
        defectImageFileName={defectImageFileName}
        actionLoading={actionLoading}
        onImageChange={handleDefectImageChange}
        onSubmit={handleDefectReportSubmit}
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
      onClick={onClick}
      style={{
        padding: '10px 20px', borderRadius: '7px', border: 'none',
        background: active ? 'var(--accent-seller)' : 'transparent',
        color: active ? '#111' : 'var(--muted)',
        fontWeight: 600, cursor: 'pointer', display: 'inline-flex',
        alignItems: 'center', gap: '8px', transition: 'all 0.2s ease', fontSize: '13px'
      }}
    >
      {icon}
      {label}
    </button>
  );
}


