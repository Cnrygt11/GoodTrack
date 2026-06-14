import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product } from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';
import { MFR_SEEN_KEY_PREFIX } from '../constants/authKeys';
import { ORDER_STATUS } from '../utils/constants';

export type MfrTab = 'awaiting' | 'corrected' | 'production' | 'completed' | 'delivered' | 'defective' | 'shipped';

export default function useMfrOrders() {
  const { products } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as MfrTab) || ORDER_STATUS.AWAITING;
  const setActiveTab = useCallback((tab: MfrTab) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    });
  }, [setSearchParams]);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedDefectProduct, setSelectedDefectProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Broken order report modal state
  const [brokenProductId, setBrokenProductId] = useState<string | null>(null);
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);

  const closeBrokenModal = useCallback(() => {
    setIsBrokenModalOpen(false);
    setBrokenProductId(null);
  }, []);

  // Timeline modal state
  const navigate = useNavigate();

  const openTimeline = useCallback((p: Product) => {
    navigate(`/mfr/orders/${p.id}`);
  }, [navigate]);

  // Unseen orders notification states for each list filter tab
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>({
    awaiting: [],
    corrected: [],
    production: [],
    completed: [],
    delivered: [],
    defective: [],
    shipped: []
  });
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    awaiting: 0,
    corrected: 0,
    production: 0,
    completed: 0,
    delivered: 0,
    defective: 0,
    shipped: 0
  });

  useEffect(() => {
    // Group products by status
    const groupedIds: Record<string, string[]> = {
      awaiting: products.filter(p => p.status === ORDER_STATUS.AWAITING).map(p => p.id),
      corrected: products.filter(p => p.status === ORDER_STATUS.CORRECTED).map(p => p.id),
      production: products.filter(p => p.status === ORDER_STATUS.PRODUCTION).map(p => p.id),
      completed: products.filter(p => p.status === ORDER_STATUS.COMPLETED).map(p => p.id),
      delivered: products.filter(p => p.status === ORDER_STATUS.DELIVERED).map(p => p.id),
      defective: products.filter(p => p.status === ORDER_STATUS.DEFECTIVE || p.status === ORDER_STATUS.MISSING).map(p => p.id),
      shipped: products.filter(p => p.status === ORDER_STATUS.SHIPPED || p.status === ORDER_STATUS.CANCELLED).map(p => p.id)
    };

    const nextUnseen: Record<string, string[]> = {
      awaiting: [], corrected: [], production: [], completed: [], delivered: [], defective: [], shipped: []
    };
    const nextBadgeCounts: Record<string, number> = {
      awaiting: 0, corrected: 0, production: 0, completed: 0, delivered: 0, defective: 0, shipped: 0
    };

    const tabs: MfrTab[] = ['awaiting', 'corrected', 'production', 'completed', 'delivered', 'defective', 'shipped'];

    tabs.forEach(tab => {
      const storageKey = `${MFR_SEEN_KEY_PREFIX}${tab}`;
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

      if (activeTab !== tab) {
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
  }, [products, activeTab]);

  const handleMarkSingleAsSeen = useCallback((productId: string, tab: MfrTab) => {
    setUnseenIds(prev => ({
      ...prev,
      [tab]: prev[tab].filter(id => id !== productId)
    }));
    const storageKey = `${MFR_SEEN_KEY_PREFIX}${tab}`;
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    if (!seen.includes(productId)) {
      localStorage.setItem(storageKey, JSON.stringify([...seen, productId]));
    }
  }, []);

  const handleUpdateStatus = useCallback(async (productId: string, status: string, defectNote?: string) => {
    console.log('[useMfrOrders] handleUpdateStatus:', { productId, status, defectNote });
    if (status === 'broken' && !defectNote) {
      console.log('[useMfrOrders] Intercepted broken status without note. Opening BrokenReportModal...');
      setBrokenProductId(productId);
      setIsBrokenModalOpen(true);
      return;
    }

    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, status, defectNote);
      showToast(data.message || t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [showToast, t]);

  const handleBrokenSubmit = useCallback(async (note: string) => {
    console.log('[useMfrOrders] handleBrokenSubmit:', { brokenProductId, note });
    if (!brokenProductId) return;
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(brokenProductId, 'broken', note);
      showToast(data.message || t('statusUpdatedSuccess'));
      setIsBrokenModalOpen(false);
      setBrokenProductId(null);
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [brokenProductId, showToast, t]);

  const handleRespondCancel = useCallback(async (productId: string, approve: boolean) => {
    console.log('[useMfrOrders] handleRespondCancel:', { productId, approve });
    try {
      setActionLoading(true);
      const data = await api.respondToOrderCancellation(productId, approve);
      showToast(data.message || t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }, [showToast, t]);

  const openDefectDetails = useCallback((product: Product) => {
    setSelectedDefectProduct(product);
    setIsDetailsModalOpen(true);
  }, []);

  const closeDefectDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
  }, []);

  // Computed: sorted products
  const sortedProducts = [...products].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // Computed: filtered products based on active tab
  const filteredProducts = sortedProducts.filter(p => {
    const status = p.status || (p.isDefective ? ORDER_STATUS.DEFECTIVE : (p.completed ? ORDER_STATUS.COMPLETED : (p.isPendingApproval ? ORDER_STATUS.AWAITING : ORDER_STATUS.PRODUCTION)));
    if (activeTab === ORDER_STATUS.AWAITING) return status === ORDER_STATUS.AWAITING;
    if (activeTab === ORDER_STATUS.CORRECTED) return status === ORDER_STATUS.CORRECTED;
    if (activeTab === ORDER_STATUS.PRODUCTION) return status === ORDER_STATUS.PRODUCTION;
    if (activeTab === ORDER_STATUS.COMPLETED) return status === ORDER_STATUS.COMPLETED;
    if (activeTab === ORDER_STATUS.DELIVERED) return status === ORDER_STATUS.DELIVERED;
    if (activeTab === ORDER_STATUS.DEFECTIVE) return status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING;
    if (activeTab === ORDER_STATUS.SHIPPED) return status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED;
    return true;
  });

  return {
    language,
    t,
    activeTab,
    setActiveTab,
    sortOrder,
    setSortOrder,
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
    filteredProducts
  };
}
