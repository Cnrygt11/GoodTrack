import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProductsQuery, useProductActions } from './useProductsData';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';
import { ORDER_STATUS } from '../utils/constants';
import { deriveStatus } from '../utils/orderStatus';
import { useOptimisticMutation } from './useOptimisticMutation';

export type MfrTab =
  'awaiting' | 'corrected' | 'production' | 'completed' | 'delivered' | 'defective';

export default function useMfrOrders() {
  const { products } = useProductsQuery();
  const { loadProducts, optimisticUpdateProduct, rollbackProducts, markTabAsRead } =
    useProductActions();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as MfrTab) || ORDER_STATUS.AWAITING;
  const setActiveTab = useCallback(
    (tab: MfrTab) => {
      setSearchParams((prev) => {
        prev.set('tab', tab);
        return prev;
      });
    },
    [setSearchParams],
  );
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedDefectProduct, setSelectedDefectProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const { run, actionLoading } = useOptimisticMutation<Product[]>({
    snapshot: () => [...products],
    rollback: rollbackProducts,
    refresh: loadProducts,
  });

  /** Cache'teki siparişe iyimser yama uygular (sipariş yoksa sessizce geçer). */
  const patchProduct = useCallback(
    (productId: string, patch: Partial<Product>) => {
      const target = products.find((p) => p.id === productId);
      if (target) optimisticUpdateProduct({ ...target, ...patch });
    },
    [products, optimisticUpdateProduct],
  );

  // Broken order report modal state
  const [brokenProductId, setBrokenProductId] = useState<string | null>(null);
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);

  const closeBrokenModal = useCallback(() => {
    setIsBrokenModalOpen(false);
    setBrokenProductId(null);
  }, []);

  // Timeline modal state
  const navigate = useNavigate();

  const openTimeline = useCallback(
    (p: Product) => {
      navigate(`/mfr/orders/${p.id}`);
    },
    [navigate],
  );

  // Unseen orders notification states for each list filter tab
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>({
    awaiting: [],
    corrected: [],
    production: [],
    completed: [],
    delivered: [],
    defective: [],
  });
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    awaiting: 0,
    corrected: 0,
    production: 0,
    completed: 0,
    delivered: 0,
    defective: 0,
  });

  useEffect(() => {
    const nextUnseen: Record<string, string[]> = {
      awaiting: [],
      corrected: [],
      production: [],
      completed: [],
      delivered: [],
      defective: [],
    };
    const nextBadgeCounts: Record<string, number> = {
      awaiting: 0,
      corrected: 0,
      production: 0,
      completed: 0,
      delivered: 0,
      defective: 0,
    };

    products.forEach((p) => {
      let tab: MfrTab | null = null;
      if (p.status === ORDER_STATUS.AWAITING) tab = 'awaiting';
      else if (p.status === ORDER_STATUS.CORRECTED) tab = 'corrected';
      else if (p.status === ORDER_STATUS.PRODUCTION) tab = 'production';
      else if (p.status === ORDER_STATUS.COMPLETED) tab = 'completed';
      else if (p.status === ORDER_STATUS.DELIVERED) tab = 'delivered';
      else if (p.status === ORDER_STATUS.DEFECTIVE || p.status === ORDER_STATUS.MISSING)
        tab = 'defective';

      if (tab && p.isReadByMfr === false) {
        nextUnseen[tab].push(p.id);
        nextBadgeCounts[tab]++;
      }
    });

    setUnseenIds(nextUnseen);
    setBadgeCounts(nextBadgeCounts);

    // If there are unseen products on the current tab, mark them all as read on the backend
    const currentUnseen = nextUnseen[activeTab] || [];
    if (currentUnseen.length > 0) {
      markTabAsRead(activeTab, 'mfr');
    }
  }, [products, activeTab, markTabAsRead]);

  const handleMarkSingleAsSeen = useCallback((productId: string, tab: MfrTab) => {
    setUnseenIds((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((id) => id !== productId),
    }));
    setBadgeCounts((prev) => ({
      ...prev,
      [tab]: Math.max(0, prev[tab] - 1),
    }));
  }, []);

  const handleUpdateStatus = useCallback(
    async (productId: string, status: string, defectNote?: string) => {
      if (status === 'broken' && !defectNote) {
        setBrokenProductId(productId);
        setIsBrokenModalOpen(true);
        return;
      }

      const target = products.find((p) => p.id === productId);
      await run({
        optimistic: () =>
          patchProduct(productId, { status, defectNote: defectNote || target?.defectNote }),
        action: () => api.updateOrderStatus(productId, status, defectNote),
        successToast: (data) => data.message || t('statusUpdatedSuccess'),
      });
    },
    [products, run, patchProduct, t],
  );

  const handleBrokenSubmit = useCallback(
    async (note: string) => {
      if (!brokenProductId) return;
      setIsBrokenModalOpen(false);
      const savedProductId = brokenProductId;
      setBrokenProductId(null);

      await run({
        optimistic: () => patchProduct(savedProductId, { status: 'broken', defectNote: note }),
        action: () => api.updateOrderStatus(savedProductId, 'broken', note),
        successToast: (data) => data.message || t('statusUpdatedSuccess'),
        onError: (err) => {
          showToast(extractErrorMessage(err));
          setIsBrokenModalOpen(true);
          setBrokenProductId(savedProductId);
        },
      });
    },
    [brokenProductId, run, patchProduct, showToast, t],
  );

  const handleRespondCancel = useCallback(
    async (productId: string, approve: boolean) => {
      const target = products.find((p) => p.id === productId);
      await run({
        optimistic: () =>
          patchProduct(productId, {
            status: approve ? 'cancelled' : target?.status,
            cancelRequested: false,
          }),
        action: () => api.respondToOrderCancellation(productId, approve),
        successToast: (data) => data.message || t('statusUpdatedSuccess'),
      });
    },
    [products, run, patchProduct, t],
  );

  const openDefectDetails = useCallback((product: Product) => {
    // Modal liste verisiyle hemen açılır (not + bayrak mevcut); liste yanıtı ağır kusur
    // görselini taşımadığından tam görsel arka planda detay ucundan çekilip yerleştirilir.
    setSelectedDefectProduct(product);
    setIsDetailsModalOpen(true);

    if (product.hasDefectImage && !product.defectImage) {
      api
        .getProductById(product.id)
        .then((full) => {
          setSelectedDefectProduct((current) =>
            current?.id === product.id ? { ...current, defectImage: full.defectImage } : current,
          );
        })
        .catch(() => {
          // Görsel alınamadı: spinner yerine "görsel yok" satırına düş.
          setSelectedDefectProduct((current) =>
            current?.id === product.id ? { ...current, hasDefectImage: false } : current,
          );
        });
    }
  }, []);

  const closeDefectDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  // Computed: sorted products
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [products, sortOrder]);

  // Computed: filtered products based on active tab (+ client-side arama)
  const filteredProducts = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch = (p: Product) =>
      !q ||
      [p.code, p.text, p.mfrName, p.sellerName].some((f) => (f || '').toLowerCase().includes(q));

    return sortedProducts.filter((p) => {
      const status = deriveStatus(p);
      let statusMatch: boolean;
      if (activeTab === ORDER_STATUS.AWAITING) statusMatch = status === ORDER_STATUS.AWAITING;
      else if (activeTab === ORDER_STATUS.CORRECTED)
        statusMatch = status === ORDER_STATUS.CORRECTED;
      else if (activeTab === ORDER_STATUS.PRODUCTION)
        statusMatch = status === ORDER_STATUS.PRODUCTION;
      else if (activeTab === ORDER_STATUS.COMPLETED)
        statusMatch = status === ORDER_STATUS.COMPLETED;
      else if (activeTab === ORDER_STATUS.DELIVERED)
        statusMatch = status === ORDER_STATUS.DELIVERED;
      else if (activeTab === ORDER_STATUS.DEFECTIVE)
        statusMatch = status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING;
      else statusMatch = true;

      return statusMatch && matchesSearch(p);
    });
  }, [sortedProducts, activeTab, orderSearch]);

  return {
    language,
    t,
    activeTab,
    setActiveTab,
    sortOrder,
    setSortOrder,
    orderSearch,
    setOrderSearch,
    selectedDefectProduct,
    isDetailsModalOpen,
    actionLoading,
    unseenIds,
    badgeCounts,
    openTimeline,
    handleUpdateStatus,
    handleMarkSingleAsSeen,
    openDefectDetails,
    closeDefectDetails,
    isBrokenModalOpen,
    closeBrokenModal,
    handleBrokenSubmit,
    handleRespondCancel,
    filteredProducts,
  };
}
