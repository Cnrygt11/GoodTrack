import React from 'react';
import { Camera, Plus, Save, Loader2 } from 'lucide-react';
import { CatalogProduct, ConnectionUser } from '../../services/api';
import { TranslationKey } from '../../services/translations';

interface CatalogFormProps {
  language: string;
  t: (key: TranslationKey) => string;
  editingProduct: CatalogProduct | null;
  productCode: string;
  setProductCode: (val: string) => void;
  mfrId: string;
  setMfrId: (val: string) => void;
  catalogImage: string | null;
  imageFileName: string;
  actionLoading: boolean;
  connections: ConnectionUser[];
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearForm: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function CatalogForm({
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
  connections,
  onImageChange,
  onClearForm,
  onSubmit
}: CatalogFormProps) {
  return (
    <div className="form-card">
      <h3>
        {editingProduct 
          ? t('editCatalogProductTitle') 
          : (language === 'tr' ? 'Yeni Katalog Ürünü Ekle' : 'Add New Catalog Product')}
      </h3>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>{t('productCode')}</label>
            <input 
              type="text" 
              placeholder="Örn: A31" 
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
                    {language === 'tr' ? 'Seçildi' : 'Selected'}: {imageFileName ? imageFileName.substring(0, 16) + '...' : ''}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>{language === 'tr' ? 'Atanmış Üretici' : 'Assigned Manufacturer'}</label>
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
              : (language === 'tr' ? 'Kataloğa Ekle' : 'Add to Catalog')}
          </button>
        </div>
      </form>
    </div>
  );
}
