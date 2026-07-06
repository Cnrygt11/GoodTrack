import { Package, Sparkles, Loader2 } from 'lucide-react';
import useCatalog from '../../hooks/useCatalog';
import CatalogForm from './CatalogForm';
import CatalogItemCard from './CatalogItemCard';
import { ExtraFieldDef } from '../../services/api';

interface CatalogPageProps {
  extraFieldDefs: ExtraFieldDef[];
  onOpenFieldModal: () => void;
  onRemoveField: (id: string) => Promise<void>;
}

export default function CatalogPage({
  extraFieldDefs,
  onOpenFieldModal,
  onRemoveField
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
    handleAssignManufacturer
  } = useCatalog();

  return (
    <div id="catalog-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: 0 }}>
          {t('productCatalogTitlePart1')} <span className="seller-accent">{t('productCatalogTitlePart2')}</span>
        </h2>
        <button
          className="btn-primary"
          onClick={handleSyncEtsyListings}
          disabled={syncEtsyLoading}
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F1641E', borderColor: '#F1641E', padding: '8px 16px' }}
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
        {t('registeredCatalogProductsTitlePart1')} <span className="seller-accent">{t('registeredCatalogProductsTitlePart2')}</span>
      </h2>

      <div className="product-list">
        {catalogProducts.length === 0 ? (
          <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
            <div className="empty-icon">
              <Package size={36} style={{ color: 'var(--muted)' }} />
            </div>
            <p style={{ margin: 0, color: 'var(--muted)' }}>{t('noCatalogProducts')}</p>
          </div>
        ) : (
          [...catalogProducts].reverse().map(p => (
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
    </div>
  );
}
