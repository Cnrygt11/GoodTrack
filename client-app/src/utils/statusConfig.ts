import React from 'react';
import {
  Clock, CheckCircle2, AlertTriangle, XCircle,
  Ban, Send, Archive, Package,
} from 'lucide-react';
import { TranslationKey } from '../services/translations';
import { ORDER_STATUS, ROLES } from './constants';

export type StatusConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

/**
 * Returns the visual configuration (color, background, icon, label) for a
 * given order status.
 *
 * @param status - The order status string.
 * @param t - Translation function.
 * @param options.iconSize - Icon pixel size (default: 11).
 * @param options.role - 'seller' or 'mfr'. Affects the "production" status
 *   accent color (seller → amber, mfr → cyan). Default: 'seller'.
 */
export function getStatusConfig(
  status: string,
  t: (key: TranslationKey) => string,
  options?: { iconSize?: number; role?: 'seller' | 'mfr'; isReproduction?: boolean },
): StatusConfig {
  const sz = options?.iconSize ?? 11;
  const role = options?.role ?? 'seller';
  const isReproduction = options?.isReproduction ?? false;

  const productionStyle =
    role === ROLES.MFR
      ? {
          color: 'var(--accent-mfr)',
          bg: 'var(--accent-mfr-glow)',
          border: 'rgba(6,182,212,0.3)',
        }
      : {
          color: 'var(--accent-seller)',
          bg: 'var(--accent-seller-glow)',
          border: 'rgba(245,166,35,0.3)',
        };

  switch (status) {
    case ORDER_STATUS.AWAITING:
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: React.createElement(Clock, { size: sz }), label: t('statusPendingApproval') };
    case ORDER_STATUS.CORRECTED:
      return { color: '#00bcd4', bg: 'rgba(0,188,212,0.1)', border: 'rgba(0,188,212,0.3)', icon: React.createElement(Clock, { size: sz }), label: t('statusCorrected') };
    case ORDER_STATUS.BROKEN:
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: React.createElement(AlertTriangle, { size: sz }), label: t('statusBroken') };
    case ORDER_STATUS.PRODUCTION:
      return { ...productionStyle, icon: React.createElement(Clock, { size: sz }), label: isReproduction ? t('statusReproduction') : t('statusInProduction') };
    case ORDER_STATUS.COMPLETED:
      return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: React.createElement(CheckCircle2, { size: sz }), label: isReproduction ? t('statusReproductionCompleted') : t('statusCompleted') };
    case ORDER_STATUS.DELIVERED:
      return { color: '#8bc34a', bg: 'rgba(139,195,74,0.1)', border: 'rgba(139,195,74,0.3)', icon: React.createElement(CheckCircle2, { size: sz }), label: isReproduction ? t('statusReproductionDelivered') : t('statusDelivered') };
    case ORDER_STATUS.DEFECTIVE:
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: React.createElement(XCircle, { size: sz }), label: t('statusDefective') };
    case ORDER_STATUS.MISSING:
      return { color: '#ff5722', bg: 'rgba(255,87,34,0.1)', border: 'rgba(255,87,34,0.3)', icon: React.createElement(AlertTriangle, { size: sz }), label: t('statusMissing') };
    case ORDER_STATUS.TO_SHIP:
      return { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', icon: React.createElement(Send, { size: sz }), label: t('statusToShip') };
    case ORDER_STATUS.SHIPPED:
      return { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: React.createElement(Archive, { size: sz }), label: t('statusShipped') };
    case ORDER_STATUS.CANCELLED:
      return { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', icon: React.createElement(Ban, { size: sz }), label: t('statusCancelled') };
    default:
      return { color: 'var(--muted)', bg: 'transparent', border: 'var(--border)', icon: React.createElement(Package, { size: sz }), label: status };
  }
}

/**
 * Returns the left accent bar color + card background glow for a given status.
 * Used by seller-side order cards.
 */
export function getSellerCardAccent(status: string): { left: string; glow: string } {
  if (status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING || status === ORDER_STATUS.BROKEN)
    return { left: '#ef4444', glow: 'rgba(239,68,68,0.08)' };
  if (status === ORDER_STATUS.COMPLETED || status === ORDER_STATUS.DELIVERED)
    return { left: '#22c55e', glow: 'rgba(34,197,94,0.05)' };
  if (status === ORDER_STATUS.TO_SHIP)
    return { left: '#a855f7', glow: 'rgba(168,85,247,0.06)' };
  if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED)
    return { left: '#4b5563', glow: 'transparent' };
  return { left: 'var(--accent-seller)', glow: 'var(--accent-seller-glow)' };
}

/**
 * Returns the left accent bar color for a given status.
 * Used by mfr-side order cards.
 */
export function getMfrCardAccentColor(status: string): string {
  if (status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING || status === ORDER_STATUS.BROKEN) return '#ef4444';
  if (status === ORDER_STATUS.COMPLETED || status === ORDER_STATUS.DELIVERED) return '#22c55e';
  if (status === ORDER_STATUS.TO_SHIP) return '#a855f7';
  if (status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED) return '#4b5563';
  return 'var(--accent-mfr)';
}
