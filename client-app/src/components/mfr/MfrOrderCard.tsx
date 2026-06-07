import React from 'react';
import { Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban, Info } from 'lucide-react';
import { Product } from '../../services/api';
import { Language, TranslationKey } from '../../services/translations';
import { MfrTab } from '../../hooks/useMfrOrders';

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

export default function MfrOrderCard({
  product: p,
  activeTab,
  isUnseen,
  language,
  t,
  onUpdateStatus,
  onMarkAsSeen,
  onOpenDefectDetails,
  onOpenTimeline
}: MfrOrderCardProps) {
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

  return (
    <div
      className={`product-card ${status === 'defective' || status === 'missing' || status === 'broken' ? 'defective' : (status === 'shipped' || status === 'cancelled') ? 'archived' : status === 'completed' || status === 'delivered' || status === 'to_ship' ? 'completed' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}
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
            title={language === 'tr' ? 'Yeni Sipariş/Durum! Okundu olarak işaretlemek için tıklayın.' : 'New Order/Status! Click to mark as read.'}
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsSeen(p.id, activeTab);
            }}
            onMouseEnter={() => {
              setTimeout(() => onMarkAsSeen(p.id, activeTab), 1500);
            }}
          />
        )}

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
        <div className="product-info" style={{ flex: 1, paddingRight: '12px' }}>
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
            {p.sellerName && (
              <div className="product-field-chip" style={{ border: '1px solid var(--accent-seller)', color: 'var(--accent-seller)' }}>
                <strong>{t('sellerLabel')}:</strong> {p.sellerName}
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

        {/* Status Badge & Dates */}
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
      {(status === 'awaiting' || status === 'corrected') && (
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'production')}
            className="action-btn"
            style={{ backgroundColor: 'var(--accent-mfr)', color: '#111', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnApproveProduction')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'broken')}
            className="action-btn"
            style={{ backgroundColor: 'var(--danger)', color: '#fff', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnMarkBroken')}
          </button>
        </div>
      )}

      {status === 'production' && (
        <div style={{
          display: 'flex', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'completed')}
            className="action-btn"
            style={{ backgroundColor: 'var(--success)', color: '#fff', fontSize: '11px', padding: '6px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
          >
            {t('btnFinishProduction')}
          </button>
        </div>
      )}

      {status === 'completed' && (
        <div style={{
          display: 'flex', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'delivered')}
            className="action-btn"
            style={{ backgroundColor: '#00bcd4', color: '#fff', fontSize: '11px', padding: '6px 14px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, width: '100%' }}
          >
            {t('btnDeliver')}
          </button>
        </div>
      )}

      {(status === 'defective' || status === 'missing') && (
        <div style={{
          display: 'flex', gap: '8px', padding: '12px 16px',
          borderTop: '1px solid var(--border)', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.1)', flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => onOpenDefectDetails(p)}
            className="action-btn"
            style={{ backgroundColor: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}
          >
            {t('btnDetails')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'production')}
            className="action-btn"
            style={{ backgroundColor: 'var(--accent-mfr)', color: '#111', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnReproduce')}
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(p.id, 'delivered')}
            className="action-btn"
            style={{ backgroundColor: 'var(--success)', color: '#fff', fontSize: '11px', padding: '6px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('btnDeliverFixed')}
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
            onClick={() => onOpenTimeline(p)}
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
