import { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { api, Product } from '../services/api';

type MfrTab = 'pending' | 'completed' | 'defective' | 'approval';

export default function useMfrOrders() {
  const { products, setProducts } = useData();
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [activeTab, setActiveTab] = useState<MfrTab>('pending');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedDefectProduct, setSelectedDefectProduct] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Unseen orders notification states for each list filter tab
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>({
    pending: [],
    completed: [],
    defective: [],
    approval: []
  });
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({
    pending: 0,
    completed: 0,
    defective: 0,
    approval: 0
  });

  useEffect(() => {
    // Group products by status
    const groupedIds: Record<string, string[]> = {
      pending: products.filter(p => !p.completed && !p.isDefective && !p.isPendingApproval).map(p => p.id),
      completed: products.filter(p => !!p.completed && !p.isDefective && !p.isPendingApproval).map(p => p.id),
      defective: products.filter(p => !!p.isDefective && !p.isPendingApproval).map(p => p.id),
      approval: products.filter(p => !!p.isPendingApproval).map(p => p.id)
    };

    const nextUnseen: Record<string, string[]> = { pending: [], completed: [], defective: [], approval: [] };
    const nextBadgeCounts: Record<string, number> = { pending: 0, completed: 0, defective: 0, approval: 0 };

    const tabs: MfrTab[] = ['pending', 'completed', 'defective', 'approval'];

    tabs.forEach(tab => {
      const storageKey = `seen_mfr_${tab}`;
      const seenRaw = localStorage.getItem(storageKey);

      let seen: string[] = [];
      if (seenRaw === null) {
        // First run: mark existing as seen so we only notify on new changes
        seen = groupedIds[tab];
        localStorage.setItem(storageKey, JSON.stringify(seen));
      } else {
        seen = JSON.parse(seenRaw) as string[];
      }

      const unseen = groupedIds[tab].filter(id => !seen.includes(id));
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

  const handleToggleComplete = useCallback(async (productId: string, checked: boolean) => {
    try {
      const data = await api.toggleProductComplete(productId, checked);
      showToast(data.message || t('statusUpdatedSuccess'));

      // Update local state
      setProducts((prev: Product[]) => prev.map(p => {
        if (p.id === productId) {
          return { ...p, completed: checked };
        }
        return p;
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(errorMessage);
    }
  }, [showToast, t, setProducts]);

  const handleToggleApproval = useCallback(async (productId: string, isPendingApproval: boolean) => {
    try {
      const data = await api.toggleProductApproval(productId, isPendingApproval);
      showToast(data.message || t('statusUpdatedSuccess'));
      setProducts((prev: Product[]) => prev.map(item =>
        item.id === productId ? { ...item, isPendingApproval } : item
      ));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(errorMessage);
    }
  }, [showToast, t, setProducts]);

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
    if (activeTab === 'pending') return !p.completed && !p.isDefective && !p.isPendingApproval;
    if (activeTab === 'completed') return p.completed && !p.isDefective && !p.isPendingApproval;
    if (activeTab === 'defective') return !!p.isDefective && !p.isPendingApproval;
    if (activeTab === 'approval') return !!p.isPendingApproval;
    return true;
  });

  return {
    // Context values
    language,
    t,

    // State
    activeTab,
    setActiveTab,
    sortOrder,
    setSortOrder,
    selectedDefectProduct,
    isDetailsModalOpen,
    unseenIds,
    badgeCounts,

    // Handlers
    handleToggleComplete,
    handleToggleApproval,
    handleMarkSingleAsSeen,
    openDefectDetails,
    closeDefectDetails,

    // Derived data
    filteredProducts
  };
}
