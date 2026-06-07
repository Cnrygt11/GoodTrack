import { Package, CheckCircle2, X, Info, Clock } from 'lucide-react';
import { Product } from '../../services/api';
import { Language, TranslationKey } from '../../services/translations';

type MfrTab = 'pending' | 'completed' | 'defective' | 'approval';

interface MfrOrderCardProps {
  product: Product;
  activeTab: MfrTab;
  isUnseen: boolean;
  language: Language;
  t: (key: TranslationKey) => string;
  onToggleComplete: (productId: string, checked: boolean) => void;
  onToggleApproval: (productId: string, isPendingApproval: boolean) => void;
  onMarkAsSeen: (productId: string, tab: MfrTab) => void;
  onOpenDefectDetails: (product: Product) => void;
}

export default function MfrOrderCard({
  product: p,
  activeTab,
  isUnseen,
  language,
  t,
  onToggleComplete,
  onToggleApproval,
  onMarkAsSeen,
  onOpenDefectDetails
}: MfrOrderCardProps) {
  const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—';

  return (
    <div className={`product-card ${p.isDefective ? 'defective' : p.completed ? 'completed' : ''}`}>
      {isUnseen && (
        <div
          className="new-completed-dot"
          style={activeTab === 'defective' ? { backgroundColor: 'var(--danger)', boxShadow: '0 0 8px var(--danger)' } : activeTab === 'approval' ? { backgroundColor: 'var(--accent-mfr)', boxShadow: '0 0 8px var(--accent-mfr)' } : {}}
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
      {p.image ? (
        <div className="product-thumb">
          <img src={p.image} alt="ürün" />
        </div>
      ) : (
        <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={24} style={{ color: 'var(--muted)' }} />
        </div>
      )}

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

      <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'right', padding: '4px 0', lineHeight: 1.6, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', marginRight: '24px' }}>
        {p.completed ? (
          <>
            <span><strong>{t('sentDateLabel')}:</strong> {p.createdAt ? new Date(p.createdAt).toLocaleString('tr-TR') : '—'}</span>
            <span style={{ marginTop: '2px', color: 'var(--success)' }}><strong>{t('completedDateLabel')}:</strong> {p.completedAt ? new Date(p.completedAt).toLocaleString('tr-TR') : '—'}</span>
          </>
        ) : (
          <span><strong>{t('sentDateLabel')}:</strong> {dateStr}</span>
        )}
      </div>

      <div className="complete-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id={`cb-${p.id}`}
          checked={p.completed}
          onChange={(e) => onToggleComplete(p.id, e.target.checked)}
          style={{ cursor: 'pointer' }}
        />
        <label htmlFor={`cb-${p.id}`} style={{ cursor: 'pointer', fontSize: '13px' }}>{t('statusCompleted')}</label>
        {p.isPendingApproval ? (
          <>
            <span className="pending-approval-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(230, 126, 34, 0.15)', color: 'var(--accent-mfr)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
              <Clock size={12} style={{ color: 'var(--accent-mfr)' }} />
              {t('statusPendingApproval')}
            </span>
            <button
              type="button"
              onClick={() => onToggleApproval(p.id, false)}
              style={{
                padding: '4px 10px',
                background: 'rgba(52, 152, 219, 0.15)',
                border: '1px solid rgba(52, 152, 219, 0.3)',
                color: 'var(--accent-mfr)',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(52, 152, 219, 0.15)'}
            >
              {language === 'tr' ? 'Üretime Al' : 'Put to Production'}
            </button>
          </>
        ) : p.isDefective ? (
          <>
            <span className="defective-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
              <X size={12} />
              {language === 'tr' ? 'Hatalı' : 'Defective'}
            </span>
            <button
              type="button"
              onClick={() => onOpenDefectDetails(p)}
              style={{
                padding: '4px 10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
            >
              <Info size={11} />
              {t('btnDetails')}
            </button>
          </>
        ) : p.completed ? (
          <span className="completed-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(46, 204, 113, 0.15)', color: 'var(--success)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
            <CheckCircle2 size={12} />
            {t('statusCompleted')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onToggleApproval(p.id, true)}
            style={{
              padding: '4px 10px',
              background: 'rgba(230, 126, 34, 0.15)',
              border: '1px solid rgba(230, 126, 34, 0.3)',
              color: 'var(--accent-mfr)',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'background 0.2s',
              marginLeft: '8px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.25)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(230, 126, 34, 0.15)'}
          >
            <Info size={11} />
            {t('btnSendToApproval')}
          </button>
        )}
      </div>
    </div>
  );
}
