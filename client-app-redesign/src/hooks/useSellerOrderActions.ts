import { useState, useCallback, FormEvent } from 'react';
import { useProductsQuery, useProductActions } from './useProductsData';
import { useOptimisticMutation } from './useOptimisticMutation';
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
  const { t } = useSettings();
  const confirm = useConfirm();

  const { run, actionLoading, isRunning } = useOptimisticMutation<Product[]>({
    snapshot: () => [...products],
    rollback: rollbackProducts,
    refresh: loadProducts,
  });

  // --- Defect Modal State ---
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectType, setDefectType] = useState<'defective' | 'missing'>('defective');
  const [defectProductId, setDefectProductId] = useState<string | null>(null);
  const [defectNote, setDefectNote] = useState('');
  const [defectImage, setDefectImage] = useState<string | null>(null);
  const [defectImageFileName, setDefectImageFileName] = useState('');

  /** Cache'teki siparişe iyimser yama uygular (sipariş yoksa sessizce geçer). */
  const patchProduct = useCallback(
    (productId: string, patch: Partial<Product>) => {
      const target = products.find((p) => p.id === productId);
      if (target) optimisticUpdateProduct({ ...target, ...patch });
    },
    [products, optimisticUpdateProduct],
  );

  // --- Handlers ---

  const handleCancelOrder = useCallback(async (productId: string) => {
    if (isRunning.current) return;
    const accepted = await confirm({
      title: t('cancelOrderTitle'),
      message: t('cancelOrderConfirm'),
      confirmText: t('cancelBtn'),
      isDestructive: true,
    });
    if (!accepted) return;

    await run({
      optimistic: () => patchProduct(productId, { status: 'cancelled' }),
      action: () => api.updateOrderStatus(productId, 'cancelled'),
      successToast: (data) => data.message || t('statusUpdatedSuccess'),
    });
  }, [confirm, isRunning, run, patchProduct, t]);

  const handleRequestCancel = useCallback(async (productId: string) => {
    if (isRunning.current) return;
    const accepted = await confirm({
      title: t('requestCancelTitle'),
      message: t('requestCancelConfirm'),
      confirmText: t('sendRequestBtn'),
      isDestructive: true,
    });
    if (!accepted) return;

    await run({
      optimistic: () => patchProduct(productId, { cancelRequested: true }),
      action: () => api.requestOrderCancellation(productId),
      successToast: (data) => data.message || t('statusUpdatedSuccess'),
    });
  }, [confirm, isRunning, run, patchProduct, t]);

  const handleVerifyOrder = useCallback(async (
    productId: string,
    action: 'correct' | 'defective' | 'missing',
    note?: string | null,
    image?: string | null,
  ) => {
    if (isRunning.current) return;
    if (action === 'correct') {
      const accepted = await confirm({
        title: t('verifyOrderTitle'),
        message: t('verifyOrderConfirm'),
        confirmText: t('approveBtn'),
        isDestructive: false,
      });
      if (!accepted) return;

      await run({
        optimistic: () => patchProduct(productId, { status: 'to_ship' }),
        action: () => api.updateOrderStatus(productId, 'to_ship'),
        successToast: (data) => data.message || t('statusUpdatedSuccess'),
      });
    } else {
      // Open defect modal pre-filled
      setDefectType(action === 'defective' ? 'defective' : 'missing');
      setDefectProductId(productId);
      setDefectNote(note || '');
      setDefectImage(image || null);
      setDefectImageFileName(image ? t('currentImageLabel') : '');
      setIsDefectModalOpen(true);
    }
  }, [confirm, isRunning, run, patchProduct, t]);

  const handleShipOrder = useCallback(async (productId: string) => {
    if (isRunning.current) return;
    const accepted = await confirm({
      title: t('shipOrderTitle'),
      message: t('shipOrderConfirm'),
      confirmText: t('btnMarkShipped'),
      isDestructive: false,
    });
    if (!accepted) return;

    await run({
      optimistic: () => patchProduct(productId, { status: 'shipped' }),
      action: () => api.updateOrderStatus(productId, 'shipped'),
      successToast: (data) => data.message || t('statusUpdatedSuccess'),
    });
  }, [confirm, isRunning, run, patchProduct, t]);

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
      showToast(t('imageCompressionError'));
    }
  }, [t, showToast]);

  const handleDefectReportSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!defectProductId || isRunning.current) return;

    setIsDefectModalOpen(false);
    await run({
      optimistic: () =>
        patchProduct(defectProductId, {
          status: defectType,
          defectNote: defectNote || undefined,
          defectImage: defectImage || null,
        }),
      action: () => api.updateOrderStatus(defectProductId, defectType, defectNote, defectImage),
      successToast: (data) => data.message || t('statusUpdatedSuccess'),
      onError: (err) => {
        showToast(extractErrorMessage(err));
        setIsDefectModalOpen(true);
      },
      extraLoading: externalLoading.set,
    });
  }, [
    defectProductId,
    defectType,
    defectNote,
    defectImage,
    externalLoading,
    isRunning,
    run,
    patchProduct,
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
