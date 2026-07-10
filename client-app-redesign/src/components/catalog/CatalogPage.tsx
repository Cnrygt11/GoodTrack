import { useMemo } from 'react';
import { Package, Sparkles, Loader2 } from 'lucide-react';
import useCatalog from '../../hooks/useCatalog';
import usePagination from '../../hooks/usePagination';
import Pagination from '../ui/Pagination';
import CatalogForm from './CatalogForm';
import CatalogItemCard from './CatalogItemCard';
import { ExtraFieldDef } from '../../services/apiClient';

const PAGE_SIZE = 20;

interface CatalogPageProps {
  extraFieldDefs: ExtraFieldDef[];
  onOpenFieldModal: () => void;
  onRemoveField: (id: string) => Promise<void>;
}

export default function CatalogPage({
  extraFieldDefs,
  onOpenFieldModal,
  onRemoveField,
}: CatalogPageProps) {
  const {
    connections,
    catalogProducts,
    t,
    editingProduct,
    productCode,
    setProductCode,
    mfrId,
    setMfrId,
    catalogImage,
    imageFileName,
    extraValues,
    handleExtraValueChange,
    actionLoading,
    handleImageChange,
    handleClearForm,
    handleSubmit,
    handleDelete,
    syncEtsyLoading,
    handleSyncEtsyListings,
    handleAssignManufacturer,
  } = useCatalog();

  // En yeni ürün önce (mevcut davranış), ardından 20'şerlik sayfalama
  const orderedProducts = useMemo(() => [...catalogProducts].reverse(), [catalogProducts]);
  const { pageItems, currentPage, totalPages, setCurrentPage } = usePagination(
    orderedProducts,
    PAGE_SIZE,
  );

  return (
    <div id="catalog-screen">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ marginBottom: 0 }}>
          {t('productCatalogTitlePart1')}{' '}
          <span className="seller-accent">{t('productCatalogTitlePart2')}</span>
        </h2>
        <button
          className="btn-primary btn-etsy-sync"
          onClick={handleSyncEtsyListings}
          disabled={syncEtsyLoading}
        >
          {syncEtsyLoading ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Ürünler Çekiliyor...
            </>
          ) : (
            <>
              <Sparkles size={14} />
              Etsy Ürünlerini Çek
            </>
          )}
        </button>
      </div>

      <CatalogForm
        t={t}
        editingProduct={editingProduct}
        productCode={productCode}
        setProductCode={setProductCode}
        mfrId={mfrId}
        setMfrId={setMfrId}
        catalogImage={catalogImage}
        imageFileName={imageFileName}
        extraValues={extraValues}
        onExtraValueChange={handleExtraValueChange}
        actionLoading={actionLoading}
        connections={connections}
        onImageChange={handleImageChange}
        onClearForm={handleClearForm}
        onSubmit={handleSubmit}
        extraFieldDefs={extraFieldDefs}
        onOpenFieldModal={onOpenFieldModal}
        onRemoveField={onRemoveField}
      />

      <h2>
        {t('registeredCatalogProductsTitlePart1')}{' '}
        <span className="seller-accent">{t('registeredCatalogProductsTitlePart2')}</span>
      </h2>

      <div className="product-list">
        {catalogProducts.length === 0 ? (
          <div
            className="empty-state"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '40px 0',
            }}
          >
            <div className="empty-icon">
              <Package size={36} style={{ color: 'var(--muted)' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{t('noCatalogProducts')}</p>
          </div>
        ) : (
          pageItems.map((p) => (
            <CatalogItemCard
              key={p.id}
              product={p}
              connections={connections}
              onAssignMfr={handleAssignManufacturer}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
    </div>
  );
}
