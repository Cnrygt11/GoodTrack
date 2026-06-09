import React from 'react';
import { Product } from '../../services/api';
import { ListFilter } from '../../types/orders';
import { getStatusConfig, getSellerCardAccent } from '../../utils/statusConfig';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import Lightbox from '../ui/Lightbox';
import {
  Package, Info, MoreVertical, Edit2, Trash2, Send, Archive, Calendar,
  Factory, Tag, Ruler, CheckCircle2, Ban,
} from 'lucide-react';

interface SellerOrderCardProps {
  product: Product;
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
}

export default function SellerOrderCard({
  product: p, listFilter,
  isUnseen, isDropdownOpen,
  onDropdownToggle, onEdit, onDelete, onCancel, onVerify, onShip, onViewTimeline, onMarkSeen,
}: SellerOrderCardProps) {
  // Read language, t and showToast from context — no prop drilling needed
  const { language, t } = useSettings();
  const { showToast } = useToast();

  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  const dateStr = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const timeStr = p.createdAt
    ? new Date(p.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    : '';

  const status =
    p.status ||
    (p.isDefective ? 'defective' : p.completed ? 'completed' : p.isPendingApproval ? 'awaiting' : 'production');
  const isEditable = status === 'awaiting' || status === 'corrected' || status === 'broken';
  const sc = getStatusConfig(status, t, { iconSize: 11, role: 'seller' });
  const accent = getSellerCardAccent(status);

  const hasActionBar =
    status === 'delivered' || status === 'to_ship' || status === 'shipped' || status === 'cancelled';

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
        background: accent.left, borderRadius: '14px 0 0 14px',
      }} />

      {/* Unseen glow dot */}
      {isUnseen && (
        <div
          style={{
            position: 'absolute', top: '14px', left: '14px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: sc.color, boxShadow: `0 0 8px ${sc.color}`,
            cursor: 'pointer', zIndex: 5, animation: 'pulse 2s infinite',
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
              textShadow: '0 0 12px var(--accent-seller-glow)', lineHeight: 1,
            }}>
              {p.code}
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              background: sc.bg, border: `1px solid ${sc.border}`,
              color: sc.color, borderRadius: '20px',
              padding: '3px 10px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.3px', whiteSpace: 'nowrap',
            }}>
              {sc.icon} {sc.label}
            </span>
          </div>

          {/* Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {p.text && (
              <span className="order-chip">
                <Tag size={10} style={{ color: 'var(--accent-seller)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span className="order-chip">
                <Ruler size={10} style={{ color: 'var(--accent-seller)' }} />
                <strong style={{ color: 'var(--text)' }}>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'in'}
              </span>
            )}
            {p.mfrName && (
              <span className="order-chip order-chip--mfr">
                <Factory size={10} />
                <strong>{t('mfrLabel')}:</strong> {p.mfrName}
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
                className="timeline-link"
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
            className="icon-btn"
          >
            <MoreVertical size={16} />
          </button>

          {isDropdownOpen && (
            <div className="dropdown-menu">
              {isEditable && (
                <DropdownItem icon={<Edit2 size={13} style={{ color: 'var(--accent-seller)' }} />} label={language === 'tr' ? 'Düzenle' : 'Edit'} color="var(--text)" onClick={() => { onEdit(p); onDropdownToggle(null); }} />
              )}
              <DropdownItem icon={<Info size={13} style={{ color: '#60a5fa' }} />} label={t('btnViewTimeline')} color="var(--text)" onClick={() => { onViewTimeline(p); onDropdownToggle(null); }} />
              {isEditable && (
                <>
                  <div className="dropdown-divider" />
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
        <div className="order-action-bar">
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
        fontWeight: 500, transition: 'background 0.15s', fontFamily: 'inherit',
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
