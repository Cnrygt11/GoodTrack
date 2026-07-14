import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useProductsQuery, useProductActions } from './useProductsData';
import { useCatalogProducts, useExtraFieldDefs } from './useCatalogData';
import { useConnectionsQuery } from './useConnectionsData';
import useCredits from './useCredits';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import {
  api,
  Product,
  ExtraFieldValue,
  CreateProductPayload,
  ApiError,
} from '../services/apiClient';
import { compressImage, makeThumbnail } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';
import { SellerTabId } from '../types/orders';

interface UseSellerOrderFormReturn {
  // Form fields
  productCode: string;
  setProductCode: (v: string) => void;
  orderText: string;
  setOrderText: (v: string) => void;
  mfrId: string;
  setMfrId: (v: string) => void;
  orderImage: string | null;
  imageFileName: string;
  autofillSuccess: boolean;
  extraValues: Record<string, string>;

  // Edit mode
  editingProduct: Product | null;

  // Loading flag (shared with actions)
  actionLoading: boolean;
  isActionLoadingRef: React.MutableRefObject<boolean>;
  setActionLoading: (v: boolean) => void;

  // Field modal state
  isFieldModalOpen: boolean;
  setIsFieldModalOpen: (v: boolean) => void;
  newFieldName: string;
  setNewFieldName: (v: string) => void;
  newFieldType: string;
  setNewFieldType: (v: string) => void;
  newFieldOptions: string;
  setNewFieldOptions: (v: string) => void;

  // Handlers
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleClearForm: () => void;
  handleEditClick: (product: Product, setActiveTab: (tab: SellerTabId) => void) => void;
  handleExtraValueChange: (fieldId: string, val: string) => void;
  handleSubmit: (e: FormEvent, setActiveTab: (tab: SellerTabId) => void) => Promise<void>;
  handleAddFieldSubmit: (e: FormEvent) => Promise<void>;
  handleRemoveField: (id: string) => Promise<void>;
  handleDeleteClick: (product: Product) => Promise<void>;
}

/**
 * Manages all state and logic related to the "Create / Edit Order" form.
 * Includes catalog auto-fill, image compression, field management and CRUD handlers.
 */
export default function useSellerOrderForm(): UseSellerOrderFormReturn {
  const { products } = useProductsQuery();
  const {
    loadProducts,
    optimisticAddProduct,
    optimisticUpdateProduct,
    optimisticRemoveProduct,
    rollbackProducts,
  } = useProductActions();
  const { connections } = useConnectionsQuery();
  const { catalogProducts } = useCatalogProducts();
  const { extraFieldDefs, loadExtraFields } = useExtraFieldDefs();
  const { fetchCredits } = useCredits();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const confirm = useConfirm();
  const navigate = useNavigate();

  // --- Form State ---
  const [productCode, setProductCode] = useState('');
  const [orderText, setOrderText] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [orderImage, setOrderImage] = useState<string | null>(null);
  const [orderThumbnail, setOrderThumbnail] = useState<string | null>(null);
  // Görsel katalogtan geldiğinde base64 kopya yerine bu referans gönderilir (backend katalogtan çözer).
  const [catalogProductId, setCatalogProductId] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState('');
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const [autofillSuccess, setAutofillSuccess] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // --- Field Modal State ---
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // --- Loading State (shared with caller) ---
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoadingRef = useRef(false);

  // --- Catalog Auto-Fill ---
  useEffect(() => {
    const code = productCode.trim().toLowerCase();
    if (!code) {
      setAutofillSuccess(false);
      return;
    }
    if (editingProduct) return; // Don't overwrite when editing an existing order

    const match = catalogProducts.find((p) => p.productCode.trim().toLowerCase() === code);
    if (match) {
      setMfrId(match.mfrId);
      const previewImage = match.thumbnailImage ?? match.image;
      if (previewImage) {
        // Önizleme için katalog thumbnail'i gösterilir (liste tam görseli taşımaz);
        // gönderimde base64 yerine katalog referansı (catalogProductId) gider.
        setOrderImage(previewImage);
        setOrderThumbnail(match.thumbnailImage ?? null);
        setCatalogProductId(match.id);
        setImageFileName('Katalog Görseli');
      }
      setOrderText(match.text || '');

      const nextExtras: Record<string, string> = {};
      extraFieldDefs.forEach((def) => {
        nextExtras[def.id] = match.extras?.[def.id]?.value || '';
      });
      setExtraValues(nextExtras);

      setAutofillSuccess(true);
    } else {
      setAutofillSuccess(false);
    }
  }, [productCode, catalogProducts, editingProduct, extraFieldDefs]);

  // --- Handlers ---

  const handleClearForm = useCallback(() => {
    setProductCode('');
    setOrderText('');
    setMfrId('');
    setOrderImage(null);
    setOrderThumbnail(null);
    setCatalogProductId(null);
    setImageFileName('');
    setExtraValues({});
    setAutofillSuccess(false);
    setEditingProduct(null);
    const fileInput = document.getElementById('field-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleEditClick = useCallback(
    (product: Product, setActiveTab: (tab: SellerTabId) => void) => {
      setEditingProduct(product);
      setProductCode(product.code);
      setOrderText(product.text || '');
      setMfrId(product.mfrId);
      // Liste yanıtı tam görseli taşımaz (yalnız thumbnail). Önce eldeki thumbnail'i göster, ardından
      // tam görseli talep üzerine çekip forma yerleştir (kaydetmede tam çözünürlük korunur).
      const placeholder = product.image ?? product.thumbnailImage ?? null;
      setOrderImage(placeholder);
      setOrderThumbnail(product.thumbnailImage ?? null);
      setCatalogProductId(product.catalogProductId ?? null);
      setImageFileName(placeholder ? 'Mevcut Görsel' : '');
      const initialExtras: Record<string, string> = {};
      extraFieldDefs.forEach((def) => {
        initialExtras[def.id] = product.extras?.[def.id]?.value || '';
      });
      setExtraValues(initialExtras);
      setActiveTab('create');

      if (!product.image && product.id) {
        api
          .getProductById(product.id)
          .then((full) => {
            setOrderImage(full.image);
            setOrderThumbnail(full.thumbnailImage ?? null);
          })
          .catch(() => {
            /* thumbnail placeholder yeterli */
          });
      }
    },
    [extraFieldDefs],
  );

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
        setOrderImage(compressed);
        setOrderThumbnail(thumbnail);
        // Kullanıcı kendi görselini yükledi: katalog referansı düşer, görsel siparişte saklanır.
        setCatalogProductId(null);
      } catch (err: unknown) {
        console.error(err);
        showToast(
          language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!',
        );
      }
    },
    [language, showToast],
  );

  const handleExtraValueChange = useCallback((fieldId: string, val: string) => {
    setExtraValues((prev) => ({ ...prev, [fieldId]: val }));
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent, setActiveTab: (tab: SellerTabId) => void) => {
      e.preventDefault();
      if (isActionLoadingRef.current) return;
      const code = productCode.trim();
      if (!code) {
        showToast(t('productCodeRequired'));
        return;
      }
      if (!mfrId) {
        showToast(t('selectMfrRequired'));
        return;
      }

      const selectedMfr = connections.find((c) => c.id === mfrId);
      const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

      const formattedExtras: Record<string, ExtraFieldValue> = {};
      extraFieldDefs.forEach((def) => {
        formattedExtras[def.id] = {
          name: def.name,
          type: def.type,
          value: extraValues[def.id] || '',
        };
      });

      const prevProducts = [...products];

      if (editingProduct) {
        // Katalog referanslıysa base64 gönderilmez; backend görseli katalogtan çözer.
        const payload: Product = {
          ...editingProduct,
          code,
          image: catalogProductId ? null : orderImage,
          thumbnailImage: orderThumbnail,
          catalogProductId,
          text: orderText,
          extras: formattedExtras,
          mfrId,
          mfrName,
        };
        optimisticUpdateProduct({ ...payload, image: orderImage });
        setActiveTab('list');
        handleClearForm();

        try {
          isActionLoadingRef.current = true;
          setActionLoading(true);
          const data = await api.updateProduct(editingProduct.id, payload);
          showToast(data.message || t('orderUpdatedSuccess'));
          optimisticUpdateProduct(data.product);
          await loadProducts();
        } catch (err: unknown) {
          rollbackProducts(prevProducts);
          if (err instanceof ApiError && err.status === 402) {
            showToast(t('creditWarnToast'), true);
            confirm({
              title: t('creditsLowWarning'),
              message: t('insufficientCredits'),
              confirmText: t('goToBilling'),
            }).then((go) => {
              if (go) navigate(ROUTES.sellerCredits);
            });
          } else {
            showToast(extractErrorMessage(err));
          }
          setEditingProduct(editingProduct);
          setProductCode(code);
          setOrderText(orderText || '');
          setMfrId(mfrId);
          setOrderImage(orderImage);
          setOrderThumbnail(orderThumbnail);
          setCatalogProductId(catalogProductId);
          setImageFileName(orderImage ? 'Mevcut Görsel' : '');
          const initialExtras: Record<string, string> = {};
          extraFieldDefs.forEach((def) => {
            initialExtras[def.id] = formattedExtras[def.id]?.value || '';
          });
          setExtraValues(initialExtras);
          setActiveTab('create');
        } finally {
          isActionLoadingRef.current = false;
          setActionLoading(false);
        }
      } else {
        const tempId = `temp_${Date.now()}`;
        const tempProduct: Product = {
          id: tempId,
          code,
          image: orderImage,
          thumbnailImage: orderThumbnail,
          text: orderText,
          length: '',
          extras: formattedExtras,
          completed: false,
          cancelRequested: false,
          status: 'pending',
          mfrId,
          mfrName,
          sellerId: '',
          sellerName: '',
          createdAt: new Date().toISOString(),
          isReadBySeller: true,
          isReadByMfr: false,
        };

        optimisticAddProduct(tempProduct);
        setActiveTab('list');
        handleClearForm();

        try {
          isActionLoadingRef.current = true;
          setActionLoading(true);
          // Katalog referanslıysa base64 gönderilmez; backend görseli katalogtan çözer.
          const payload: CreateProductPayload = {
            code,
            image: catalogProductId ? null : orderImage,
            thumbnailImage: orderThumbnail,
            catalogProductId,
            text: orderText,
            extras: formattedExtras,
            completed: false,
            mfrId,
            mfrName,
          };
          const data = await api.createProduct(payload);
          showToast(data.message || t('orderSentSuccess'));
          optimisticRemoveProduct(tempId);
          optimisticAddProduct(data.product);
          await loadProducts();
          await fetchCredits();
        } catch (err: unknown) {
          rollbackProducts(prevProducts);
          if (err instanceof ApiError && err.status === 402) {
            showToast(t('creditWarnToast'), true);
            confirm({
              title: t('creditsLowWarning'),
              message: t('insufficientCredits'),
              confirmText: t('goToBilling'),
            }).then((go) => {
              if (go) navigate(ROUTES.sellerCredits);
            });
          } else {
            showToast(extractErrorMessage(err));
          }
          setProductCode(code);
          setOrderText(orderText || '');
          setMfrId(mfrId);
          setOrderImage(orderImage);
          setOrderThumbnail(orderThumbnail);
          setCatalogProductId(catalogProductId);
          setImageFileName(orderImage ? 'Katalog Görseli' : '');
          const initialExtras: Record<string, string> = {};
          extraFieldDefs.forEach((def) => {
            initialExtras[def.id] = formattedExtras[def.id]?.value || '';
          });
          setExtraValues(initialExtras);
          setActiveTab('create');
        } finally {
          isActionLoadingRef.current = false;
          setActionLoading(false);
        }
      }
    },
    [
      productCode,
      mfrId,
      connections,
      extraFieldDefs,
      extraValues,
      editingProduct,
      orderImage,
      orderThumbnail,
      catalogProductId,
      orderText,
      products,
      optimisticAddProduct,
      optimisticUpdateProduct,
      optimisticRemoveProduct,
      rollbackProducts,
      loadProducts,
      showToast,
      t,
      handleClearForm,
      confirm,
      navigate,
      fetchCredits,
    ],
  );

  const handleAddFieldSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (isActionLoadingRef.current) return;
      const name = newFieldName.trim();
      if (!name) {
        showToast(t('featureNameRequired'));
        return;
      }
      if (newFieldType === 'select' && !newFieldOptions.trim()) {
        showToast(t('featureOptionsRequired'));
        return;
      }

      const options =
        newFieldType === 'select'
          ? newFieldOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
      try {
        isActionLoadingRef.current = true;
        setActionLoading(true);
        const data = await api.createField({ name, type: newFieldType, options });
        showToast(data.message || t('featureAddSuccess'));
        await loadExtraFields();
        setIsFieldModalOpen(false);
        setNewFieldName('');
        setNewFieldType('text');
        setNewFieldOptions('');
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        isActionLoadingRef.current = false;
        setActionLoading(false);
      }
    },
    [newFieldName, newFieldType, newFieldOptions, loadExtraFields, showToast, t],
  );

  const handleRemoveField = useCallback(
    async (id: string) => {
      const accepted = await confirm({
        title: language === 'tr' ? 'Özelliği Kaldır' : 'Remove Feature',
        message:
          language === 'tr'
            ? 'Bu özelliği silmek istediğinize emin misiniz?'
            : 'Are you sure you want to delete this feature template?',
        confirmText: language === 'tr' ? 'Kaldır' : 'Remove',
        isDestructive: true,
      });
      if (!accepted) return;
      try {
        const data = await api.deleteField(id);
        showToast(data.message || t('featureDelSuccess'));
        await loadExtraFields();
        setExtraValues((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      }
    },
    [confirm, language, loadExtraFields, showToast, t],
  );

  const handleDeleteClick = useCallback(
    async (product: Product) => {
      const prevProducts = [...products];
      optimisticRemoveProduct(product.id);
      if (editingProduct?.id === product.id) handleClearForm();

      try {
        const data = await api.deleteProduct(product.id);
        showToast(data.message || t('deleteSuccess'));
        await loadProducts();
      } catch (err: unknown) {
        rollbackProducts(prevProducts);
        showToast(extractErrorMessage(err));
        if (editingProduct?.id === product.id) {
          setEditingProduct(product);
          setProductCode(product.code);
          setOrderText(product.text || '');
          setMfrId(product.mfrId);
          setOrderImage(product.image);
          setOrderThumbnail(product.thumbnailImage ?? null);
          setCatalogProductId(product.catalogProductId ?? null);
          setImageFileName(product.image ? 'Mevcut Görsel' : '');
          const initialExtras: Record<string, string> = {};
          extraFieldDefs.forEach((def) => {
            initialExtras[def.id] = product.extras?.[def.id]?.value || '';
          });
          setExtraValues(initialExtras);
        }
      }
    },
    [
      editingProduct,
      products,
      extraFieldDefs,
      loadProducts,
      optimisticRemoveProduct,
      rollbackProducts,
      showToast,
      t,
      handleClearForm,
    ],
  );

  return {
    productCode,
    setProductCode,
    orderText,
    setOrderText,
    mfrId,
    setMfrId,
    orderImage,
    imageFileName,
    autofillSuccess,
    extraValues,
    editingProduct,
    actionLoading,
    isActionLoadingRef,
    setActionLoading,
    isFieldModalOpen,
    setIsFieldModalOpen,
    newFieldName,
    setNewFieldName,
    newFieldType,
    setNewFieldType,
    newFieldOptions,
    setNewFieldOptions,
    handleImageChange,
    handleClearForm,
    handleEditClick,
    handleExtraValueChange,
    handleSubmit,
    handleAddFieldSubmit,
    handleRemoveField,
    handleDeleteClick,
  };
}
