/**
 * Application-wide shared constants.
 * Import from here instead of hard-coding values in components.
 */

/**
 * Manufacturer specialty categories used in the B2B directory search
 * and in the manufacturer profile keyword selection.
 */
export const MANUFACTURER_CATEGORIES: string[] = [
  'Deri',
  'Gümüş',
  'Altın',
  'Ahşap',
  'Takı',
  'Bijuteri',
  'Terzi',
  'Lazer Kesim',
];

export const ROLES = {
  SELLER: 'seller',
  MFR: 'mfr',
  ADMIN: 'admin',
} as const;

export const ORDER_STATUS = {
  AWAITING: 'awaiting',
  PRODUCTION: 'production',
  COMPLETED: 'completed',
  DELIVERED: 'delivered',
  BROKEN: 'broken',
  CORRECTED: 'corrected',
  DEFECTIVE: 'defective',
  MISSING: 'missing',
  TO_SHIP: 'to_ship',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
} as const;

