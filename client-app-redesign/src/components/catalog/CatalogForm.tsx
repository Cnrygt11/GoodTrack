import { Plus, Save, Loader2, X } from 'lucide-react';
import { CatalogProduct, ConnectionUser, ExtraFieldDef } from '../../services/api';
import { TranslationKey } from '../../services/translations';

interface CatalogFormProps {
  t: (key: TranslationKey) => string;
  editingProduct: CatalogProduct | null;
  productCode: string;
  setProductCode: (val: string) => void;
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
  t,
  editingProduct,
  productCode,
  setProductCode,
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
  // Uyumluluk için tutulan ancak kullanılmayan props uyarılarını sustur
  void catalogImage;
  void imageFileName;
  void onImageChange;

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
              placeholder={t('placeholderProductCode')}
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
            />
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
        <div className="form-section-divider">
          <div className="form-section-header">
            <span className="form-section-title">
              {t('orderCustomFields')}
            </span>
            <button
              type="button"
              className="add-field-btn add-field-btn-sm"
              onClick={onOpenFieldModal}
            >
              <Plus size={14} />
              {t('addNewFeature')}
            </button>
          </div>

          {extraFieldDefs.length === 0 ? (
            <p className="form-section-empty">
              {t('noCustomFieldsDefined')}
            </p>
          ) : (
            <div className="extra-fields">
              {extraFieldDefs.map(def => (
                <div className="extra-field-row compact" key={def.id}>
                  <div className="field-info">
                    <span className="field-label">{def.name}</span>
                    <span className="field-type">
                      {def.type === 'text' ? t('textLabel') : t('listLabel')}
                    </span>
                  </div>

                  <div className="field-input">
                    {def.type === 'text' ? (
                      <input
                        type="text"
                        placeholder={t('enterField').replace('{name}', def.name)}
                        value={extraValues[def.id] || ''}
                        onChange={(e) => onExtraValueChange(def.id, e.target.value)}
                      />
                    ) : (
                      <select
                        value={extraValues[def.id] || ''}
                        onChange={(e) => onExtraValueChange(def.id, e.target.value)}
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
                    onClick={() => onRemoveField(def.id)}
                    title={t('titleRemove')}
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
            className="btn-primary btn-flex-inline"
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
