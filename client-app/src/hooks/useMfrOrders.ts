import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product } from '../services/api';

export type MfrTab = 'awaiting' | 'corrected' | 'production' | 'completed' | 'delivered' | 'defective' | 'shipped';

export default function useMfrOrders() {
  const { products, setProducts } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as MfrTab) || 'awaiting';
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
      awaiting: products.filter(p => p.status === 'awaiting').map(p => p.id),
      corrected: products.filter(p => p.status === 'corrected').map(p => p.id),
      production: products.filter(p => p.status === 'production').map(p => p.id),
      completed: products.filter(p => p.status === 'completed').map(p => p.id),
      delivered: products.filter(p => p.status === 'delivered').map(p => p.id),
      defective: products.filter(p => p.status === 'defective' || p.status === 'missing').map(p => p.id),
      shipped: products.filter(p => p.status === 'shipped' || p.status === 'cancelled').map(p => p.id)
    };

    const nextUnseen: Record<string, string[]> = {
      awaiting: [], corrected: [], production: [], completed: [], delivered: [], defective: [], shipped: []
    };
    const nextBadgeCounts: Record<string, number> = {
      awaiting: 0, corrected: 0, production: 0, completed: 0, delivered: 0, defective: 0, shipped: 0
    };

    const tabs: MfrTab[] = ['awaiting', 'corrected', 'production', 'completed', 'delivered', 'defective', 'shipped'];

    tabs.forEach(tab => {
      const storageKey = `seen_mfr_${tab}`;
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
    const storageKey = `seen_mfr_${tab}`;
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    if (!seen.includes(productId)) {
      localStorage.setItem(storageKey, JSON.stringify([...seen, productId]));
    }
  }, []);

  const handleUpdateStatus = useCallback(async (productId: string, status: string) => {
    try {
      setActionLoading(true);
      const data = await api.updateOrderStatus(productId, status);
      showToast(data.message || t('statusUpdatedSuccess'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      showToast(errorMessage);
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
    const status = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));
    if (activeTab === 'awaiting') return status === 'awaiting';
    if (activeTab === 'corrected') return status === 'corrected';
    if (activeTab === 'production') return status === 'production';
    if (activeTab === 'completed') return status === 'completed';
    if (activeTab === 'delivered') return status === 'delivered';
    if (activeTab === 'defective') return status === 'defective' || status === 'missing';
    if (activeTab === 'shipped') return status === 'shipped' || status === 'cancelled';
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
    filteredProducts
  };
}
