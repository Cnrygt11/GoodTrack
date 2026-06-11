import React from 'react';
import { ArrowLeft, Package, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const {
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
          {t('productCatalogTitlePart1')} <span className="seller-accent">{t('productCatalogTitlePart2')}</span>
        </h2>
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

      {/* Sipariş Özellikleri (Custom Fields Management) */}
      <div className="card" style={{ padding: '20px', marginTop: '20px', marginBottom: '28px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
            {language === 'tr' ? 'Sipariş Özellikleri (Özel Alanlar)' : 'Order Custom Fields'}
          </h3>
          <button
            type="button"
            className="add-field-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}
            onClick={onOpenFieldModal}
          >
            <Plus size={16} />
            {t('addNewFeature')}
          </button>
        </div>

        {extraFieldDefs.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
            {language === 'tr' ? 'Tanımlanmış özel alan bulunmuyor.' : 'No custom fields defined.'}
          </p>
        ) : (
          <div className="extra-fields" style={{ margin: 0 }}>
            {extraFieldDefs.map(def => (
              <div className="extra-field-row" key={def.id} style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="field-label" style={{ fontWeight: 600 }}>{def.name}</span>
                  <span className="field-type">
                    {def.type === 'text' ? (language === 'tr' ? 'Metin' : 'Text') : (language === 'tr' ? 'Liste' : 'List')}
                  </span>
                </div>
                <button
                  type="button"
                  className="del-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                  onClick={() => onRemoveField(def.id)}
                  title={language === 'tr' ? 'Kaldır' : 'Remove'}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

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
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
