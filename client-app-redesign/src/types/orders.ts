/**
 * Shared order-related types used across hooks and components.
 * Single source of truth — import from here instead of re-declaring locally.
 */

/** All possible status buckets shown in the seller's tab navigation. */
export type ListFilter =
  | 'awaiting'
  | 'broken'
  | 'production'
  | 'completed'
  | 'delivered'
  | 'defective'
  | 'to_ship'
  | 'shipped';

/** All ListFilter values as an ordered array (useful for iteration). */
export const LIST_FILTER_TABS: ListFilter[] = [
  'awaiting',
  'broken',
  'production',
  'completed',
  'delivered',
  'defective',
  'to_ship',
  'shipped',
];

/** Active sub-page tab on the SellerPage. */
export type SellerTabId = 'list' | 'create' | 'catalog';

/**
 * Satıcı sipariş kartının aksiyon callback'leri tek pakette — kart, dropdown ve
 * action-bar bileşenlerine tek prop olarak geçer (12 ayrı prop yerine).
 */
export interface SellerOrderCardActions {
  onEdit: (product: import('../services/apiClient').Product) => void;
  onDelete: (product: import('../services/apiClient').Product) => Promise<void>;
  onCancel: (productId: string) => Promise<void>;
  onVerify: (productId: string, action: 'correct' | 'defective' | 'missing') => void;
  onShip: (productId: string) => Promise<void>;
  onViewTimeline: (product: import('../services/apiClient').Product) => void;
  onMarkSeen: (productId: string, tab: ListFilter) => void;
  onViewBrokenNote?: (product: import('../services/apiClient').Product) => void;
  onRequestCancel?: (productId: string) => Promise<void>;
}
