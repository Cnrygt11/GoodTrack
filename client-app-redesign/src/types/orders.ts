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
export type SellerTabId = 'list' | 'create' | 'catalog' | 'archive';

