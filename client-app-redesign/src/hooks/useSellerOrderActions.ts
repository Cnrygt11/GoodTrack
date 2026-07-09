import { useState, useRef, useCallback, FormEvent } from 'react';
import { useProductsQuery, useProductActions } from './useProductsData';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, Product } from '../services/apiClient';
import { compressImage } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';

interface UseSellerOrderActionsReturn {
  // Defect modal state
  isDefectModalOpen: boolean;
  setIsDefectModalOpen: (v: boolean) => void;
  defectType: 'defective' | 'missing';
  setDefectType: (v: 'defective' | 'missing') => void;
  defectNote: string;
  setDefectNote: (v: string) => void;
  defectImage: string | null;
  defectImageFileName: string;

  // Loading (shared ref from form hook)
  actionLoading: boolean;

  handleCancelOrder: (productId: string) => Promise<void>;
  handleRequestCancel: (productId: string) => Promise<void>;
  handleVerifyOrder: (
    productId: string,
    action: 'correct' | 'defective' | 'missing',
    note?: string | null,
    image?: string | null,
  ) => Promise<void>;
  handleShipOrder: (productId: string) => Promise<void>;
  handleDefectClick: (product: Product, type: 'defective' | 'missing') => void;
  handleDefectImageChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDefectReportSubmit: (e: FormEvent) => Promise<void>;
}

/**
 * Manages all order action handlers: cancel, verify (correct/defective/missing),
 * ship, and the defect report flow.
 */
export default function useSellerOrderActions(
  /** Shared loading ref from useSellerOrderForm so both hooks control the same flag. */
  externalLoading: { isRef: React.MutableRefObject<boolean>; set: (v: boolean) => void },
): UseSellerOrderActionsReturn {
  const { products } = useProductsQuery();
  const { loadProducts, optimisticUpdateProduct, rollbackProducts } = useProductActions();
  const { showToast } = useToast();
  const { language, t } = useSettings();
  const confirm = useConfirm();

  // --- Defect Modal State ---
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectType, setDefectType] = useState<'defective' | 'missing'>('defective');
  const [defectProductId, setDefectProductId] = useState<string | null>(null);
  const [defectNote, setDefectNote] = useState('');
  const [defectImage, setDefectImage] = useState<string | null>(null);
  const [defectImageFileName, setDefectImageFileName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const isLoading = useRef(false);

  // --- Handlers ---

  const handleCancelOrder = useCallback(async (productId: string) => {
    if (isLoading.current) return;
    const accepted = await confirm({
      title: t('cancelOrderTitle'),
      message: t('cancelOrderConfirm'),
      confirmText: language === 'tr' ? 'İptal Et' : 'Cancel',
      isDestructive: true,
    });
    if (!accepted) return;

    const prevProducts = [...products];
    const target = products.find(p => p.id === productId);
    if (target) {
      optimisticUpdateProduct({
        ...target,
        status: 'cancelled'
      });
    }

    try {
      isLoading.current = true;
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'cancelled');
      showToast(data.message || t('statusUpdatedSuccess'));
      await loadProducts();
    } catch (err: unknown) {
      rollbackProducts(prevProducts);
      showToast(extractErrorMessage(err));
    } finally {
      isLoading.current = false;
      setActionLoading(false);
    }
  }, [confirm, language, products, optimisticUpdateProduct, rollbackProducts, loadProducts, showToast, t]);

  const handleRequestCancel = useCallback(async (productId: string) => {
    if (isLoading.current) return;
    const accepted = await confirm({
      title: t('requestCancelTitle'),
      message: t('requestCancelConfirm'),
      confirmText: language === 'tr' ? 'Talep Gönder' : 'Send Request',
      isDestructive: true,
    });
    if (!accepted) return;

    const prevProducts = [...products];
    const target = products.find(p => p.id === productId);
    if (target) {
      optimisticUpdateProduct({
        ...target,
        cancelRequested: true
      });
    }

    try {
      isLoading.current = true;
      setActionLoading(true);
      const data = await api.requestOrderCancellation(productId);
      showToast(data.message || t('statusUpdatedSuccess'));
      await loadProducts();
    } catch (err: unknown) {
      rollbackProducts(prevProducts);
      showToast(extractErrorMessage(err));
    } finally {
      isLoading.current = false;
      setActionLoading(false);
    }
  }, [confirm, language, products, optimisticUpdateProduct, rollbackProducts, loadProducts, showToast, t]);

  const handleVerifyOrder = useCallback(async (
    productId: string,
    action: 'correct' | 'defective' | 'missing',
    note?: string | null,
    image?: string | null,
  ) => {
    if (isLoading.current) return;
    if (action === 'correct') {
      const accepted = await confirm({
        title: t('verifyOrderTitle'),
        message: t('verifyOrderConfirm'),
        confirmText: language === 'tr' ? 'Onayla' : 'Approve',
        isDestructive: false,
      });
      if (!accepted) return;

      const prevProducts = [...products];
      const target = products.find(p => p.id === productId);
      if (target) {
        optimisticUpdateProduct({
          ...target,
          status: 'to_ship'
        });
      }

      try {
        isLoading.current = true;
        setActionLoading(true);
        const data = await api.updateOrderStatus(productId, 'to_ship');
        showToast(data.message || t('statusUpdatedSuccess'));
        await loadProducts();
      } catch (err: unknown) {
        rollbackProducts(prevProducts);
        showToast(extractErrorMessage(err));
      } finally {
        isLoading.current = false;
        setActionLoading(false);
      }
    } else {
      // Open defect modal pre-filled
      setDefectType(action === 'defective' ? 'defective' : 'missing');
      setDefectProductId(productId);
      setDefectNote(note || '');
      setDefectImage(image || null);
      setDefectImageFileName(image ? 'Mevcut Görsel' : '');
      setIsDefectModalOpen(true);
    }
  }, [confirm, language, products, optimisticUpdateProduct, rollbackProducts, loadProducts, showToast, t]);

  const handleShipOrder = useCallback(async (productId: string) => {
    if (isLoading.current) return;
    const accepted = await confirm({
      title: t('shipOrderTitle'),
      message: t('shipOrderConfirm'),
      confirmText: language === 'tr' ? 'Kargolandı İşaretle' : 'Mark as Shipped',
      isDestructive: false,
    });
    if (!accepted) return;

    const prevProducts = [...products];
    const target = products.find(p => p.id === productId);
    if (target) {
      optimisticUpdateProduct({
        ...target,
        status: 'shipped'
      });
    }

    try {
      isLoading.current = true;
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'shipped');
      showToast(data.message || t('statusUpdatedSuccess'));
      await loadProducts();
    } catch (err: unknown) {
      rollbackProducts(prevProducts);
      showToast(extractErrorMessage(err));
    } finally {
      isLoading.current = false;
      setActionLoading(false);
    }
  }, [confirm, language, products, optimisticUpdateProduct, rollbackProducts, loadProducts, showToast, t]);

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

  const handleDefectReportSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!defectProductId || isLoading.current) return;

    const prevProducts = [...products];
    const target = products.find(p => p.id === defectProductId);
    if (target) {
      optimisticUpdateProduct({
        ...target,
        status: defectType,
        defectNote: defectNote || undefined,
        defectImage: defectImage || null
      });
    }
    setIsDefectModalOpen(false);

    try {
      isLoading.current = true;
      setActionLoading(true);
      externalLoading.set(true);
      const data = await api.updateOrderStatus(defectProductId, defectType, defectNote, defectImage);
      showToast(data.message || t('statusUpdatedSuccess'));
      await loadProducts();
    } catch (err: unknown) {
      rollbackProducts(prevProducts);
      showToast(extractErrorMessage(err));
      setIsDefectModalOpen(true);
    } finally {
      isLoading.current = false;
      setActionLoading(false);
      externalLoading.set(false);
    }
  }, [
    defectProductId,
    defectType,
    defectNote,
    defectImage,
    externalLoading,
    products,
    optimisticUpdateProduct,
    rollbackProducts,
    loadProducts,
    showToast,
    t,
  ]);

  return {
    isDefectModalOpen, setIsDefectModalOpen,
    defectType, setDefectType,
    defectNote, setDefectNote,
    defectImage, defectImageFileName,
    actionLoading,
    handleCancelOrder, handleVerifyOrder, handleShipOrder, handleRequestCancel,
    handleDefectClick, handleDefectImageChange, handleDefectReportSubmit,
  };
}

