import { useState, useRef, useCallback, FormEvent } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { useConfirm } from '../context/ConfirmContext';
import { api, Product } from '../services/api';
import { compressImage } from '../utils/imageHelper';
import { extractErrorMessage } from '../utils/errorUtils';
import { ListFilter } from '../types/orders';

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

  // Handlers
  handleCancelOrder: (productId: string) => Promise<void>;
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
  const { setProducts } = useData();
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
    const accepted = await confirm({
      title: language === 'tr' ? 'Siparişi İptal Et' : 'Cancel Order',
      message: language === 'tr' ? 'Siparişi iptal etmek istediğinize emin misiniz?' : 'Are you sure you want to cancel this order?',
      confirmText: language === 'tr' ? 'İptal Et' : 'Cancel',
      isDestructive: true,
    });
    if (!accepted) return;
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'cancelled');
      showToast(data.message || t('statusUpdatedSuccess'));
      setProducts((prev: Product[]) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, status: 'cancelled', isPendingApproval: false, isDefective: false, completed: false }
            : p,
        ),
      );
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [confirm, language, setProducts, showToast, t]);

  const handleVerifyOrder = useCallback(async (
    productId: string,
    action: 'correct' | 'defective' | 'missing',
    note?: string | null,
    image?: string | null,
  ) => {
    if (action === 'correct') {
      const accepted = await confirm({
        title: language === 'tr' ? 'Siparişi Doğrula' : 'Verify Order',
        message: language === 'tr' ? 'Bu siparişi DOĞRU olarak onaylamak istediğinize emin misiniz?' : 'Are you sure you want to approve this order as CORRECT?',
        confirmText: language === 'tr' ? 'Onayla' : 'Approve',
        isDestructive: false,
      });
      if (!accepted) return;
      try {
        setActionLoading(true);
        const data = await api.updateOrderStatus(productId, 'to_ship');
        showToast(data.message || t('statusUpdatedSuccess'));
        setProducts((prev: Product[]) =>
          prev.map((p) =>
            p.id === productId ? { ...p, status: 'to_ship', completed: true, isDefective: false } : p,
          ),
        );
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
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
  }, [confirm, language, setProducts, showToast, t]);

  const handleShipOrder = useCallback(async (productId: string) => {
    const accepted = await confirm({
      title: language === 'tr' ? 'Kargoya Ver' : 'Ship Order',
      message: language === 'tr' ? 'Siparişi kargolandı olarak işaretlemek istediğinize emin misiniz?' : 'Are you sure you want to mark this order as shipped?',
      confirmText: language === 'tr' ? 'Kargolandı İşaretle' : 'Mark as Shipped',
      isDestructive: false,
    });
    if (!accepted) return;
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, 'shipped');
      showToast(data.message || t('statusUpdatedSuccess'));
      setProducts((prev: Product[]) =>
        prev.map((p) =>
          p.id === productId ? { ...p, status: 'shipped', completed: true, isDefective: false } : p,
        ),
      );
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [confirm, language, setProducts, showToast, t]);

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
    try {
      isLoading.current = true;
      setActionLoading(true);
      externalLoading.set(true);
      const data = await api.updateOrderStatus(defectProductId, defectType, defectNote, defectImage);
      showToast(data.message || t('statusUpdatedSuccess'));
      setProducts((prev: Product[]) =>
        prev.map((p) =>
          p.id === defectProductId
            ? { ...p, status: defectType, isDefective: true, completed: false, defectNote, defectImage }
            : p,
        ),
      );
      setIsDefectModalOpen(false);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      isLoading.current = false;
      setActionLoading(false);
      externalLoading.set(false);
    }
  }, [defectProductId, defectType, defectNote, defectImage, externalLoading, setProducts, showToast, t]);

  return {
    isDefectModalOpen, setIsDefectModalOpen,
    defectType, setDefectType,
    defectNote, setDefectNote,
    defectImage, defectImageFileName,
    actionLoading,
    handleCancelOrder, handleVerifyOrder, handleShipOrder,
    handleDefectClick, handleDefectImageChange, handleDefectReportSubmit,
  };
}
