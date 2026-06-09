import { useState, useEffect, useCallback } from 'react';
import { Product } from '../services/api';
import { ListFilter, LIST_FILTER_TABS } from '../types/orders';

interface UseSellerOrderBadgesReturn {
  unseenIds: Record<string, string[]>;
  badgeCounts: Record<string, number>;
  handleMarkSingleAsSeen: (productId: string, tab: ListFilter) => void;
}

/** Maps a product to its display-tab bucket. */
function resolveProductTab(p: Product): ListFilter {
  const status =
    p.status ||
    (p.isDefective ? 'defective' : p.completed ? 'completed' : p.isPendingApproval ? 'awaiting' : 'production');

  if (status === 'awaiting' || status === 'corrected') return 'awaiting';
  if (status === 'broken') return 'broken';
  if (status === 'production') return 'production';
  if (status === 'completed') return 'completed';
  if (status === 'delivered') return 'delivered';
  if (status === 'defective' || status === 'missing') return 'defective';
  if (status === 'to_ship') return 'to_ship';
  if (status === 'shipped' || status === 'cancelled') return 'shipped';
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
