import React from 'react';
import { Product } from '../../services/api';
import { TranslationKey } from '../../services/translations';
import { Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban, Info, MoreVertical, Edit2, Trash2 } from 'lucide-react';

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

export default function SellerOrderCard({
  product: p, language, t, listFilter,
  isUnseen, isDropdownOpen,
  onDropdownToggle, onEdit, onDelete, onCancel, onVerify, onShip, onViewTimeline, onMarkSeen,
  showToast
}: SellerOrderCardProps) {
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';
  const status = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));

  // Render Status Badge
  const renderStatusBadge = () => {
    switch (status) {
      case 'awaiting':
        return (
          <span style={{ color: '#ff9800', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {t('statusPendingApproval')}
          </span>
        );
      case 'corrected':
        return (
          <span style={{ color: '#00bcd4', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {t('statusCorrected')}
          </span>
        );
      case 'broken':
        return (
          <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} />
            {t('statusBroken')}
          </span>
        );
      case 'production':
        return (
          <span style={{ color: 'var(--accent-seller)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            {t('statusInProduction')}
          </span>
        );
      case 'completed':
        return (
          <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            {t('statusCompleted')}
          </span>
        );
      case 'delivered':
        return (
          <span style={{ color: '#8bc34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            {t('statusDelivered')}
          </span>
        );
      case 'defective':
        return (
          <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} />
            {t('statusDefective')}
          </span>
        );
      case 'missing':
        return (
          <span style={{ color: '#ff5722', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} />
            {t('statusMissing')}
          </span>
        );
      case 'to_ship':
        return (
          <span style={{ color: '#9c27b0', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle2 size={12} />
            {t('statusToShip')}
          </span>
        );
      case 'shipped':
        return (
          <span style={{ color: 'var(--muted)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Package size={12} />
            {t('statusShipped')}
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ color: '#757575', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'line-through' }}>
            <Ban size={12} />
            {t('statusCancelled')}
          </span>
        );
      default:
        return null;
    }
  };

  // Determine if dropdown editing is allowed (before production)
  const isEditable = status === 'awaiting' || status === 'corrected' || status === 'broken';

  return (
    <div
      className={`product-card ${status === 'defective' || status === 'missing' || status === 'broken' ? 'defective' : (status === 'shipped' || status === 'cancelled') ? 'archived' : status === 'completed' || status === 'delivered' || status === 'to_ship' ? 'completed' : ''}`}
      style={{ zIndex: isDropdownOpen ? 50 : 1, display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      {/* Card Content Top */}
      <div style={{ display: 'flex', flex: 1, padding: '16px', position: 'relative' }}>
        {/* Unseen notification dot */}
        {isUnseen && (
          <div
            className="new-completed-dot"
            style={
              status === 'defective' || status === 'missing' || status === 'broken'
                ? { backgroundColor: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' }
                : status === 'completed' || status === 'delivered' || status === 'to_ship'
                ? { backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' }
                : { backgroundColor: 'var(--accent-mfr)', boxShadow: '0 0 8px var(--accent-mfr)' }
            }
            title={language === 'tr' ? 'Yeni Durum! Okundu olarak işaretlemek için tıklayın.' : 'New Status! Click to mark as read.'}
            onClick={(e) => { e.stopPropagation(); onMarkSeen(p.id, listFilter); }}
            onMouseEnter={() => { setTimeout(() => onMarkSeen(p.id, listFilter), 1500); }}
          />
        )}

        {/* Three-dot dropdown menu */}
        <div
          style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDropdownToggle(isDropdownOpen ? null : p.id); }}
            style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              cursor: 'pointer', display: 'flex', padding: '4px',
              borderRadius: '50%', transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <MoreVertical size={18} />
          </button>

          {isDropdownOpen && (
            <div style={{
              position: 'absolute', top: '28px', right: '0',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', zIndex: 20,
              minWidth: '130px', padding: '4px 0', overflow: 'hidden'
            }}>
              {isEditable && (
                <DropdownItem
                  icon={<Edit2 size={13} style={{ color: 'var(--accent-seller)' }} />}
                  label={language === 'tr' ? 'Düzenle' : 'Edit'}
                  color="var(--text)"
                  onClick={() => { onEdit(p); onDropdownToggle(null); }}
                />
              )}
              <DropdownItem
                icon={<Info size={13} style={{ color: 'var(--accent-mfr)' }} />}
                label={t('btnViewTimeline')}
                color="var(--text)"
                onClick={() => { onViewTimeline(p); onDropdownToggle(null); }}
              />
              {isEditable && (
                <>
                  <DropdownItem
                    icon={<Ban size={13} style={{ color: 'var(--danger)' }} />}
                    label={t('btnCancelOrder')}
                    color="var(--danger)"
                    onClick={() => { onCancel(p.id); onDropdownToggle(null); }}
                  />
                  <DropdownItem
                    icon={<Trash2 size={13} style={{ color: 'var(--danger)' }} />}
                    label={language === 'tr' ? 'Sil' : 'Delete'}
                    color="var(--danger)"
                    onClick={() => { onDelete(p); onDropdownToggle(null); }}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Product Thumbnail */}
        {p.image ? (
          <div className="product-thumb">
            <img src={p.image} alt="ürün" />
          </div>
        ) : (
          <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={24} style={{ color: 'var(--muted)' }} />
          </div>
        )}

        {/* Product Info */}
        <div className="product-info" style={{ flex: 1, paddingRight: '24px' }}>
          <div className="product-code">{p.code}</div>
          <div className="product-fields">
            {p.text && (
              <div className="product-field-chip">
                <strong>{t('textLabel')}:</strong> {p.text}
              </div>
            )}
            {p.length && (
              <div className="product-field-chip">
                <strong>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'inches'}
              </div>
            )}
            {p.mfrName && (
              <div className="product-field-chip" style={{ border: '1px solid var(--accent-mfr)', color: 'var(--accent-mfr)' }}>
                <strong>{t('mfrLabel')}:</strong> {p.mfrName}
              </div>
            )}
            {Object.entries(p.extras || {}).map(([key, item]) => {
              if (!item.value) return null;
              return (
                <div key={key} className="product-field-chip">
                  <strong>{item.name}:</strong> {item.value}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Badge & Sent Date */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center',
          fontSize: '11px', color: 'var(--muted)', width: '150px', lineHeight: 1.5
        }}>
          {renderStatusBadge()}
          <span style={{ marginTop: '6px' }}><strong>{t('sentDateLabel')}:</strong> {dateStr}</span>
          {p.completedAt && (
            <span style={{ marginTop: '2px', color: 'var(--success)' }}>
              <strong>{t('completedDateLabel')}:</strong> {new Date(p.completedAt).toLocaleString('tr-TR')}
            </span>
          )}
        </div>
      </div>

      {/* Button Action Bar */}
      {status === 'delivered' && (
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onVerify(p.id, 'correct')}
            className="action-btn"
            style={{ backgroundColor: 'var(--success)', color: '#fff', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnVerifyCorrect')}
          </button>
          <button
            type="button"
            onClick={() => onVerify(p.id, 'defective')}
            className="action-btn"
            style={{ backgroundColor: 'var(--danger)', color: '#fff', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnVerifyDefective')}
          </button>
          <button
            type="button"
            onClick={() => onVerify(p.id, 'missing')}
            className="action-btn"
            style={{ backgroundColor: '#ff5722', color: '#fff', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnVerifyMissing')}
          </button>
        </div>
      )}

      {status === 'to_ship' && (
        <div style={{
          display: 'flex', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onShip(p.id)}
            className="action-btn"
            style={{ backgroundColor: '#9c27b0', color: '#fff', fontSize: '11px', padding: '6px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
          >
            {t('btnMarkShipped')}
          </button>
        </div>
      )}

      {(status === 'shipped' || status === 'cancelled') && (
        <div style={{
          display: 'flex', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onViewTimeline(p)}
            className="action-btn"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)', fontSize: '11px', padding: '6px 14px', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Info size={13} />
            {t('btnViewTimeline')}
          </button>
        </div>
      )}
    </div>
  );
}

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
        padding: '8px 14px', background: 'none', border: 'none',
        color, textAlign: 'left', cursor: 'pointer', fontSize: '13px',
        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
        fontWeight: 500, transition: 'background 0.2s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface2)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
    >
      {icon}
      {label}
    </button>
  );
}
