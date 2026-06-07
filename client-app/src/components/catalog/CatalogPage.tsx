import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api, CatalogProduct } from '../../services/api';
import { ArrowLeft, Camera, Package, Trash2, Plus, Edit2, Save, Loader2 } from 'lucide-react';
import { compressImage } from '../../utils/imageHelper';

export default function CatalogPage() {
  const { setActiveScreen } = useAuth();
  const {
    connections,
    catalogProducts,
    setCatalogProducts
  } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  // Editing state
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Catalog Form inputs
  const [productCode, setProductCode] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [catalogImage, setCatalogImage] = useState<string | null>(null); // base64 string
  const [imageFileName, setImageFileName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoading = useRef(false);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    try {
      const compressed = await compressImage(file);
      setCatalogImage(compressed);
    } catch (err: any) {
      console.error(err);
      showToast(language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!');
    }
  };

  const handleClearForm = () => {
    setProductCode('');
    setMfrId('');
    setCatalogImage(null);
    setImageFileName('');
    setEditingProduct(null);
    // Clear the file input element
    const fileInput = document.getElementById('cat-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  };

  const handleStartEdit = (product: CatalogProduct) => {
    setEditingProduct(product);
    setProductCode(product.productCode);
    setMfrId(product.mfrId);
    setCatalogImage(product.image);
    setImageFileName(product.image ? 'Mevcut Görsel' : '');
    
    // Smooth scroll to form
    const formCard = document.querySelector('.form-card');
    if (formCard) {
      formCard.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionLoading.current) return;
    const code = productCode.trim();
    if (!code) {
      alert(t('productCodeRequired'));
      return;
    }

    if (!mfrId) {
      alert(language === 'tr' ? 'Lütfen atanacak üreticiyi seçin!' : 'Please select a manufacturer to assign!');
      return;
    }

    if (!catalogImage) {
      alert(language === 'tr' ? 'Lütfen ürün resmi yükleyin!' : 'Please upload a product image!');
      return;
    }

    const selectedMfr = connections.find(c => c.id === mfrId);
    const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

    try {
      isActionLoading.current = true;
      setActionLoading(true);
      if (editingProduct) {
        // Edit mode
        const data = await api.updateCatalogProduct(editingProduct.id, {
          productCode: code,
          image: catalogImage,
          mfrId,
          mfrName
        });

        showToast(data.message || t('catalogUpdateSuccess'));
        setCatalogProducts((prev: CatalogProduct[]) =>
          prev.map(p => (p.id === editingProduct.id ? data.product : p))
        );
        handleClearForm();
      } else {
        // Add mode
        const data = await api.addCatalogProduct({
          productCode: code,
          image: catalogImage,
          mfrId,
          mfrName,
          
        });

        showToast(data.message || t('catalogAddSuccess'));
        setCatalogProducts((prev: CatalogProduct[]) => [...prev, data.product]);
        handleClearForm();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'tr' ? 'Bu ürünü katalogdan silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this product from the catalog?')) return;
    try {
      const data = await api.deleteCatalogProduct(id);
      showToast(data.message || t('catalogDeleteSuccess'));
      setCatalogProducts((prev: CatalogProduct[]) => prev.filter(p => p.id !== id));
      // If we were editing this product, clear form
      if (editingProduct?.id === id) {
        handleClearForm();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div id="catalog-screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ marginBottom: 0 }}>{language === 'tr' ? <>ÜRÜN <span>KATALOĞU</span></> : <>PRODUCT <span>CATALOG</span></>}</h2>
        <button 
          className="btn-secondary" 
          onClick={() => setActiveScreen('seller')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          {language === 'tr' ? 'Sipariş Ekranına Dön' : 'Back to Orders'}
        </button>
      </div>

      <div className="form-card">
        <h3>{editingProduct ? t('editCatalogProductTitle') : (language === 'tr' ? 'Yeni Katalog Ürünü Ekle' : 'Add New Catalog Product')}</h3>
        <form onSubmit={handleSubmit}>
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
                  onChange={handleImageChange}
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
            <button type="button" className="btn-secondary" onClick={handleClearForm} disabled={actionLoading}>
              {editingProduct ? t('cancelBtn') : t('clearBtn')}
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="animate-spin" size={16} /> : (editingProduct ? <Save size={16} /> : <Plus size={16} />)}
              {editingProduct ? t('saveChanges') : (language === 'tr' ? 'Kataloğa Ekle' : 'Add to Catalog')}
            </button>
          </div>
        </form>
      </div>

      <h2>{language === 'tr' ? <>KAYITLI <span>KATALOG ÜRÜNLERİ</span></> : <>REGISTERED <span>CATALOG PRODUCTS</span></>}</h2>
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
            <div className="product-card" key={p.id}>
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
                <div className="product-code">{p.productCode}</div>
                <div className="product-fields">
                  <div className="product-field-chip" style={{ border: '1px solid var(--accent-mfr)', color: 'var(--accent-mfr)' }}>
                    <strong>{language === 'tr' ? 'Atanmış Üretici' : 'Assigned Manufacturer'}:</strong> {p.mfrName}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ 
                    borderColor: 'var(--accent-seller)', 
                    color: 'var(--accent-seller)', 
                    fontSize: '12px', 
                    padding: '6px 12px', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flex: 1,
                    justifyContent: 'center'
                  }}
                  onClick={() => handleStartEdit(p)}
                >
                  <Edit2 size={14} />
                  {language === 'tr' ? 'Düzenle' : 'Edit'}
                </button>
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ 
                    borderColor: 'var(--danger)', 
                    color: 'var(--danger)', 
                    fontSize: '12px', 
                    padding: '6px 12px', 
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    flex: 1,
                    justifyContent: 'center'
                  }}
                  onClick={() => handleDelete(p.id)}
                >
                  <Trash2 size={14} />
                  {language === 'tr' ? 'Sil' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

