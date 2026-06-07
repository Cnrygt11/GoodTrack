import React, { useCallback } from 'react';
import { ClipboardList, PlusCircle, Package, Clock, AlertTriangle, CheckCircle2, XCircle, Send, Archive, Ban } from 'lucide-react';
import useSellerOrders from '../../hooks/useSellerOrders';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import OrderForm from './OrderForm';
import SellerOrderCard from './SellerOrderCard';
import AddFieldModal from './AddFieldModal';
import DefectReportModal from './DefectReportModal';
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
  const {
    language, t, connections, extraFieldDefs, catalogProducts,
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,
    productCode, setProductCode, orderText, setOrderText, orderLength, setOrderLength,
    mfrId, setMfrId, orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct, actionLoading,
    isFieldModalOpen, setIsFieldModalOpen, newFieldName, setNewFieldName,
    newFieldType, setNewFieldType, newFieldOptions, setNewFieldOptions,
    isDefectModalOpen, setIsDefectModalOpen, defectType, setDefectType, defectNote, setDefectNote, defectImage, defectImageFileName,
    selectedTimelineProduct, isTimelineModalOpen, openTimeline, closeTimeline,
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

      {/* Order Timeline History Modal */}
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
              {product.mfrName && <span>{t('mfrLabel')}: {product.mfrName}</span>}
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
                  background: isActive ? 'var(--accent-seller)' : 'var(--border)',
                  border: isActive ? '4px solid var(--surface2)' : '4px solid var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: isActive ? '0 0 10px var(--accent-seller)' : 'none'
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
