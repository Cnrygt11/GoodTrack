import React, { useMemo } from 'react';
import {
  Package,
  CheckCircle2,
  Info,
  Calendar,
  Tag,
  Ruler,
  User,
  AlertTriangle,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { api, Product } from '../../services/apiClient';
import { MfrTab } from '../../hooks/useMfrOrders';
import { getStatusConfig, getMfrCardAccentColor } from '../../utils/statusConfig';
import Lightbox from '../ui/Lightbox';
import { useSettings } from '../../context/SettingsContext';
import { ORDER_STATUS } from '../../utils/constants';

const ACTION_BAR_STATUSES = [
  ORDER_STATUS.AWAITING as string,
  ORDER_STATUS.CORRECTED as string,
  ORDER_STATUS.PRODUCTION as string,
  ORDER_STATUS.COMPLETED as string,
  ORDER_STATUS.DEFECTIVE as string,
  ORDER_STATUS.MISSING as string,
  ORDER_STATUS.SHIPPED as string,
  ORDER_STATUS.CANCELLED as string,
  ORDER_STATUS.TO_SHIP as string,
];

interface MfrOrderCardProps {
  product: Product;
  activeTab: MfrTab;
  isUnseen: boolean;
  onUpdateStatus: (productId: string, status: string) => Promise<void>;
  onMarkAsSeen: (productId: string, tab: MfrTab) => void;
  onOpenDefectDetails: (product: Product) => void;
  onOpenTimeline: (product: Product) => void;
  onRespondCancel?: (productId: string, approve: boolean) => Promise<void>;
}

export default function MfrOrderCard({
  product: p,
  activeTab,
  isUnseen,
  onUpdateStatus,
  onMarkAsSeen,
  onOpenDefectDetails,
  onOpenTimeline,
  onRespondCancel,
}: MfrOrderCardProps) {
  const { t } = useSettings();
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const [fullImage, setFullImage] = React.useState<string | null>(p.image);

  // Liste yanıtı yalnız thumbnail taşır; kart onu gösterir, "büyüt"te tam görsel talep üzerine çekilir.
  const thumb = p.thumbnailImage ?? p.image;

  const openLightbox = () => {
    setIsLightboxOpen(true);
    if (!fullImage && p.id) {
      api
        .getProductById(p.id)
        .then((f) => setFullImage(f.image))
        .catch(() => {
          /* thumbnail yeterli */
        });
    }
  };

  const dateStr = useMemo(() => {
    if (!p.createdAt) return '—';
    return new Date(p.createdAt).toLocaleDateString(t('dateLocale'), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [p.createdAt, t]);

  const timeStr = useMemo(() => {
    if (!p.createdAt) return '';
    return new Date(p.createdAt).toLocaleTimeString(t('dateLocale'), {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [p.createdAt, t]);

  const status =
    p.status ||
    (p.isDefective
      ? ORDER_STATUS.DEFECTIVE
      : p.completed
        ? ORDER_STATUS.COMPLETED
        : p.isPendingApproval
          ? ORDER_STATUS.AWAITING
          : ORDER_STATUS.PRODUCTION);
  const sc = getStatusConfig(status, t, {
    iconSize: 11,
    role: 'mfr',
    isReproduction: p.isReproduction,
  });
  const accentColor = getMfrCardAccentColor(status);

  const hasActionBar = ACTION_BAR_STATUSES.includes(status);

  return (
    <div className="mfr-theme moc-card">
      {/* Colored left accent bar — color is dynamic, inline kept intentionally */}
      <div className="moc-accent-bar" style={{ background: accentColor }} />

      {/* Unseen dot — color is dynamic */}
      {isUnseen && (
        <div
          className="moc-unseen-dot"
          style={{ background: sc.color, boxShadow: `0 0 8px ${sc.color}` }}
          title={t('unseenDotTitle')}
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsSeen(p.id, activeTab);
          }}
        />
      )}

      {/* Main body */}
      <div className="moc-body">
        {/* Thumbnail */}
        <div
          className={`moc-thumb${thumb ? ' moc-thumb--clickable' : ''}`}
          onClick={thumb ? openLightbox : undefined}
          title={thumb ? t('clickToInspectDetails') : undefined}
        >
          {thumb ? <img src={thumb} alt="ürün" /> : <Package size={28} />}
        </div>

        {/* Info column */}
        <div className="moc-info">
          {/* Code + Status badge */}
          <div className="moc-title-row">
            <span className="moc-code">{p.code}</span>
            {p.etsyReceiptId && (
              <span
                className="order-etsy-badge"
                title={`${t('etsyOrderNoLabel')}: ${p.etsyReceiptId}`}
              >
                <ShoppingBag size={11} />
                {t('etsyOrderNoLabel')}: {p.etsyReceiptId}
              </span>
            )}
            {(p.quantity ?? 1) > 1 && (
              <span className="order-qty-badge" title={`${t('quantityLabel')}: ${p.quantity}`}>
                <Layers size={11} />
                {t('quantityLabel')}: {p.quantity}
              </span>
            )}
            {/* bg/border/color are dynamic — minimal inline kept */}
            <span
              className="moc-status-badge"
              style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
            >
              {sc.icon} {sc.label}
            </span>
            {p.cancelRequested && (
              <span className="moc-status-badge moc-status-badge--cancel">
                {t('cancelRequestPending')}
              </span>
            )}
          </div>

          {/* Chips */}
          <div className="moc-chips">
            {p.text && (
              <span className="order-chip">
                <Tag size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span className="order-chip">
                <Ruler size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong>{t('lengthLabel')}:</strong> {p.length} {t('inchSuffix')}
              </span>
            )}
            {p.sellerName && (
              <span className="moc-chip--seller">
                <User size={10} />
                <strong>{t('sellerLabel')}:</strong> {p.sellerName}
              </span>
            )}
            {Object.entries(p.extras || {}).map(([key, item]) => {
              if (!item.value) return null;
              return (
                <span key={key} className="order-chip">
                  <strong>{item.name}:</strong> {item.value}
                </span>
              );
            })}
          </div>

          {/* Dates + Timeline link */}
          <div className="moc-meta-row">
            <span className="moc-date-span">
              <Calendar size={11} style={{ opacity: 0.7 }} />
              {t('sentDateLabel')}:{' '}
              <strong>
                {dateStr} {timeStr}
              </strong>
            </span>
            {p.completedAt && (
              <span className="moc-completed-span">
                <CheckCircle2 size={11} />
                {t('completedDateLabel')}:{' '}
                <strong>
                  {new Date(p.completedAt).toLocaleDateString(t('dateLocale'), {
                    day: '2-digit',
                    month: 'short',
                  })}
                </strong>
              </span>
            )}
            {!(
              status === 'shipped' ||
              status === 'cancelled' ||
              status === ORDER_STATUS.TO_SHIP
            ) && (
              <button type="button" className="timeline-link" onClick={() => onOpenTimeline(p)}>
                <Info size={11} />
                {t('btnViewTimeline')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      {hasActionBar && (
        <div className="order-action-bar">
          {p.cancelRequested ? (
            <div className="moc-cancel-actions">
              <div className="moc-cancel-warning">
                <AlertTriangle size={14} />
                {t('sellerRequestedCancellation')}
              </div>
              <div className="moc-cancel-buttons">
                <MfrBtn color="#22c55e" onClick={() => onRespondCancel?.(p.id, true)}>
                  {t('cancelReqApprove')}
                </MfrBtn>
                <MfrBtn color="#ef4444" onClick={() => onRespondCancel?.(p.id, false)}>
                  {t('cancelReqReject')}
                </MfrBtn>
              </div>
            </div>
          ) : (
            <>
              {(status === ORDER_STATUS.AWAITING || status === ORDER_STATUS.CORRECTED) && (
                <>
                  <MfrBtn
                    color="var(--accent-mfr)"
                    dark
                    onClick={() => onUpdateStatus(p.id, ORDER_STATUS.PRODUCTION)}
                  >
                    {t('btnApproveProduction')}
                  </MfrBtn>
                  <MfrBtn color="#ef4444" onClick={() => onUpdateStatus(p.id, ORDER_STATUS.BROKEN)}>
                    {t('btnMarkBroken')}
                  </MfrBtn>
                </>
              )}
              {status === ORDER_STATUS.PRODUCTION && (
                <MfrBtn
                  color="#22c55e"
                  onClick={() => onUpdateStatus(p.id, ORDER_STATUS.COMPLETED)}
                  fullWidth
                >
                  {t('btnFinishProduction')}
                </MfrBtn>
              )}
              {status === ORDER_STATUS.COMPLETED && (
                <MfrBtn
                  color="#00bcd4"
                  onClick={() => onUpdateStatus(p.id, ORDER_STATUS.DELIVERED)}
                  fullWidth
                >
                  {t('btnDeliver')}
                </MfrBtn>
              )}
              {(status === ORDER_STATUS.DEFECTIVE || status === ORDER_STATUS.MISSING) && (
                <>
                  <MfrBtn color="var(--surface2)" bordered onClick={() => onOpenDefectDetails(p)}>
                    {t('btnDetails')}
                  </MfrBtn>
                  <MfrBtn
                    color="var(--accent-mfr)"
                    dark
                    onClick={() => onUpdateStatus(p.id, ORDER_STATUS.PRODUCTION)}
                  >
                    {t('btnReproduce')}
                  </MfrBtn>
                  <MfrBtn
                    color="#22c55e"
                    onClick={() => onUpdateStatus(p.id, ORDER_STATUS.DELIVERED)}
                  >
                    {t('btnDeliverFixed')}
                  </MfrBtn>
                </>
              )}
              {(status === ORDER_STATUS.SHIPPED ||
                status === ORDER_STATUS.CANCELLED ||
                status === ORDER_STATUS.TO_SHIP) && (
                <MfrBtn
                  color="var(--muted)"
                  bordered
                  icon={<Info size={12} />}
                  onClick={() => onOpenTimeline(p)}
                  fullWidth
                >
                  {t('btnViewTimeline')}
                </MfrBtn>
              )}
            </>
          )}
        </div>
      )}

      {thumb && (
        <Lightbox
          isOpen={isLightboxOpen}
          src={fullImage ?? thumb}
          onClose={() => setIsLightboxOpen(false)}
          altText={p.code}
        />
      )}
    </div>
  );
}

// --- Helper button component ---

interface MfrBtnProps {
  color: string;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  bordered?: boolean;
  dark?: boolean;
}

function MfrBtn({ color, onClick, children, icon, fullWidth, bordered, dark }: MfrBtnProps) {
  const classes = [
    'mfr-btn',
    fullWidth ? 'mfr-btn--full' : '',
    bordered ? 'mfr-btn--bordered' : '',
    !bordered && dark ? 'mfr-btn--dark' : '',
    !bordered && !dark ? 'mfr-btn--light' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      /* background color is dynamic per status — kept as minimal inline */
      style={!bordered ? { background: color } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}
