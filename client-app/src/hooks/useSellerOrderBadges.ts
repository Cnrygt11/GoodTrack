import { useState, useEffect, useCallback } from 'react';
import { Product } from '../services/api';
import { ListFilter, LIST_FILTER_TABS } from '../types/orders';
import { ORDER_STATUS } from '../utils/constants';

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
 * Persists seen IDs in localStorage so badges survive page refresh.
 */
export default function useSellerOrderBadges(
  products: Product[],
  listFilter: ListFilter,
): UseSellerOrderBadgesReturn {
  const [unseenIds, setUnseenIds] = useState<Record<string, string[]>>(EMPTY_RECORD);
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>(ZERO_RECORD);

  useEffect(() => {
    // Group product IDs by their display tab
    const groupedIds: Record<string, string[]> = EMPTY_RECORD();
    products.forEach((p) => {
      const tab = resolveProductTab(p);
      groupedIds[tab].push(p.id);
    });

    const nextUnseen: Record<string, string[]> = EMPTY_RECORD();
    const nextBadge: Record<string, number> = ZERO_RECORD();

    LIST_FILTER_TABS.forEach((tab) => {
      const storageKey = `seen_seller_${tab}`;
      const seenRaw = localStorage.getItem(storageKey);

      let seen: string[];
      if (seenRaw === null) {
        // First visit: treat everything currently on this tab as already seen
        seen = groupedIds[tab];
        localStorage.setItem(storageKey, JSON.stringify(seen));
      } else {
        seen = JSON.parse(seenRaw) as string[];
      }

      const unseen = groupedIds[tab].filter((id) => !seen.includes(id));
      nextUnseen[tab] = unseen;

      if (listFilter === tab) {
        // User is currently on this tab → auto-mark all as seen
        nextBadge[tab] = 0;
        if (unseen.length > 0) {
          const merged = Array.from(new Set([...seen, ...unseen]));
          localStorage.setItem(storageKey, JSON.stringify(merged));
        }
      } else {
        nextBadge[tab] = unseen.length;
      }
    });

    setUnseenIds(nextUnseen);
    setBadgeCounts(nextBadge);
  }, [products, listFilter]);

  const handleMarkSingleAsSeen = useCallback((productId: string, tab: ListFilter) => {
    setUnseenIds((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((id) => id !== productId),
    }));

    const storageKey = `seen_seller_${tab}`;
    const seen = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
    if (!seen.includes(productId)) {
      localStorage.setItem(storageKey, JSON.stringify([...seen, productId]));
    }
  }, []);

  return { unseenIds, badgeCounts, handleMarkSingleAsSeen };
}
