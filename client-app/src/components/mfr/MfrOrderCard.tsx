import React from 'react';
import { Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban, Info, Send, Archive, Calendar, Tag, Ruler, User } from 'lucide-react';
import { Product } from '../../services/api';
import { Language, TranslationKey } from '../../services/translations';
import { MfrTab } from '../../hooks/useMfrOrders';
import Lightbox from '../ui/Lightbox';

interface MfrOrderCardProps {
  product: Product;
  activeTab: MfrTab;
  isUnseen: boolean;
  language: Language;
  t: (key: TranslationKey) => string;
  onUpdateStatus: (productId: string, status: string) => Promise<void>;
  onMarkAsSeen: (productId: string, tab: MfrTab) => void;
  onOpenDefectDetails: (product: Product) => void;
  onOpenTimeline: (product: Product) => void;
}

type StatusConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

function getStatusConfig(status: string, t: (key: TranslationKey) => string): StatusConfig {
  switch (status) {
    case 'awaiting':
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: <Clock size={11} />, label: t('statusPendingApproval') };
    case 'corrected':
      return { color: '#00bcd4', bg: 'rgba(0,188,212,0.1)', border: 'rgba(0,188,212,0.3)', icon: <Clock size={11} />, label: t('statusCorrected') };
    case 'broken':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: <AlertTriangle size={11} />, label: t('statusBroken') };
    case 'production':
      return { color: 'var(--accent-mfr)', bg: 'var(--accent-mfr-glow)', border: 'rgba(6,182,212,0.3)', icon: <Clock size={11} />, label: t('statusInProduction') };
    case 'completed':
      return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: <CheckCircle2 size={11} />, label: t('statusCompleted') };
    case 'delivered':
      return { color: '#8bc34a', bg: 'rgba(139,195,74,0.1)', border: 'rgba(139,195,74,0.3)', icon: <CheckCircle2 size={11} />, label: t('statusDelivered') };
    case 'defective':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: <XCircle size={11} />, label: t('statusDefective') };
    case 'missing':
      return { color: '#ff5722', bg: 'rgba(255,87,34,0.1)', border: 'rgba(255,87,34,0.3)', icon: <AlertTriangle size={11} />, label: t('statusMissing') };
    case 'to_ship':
      return { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', icon: <Send size={11} />, label: t('statusToShip') };
    case 'shipped':
      return { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: <Archive size={11} />, label: t('statusShipped') };
    case 'cancelled':
      return { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', icon: <Ban size={11} />, label: t('statusCancelled') };
    default:
      return { color: 'var(--muted)', bg: 'transparent', border: 'var(--border)', icon: <Package size={11} />, label: status };
  }
}

function getCardAccentColor(status: string): string {
  if (status === 'defective' || status === 'missing' || status === 'broken') return '#ef4444';
  if (status === 'completed' || status === 'delivered') return '#22c55e';
  if (status === 'to_ship') return '#a855f7';
  if (status === 'shipped' || status === 'cancelled') return '#4b5563';
  return 'var(--accent-mfr)';
}

export default function MfrOrderCard({
  product: p,
  activeTab,
  isUnseen,
  language,
  t,
  onUpdateStatus,
  onMarkAsSeen,
  onOpenDefectDetails,
  onOpenTimeline,
}: MfrOrderCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
  const status = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));
  const sc = getStatusConfig(status, t);
  const accentColor = getCardAccentColor(status);

  const hasActionBar = ['awaiting', 'corrected', 'production', 'completed', 'defective', 'missing', 'shipped', 'cancelled'].includes(status);

  return (
    <div
      className="mfr-theme"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        animation: 'slideUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
        e.currentTarget.style.borderColor = sc.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* Colored left accent bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px',
        background: accentColor, borderRadius: '14px 0 0 14px'
      }} />

      {/* Unseen indicator dot */}
      {isUnseen && (
        <div
          style={{
            position: 'absolute', top: '14px', left: '14px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: sc.color, boxShadow: `0 0 8px ${sc.color}`,
            cursor: 'pointer', zIndex: 5, animation: 'pulse 2s infinite'
          }}
          title={language === 'tr' ? 'Yeni! Tıklayarak okundu olarak işaretle.' : 'New! Click to mark as read.'}
          onClick={(e) => { e.stopPropagation(); onMarkAsSeen(p.id, activeTab); }}
        />
      )}

      {/* Main content */}
      <div style={{ display: 'flex', gap: '16px', padding: '16px 16px 16px 20px', flex: 1 }}>

        {/* Thumbnail */}
        <div 
          onClick={p.image ? () => setIsLightboxOpen(true) : undefined}
          style={{
            width: '80px', height: '80px', borderRadius: '10px', flexShrink: 0,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: p.image ? 'pointer' : 'default',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { if (p.image) e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          title={p.image ? (language === 'tr' ? 'Detaylı görmek için tıklayın' : 'Click to inspect details') : undefined}
        >
          {p.image
            ? <img src={p.image} alt="ürün" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Package size={28} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          }
        </div>

        {/* Info block */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Code + Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '22px',
              letterSpacing: '2px', color: 'var(--accent-mfr)',
              textShadow: '0 0 12px var(--accent-mfr-glow)', lineHeight: 1
            }}>
              {p.code}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: sc.bg, border: `1px solid ${sc.border}`,
              color: sc.color, borderRadius: '20px',
              padding: '3px 10px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.3px', whiteSpace: 'nowrap'
            }}>
              {sc.icon} {sc.label}
            </span>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {p.text && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--muted)'
              }}>
                <Tag size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--muted)'
              }}>
                <Ruler size={10} style={{ color: 'var(--accent-mfr)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'in'}
              </span>
            )}
            {p.sellerName && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)',
                borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--accent-seller)'
              }}>
                <User size={10} />
                <strong>{t('sellerLabel')}:</strong> {p.sellerName}
              </span>
            )}
            {Object.entries(p.extras || {}).map(([key, item]) => {
              if (!item.value) return null;
              return (
                <span key={key} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--muted)'
                }}>
                  <strong style={{ color: 'var(--text)' }}>{item.name}:</strong> {item.value}
                </span>
              );
            })}
          </div>

          {/* Dates + Timeline link */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginTop: '2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: 'var(--muted)' }}>
              <Calendar size={11} style={{ opacity: 0.7 }} />
              {t('sentDateLabel')}: <strong style={{ color: 'var(--text)' }}>{dateStr} {timeStr}</strong>
            </span>
            {p.completedAt && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11.5px', color: '#22c55e' }}>
                <CheckCircle2 size={11} />
                {t('completedDateLabel')}: <strong>{new Date(p.completedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</strong>
              </span>
            )}
            {!(status === 'shipped' || status === 'cancelled') && (
              <button
                type="button"
                onClick={() => onOpenTimeline(p)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  background: 'none', border: 'none', padding: '0',
                  color: '#60a5fa', fontSize: '11.5px', cursor: 'pointer',
                  fontFamily: 'inherit', fontWeight: 500,
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                  textUnderlineOffset: '3px'
                }}
              >
                <Info size={11} />
                {t('btnViewTimeline')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {hasActionBar && (
        <div style={{
          display: 'flex', gap: '8px', padding: '10px 16px 10px 20px',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.12)',
          justifyContent: 'flex-end',
          flexWrap: 'wrap'
        }}>
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
        <Lightbox
          isOpen={isLightboxOpen}
          src={p.image}
          onClose={() => setIsLightboxOpen(false)}
          altText={p.code}
        />
      )}
    </div>
  );
}

// --- Helper components ---

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
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        padding: '7px 14px', borderRadius: '7px', cursor: 'pointer',
        fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
        letterSpacing: '0.3px', transition: 'opacity 0.15s, transform 0.15s',
        width: fullWidth ? '100%' : undefined,
        background: bordered ? 'transparent' : color,
        color: bordered ? 'var(--text)' : dark ? '#09090b' : '#fff',
        border: bordered ? '1px solid var(--border)' : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {icon}
      {children}
    </button>
  );
}
