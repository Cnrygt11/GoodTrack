import React from 'react';
import { Camera, Plus, Save, Loader2, X } from 'lucide-react';
import { CatalogProduct, ConnectionUser, ExtraFieldDef } from '../../services/api';
import { TranslationKey } from '../../services/translations';

interface CatalogFormProps {
  language: string;
  t: (key: TranslationKey) => string;
  editingProduct: CatalogProduct | null;
  productCode: string;
  setProductCode: (val: string) => void;
  productText: string;
  setProductText: (val: string) => void;
  productLength: string;
  setProductLength: (val: string) => void;
  mfrId: string;
  setMfrId: (val: string) => void;
  catalogImage: string | null;
  imageFileName: string;
  extraValues: Record<string, string>;
  onExtraValueChange: (fieldId: string, val: string) => void;
  actionLoading: boolean;
  connections: ConnectionUser[];
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
  extraFieldDefs: ExtraFieldDef[];
  onOpenFieldModal: () => void;
  onRemoveField: (id: string) => Promise<void>;
}

export default function CatalogForm({
  language,
  t,
  editingProduct,
  productCode,
  setProductCode,
  productText,
  setProductText,
  productLength,
  setProductLength,
  mfrId,
  setMfrId,
  catalogImage,
  imageFileName,
  extraValues,
  onExtraValueChange,
  actionLoading,
  connections,
  onImageChange,
  onClearForm,
  onSubmit,
  extraFieldDefs,
  onOpenFieldModal,
  onRemoveField
}: CatalogFormProps) {
  return (
    <div className="form-card">
      <h3>
        {editingProduct 
          ? t('editCatalogProductTitle') 
          : t('addNewCatalogProduct')}
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('productCode')}</label>
            <input 
              type="text" 
              placeholder={language === 'tr' ? 'Örn: A31' : 'e.g. A31'}
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('productImage')}</label>
            <div className="image-upload-area" id="cat-img-area">
              <input 
                type="file" 
                accept="image/*" 
                id="cat-image" 
                onChange={onImageChange}
              />
              {!catalogImage ? (
                <>
                  <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                    <Camera size={24} style={{ color: 'var(--muted)' }} />
                  </div>
                  <div className="upload-text">{t('clickToUpload')}</div>
                </>
              ) : (
                <>
                  <img className="image-preview" src={catalogImage} alt="preview" style={{ display: 'block' }} />
                  <span style={{ fontSize: '10px', color: 'var(--success)', marginTop: '4px' }}>
                    {imageFileName.substring(0, 16)}...
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{t('customText')}</label>
            <input
              type="text"
              placeholder={language === 'tr' ? 'Metin giriniz' : 'Enter text'}
              value={productText}
              onChange={(e) => setProductText(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('lengthInch')}</label>
            <select
              value={productLength}
              onChange={(e) => setProductLength(e.target.value)}
            >
              <option value="">{t('selectDefault')}</option>
              <option value="20">20 {language === 'tr' ? 'inç' : 'inches'}</option>
              <option value="22">22 {language === 'tr' ? 'inç' : 'inches'}</option>
              <option value="24">24 {language === 'tr' ? 'inç' : 'inches'}</option>
              <option value="26">26 {language === 'tr' ? 'inç' : 'inches'}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('assignedManufacturerLabel')}</label>
            <select 
              value={mfrId}
              onChange={(e) => setMfrId(e.target.value)}
              required
            >
              <option value="">{t('selectDefault')}</option>
              {connections.map(c => (
                <option key={c.id} value={c.id}>{c.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dynamic Extra Fields */}
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>
              {language === 'tr' ? 'Sipariş Özellikleri (Özel Alanlar)' : 'Order Custom Fields'}
            </span>
            <button
              type="button"
              className="add-field-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0, padding: '4px 10px', fontSize: '12px' }}
              onClick={onOpenFieldModal}
            >
              <Plus size={14} />
              {t('addNewFeature')}
            </button>
          </div>

          {extraFieldDefs.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0, fontStyle: 'italic' }}>
              {language === 'tr' ? 'Tanımlanmış özel alan bulunmuyor.' : 'No custom fields defined.'}
            </p>
          ) : (
            <div className="extra-fields" style={{ margin: 0 }}>
              {extraFieldDefs.map(def => (
                <div className="extra-field-row" key={def.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <span className="field-label" style={{ fontWeight: 600, fontSize: '13px' }}>{def.name}</span>
                    <span className="field-type" style={{ fontSize: '10px' }}>
                      {def.type === 'text' ? (language === 'tr' ? 'Metin' : 'Text') : (language === 'tr' ? 'Liste' : 'List')}
                    </span>
                  </div>

                  <div className="field-input" style={{ flex: 1, maxWidth: '300px' }}>
                    {def.type === 'text' ? (
                      <input
                        type="text"
                        placeholder={language === 'tr' ? `${def.name} giriniz` : `Enter ${def.name}`}
                        value={extraValues[def.id] || ''}
                        onChange={(e) => onExtraValueChange(def.id, e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                      />
                    ) : (
                      <select
                        value={extraValues[def.id] || ''}
                        onChange={(e) => onExtraValueChange(def.id, e.target.value)}
                        style={{ width: '100%', padding: '6px', fontSize: '12px' }}
                      >
                        <option value="">{t('selectDefault')}</option>
                        {(def.options || []).map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    )}
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

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClearForm} disabled={actionLoading}>
            {editingProduct ? t('cancelBtn') : t('clearBtn')}
          </button>
          <button 
            type="submit" 
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : editingProduct ? (
              <Save size={16} />
            ) : (
              <Plus size={16} />
            )}
            {editingProduct 
              ? t('saveChanges') 
              : t('addToCatalog')}
          </button>
        </div>
      </form>
    </div>
  );
}
