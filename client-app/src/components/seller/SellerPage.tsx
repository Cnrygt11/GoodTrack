import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api, Product, ExtraFieldValue } from '../../services/api';
import Modal from '../ui/Modal';
import { Camera, Package, Plus, Send, Clock, CheckCircle2, X, PlusCircle, ClipboardList, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { compressImage } from '../../utils/imageHelper';

export default function SellerPage() {
  const {
    connections,
    products,
    setProducts,
    extraFieldDefs,
    setExtraFieldDefs,
    catalogProducts
  } = useData();

  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  // Core Form inputs
  const [productCode, setProductCode] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderLength, setOrderLength] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [orderImage, setOrderImage] = useState<string | null>(null); // base64 string
  const [imageFileName, setImageFileName] = useState('');

  // Extra dynamic field values dictionary: { [fieldId]: value }
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  // Catalog Auto-fill Match UI indicator
  const [autofillSuccess, setAutofillSuccess] = useState(false);

  // Add Feature Modal inputs
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text'); // text, select
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<'pending' | 'completed'>('pending');

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Handle auto-fill logic when typing product code
  useEffect(() => {
    const code = productCode.trim().toLowerCase();
    if (!code) {
      setAutofillSuccess(false);
      return;
    }

    const match = catalogProducts.find(p => p.productCode.trim().toLowerCase() === code);
    if (match) {
      setMfrId(match.mfrId);
      if (match.image) {
        setOrderImage(match.image);
        setImageFileName('Katalog Görseli');
      }
      setAutofillSuccess(true);
    } else {
      setAutofillSuccess(false);
    }
  }, [productCode, catalogProducts]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    try {
      const compressed = await compressImage(file);
      setOrderImage(compressed);
    } catch (err: any) {
      console.error(err);
      showToast(language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!');
    }
  };

  const handleClearForm = () => {
    setProductCode('');
    setOrderText('');
    setOrderLength('');
    setMfrId('');
    setOrderImage(null);
    setImageFileName('');
    setExtraValues({});
    setAutofillSuccess(false);
    setEditingProduct(null);
    
    const fileInput = document.getElementById('field-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setProductCode(product.code);
    setOrderText(product.text || '');
    setOrderLength(product.length || '');
    setMfrId(product.mfrId);
    setOrderImage(product.image);
    setImageFileName(product.image ? 'Mevcut Görsel' : '');

    const initialExtras: Record<string, string> = {};
    extraFieldDefs.forEach(def => {
      initialExtras[def.id] = product.extras?.[def.id]?.value || '';
    });
    setExtraValues(initialExtras);
    setActiveTab('create');
  };

  const handleExtraValueChange = (fieldId: string, val: string) => {
    setExtraValues(prev => ({
      ...prev,
      [fieldId]: val
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = productCode.trim();
    if (!code) {
      alert(t('productCodeRequired'));
      return;
    }

    if (!mfrId) {
      alert(t('selectMfrRequired'));
      return;
    }

    const selectedMfr = connections.find(c => c.id === mfrId);
    const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

    // Format extra values to match model structure
    const formattedExtras: Record<string, ExtraFieldValue> = {};
    extraFieldDefs.forEach(def => {
      formattedExtras[def.id] = {
        name: def.name,
        type: def.type,
        value: extraValues[def.id] || ''
      };
    });

    try {
      if (editingProduct) {
        const productPayload = {
          ...editingProduct,
          code,
          image: orderImage,
          text: orderText,
          length: orderLength,
          extras: formattedExtras,
          mfrId,
          mfrName
        };
        const data = await api.updateProduct(editingProduct.id, productPayload);
        showToast(data.message || t('orderUpdatedSuccess'));
        setProducts((prev: Product[]) => prev.map(p => p.id === editingProduct.id ? data.product : p));
        handleClearForm();
        setActiveTab('list');
      } else {
        const productPayload = {
          code,
          image: orderImage,
          text: orderText,
          length: orderLength,
          extras: formattedExtras,
          completed: false,
          mfrId,
          mfrName
        };
        const data = await api.createProduct(productPayload);
        showToast(data.message || t('orderSentSuccess'));
        setProducts((prev: Product[]) => [...prev, data.product]);
        handleClearForm();
        setActiveTab('list');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Add Dynamic Feature definition
  const handleAddFieldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFieldName.trim();
    if (!name) {
      alert(t('featureNameRequired'));
      return;
    }

    if (newFieldType === 'select' && !newFieldOptions.trim()) {
      alert(t('featureOptionsRequired'));
      return;
    }

    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      const data = await api.createField({ name, type: newFieldType, options });
      showToast(data.message || t('featureAddSuccess'));
      setExtraFieldDefs(prev => [...prev, data.field]);
      setIsFieldModalOpen(false);
      
      // Clear inputs
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove Dynamic Feature definition
  const handleRemoveField = async (id: string) => {
    if (!confirm(t('featureDelConfirm'))) return;
    try {
      const data = await api.deleteField(id);
      showToast(data.message || t('featureDelSuccess'));
      setExtraFieldDefs(prev => prev.filter(d => d.id !== id));
      
      // Clear values mapping
      setExtraValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteClick = async (product: Product) => {
    const confirmMessage = language === 'tr'
      ? `${product.code} ${t('deleteOrderConfirm')}`
      : `${t('deleteOrderConfirm')} ${product.code}?`;
    if (!confirm(confirmMessage)) {
      return;
    }
    try {
      const data = await api.deleteProduct(product.id);
      showToast(data.message || t('deleteSuccess'));
      setProducts((prev: Product[]) => prev.filter(p => p.id !== product.id));
      if (editingProduct && editingProduct.id === product.id) {
        handleClearForm();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const sortedProducts = [...products].reverse();
  const isCompletedView = listFilter === 'completed';
  const filteredProducts = sortedProducts.filter(p => p.completed === isCompletedView);

  return (
    <div id="seller-screen">
      {/* Sub-tab Navigation */}
      <div 
        className="tab-navigation" 
        style={{ 
          display: 'flex', 
          gap: '12px', 
          marginBottom: '28px',
          background: 'var(--surface)',
          padding: '6px',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          width: 'fit-content'
        }}
      >
        <button 
          type="button"
          onClick={() => setActiveTab('list')}
          style={{
            padding: '10px 20px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'list' ? 'var(--accent-seller)' : 'transparent',
            color: activeTab === 'list' ? '#111' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <ClipboardList size={16} />
          {language === 'tr' ? 'Gönderilen Siparişler' : 'Sent Orders'}
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('create')}
          style={{
            padding: '10px 20px',
            borderRadius: '7px',
            border: 'none',
            background: activeTab === 'create' ? 'var(--accent-seller)' : 'transparent',
            color: activeTab === 'create' ? '#111' : 'var(--muted)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            fontSize: '13px'
          }}
        >
          <PlusCircle size={16} />
          {language === 'tr' ? 'Yeni Sipariş Oluştur' : 'Create New Order'}
        </button>
      </div>

      {activeTab === 'create' ? (
        <>
          <h2>{editingProduct ? (language === 'tr' ? <>SİPARİŞİ <span>DÜZENLE</span></> : <>EDIT <span>ORDER</span></>) : (language === 'tr' ? <>YENİ <span>SİPARİŞ</span> OLUŞTUR</> : <>CREATE NEW <span>ORDER</span></>)}</h2>

          <div className="form-card">
            <h3>{t('productInfo')}</h3>
            <form onSubmit={handleSubmit}>
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
                  {autofillSuccess && (
                    <span style={{ color: 'var(--success)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                      ✓ {t('autofillMatch')}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('productImage')}</label>
                  <div className="image-upload-area">
                    <input 
                      type="file" 
                      accept="image/*" 
                      id="field-image" 
                      onChange={handleImageChange}
                    />
                    {!orderImage ? (
                      <>
                        <div className="upload-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                          <Camera size={24} style={{ color: 'var(--muted)' }} />
                        </div>
                        <div className="upload-text">{t('clickToUpload')}</div>
                      </>
                    ) : (
                      <>
                        <img className="image-preview" src={orderImage} alt="preview" style={{ display: 'block' }} />
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
                    value={orderText}
                    onChange={(e) => setOrderText(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>{t('lengthInch')}</label>
                  <select 
                    value={orderLength} 
                    onChange={(e) => setOrderLength(e.target.value)}
                  >
                    <option value="">{t('selectDefault')}</option>
                    <option value="20">20 {language === 'tr' ? 'inç' : 'inches'}</option>
                    <option value="22">22 {language === 'tr' ? 'inç' : 'inches'}</option>
                    <option value="24">24 {language === 'tr' ? 'inç' : 'inches'}</option>
                    <option value="26">26 {language === 'tr' ? 'inç' : 'inches'}</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>{t('mfrToSend')}</label>
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

              {/* Dynamic Extra Features definitions container */}
              <div className="extra-fields">
                {extraFieldDefs.map(def => (
                  <div className="extra-field-row" key={def.id}>
                    <span className="field-label">{def.name}</span>
                    <span className="field-type">{def.type === 'text' ? (language === 'tr' ? 'Metin' : 'Text') : (language === 'tr' ? 'Liste' : 'List')}</span>
                    
                    <div className="field-input">
                      {def.type === 'text' ? (
                        <input 
                          type="text" 
                          placeholder={language === 'tr' ? `${def.name} giriniz` : `Enter ${def.name}`}
                          value={extraValues[def.id] || ''}
                          onChange={(e) => handleExtraValueChange(def.id, e.target.value)}
                        />
                      ) : (
                        <select 
                          value={extraValues[def.id] || ''}
                          onChange={(e) => handleExtraValueChange(def.id, e.target.value)}
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
                      onClick={() => handleRemoveField(def.id)}
                      title={language === 'tr' ? 'Kaldır' : 'Remove'}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <button 
                type="button" 
                className="add-field-btn" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => setIsFieldModalOpen(true)}
              >
                <Plus size={16} />
                {t('addNewFeature')}
              </button>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    handleClearForm();
                    if (editingProduct) {
                      setActiveTab('list');
                    }
                  }}
                >
                  {editingProduct ? t('cancelBtn') : t('clearBtn')}
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {editingProduct ? <CheckCircle2 size={16} /> : <Send size={16} />}
                  {editingProduct ? t('saveChanges') : t('sendToProduction')}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          {/* Dynamic Orders list */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <h2 style={{ margin: 0 }}>
              {isCompletedView ? (
                language === 'tr' ? <>TAMAMLANMIŞ <span>SİPARİŞLER</span></> : <>COMPLETED <span>ORDERS</span></>
              ) : (
                language === 'tr' ? <>BEKLEYEN <span>SİPARİŞLER</span></> : <>PENDING <span>ORDERS</span></>
              )}
            </h2>
            
            <div className="auth-tabs" style={{ margin: 0, width: '300px' }}>
              <button 
                type="button"
                className={`auth-tab ${listFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setListFilter('pending')}
                style={listFilter === 'pending' ? { borderBottomColor: 'var(--accent-seller)', color: 'var(--text)' } : {}}
              >
                {language === 'tr' ? 'Bekleyenler' : 'Pending'}
              </button>
              <button 
                type="button"
                className={`auth-tab ${listFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setListFilter('completed')}
                style={listFilter === 'completed' ? { borderBottomColor: 'var(--accent-seller)', color: 'var(--text)' } : {}}
              >
                {language === 'tr' ? 'Tamamlananlar' : 'Completed'}
              </button>
            </div>
          </div>

          <div className="product-list">
            {filteredProducts.length === 0 ? (
              <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '40px 0' }}>
                <div className="empty-icon">
                  <Package size={36} style={{ color: 'var(--muted)' }} />
                </div>
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  {isCompletedView ? t('noCompletedOrders') : t('noPendingOrders')}
                </p>
              </div>
            ) : (
              filteredProducts.map(p => {
                const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';
                return (
                  <div key={p.id} className={`product-card ${p.completed ? 'completed' : ''}`}>
                    {/* Three-dot dropdown menu */}
                    <div 
                      style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdownId(activeDropdownId === p.id ? null : p.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          padding: '4px',
                          borderRadius: '50%',
                          transition: 'background 0.2s, color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface2)';
                          e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'none';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {activeDropdownId === p.id && (
                        <div style={{
                          position: 'absolute',
                          top: '28px',
                          right: '0',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                          display: 'flex',
                          flexDirection: 'column',
                          zIndex: 20,
                          minWidth: '120px',
                          padding: '4px 0',
                          overflow: 'hidden'
                        }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(p);
                              setActiveDropdownId(null);
                            }}
                            style={{
                              padding: '8px 14px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              fontWeight: 500,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Edit2 size={13} style={{ color: 'var(--accent-seller)' }} />
                            {language === 'tr' ? 'Düzenle' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(p);
                              setActiveDropdownId(null);
                            }}
                            style={{
                              padding: '8px 14px',
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '13px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              width: '100%',
                              fontWeight: 500,
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            <Trash2 size={13} style={{ color: 'var(--danger)' }} />
                            {language === 'tr' ? 'Sil' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>

                    {p.image ? (
                      <div className="product-thumb">
                        <img src={p.image} alt="ürün" />
                      </div>
                    ) : (
                      <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Package size={24} style={{ color: 'var(--muted)' }} />
                      </div>
                    )}
                    
                    <div className="product-info">
                      <div className="product-code">{p.code}</div>
                      <div className="product-fields">
                        {p.text && (
                          <div className="product-field-chip">
                            <strong>{t('textLabel')}:</strong> {p.text}
                          </div>
                        )}
                        {p.length && (
                          <div className="product-field-chip">
                            <strong>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'inches'}
                          </div>
                        )}
                        {p.mfrName && (
                          <div className="product-field-chip" style={{ border: '1px solid var(--accent-mfr)', color: 'var(--accent-mfr)' }}>
                            <strong>{t('mfrLabel')}:</strong> {p.mfrName}
                          </div>
                        )}
                        {Object.entries(p.extras || {}).map(([key, item]) => {
                          if (!item.value) return null;
                          return (
                            <div key={key} className="product-field-chip">
                              <strong>{item.name}:</strong> {item.value}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', padding: '4px 0', lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginRight: '24px' }}>
                      {p.completed ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} />
                          {t('statusCompleted')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-seller)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {t('statusInProduction')}
                        </span>
                      )}
                      <span style={{ marginTop: '4px' }}>{dateStr}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}


      {/* Add dynamic field modal dialog */}
      <Modal isOpen={isFieldModalOpen} onClose={() => setIsFieldModalOpen(false)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>{t('newFeatureTitle')}</h3>
          <button 
            onClick={() => setIsFieldModalOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleAddFieldSubmit}>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>{t('featureName')}</label>
            <input 
              type="text" 
              placeholder={t('featureNamePlaceholder')} 
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              required
            />
          </div>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label>{t('fieldType')}</label>
            <select 
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
            >
              <option value="text">{t('fieldTypeText')}</option>
              <option value="select">{t('fieldTypeDropdown')}</option>
            </select>
          </div>
          {newFieldType === 'select' && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>{t('optionsListLabel')}</label>
              <input 
                type="text" 
                placeholder={t('optionsPlaceholder')} 
                value={newFieldOptions}
                onChange={(e) => setNewFieldOptions(e.target.value)}
                required
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsFieldModalOpen(false)}>{language === 'tr' ? 'İptal' : 'Cancel'}</button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <PlusCircle size={16} />
              {t('addBtn')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

