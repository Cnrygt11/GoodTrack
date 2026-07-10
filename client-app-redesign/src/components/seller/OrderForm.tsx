import React from 'react';
import { ExtraFieldDef, ConnectionUser } from '../../services/apiClient';
import { TranslationKey } from '../../services/translations';
import { Camera, Plus, Send, CheckCircle2, X, Loader2 } from 'lucide-react';

interface OrderFormProps {
  t: (key: TranslationKey) => string;
  editingProduct: { code: string } | null;
  productCode: string;
  setProductCode: (v: string) => void;
  autofillSuccess: boolean;
  orderImage: string | null;
  imageFileName: string;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  orderText: string;
  setOrderText: (v: string) => void;
  mfrId: string;
  setMfrId: (v: string) => void;
  connections: ConnectionUser[];
  extraFieldDefs: ExtraFieldDef[];
  extraValues: Record<string, string>;
  onExtraValueChange: (fieldId: string, val: string) => void;
  onRemoveField: (id: string) => Promise<void>;
  onOpenFieldModal: () => void;
  actionLoading: boolean;
  onClearForm: () => void;
  onSetActiveTab: (tab: 'list' | 'create') => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export default function OrderForm({
  t,
  editingProduct,
  productCode,
  setProductCode,
  autofillSuccess,
  orderImage,
  imageFileName,
  onImageChange,
  orderText,
  setOrderText,
  mfrId,
  setMfrId,
  connections,
  extraFieldDefs,
  extraValues,
  onExtraValueChange,
  onRemoveField,
  onOpenFieldModal,
  actionLoading,
  onClearForm,
  onSetActiveTab,
  onSubmit,
}: OrderFormProps) {
  return (
    <>
      <h2>{editingProduct ? t('editOrderHeading') : t('createOrderHeading')}</h2>

      <div className="form-card">
        <h3>{t('productInfo')}</h3>
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
              {autofillSuccess && (
                <span className="form-feedback-success">✓ {t('autofillMatch')}</span>
              )}
            </div>

            <div className="form-group">
              <label>{t('productImage')}</label>
              <div className="image-upload-area">
                <input type="file" accept="image/*" id="field-image" onChange={onImageChange} />
                {!orderImage ? (
                  <>
                    <div className="upload-icon">
                      <Camera size={24} />
                    </div>
                    <div className="upload-text">{t('clickToUpload')}</div>
                  </>
                ) : (
                  <>
                    <img className="image-preview" src={orderImage} alt="preview" />
                    <span className="filename-preview">{imageFileName.substring(0, 16)}...</span>
                  </>
                )}
              </div>
            </div>

            {/* Yeni sipariş oluşturmada bu alan gösterilmez — kullanıcı özel bir bilgi
                eklemek isterse aşağıdaki "ek özellik ekle" mekanizmasını kullanır.
                Mevcut siparişlerde zaten kayıtlı bir metin olabileceğinden düzenleme
                modunda alan görünmeye devam eder. */}
            {editingProduct && (
              <div className="form-group">
                <label>{t('customText')}</label>
                <input
                  type="text"
                  placeholder={t('enterTextPlaceholder')}
                  value={orderText}
                  onChange={(e) => setOrderText(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label>{t('mfrToSend')}</label>
              <select value={mfrId} onChange={(e) => setMfrId(e.target.value)} required>
                <option value="">{t('selectDefault')}</option>
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.username}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Extra Fields */}
          <div className="extra-fields">
            {extraFieldDefs.map((def) => (
              <div className="extra-field-row" key={def.id}>
                <span className="field-label">{def.name}</span>
                <span className="field-type">
                  {def.type === 'text' ? t('orderFormFieldTypeText') : t('orderFormFieldTypeList')}
                </span>

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
                      {(def.options || []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <button
                  type="button"
                  className="del-btn"
                  onClick={() => onRemoveField(def.id)}
                  title={t('removeTitle')}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="add-field-btn btn-flex-inline"
            onClick={onOpenFieldModal}
          >
            <Plus size={16} />
            {t('addNewFeature')}
          </button>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                onClearForm();
                if (editingProduct) {
                  onSetActiveTab('list');
                }
              }}
              disabled={actionLoading}
            >
              {editingProduct ? t('cancelBtn') : t('clearBtn')}
            </button>
            <button type="submit" className="btn-primary btn-flex-inline" disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : editingProduct ? (
                <CheckCircle2 size={16} />
              ) : (
                <Send size={16} />
              )}
              {editingProduct ? t('saveChanges') : t('sendToProduction')}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
