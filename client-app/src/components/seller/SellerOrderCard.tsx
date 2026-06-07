import React from 'react';
import { Product } from '../../services/api';
import { TranslationKey } from '../../services/translations';
import { Package, Clock, CheckCircle2, X, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { api } from '../../services/api';

type ListFilter = 'pending' | 'completed' | 'defective' | 'approval';

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
  onDefect: (product: Product) => void;
  onMarkSeen: (productId: string, tab: ListFilter) => void;
  showToast: (msg: string) => void;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export default function SellerOrderCard({
  product: p, language, t, listFilter,
  isUnseen, isDropdownOpen,
  onDropdownToggle, onEdit, onDelete, onDefect, onMarkSeen,
  showToast, setProducts
}: SellerOrderCardProps) {
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';

  return (
    <div
      className={`product-card ${p.isDefective ? 'defective' : p.completed ? 'completed' : ''}`}
      style={{ zIndex: isDropdownOpen ? 50 : 1 }}
    >
      {/* Unseen notification dot */}
      {isUnseen && (
        <div
          className="new-completed-dot"
          style={listFilter === 'defective' ? { backgroundColor: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' } : listFilter === 'approval' ? { backgroundColor: 'var(--accent-mfr)', boxShadow: '0 0 8px var(--accent-mfr)' } : {}}
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
            minWidth: '120px', padding: '4px 0', overflow: 'hidden'
          }}>
            <DropdownItem
              icon={<Edit2 size={13} style={{ color: 'var(--accent-seller)' }} />}
              label={language === 'tr' ? 'Düzenle' : 'Edit'}
              color="var(--text)"
              onClick={() => { onEdit(p); onDropdownToggle(null); }}
            />
            {p.completed && !p.isDefective && (
              <DropdownItem
                icon={<X size={13} style={{ color: 'var(--danger)' }} />}
                label={t('markDefective')}
                color="var(--danger)"
                onClick={() => { onDropdownToggle(null); onDefect(p); }}
              />
            )}
            <DropdownItem
              icon={<Trash2 size={13} style={{ color: 'var(--danger)' }} />}
              label={language === 'tr' ? 'Sil' : 'Delete'}
              color="var(--danger)"
              onClick={() => { onDelete(p); onDropdownToggle(null); }}
            />
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
      <div className="product-info">
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

      {/* Status & Dates */}
      <div className="product-status-dates" style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', padding: '4px 0', lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginRight: '24px' }}>
        {p.isPendingApproval ? (
          <span style={{ color: 'var(--accent-mfr)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Clock size={12} />
            {t('statusPendingApproval')}
          </span>
        ) : p.isDefective ? (
          <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <X size={12} />
            {language === 'tr' ? 'Hatalı Sipariş' : 'Defective Order'}
          </span>
        ) : p.completed ? (
          <span style={{ color: 'var(--success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <CheckCircle2 size={12} />
            {t('statusCompleted')}
          </span>
        ) : (
          <span style={{ color: 'var(--accent-seller)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Clock size={12} />
            {t('statusInProduction')}
          </span>
        )}

        {p.completed ? (
          <>
            <span><strong>{t('sentDateLabel')}:</strong> {p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—'}</span>
            <span style={{ marginTop: '2px', color: 'var(--success)' }}><strong>{t('completedDateLabel')}:</strong> {p.completedAt ? new Date(p.completedAt).toLocaleString('tr-TR') : '—'}</span>
          </>
        ) : (
          <span><strong>{t('sentDateLabel')}:</strong> {dateStr}</span>
        )}
      </div>
    </div>
  );
}

// --- Internal helper component for dropdown items ---

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
