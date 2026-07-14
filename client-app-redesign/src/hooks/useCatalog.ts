import { useState, useRef, useCallback } from 'react';
import { useCatalogProducts, useExtraFieldDefs } from './useCatalogData';
import { useConnectionsQuery } from './useConnectionsData';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, CatalogProduct, ExtraFieldValue } from '../services/apiClient';
import { compressImage, makeThumbnail } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';

export default function useCatalog() {
  const { connections } = useConnectionsQuery();
  const { catalogProducts, loadCatalog } = useCatalogProducts();
  const { extraFieldDefs } = useExtraFieldDefs();
  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  // Editing state
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);

  // Catalog Form inputs
  const [productCode, setProductCode] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [catalogImage, setCatalogImage] = useState<string | null>(null); // base64 string
  const [catalogThumbnail, setCatalogThumbnail] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoading = useRef(false);

  const handleExtraValueChange = useCallback((fieldId: string, val: string) => {
    setExtraValues((prev) => ({ ...prev, [fieldId]: val }));
  }, []);

  const handleImageChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setImageFileName(file.name);
      try {
        const [compressed, thumbnail] = await Promise.all([
          compressImage(file),
          makeThumbnail(file),
        ]);
        setCatalogImage(compressed);
        setCatalogThumbnail(thumbnail);
      } catch (err: unknown) {
        console.error(err);
        showToast(t('imageCompressionError'));
      }
    },
    [showToast, t],
  );

  const handleClearForm = useCallback(() => {
    setProductCode('');
    setMfrId('');
    setCatalogImage(null);
    setCatalogThumbnail(null);
    setImageFileName('');
    setExtraValues({});
    setEditingProduct(null);
    // Clear the file input element
    const fileInput = document.getElementById('cat-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleStartEdit = useCallback(
    (product: CatalogProduct) => {
      setEditingProduct(product);
      setProductCode(product.productCode);
      setMfrId(product.mfrId);
      // Liste yanıtı tam görseli taşımaz; form önizlemesi thumbnail ile başlar, tam görsel
      // arka planda detay ucundan çekilir. Fetch başarısız olursa null kalır ve kaydetme
      // "görsel değişmedi" (null) gönderir — mevcut görsel sunucuda korunur.
      const hasImage = Boolean(product.thumbnailImage ?? product.image);
      setCatalogImage(product.image);
      setCatalogThumbnail(product.thumbnailImage ?? null);
      setImageFileName(hasImage ? 'Mevcut Görsel' : '');

      if (hasImage && !product.image) {
        api
          .getCatalogById(product.id)
          .then((full) => {
            // Kullanıcı bu arada başka ürünü düzenlemeye geçtiyse veya yeni görsel seçtiyse dokunma.
            setEditingProduct((current) => {
              if (current?.id === product.id) {
                setCatalogImage((img) => img ?? full.image);
              }
              return current;
            });
          })
          .catch(() => {
            // Tam görsel alınamadı: önizleme thumbnail'de kalır, kayıt görseli değiştirmez.
          });
      }

      // Set dynamic extras values
      const initialExtras: Record<string, string> = {};
      extraFieldDefs.forEach((def) => {
        initialExtras[def.id] = product.extras?.[def.id]?.value || '';
      });
      setExtraValues(initialExtras);

      // Smooth scroll to form
      const formCard = document.querySelector('.form-card');
      if (formCard) {
        formCard.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [extraFieldDefs],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isActionLoading.current) return;
      const code = productCode.trim();
      if (!code) {
        showToast(t('productCodeRequired'));
        return;
      }

      if (!mfrId) {
        showToast(t('catalogSelectMfrRequired'));
        return;
      }

      const selectedMfr = connections.find((c) => c.id === mfrId);
      const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

      // Format extra fields
      const formattedExtras: Record<string, ExtraFieldValue> = {};
      extraFieldDefs.forEach((def) => {
        formattedExtras[def.id] = {
          name: def.name,
          type: def.type,
          value: extraValues[def.id] || '',
        };
      });

      try {
        isActionLoading.current = true;
        setActionLoading(true);
        if (editingProduct) {
          // Edit mode — image null ise sunucu "görsel değişmedi" sayar ve mevcut görseli korur.
          const data = await api.updateCatalogProduct(editingProduct.id, {
            productCode: code,
            image: catalogImage,
            thumbnailImage: catalogThumbnail,
            mfrId,
            mfrName,
            extras: formattedExtras,
          });

          showToast(data.message || t('catalogUpdateSuccess'));
          await loadCatalog();
          handleClearForm();
        } else {
          // Add mode
          const data = await api.addCatalogProduct({
            productCode: code,
            image: catalogImage || '',
            thumbnailImage: catalogThumbnail,
            mfrId,
            mfrName,
            extras: formattedExtras,
          });

          showToast(data.message || t('catalogAddSuccess'));
          await loadCatalog();
          handleClearForm();
        }
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        isActionLoading.current = false;
        setActionLoading(false);
      }
    },
    [
      productCode,
      mfrId,
      catalogImage,
      catalogThumbnail,
      extraValues,
      extraFieldDefs,
      editingProduct,
      connections,
      loadCatalog,
      handleClearForm,
      showToast,
      t,
    ],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const accepted = await confirm({
        title: t('catalogDeleteTitle'),
        message: t('catalogDeleteMsgFull'),
        confirmText: t('catalogDeleteConfirmBtn'),
        isDestructive: true,
      });
      if (!accepted) return;
      try {
        const data = await api.deleteCatalogProduct(id);
        showToast(data.message || t('catalogDeleteSuccess'));
        await loadCatalog();
        // If we were editing this product, clear form
        if (editingProduct?.id === id) {
          handleClearForm();
        }
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      }
    },
    [t, showToast, loadCatalog, editingProduct, handleClearForm],
  );

  const [syncEtsyLoading, setSyncEtsyLoading] = useState(false);

  const handleSyncEtsyListings = useCallback(async () => {
    try {
      setSyncEtsyLoading(true);
      const res = await api.syncEtsyListings();
      showToast(res.message || 'Etsy ürünleri başarıyla çekildi.');
      await loadCatalog();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err) || 'Etsy ürünleri çekilirken hata oluştu.');
    } finally {
      setSyncEtsyLoading(false);
    }
  }, [loadCatalog, showToast]);

  const handleAssignManufacturer = useCallback(
    async (productId: string, selectedMfrId: string) => {
      const product = catalogProducts.find((p) => p.id === productId);
      if (!product) return;

      const selectedMfr = connections.find((c) => c.id === selectedMfrId);
      const mfrName = selectedMfr ? selectedMfr.username : '';

      // Üretici atama görsele dokunmaz: image null = "görsel değişmedi" (sunucuda korunur).
      await api.updateCatalogProduct(productId, {
        productCode: product.productCode,
        image: null,
        mfrId: selectedMfrId,
        mfrName: mfrName,
        extras: product.extras || {},
      });

      await loadCatalog();
    },
    [catalogProducts, connections, loadCatalog],
  );

  return {
    connections,
    catalogProducts,
    extraFieldDefs,
    language,
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
    handleStartEdit,
    handleSubmit,
    handleDelete,
    syncEtsyLoading,
    handleSyncEtsyListings,
    handleAssignManufacturer,
  };
}
