import React from 'react';
import { Product } from '../../services/api';
import { TranslationKey } from '../../services/translations';
import Lightbox from '../ui/Lightbox';
import {
  Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban,
  Info, MoreVertical, Edit2, Trash2, Send, Archive, Calendar,
  Factory, Tag, Ruler
} from 'lucide-react';

type ListFilter = 'awaiting' | 'broken' | 'production' | 'completed' | 'delivered' | 'defective' | 'to_ship' | 'shipped';

interface SellerOrderCardProps {
  product: Product;
  language: string;
  t: (key: TranslationKey) => string;
  listFilter: ListFilter;
  isUnseen: boolean;
  isDropdownOpen: boolean;
  onDropdownToggle: (id: string | null) => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => Promise<void>;
  onCancel: (productId: string) => Promise<void>;
  onVerify: (productId: string, action: 'correct' | 'defective' | 'missing') => void;
  onShip: (productId: string) => Promise<void>;
  onViewTimeline: (product: Product) => void;
  onMarkSeen: (productId: string, tab: ListFilter) => void;
  showToast: (msg: string) => void;
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
      return { color: 'var(--accent-seller)', bg: 'var(--accent-seller-glow)', border: 'rgba(245,166,35,0.3)', icon: <Clock size={11} />, label: t('statusInProduction') };
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

function getCardAccent(status: string): { left: string; glow: string } {
  if (status === 'defective' || status === 'missing' || status === 'broken') return { left: '#ef4444', glow: 'rgba(239,68,68,0.08)' };
  if (status === 'completed' || status === 'delivered') return { left: '#22c55e', glow: 'rgba(34,197,94,0.05)' };
  if (status === 'to_ship') return { left: '#a855f7', glow: 'rgba(168,85,247,0.06)' };
  if (status === 'shipped' || status === 'cancelled') return { left: '#4b5563', glow: 'transparent' };
  return { left: 'var(--accent-seller)', glow: 'var(--accent-seller-glow)' };
}

export default function SellerOrderCard({
  product: p, language, t, listFilter,
  isUnseen, isDropdownOpen,
  onDropdownToggle, onEdit, onDelete, onCancel, onVerify, onShip, onViewTimeline, onMarkSeen,
}: SellerOrderCardProps) {
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
  const status = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));
  const isEditable = status === 'awaiting' || status === 'corrected' || status === 'broken';
  const sc = getStatusConfig(status, t);
  const accent = getCardAccent(status);

  const hasActionBar = status === 'delivered' || status === 'to_ship' || status === 'shipped' || status === 'cancelled';

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: isDropdownOpen ? 'visible' : 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        position: 'relative',
        zIndex: isDropdownOpen ? 100 : 1,
        animation: 'slideUp 0.3s ease-out',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.35)`;
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
        background: accent.left, borderRadius: '14px 0 0 14px'
      }} />

      {/* Unseen glow dot */}
      {isUnseen && (
        <div
          style={{
            position: 'absolute', top: '14px', left: '14px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: sc.color, boxShadow: `0 0 8px ${sc.color}`,
            cursor: 'pointer', zIndex: 5, animation: 'pulse 2s infinite'
          }}
          title={language === 'tr' ? 'Yeni! Tıklayarak okundu olarak işaretle.' : 'New! Click to mark as read.'}
          onClick={(e) => { e.stopPropagation(); onMarkSeen(p.id, listFilter); }}
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
              letterSpacing: '2px', color: 'var(--accent-seller)',
              textShadow: '0 0 12px var(--accent-seller-glow)', lineHeight: 1
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
                <Tag size={10} style={{ color: 'var(--accent-seller)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--muted)'
              }}>
                <Ruler size={10} style={{ color: 'var(--accent-seller)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'in'}
              </span>
            )}
            {p.mfrName && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.3)',
                borderRadius: '6px', padding: '3px 9px', fontSize: '12px', color: 'var(--accent-mfr)'
              }}>
                <Factory size={10} />
                <strong>{t('mfrLabel')}:</strong> {p.mfrName}
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
              <Calendar size={11} style={{ color: 'var(--muted)', opacity: 0.7 }} />
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
                onClick={() => onViewTimeline(p)}
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

        {/* Right: three-dot menu */}
        <div
          style={{ position: 'relative', flexShrink: 0, alignSelf: 'flex-start' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDropdownToggle(isDropdownOpen ? null : p.id); }}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', display: 'flex', padding: '6px',
              borderRadius: '8px', transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <MoreVertical size={16} />
          </button>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute', top: '32px', right: '0',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
              display: 'flex', flexDirection: 'column', zIndex: 20,
              minWidth: '150px', padding: '4px 0', overflow: 'hidden'
            }}>
              {isEditable && (
                <DropdownItem icon={<Edit2 size={13} style={{ color: 'var(--accent-seller)' }} />} label={language === 'tr' ? 'Düzenle' : 'Edit'} color="var(--text)" onClick={() => { onEdit(p); onDropdownToggle(null); }} />
              )}
              <DropdownItem icon={<Info size={13} style={{ color: '#60a5fa' }} />} label={t('btnViewTimeline')} color="var(--text)" onClick={() => { onViewTimeline(p); onDropdownToggle(null); }} />
              {isEditable && (
                <>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                  <DropdownItem icon={<Ban size={13} style={{ color: 'var(--danger)' }} />} label={t('btnCancelOrder')} color="var(--danger)" onClick={() => { onCancel(p.id); onDropdownToggle(null); }} />
                  {status === 'awaiting' && (
                    <DropdownItem icon={<Trash2 size={13} style={{ color: 'var(--danger)' }} />} label={language === 'tr' ? 'Sil' : 'Delete'} color="var(--danger)" onClick={() => { onDelete(p); onDropdownToggle(null); }} />
                  )}
                </>
              )}
            </div>
          )}
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
          {status === 'delivered' && (
            <>
              <ActionBtn color="#22c55e" onClick={() => onVerify(p.id, 'correct')}>{t('btnVerifyCorrect')}</ActionBtn>
              <ActionBtn color="#ef4444" onClick={() => onVerify(p.id, 'defective')}>{t('btnVerifyDefective')}</ActionBtn>
              <ActionBtn color="#f97316" onClick={() => onVerify(p.id, 'missing')}>{t('btnVerifyMissing')}</ActionBtn>
            </>
          )}
          {status === 'to_ship' && (
            <ActionBtn color="#a855f7" icon={<Send size={12} />} onClick={() => onShip(p.id)} fullWidth>{t('btnMarkShipped')}</ActionBtn>
          )}
          {(status === 'shipped' || status === 'cancelled') && (
            <ActionBtn color="var(--muted)" bordered icon={<Info size={12} />} onClick={() => onViewTimeline(p)} fullWidth>{t('btnViewTimeline')}</ActionBtn>
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

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}
function DropdownItem({ icon, label, color, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        padding: '9px 14px', background: 'none', border: 'none',
        color, textAlign: 'left', cursor: 'pointer', fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: '9px', width: '100%',
        fontWeight: 500, transition: 'background 0.15s', fontFamily: 'inherit'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
    >
      {icon}
      {label}
    </button>
  );
}

interface ActionBtnProps {
  color: string;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  bordered?: boolean;
}
function ActionBtn({ color, onClick, children, icon, fullWidth, bordered }: ActionBtnProps) {
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
        color: bordered ? 'var(--text)' : (color === 'var(--muted)' ? '#111' : '#fff'),
        border: bordered ? `1px solid var(--border)` : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {icon}
      {children}
    </button>
  );
}
