import React from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import useCatalog from '../../hooks/useCatalog';
import CatalogForm from './CatalogForm';
import CatalogItemCard from './CatalogItemCard';

export default function CatalogPage() {
  const {
    setActiveScreen,
    connections,
    catalogProducts,
    language,
    t,
    editingProduct,
    productCode,
    setProductCode,
    mfrId,
    setMfrId,
    catalogImage,
    imageFileName,
    actionLoading,
    handleImageChange,
    handleClearForm,
    handleStartEdit,
    handleSubmit,
    handleDelete
  } = useCatalog();

  return (
    <div id="catalog-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: 0 }}>
          {language === 'tr' ? (
            <>ÜRÜN <span>KATALOĞU</span></>
          ) : (
            <>PRODUCT <span>CATALOG</span></>
          )}
        </h2>
        <button 
          className="btn-secondary" 
          onClick={() => setActiveScreen('seller')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          {language === 'tr' ? 'Sipariş Ekranına Dön' : 'Back to Orders'}
        </button>
      </div>

      <CatalogForm
        language={language}
        t={t}
        editingProduct={editingProduct}
        productCode={productCode}
        setProductCode={setProductCode}
        mfrId={mfrId}
        setMfrId={setMfrId}
        catalogImage={catalogImage}
        imageFileName={imageFileName}
        actionLoading={actionLoading}
        connections={connections}
        onImageChange={handleImageChange}
        onClearForm={handleClearForm}
        onSubmit={handleSubmit}
      />

      <h2>
        {language === 'tr' ? (
          <>KAYITLI <span>KATALOG ÜRÜNLERİ</span></>
        ) : (
          <>REGISTERED <span>CATALOG PRODUCTS</span></>
        )}
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
              language={language}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
