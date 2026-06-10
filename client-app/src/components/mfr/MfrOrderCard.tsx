import React from 'react';
import { Package, CheckCircle2, Info, Calendar, Tag, Ruler, User } from 'lucide-react';
import { Product } from '../../services/api';
import { MfrTab } from '../../hooks/useMfrOrders';
import { getStatusConfig, getMfrCardAccentColor } from '../../utils/statusConfig';
import Lightbox from '../ui/Lightbox';
import { useSettings } from '../../context/SettingsContext';

interface MfrOrderCardProps {
  product: Product;
  activeTab: MfrTab;
  isUnseen: boolean;
  onUpdateStatus: (productId: string, status: string) => Promise<void>;
  onMarkAsSeen: (productId: string, tab: MfrTab) => void;
  onOpenDefectDetails: (product: Product) => void;
  onOpenTimeline: (product: Product) => void;
}

export default function MfrOrderCard({
  product: p,
  activeTab,
  isUnseen,
  onUpdateStatus,
  onMarkAsSeen,
  onOpenDefectDetails,
  onOpenTimeline,
}: MfrOrderCardProps) {
  const { language, t } = useSettings();
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  const dateStr = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const timeStr = p.createdAt
    ? new Date(p.createdAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const status = p.status || (p.isDefective ? 'defective' : p.completed ? 'completed' : p.isPendingApproval ? 'awaiting' : 'production');
  const sc = getStatusConfig(status, t, { iconSize: 11, role: 'mfr' });
  const accentColor = getMfrCardAccentColor(status);

  const hasActionBar = ['awaiting', 'corrected', 'production', 'completed', 'defective', 'missing', 'shipped', 'cancelled'].includes(status);

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
          onClick={(e) => { e.stopPropagation(); onMarkAsSeen(p.id, activeTab); }}
        />
      )}

      {/* Main body */}
      <div className="moc-body">

        {/* Thumbnail */}
        <div
          className={`moc-thumb${p.image ? ' moc-thumb--clickable' : ''}`}
          onClick={p.image ? () => setIsLightboxOpen(true) : undefined}
          title={p.image ? t('clickToInspectDetails') : undefined}
        >
          {p.image
            ? <img src={p.image} alt="ürün" />
            : <Package size={28} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          }
        </div>

        {/* Info column */}
        <div className="moc-info">

          {/* Code + Status badge */}
          <div className="moc-title-row">
            <span className="moc-code">{p.code}</span>
            {/* bg/border/color are dynamic — minimal inline kept */}
            <span
              className="moc-status-badge"
              style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
            >
              {sc.icon} {sc.label}
            </span>
          </div>

          {/* Chips */}
          <div className="moc-chips">
            {p.text && (
              <span className="order-chip">
                <Tag size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span className="order-chip">
                <Ruler size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('lengthLabel')}:</strong> {p.length} {t('inchSuffix')}
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
                  <strong style={{ color: 'var(--text)' }}>{item.name}:</strong> {item.value}
                </span>
              );
            })}
          </div>

          {/* Dates + Timeline link */}
          <div className="moc-meta-row">
            <span className="moc-date-span">
              <Calendar size={11} style={{ opacity: 0.7 }} />
              {t('sentDateLabel')}: <strong style={{ color: 'var(--text)' }}>{dateStr} {timeStr}</strong>
            </span>
            {p.completedAt && (
              <span className="moc-completed-span">
                <CheckCircle2 size={11} />
                {t('completedDateLabel')}: <strong>{new Date(p.completedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}</strong>
              </span>
            )}
            {!(status === 'shipped' || status === 'cancelled') && (
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
          {(status === 'awaiting' || status === 'corrected') && (
            <>
              <MfrBtn color="var(--accent-mfr)" dark onClick={() => onUpdateStatus(p.id, 'production')}>{t('btnApproveProduction')}</MfrBtn>
              <MfrBtn color="#ef4444" onClick={() => onUpdateStatus(p.id, 'broken')}>{t('btnMarkBroken')}</MfrBtn>
            </>
          )}
          {status === 'production' && (
            <MfrBtn color="#22c55e" onClick={() => onUpdateStatus(p.id, 'completed')} fullWidth>{t('btnFinishProduction')}</MfrBtn>
          )}
          {status === 'completed' && (
            <MfrBtn color="#00bcd4" onClick={() => onUpdateStatus(p.id, 'delivered')} fullWidth>{t('btnDeliver')}</MfrBtn>
          )}
          {(status === 'defective' || status === 'missing') && (
            <>
              <MfrBtn color="var(--surface2)" bordered onClick={() => onOpenDefectDetails(p)}>{t('btnDetails')}</MfrBtn>
              <MfrBtn color="var(--accent-mfr)" dark onClick={() => onUpdateStatus(p.id, 'production')}>{t('btnReproduce')}</MfrBtn>
              <MfrBtn color="#22c55e" onClick={() => onUpdateStatus(p.id, 'delivered')}>{t('btnDeliverFixed')}</MfrBtn>
            </>
          )}
          {(status === 'shipped' || status === 'cancelled') && (
            <MfrBtn color="var(--muted)" bordered icon={<Info size={12} />} onClick={() => onOpenTimeline(p)} fullWidth>{t('btnViewTimeline')}</MfrBtn>
          )}
        </div>
      )}

      {p.image && (
        <Lightbox isOpen={isLightboxOpen} src={p.image} onClose={() => setIsLightboxOpen(false)} altText={p.code} />
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
  ].filter(Boolean).join(' ');

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
