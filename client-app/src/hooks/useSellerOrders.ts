import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product, ExtraFieldValue, CreateProductPayload } from '../services/api';
import { TranslationKey } from '../services/translations';
import { compressImage } from '../utils/imageHelper';

type ListFilter = 'awaiting' | 'broken' | 'production' | 'completed' | 'delivered' | 'defective' | 'to_ship' | 'shipped';
type TabId = 'list' | 'create';

interface UseSellerOrdersReturn {
  // Contexts
  language: string;
  t: (key: TranslationKey) => string;
  connections: ReturnType<typeof useData>['connections'];
  extraFieldDefs: ReturnType<typeof useData>['extraFieldDefs'];
  catalogProducts: ReturnType<typeof useData>['catalogProducts'];

  // Tab & filter state
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  listFilter: ListFilter;
  setListFilter: (filter: ListFilter) => void;
  sortOrder: 'desc' | 'asc';
  setSortOrder: (order: 'desc' | 'asc') => void;

  // Form state
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
  editingProduct: Product | null;
  actionLoading: boolean;

  // Field modal state
  isFieldModalOpen: boolean;
  setIsFieldModalOpen: (v: boolean) => void;
  newFieldName: string;
  setNewFieldName: (v: string) => void;
  newFieldType: string;
  setNewFieldType: (v: string) => void;
  newFieldOptions: string;
  setNewFieldOptions: (v: string) => void;

  // Defect modal state
  isDefectModalOpen: boolean;
  setIsDefectModalOpen: (v: boolean) => void;
  defectType: 'defective' | 'missing';
  setDefectType: (v: 'defective' | 'missing') => void;
  defectNote: string;
  setDefectNote: (v: string) => void;
  defectImage: string | null;
  defectImageFileName: string;

  // Timeline modal state
  openTimeline: (p: Product) => void;

  // Dropdown state
  activeDropdownId: string | null;
  setActiveDropdownId: (id: string | null) => void;

  // Notification state
  unseenIds: Record<string, string[]>;
  badgeCounts: Record<string, number>;

  // Derived data
  filteredProducts: Product[];

  // Handlers
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleClearForm: () => void;
  handleEditClick: (product: Product) => void;
  handleExtraValueChange: (fieldId: string, val: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleAddFieldSubmit: (e: React.FormEvent) => Promise<void>;
  handleRemoveField: (id: string) => Promise<void>;
  handleDeleteClick: (product: Product) => Promise<void>;
  handleCancelOrder: (productId: string) => Promise<void>;
  handleVerifyOrder: (productId: string, action: 'correct' | 'defective' | 'missing', note?: string | null, image?: string | null) => Promise<void>;
  handleShipOrder: (productId: string) => Promise<void>;
  handleDefectClick: (product: Product, type: 'defective' | 'missing') => void;
  handleDefectImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDefectReportSubmit: (e: React.FormEvent) => Promise<void>;
  handleMarkSingleAsSeen: (productId: string, tab: ListFilter) => void;
}

export default function useSellerOrders(): UseSellerOrdersReturn {
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

  // --- Tab & Filter State ---
  const [activeTab, setActiveTab] = useState<TabId>('list');
  const [searchParams, setSearchParams] = useSearchParams();
  const listFilter = (searchParams.get('tab') as ListFilter) || 'awaiting';
  const setListFilter = useCallback((tab: ListFilter) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  }, [setSearchParams]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

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

  // --- Defect Modal State ---
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectType, setDefectType] = useState<'defective' | 'missing'>('defective');
  const [defectProductId, setDefectProductId] = useState<string | null>(null);
  const [defectNote, setDefectNote] = useState('');
  const [defectImage, setDefectImage] = useState<string | null>(null);
  const [defectImageFileName, setDefectImageFileName] = useState('');

  // --- Timeline Modal State ---
  const navigate = useNavigate();

  const openTimeline = useCallback((p: Product) => {
    navigate(`/orders/${p.id}`);
  }, [navigate]);

  // --- Dropdown State ---
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  // --- Loading State ---
  const [actionLoading, setActionLoading] = useState(false);
  const isActionLoading = useRef(false);

  // --- Notification State ---
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>({
    awaiting: [], broken: [], production: [], completed: [], delivered: [], defective: [], to_ship: [], shipped: []
  });
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    awaiting: 0, broken: 0, production: 0, completed: 0, delivered: 0, defective: 0, to_ship: 0, shipped: 0
  });

  // --- Effects ---

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = () => { setActiveDropdownId(null); };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  // Badge / unseen notification calculation
  useEffect(() => {
    const groupedIds: Record<string, string[]> = {
      awaiting: products.filter(p => p.status === 'awaiting' || p.status === 'corrected').map(p => p.id),
      broken: products.filter(p => p.status === 'broken').map(p => p.id),
      production: products.filter(p => p.status === 'production').map(p => p.id),
      completed: products.filter(p => p.status === 'completed').map(p => p.id),
      delivered: products.filter(p => p.status === 'delivered').map(p => p.id),
      defective: products.filter(p => p.status === 'defective' || p.status === 'missing').map(p => p.id),
      to_ship: products.filter(p => p.status === 'to_ship').map(p => p.id),
      shipped: products.filter(p => p.status === 'shipped' || p.status === 'cancelled').map(p => p.id)
    };

    const nextUnseen: Record<string, string[]> = {
      awaiting: [], broken: [], production: [], completed: [], delivered: [], defective: [], to_ship: [], shipped: []
    };
    const nextBadgeCounts: Record<string, number> = {
      awaiting: 0, broken: 0, production: 0, completed: 0, delivered: 0, defective: 0, to_ship: 0, shipped: 0
    };

    const tabs: ListFilter[] = ['awaiting', 'broken', 'production', 'completed', 'delivered', 'defective', 'to_ship', 'shipped'];

    tabs.forEach(tab => {
      const storageKey = `seen_seller_${tab}`;
      const seenRaw = localStorage.getItem(storageKey);

      let seen: string[] = [];
      if (seenRaw === null) {
        seen = groupedIds[tab] || [];
        localStorage.setItem(storageKey, JSON.stringify(seen));
      } else {
        seen = JSON.parse(seenRaw) as string[];
      }

      const unseen = (groupedIds[tab] || []).filter(id => !seen.includes(id));
      nextUnseen[tab] = unseen;

      if (listFilter !== tab) {
        nextBadgeCounts[tab] = unseen.length;
      } else {
        nextBadgeCounts[tab] = 0;
        if (unseen.length > 0) {
          const newSeen = Array.from(new Set([...seen, ...unseen]));
          localStorage.setItem(storageKey, JSON.stringify(newSeen));
        }
      }
    });

    setUnseenIds(nextUnseen);
    setBadgeCounts(nextBadgeCounts);
  }, [products, listFilter]);

  // Catalog auto-fill
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

  // --- Handlers ---

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

  const handleEditClick = useCallback((product: Product) => {
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
  }, [extraFieldDefs]);

  const handleExtraValueChange = useCallback((fieldId: string, val: string) => {
    setExtraValues(prev => ({ ...prev, [fieldId]: val }));
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
      showToast(t('selectMfrRequired'));
      return;
    }

    const selectedMfr = connections.find(c => c.id === mfrId);
    const mfrName = selectedMfr ? selectedMfr.username : 'Üretici';

    const formattedExtras: Record<string, ExtraFieldValue> = {};
    extraFieldDefs.forEach(def => {
      formattedExtras[def.id] = {
        name: def.name,
        type: def.type,
        value: extraValues[def.id] || ''
      };
    });

    try {
      isActionLoading.current = true;
      setActionLoading(true);
      if (editingProduct) {
        const productPayload: Product = {
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
        const productPayload: CreateProductPayload = {
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [productCode, mfrId, connections, extraFieldDefs, extraValues, editingProduct, orderImage, orderText, orderLength, setProducts, showToast, t, handleClearForm]);

  const handleAddFieldSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isActionLoading.current) return;
    const name = newFieldName.trim();
    if (!name) {
      showToast(t('featureNameRequired'));
      return;
    }
    if (newFieldType === 'select' && !newFieldOptions.trim()) {
      showToast(t('featureOptionsRequired'));
      return;
    }

    const options = newFieldType === 'select'
      ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    try {
      isActionLoading.current = true;
      setActionLoading(true);
      const data = await api.createField({ name, type: newFieldType, options });
      showToast(data.message || t('featureAddSuccess'));
      setExtraFieldDefs(prev => [...prev, data.field]);
      setIsFieldModalOpen(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldOptions('');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [newFieldName, newFieldType, newFieldOptions, setExtraFieldDefs, showToast, t]);

  const handleRemoveField = useCallback(async (id: string) => {
    if (!confirm(t('featureDelConfirm'))) return;
    try {
      const data = await api.deleteField(id);
      showToast(data.message || t('featureDelSuccess'));
      setExtraFieldDefs(prev => prev.filter(d => d.id !== id));
      setExtraValues(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [setExtraFieldDefs, showToast, t]);

  const handleDeleteClick = useCallback(async (product: Product) => {
    const confirmMessage = language === 'tr'
      ? `${product.code} ${t('deleteOrderConfirm')}`
      : `${t('deleteOrderConfirm')} ${product.code}?`;
    if (!confirm(confirmMessage)) return;

    try {
      const data = await api.deleteProduct(product.id);
      showToast(data.message || t('deleteSuccess'));
      setProducts((prev: Product[]) => prev.filter(p => p.id !== product.id));
      if (editingProduct && editingProduct.id === product.id) {
        handleClearForm();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    }
  }, [language, editingProduct, setProducts, showToast, t, handleClearForm]);

  const handleCancelOrder = useCallback(async (productId: string) => {
    if (!confirm(language === 'tr' ? 'Siparişi iptal etmek istediğinize emin misiniz?' : 'Are you sure you want to cancel this order?')) return;
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'cancelled');
      showToast(data.message || t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [language, showToast, t]);

  const handleVerifyOrder = useCallback(async (productId: string, action: 'correct' | 'defective' | 'missing', note?: string | null, image?: string | null) => {
    if (action === 'correct') {
      if (!confirm(language === 'tr' ? 'Bu siparişi DOĞRU olarak onaylamak istediğinize emin misiniz?' : 'Are you sure you want to approve this order as CORRECT?')) return;
      try {
        setActionLoading(true);
        const data = await api.updateOrderStatus(productId, 'to_ship');
        showToast(data.message || t('statusUpdatedSuccess'));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        showToast(errorMessage);
      } finally {
        setActionLoading(false);
      }
    } else {
      setDefectType(action === 'defective' ? 'defective' : 'missing');
      setDefectProductId(productId);
      setDefectNote(note || '');
      setDefectImage(image || null);
      setDefectImageFileName(image ? 'Mevcut Görsel' : '');
      setIsDefectModalOpen(true);
    }
  }, [language, showToast, t]);

  const handleShipOrder = useCallback(async (productId: string) => {
    if (!confirm(language === 'tr' ? 'Siparişi kargolandı olarak işaretlemek istediğinize emin misiniz?' : 'Are you sure you want to mark this order as shipped?')) return;
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'shipped');
      showToast(data.message || t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      setActionLoading(false);
    }
  }, [language, showToast, t]);

  const handleDefectClick = useCallback((product: Product, type: 'defective' | 'missing') => {
    setDefectType(type);
    setDefectProductId(product.id);
    setDefectNote('');
    setDefectImage(null);
    setDefectImageFileName('');
    setIsDefectModalOpen(true);
  }, []);

  const handleDefectImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDefectImageFileName(file.name);
    try {
      const compressed = await compressImage(file);
      setDefectImage(compressed);
    } catch (err: unknown) {
      console.error(err);
      showToast(language === 'tr' ? 'Resim sıkıştırılırken hata oluştu!' : 'Error compressing image!');
    }
  }, [language, showToast]);

  const handleDefectReportSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!defectProductId || isActionLoading.current) return;

    try {
      isActionLoading.current = true;
      setActionLoading(true);
      const targetStatus = defectType;
      const data = await api.updateOrderStatus(defectProductId, targetStatus, defectNote, defectImage);
      showToast(data.message || t('statusUpdatedSuccess'));
      setIsDefectModalOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
    } finally {
      isActionLoading.current = false;
      setActionLoading(false);
    }
  }, [defectProductId, defectType, defectNote, defectImage, showToast, t]);

  const handleMarkSingleAsSeen = useCallback((productId: string, tab: ListFilter) => {
    setUnseenIds(prev => ({
      ...prev,
      [tab]: prev[tab].filter(id => id !== productId)
    }));
    const storageKey = `seen_seller_${tab}`;
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    if (!seen.includes(productId)) {
      localStorage.setItem(storageKey, JSON.stringify([...seen, productId]));
    }
  }, []);

  // --- Derived Data ---
  const sortedProducts = [...products].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const filteredProducts = sortedProducts.filter(p => {
    const status = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));
    if (listFilter === 'awaiting') return status === 'awaiting' || status === 'corrected';
    if (listFilter === 'broken') return status === 'broken';
    if (listFilter === 'production') return status === 'production';
    if (listFilter === 'completed') return status === 'completed';
    if (listFilter === 'delivered') return status === 'delivered';
    if (listFilter === 'defective') return status === 'defective' || status === 'missing';
    if (listFilter === 'to_ship') return status === 'to_ship';
    if (listFilter === 'shipped') return status === 'shipped' || status === 'cancelled';
    return true;
  });

  return {
    language, t, connections, extraFieldDefs, catalogProducts,
    activeTab, setActiveTab, listFilter, setListFilter, sortOrder, setSortOrder,
    productCode, setProductCode, orderText, setOrderText, orderLength, setOrderLength,
    mfrId, setMfrId, orderImage, imageFileName, autofillSuccess, extraValues,
    editingProduct, actionLoading,
    isFieldModalOpen, setIsFieldModalOpen, newFieldName, setNewFieldName,
    newFieldType, setNewFieldType, newFieldOptions, setNewFieldOptions,
    isDefectModalOpen, setIsDefectModalOpen, defectType, setDefectType, defectNote, setDefectNote, defectImage, defectImageFileName,
    openTimeline,
    activeDropdownId, setActiveDropdownId,
    unseenIds, badgeCounts, filteredProducts,
    handleImageChange, handleClearForm, handleEditClick, handleExtraValueChange,
    handleSubmit, handleAddFieldSubmit, handleRemoveField, handleDeleteClick,
    handleCancelOrder, handleVerifyOrder, handleShipOrder,
    handleDefectClick, handleDefectImageChange, handleDefectReportSubmit,
    handleMarkSingleAsSeen
  };
}
