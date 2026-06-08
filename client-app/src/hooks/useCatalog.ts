import React, { useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, CatalogProduct } from '../services/api';
import { compressImage } from '../utils/imageHelper';

export default function useCatalog() {
  const {
    connections,
    catalogProducts,
    setCatalogProducts
  } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  // Editing state
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Catalog Form inputs
  const [productCode, setProductCode] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [catalogImage, setCatalogImage] = useState<string | null>(null); // base64 string
  const [imageFileName, setImageFileName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoading = useRef(false);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    try {
      const compressed = await compressImage(file);
      setCatalogImage(compressed);
    } catch (err: unknown) {
      console.error(err);
      showToast(language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!');
    }
  }, [language, showToast]);

  const handleClearForm = useCallback(() => {
    setProductCode('');
    setMfrId('');
    setCatalogImage(null);
    setImageFileName('');
    setEditingProduct(null);
    // Clear the file input element
    const fileInput = document.getElementById('cat-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleStartEdit = useCallback((product: CatalogProduct) => {
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
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionLoading.current) return;
    const code = productCode.trim();
    if (!code) {
      showToast(t('productCodeRequired'));
      return;
    }

    if (!mfrId) {
      showToast(language === 'tr' ? 'Lütfen atanacak üreticiyi seçin!' : 'Please select a manufacturer to assign!');
      return;
    }

    if (!catalogImage) {
      showToast(language === 'tr' ? 'Lütfen ürün resmi yükleyin!' : 'Please upload a product image!');
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [productCode, mfrId, catalogImage, editingProduct, connections, setCatalogProducts, handleClearForm, showToast, t, language]);

  const handleDelete = useCallback(async (id: string) => {
    const accepted = await confirm({
      title: language === 'tr' ? 'Katalogdan Sil' : 'Delete from Catalog',
      message: language === 'tr' ? 'Bu ürünü katalogdan silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this product from the catalog?',
      confirmText: language === 'tr' ? 'Sil' : 'Delete',
      isDestructive: true
    });
    if (!accepted) return;
    try {
      const data = await api.deleteCatalogProduct(id);
      showToast(data.message || t('catalogDeleteSuccess'));
      setCatalogProducts((prev: CatalogProduct[]) => prev.filter(p => p.id !== id));
      // If we were editing this product, clear form
      if (editingProduct?.id === id) {
        handleClearForm();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [language, showToast, t, setCatalogProducts, editingProduct, handleClearForm]);

  return {
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
  };
}
