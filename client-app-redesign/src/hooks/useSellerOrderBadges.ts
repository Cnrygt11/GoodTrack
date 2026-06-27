import { useState, useEffect, useCallback } from 'react';
import { Product, api } from '../services/api';
import { ListFilter, LIST_FILTER_TABS } from '../types/orders';
import { ORDER_STATUS } from '../utils/constants';
import { useData } from '../context/DataContext';

interface UseSellerOrderBadgesReturn {
  unseenIds: Record<string, string[]>;
  badgeCounts: Record<string, number>;
  handleMarkSingleAsSeen: (productId: string, tab: ListFilter) => void;
}

/** Maps a product to its display-tab bucket. */
function resolveProductTab(p: Product): ListFilter {
  const status =
    p.status ||
    (p.isDefective ? ORDER_STATUS.DEFECTIVE : p.completed ? ORDER_STATUS.COMPLETED : p.isPendingApproval ? ORDER_STATUS.AWAITING : ORDER_STATUS.PRODUCTION);

  if (status === ORDER_STATUS.AWAITING || status === ORDER_STATUS.CORRECTED) return 'awaiting';
  if (status === ORDER_STATUS.BROKEN) return 'broken';
  if (status === ORDER_STATUS.PRODUCTION) return 'production';
  if (status === ORDER_STATUS.COMPLETED) return 'completed';
  if (status === ORDER_STATUS.DELIVERED) return 'delivered';
  if (status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING) return 'defective';
  if (status === ORDER_STATUS.TO_SHIP) return 'to_ship';
  if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED) return 'shipped';
  return 'production';
}

const EMPTY_RECORD = (): Record<string, string[]> =>
  Object.fromEntries(LIST_FILTER_TABS.map((t) => [t, []]));

const ZERO_RECORD = (): Record<string, number> =>
  Object.fromEntries(LIST_FILTER_TABS.map((t) => [t, 0]));

/**
 * Manages the "unseen" badge counts per tab.
 * Uses database-driven isReadBySeller state.
 */
export default function useSellerOrderBadges(
  products: Product[],
  listFilter: ListFilter,
): UseSellerOrderBadgesReturn {
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>(EMPTY_RECORD);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>(ZERO_RECORD);
  const { markStatusAsReadLocally } = useData();

  useEffect(() => {
    const nextUnseen: Record<string, string[]> = EMPTY_RECORD();
    const nextBadge: Record<string, number> = ZERO_RECORD();

    // Group unseen product IDs by tab, and count them
    products.forEach((p) => {
      const tab = resolveProductTab(p);
      if (p.isReadBySeller === false) {
        nextUnseen[tab].push(p.id);
        nextBadge[tab]++;
      }
    });

    setUnseenIds(nextUnseen);
    setBadgeCounts(nextBadge);

    // If there are unseen products on the current tab, mark them all as read on the backend
    const currentUnseen = nextUnseen[listFilter] || [];
    if (currentUnseen.length > 0) {
      markStatusAsReadLocally(listFilter, 'seller');
      api.markStatusAsRead(listFilter).catch((err) => {
        console.error(`Failed to mark status ${listFilter} as read:`, err);
      });
    }
  }, [products, listFilter, markStatusAsReadLocally]);

  const handleMarkSingleAsSeen = useCallback((productId: string, tab: ListFilter) => {
    setUnseenIds((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((id) => id !== productId),
    }));
    setBadgeCounts((prev) => ({
      ...prev,
      [tab]: Math.max(0, prev[tab] - 1),
    }));
  }, []);

  return { unseenIds, badgeCounts, handleMarkSingleAsSeen };
}
