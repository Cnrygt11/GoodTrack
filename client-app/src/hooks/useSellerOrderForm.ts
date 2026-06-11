import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product, ExtraFieldValue, CreateProductPayload } from '../services/api';
import { compressImage } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';
import { SellerTabId } from '../types/orders';

interface UseSellerOrderFormReturn {
  // Form fields
  productCode: string;
  setProductCode: (v: string) => void;
  orderText: string;
  setOrderText: (v: string) => void;
  orderLength: string;
  setOrderLength: (v: string) => void;
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
  const { products, loadProducts, extraFieldDefs, loadExtraFields, catalogProducts, connections } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirm = (useSettings() as any).confirm ?? (() => Promise.resolve(false));

  // --- Form State ---
  const [productCode, setProductCode] = useState('');
  const [orderText, setOrderText] = useState('');
  const [orderLength, setOrderLength] = useState('');
  const [mfrId, setMfrId] = useState('');
  const [orderImage, setOrderImage] = useState<string | null>(null);
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
    if (!code) { setAutofillSuccess(false); return; }
    if (editingProduct) return; // Don't overwrite when editing an existing order
    
    const match = catalogProducts.find((p) => p.productCode.trim().toLowerCase() === code);
    if (match) {
      setMfrId(match.mfrId);
      if (match.image) { 
        setOrderImage(match.image); 
        setImageFileName('Katalog Görseli'); 
      }
      setOrderText(match.text || '');
      setOrderLength(match.length || '');
      
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
    setOrderLength('');
    setMfrId('');
    setOrderImage(null);
    setImageFileName('');
    setExtraValues({});
    setAutofillSuccess(false);
    setEditingProduct(null);
    const fileInput = document.getElementById('field-image') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
  }, []);

  const handleEditClick = useCallback((product: Product, setActiveTab: (tab: SellerTabId) => void) => {
    setEditingProduct(product);
    setProductCode(product.code);
    setOrderText(product.text || '');
    setOrderLength(product.length || '');
    setMfrId(product.mfrId);
    setOrderImage(product.image);
    setImageFileName(product.image ? 'Mevcut Görsel' : '');
    const initialExtras: Record<string, string> = {};
    extraFieldDefs.forEach((def) => { initialExtras[def.id] = product.extras?.[def.id]?.value || ''; });
    setExtraValues(initialExtras);
    setActiveTab('create');
  }, [extraFieldDefs]);

  const handleImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFileName(file.name);
    try {
      const compressed = await compressImage(file);
      setOrderImage(compressed);
    } catch (err: unknown) {
      console.error(err);
      showToast(language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!');
    }
  }, [language, showToast]);

  const handleExtraValueChange = useCallback((fieldId: string, val: string) => {
    setExtraValues((prev) => ({ ...prev, [fieldId]: val }));
  }, []);

  const handleSubmit = useCallback(async (e: FormEvent, setActiveTab: (tab: SellerTabId) => void) => {
    e.preventDefault();
    if (isActionLoadingRef.current) return;
    const code = productCode.trim();
    if (!code) { showToast(t('productCodeRequired')); return; }
    if (!mfrId) { showToast(t('selectMfrRequired')); return; }

    const selectedMfr = connections.find((c) => c.id === mfrId);
    const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

    const formattedExtras: Record<string, ExtraFieldValue> = {};
    extraFieldDefs.forEach((def) => {
      formattedExtras[def.id] = { name: def.name, type: def.type, value: extraValues[def.id] || '' };
    });

    try {
      isActionLoadingRef.current = true;
      setActionLoading(true);
      if (editingProduct) {
        const payload: Product = { ...editingProduct, code, image: orderImage, text: orderText, length: orderLength, extras: formattedExtras, mfrId, mfrName };
        const data = await api.updateProduct(editingProduct.id, payload);
        showToast(data.message || t('orderUpdatedSuccess'));
        await loadProducts();
        handleClearForm();
        setActiveTab('list');
      } else {
        const payload: CreateProductPayload = { code, image: orderImage, text: orderText, length: orderLength, extras: formattedExtras, completed: false, mfrId, mfrName };
        const data = await api.createProduct(payload);
        showToast(data.message || t('orderSentSuccess'));
        await loadProducts();
        handleClearForm();
        setActiveTab('list');
      }
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isActionLoadingRef.current = false;
      setActionLoading(false);
    }
  }, [productCode, mfrId, connections, extraFieldDefs, extraValues, editingProduct, orderImage, orderText, orderLength, loadProducts, showToast, t, handleClearForm]);

  const handleAddFieldSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (isActionLoadingRef.current) return;
    const name = newFieldName.trim();
    if (!name) { showToast(t('featureNameRequired')); return; }
    if (newFieldType === 'select' && !newFieldOptions.trim()) { showToast(t('featureOptionsRequired')); return; }

    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
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
  }, [newFieldName, newFieldType, newFieldOptions, loadExtraFields, showToast, t]);

  const handleRemoveField = useCallback(async (id: string) => {
    const { useConfirm } = await import('../context/ConfirmContext');
    // Note: hooks can't be called dynamically — confirm is injected via closure for now
    void id;
    // The full confirm logic lives in useSellerOrderActions; this hook just handles field delete
    try {
      const data = await api.deleteField(id);
      showToast(data.message || t('featureDelSuccess'));
      await loadExtraFields();
      setExtraValues((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    }
  }, [loadExtraFields, showToast, t]);

  const handleDeleteClick = useCallback(async (product: Product) => {
    try {
      const data = await api.deleteProduct(product.id);
      showToast(data.message || t('deleteSuccess'));
      await loadProducts();
      if (editingProduct?.id === product.id) handleClearForm();
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    }
  }, [editingProduct, loadProducts, showToast, t, handleClearForm]);

  return {
    productCode, setProductCode,
    orderText, setOrderText,
    orderLength, setOrderLength,
    mfrId, setMfrId,
    orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct,
    actionLoading, isActionLoadingRef, setActionLoading,
    isFieldModalOpen, setIsFieldModalOpen,
    newFieldName, setNewFieldName,
    newFieldType, setNewFieldType,
    newFieldOptions, setNewFieldOptions,
    handleImageChange, handleClearForm, handleEditClick, handleExtraValueChange,
    handleSubmit, handleAddFieldSubmit, handleRemoveField, handleDeleteClick,
  };
}
