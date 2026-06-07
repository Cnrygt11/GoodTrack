import React from 'react';
import { ClipboardList, PlusCircle, Package } from 'lucide-react';
import useSellerOrders from '../../hooks/useSellerOrders';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import OrderForm from './OrderForm';
import SellerOrderCard from './SellerOrderCard';
import AddFieldModal from './AddFieldModal';
import DefectReportModal from './DefectReportModal';

type ListFilter = 'pending' | 'completed' | 'defective' | 'approval';

export default function SellerPage() {
  const {
    language, t, connections, extraFieldDefs, catalogProducts,
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,
    productCode, setProductCode, orderText, setOrderText, orderLength, setOrderLength,
    mfrId, setMfrId, orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct, actionLoading,
    isFieldModalOpen, setIsFieldModalOpen, newFieldName, setNewFieldName,
    newFieldType, setNewFieldType, newFieldOptions, setNewFieldOptions,
    isDefectModalOpen, defectNote, setDefectNote, defectImage, defectImageFileName,
    activeDropdownId, setActiveDropdownId,
    unseenIds, badgeCounts, filteredProducts,
    handleImageChange, handleClearForm, handleEditClick, handleExtraValueChange,
    handleSubmit, handleAddFieldSubmit, handleRemoveField, handleDeleteClick,
    handleDefectClick, handleDefectImageChange, handleDefectReportSubmit,
    handleMarkSingleAsSeen
  } = useSellerOrders();

  const { setProducts } = useData();
  const { showToast } = useToast();

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
          {/* Orders List Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <h2 style={{ margin: 0 }}>
              {listFilter === 'completed' ? (
                language === 'tr' ? <>TAMAMLANMIŞ <span>SİPARİŞLER</span></> : <>COMPLETED <span>ORDERS</span></>
              ) : listFilter === 'defective' ? (
                language === 'tr' ? <>HATALI <span>SİPARİŞLER</span></> : <>DEFECTIVE <span>ORDERS</span></>
              ) : listFilter === 'approval' ? (
                language === 'tr' ? <>ONAY <span>BEKLEYENLER</span></> : <>AWAITING <span>APPROVAL</span></>
              ) : (
                language === 'tr' ? <>BEKLEYEN <span>SİPARİŞLER</span></> : <>PENDING <span>ORDERS</span></>
              )}
            </h2>

            <div className="auth-tabs" style={{ margin: 0, width: '560px', maxWidth: '100%', display: 'flex', gap: '8px' }}>
              <FilterTab filter="pending" label={language === 'tr' ? 'Bekleyenler' : 'Pending'} current={listFilter} onChange={setListFilter} badgeCount={badgeCounts.pending} accentVar="var(--accent-seller)" />
              <FilterTab filter="completed" label={language === 'tr' ? 'Tamamlananlar' : 'Completed'} current={listFilter} onChange={setListFilter} badgeCount={badgeCounts.completed} accentVar="var(--accent-seller)" />
              <FilterTab filter="defective" label={t('btnDefectiveOrders')} current={listFilter} onChange={setListFilter} badgeCount={badgeCounts.defective} accentVar="var(--accent-seller)" />
              <FilterTab filter="approval" label={t('btnPendingApprovalOrders')} current={listFilter} onChange={setListFilter} badgeCount={badgeCounts.approval} accentVar="var(--accent-seller)" />
            </div>
          </div>

          {/* Sort Selector */}
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

          {/* Product List */}
          <div className="product-list">
            {filteredProducts.length === 0 ? (
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
                <div className="empty-icon">
                  <Package size={36} style={{ color: 'var(--muted)' }} />
                </div>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  {listFilter === 'completed'
                    ? t('noCompletedOrders')
                    : listFilter === 'defective'
                    ? t('noDefectiveOrders')
                    : listFilter === 'approval'
                    ? t('noPendingApprovalOrders')
                    : t('noPendingOrders')}
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
                  onDefect={handleDefectClick}
                  onMarkSeen={handleMarkSingleAsSeen}
                  showToast={showToast}
                  setProducts={setProducts}
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

      {/* Defect Report Modal */}
      <DefectReportModal
        isOpen={isDefectModalOpen}
        onClose={() => {/* closed by hook */}}
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

interface FilterTabProps {
  filter: ListFilter;
  label: string;
  current: ListFilter;
  onChange: (f: ListFilter) => void;
  badgeCount: number;
  accentVar: string;
}

function FilterTab({ filter, label, current, onChange, badgeCount, accentVar }: FilterTabProps) {
  const isActive = current === filter;
  return (
    <button
      type="button"
      className={`auth-tab ${isActive ? 'active' : ''}`}
      onClick={() => onChange(filter)}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', gap: '6px',
        ...(isActive ? { borderBottomColor: accentVar, color: 'var(--text)' } : {})
      }}
    >
      {label}
      {badgeCount > 0 && (
        <span style={{
          background: 'var(--danger)', color: 'white', fontSize: '10px', fontWeight: 700,
          padding: '2px 6px', borderRadius: '10px', display: 'inline-flex',
          alignItems: 'center', justifyContent: 'center', minWidth: '16px',
          height: '16px', lineHeight: 1, boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)'
        }}>
          {badgeCount}
        </span>
      )}
    </button>
  );
}
