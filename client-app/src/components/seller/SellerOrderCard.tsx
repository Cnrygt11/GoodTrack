import React from 'react';
import { Product } from '../../services/api';
import { ListFilter } from '../../types/orders';
import { getStatusConfig } from '../../utils/statusConfig';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import Lightbox from '../ui/Lightbox';
import { ORDER_STATUS } from '../../utils/constants';
import {
  Package, Info, MoreVertical, Edit2, Trash2, Send, Archive, Calendar,
  Factory, Tag, Ruler, CheckCircle2, Ban, AlertTriangle, XCircle,
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
  onViewBrokenNote?: (product: Product) => void;
  onRequestCancel?: (productId: string) => Promise<void>;
}

export default function SellerOrderCard({
  product: p, listFilter,
  isUnseen, isDropdownOpen,
  onDropdownToggle, onEdit, onDelete, onCancel, onVerify, onShip, onViewTimeline, onMarkSeen,
  onViewBrokenNote,
  onRequestCancel,
}: SellerOrderCardProps) {
  const { language, t } = useSettings();
  const { showToast } = useToast();

  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);

  const dateStr = p.createdAt
    ? new Date(p.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const timeStr = p.createdAt
    ? new Date(p.createdAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  const status =
    p.status ||
    (p.isDefective ? ORDER_STATUS.DEFECTIVE : p.completed ? ORDER_STATUS.COMPLETED : p.isPendingApproval ? ORDER_STATUS.AWAITING : ORDER_STATUS.PRODUCTION);
  const isEditable = status === ORDER_STATUS.AWAITING || status === ORDER_STATUS.CORRECTED || status === ORDER_STATUS.BROKEN;
  const sc = getStatusConfig(status, t, { iconSize: 11, role: 'seller', isReproduction: p.isReproduction });

  const hasActionBar =
    status === ORDER_STATUS.DELIVERED || status === ORDER_STATUS.TO_SHIP || status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED;

  return (
    <div className={`seller-order-card status-${status} ${isDropdownOpen ? 'dropdown-open' : ''}`}>
      {/* Colored left accent bar */}
      <div className="seller-order-card-accent-bar" />

      {/* Unseen glow dot */}
      {isUnseen && (
        <div
          className="seller-order-card-unseen-dot"
          title={t('unseenDotTitle')}
          onClick={(e) => { e.stopPropagation(); onMarkSeen(p.id, listFilter); }}
        />
      )}

      {/* Main content */}
      <div className="seller-order-card-content">

        {/* Thumbnail */}
        <div
          onClick={p.image ? () => setIsLightboxOpen(true) : undefined}
          className={`seller-order-card-thumb ${p.image ? 'clickable' : ''}`}
          title={p.image ? t('clickToInspectDetails') : undefined}
        >
          {p.image
            ? <img src={p.image} alt="ürün" />
            : <Package size={28} />
          }
        </div>

        {/* Info block */}
        <div className="seller-order-card-info">
          {/* Code + Status badge */}
          <div className="seller-order-card-header">
            <span className="seller-order-card-code">
              {p.code}
            </span>
            <span 
              className="seller-order-card-status"
              style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.color }}
            >
              {sc.icon} {sc.label}
            </span>
            {p.cancelRequested && (
              <span className="seller-order-card-cancel-requested">
                {t('cancelRequestPending')}
              </span>
            )}
            {status === 'broken' && p.defectNote && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewBrokenNote?.(p);
                }}
                className="seller-order-card-broken-btn"
                title={t('brokenOrderExplanation')}
              >
                <AlertTriangle size={12} />
              </button>
            )}
          </div>

          {/* Chips */}
          <div className="seller-order-card-header">
            {p.text && (
              <span className="order-chip">
                <Tag size={10} />
                <strong>{t('textLabel')}:</strong> {p.text}
              </span>
            )}
            {p.length && (
              <span className="order-chip">
                <Ruler size={10} />
                <strong>{t('lengthLabel')}:</strong> {p.length} {language === 'tr' ? 'inç' : 'in'}
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
                  <strong>{item.name}:</strong> {item.value}
                </span>
              );
            })}
          </div>

          {/* Dates + Timeline link */}
          <div className="seller-order-card-header">
            <span className="seller-order-card-date">
              <Calendar size={11} />
              {t('sentDateLabel')}: <strong>{dateStr} {timeStr}</strong>
            </span>
            {p.completedAt && (
              <span className="seller-order-card-date completed">
                <CheckCircle2 size={11} />
                {t('completedDateLabel')}: <strong>{new Date(p.completedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short' })}</strong>
              </span>
            )}
            {!(status === ORDER_STATUS.SHIPPED || status === ORDER_STATUS.CANCELLED) && (
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
        <div className="seller-order-card-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
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
                <DropdownItem 
                  icon={<Edit2 size={13} className="color-accent" />} 
                  label={language === 'tr' ? 'Düzenle' : 'Edit'} 
                  onClick={() => { onEdit(p); onDropdownToggle(null); }} 
                />
              )}
              <DropdownItem 
                icon={<Info size={13} className="color-info" />} 
                label={t('btnViewTimeline')} 
                onClick={() => { onViewTimeline(p); onDropdownToggle(null); }} 
              />
              {isEditable && (
                <>
                  <div className="dropdown-divider" />
                  <DropdownItem 
                    icon={<Ban size={13} className="color-danger" />} 
                    label={t('btnCancelOrder')} 
                    isDanger 
                    onClick={() => { onCancel(p.id); onDropdownToggle(null); }} 
                  />
                  {status === ORDER_STATUS.AWAITING && (
                    <DropdownItem 
                      icon={<Trash2 size={13} className="color-danger" />} 
                      label={language === 'tr' ? 'Sil' : 'Delete'} 
                      isDanger 
                      onClick={() => { onDelete(p); onDropdownToggle(null); }} 
                    />
                  )}
                </>
              )}
              {status === ORDER_STATUS.PRODUCTION && !p.cancelRequested && (
                <>
                  <div className="dropdown-divider" />
                  <DropdownItem
                    icon={<Ban size={13} className="color-danger" />}
                    label={language === 'tr' ? 'İptal Talebi Gönder' : 'Request Cancellation'}
                    isDanger
                    onClick={() => {
                      onRequestCancel?.(p.id);
                      onDropdownToggle(null);
                    }}
                  />
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
              <ActionBtn type="correct" onClick={() => onVerify(p.id, 'correct')}>{t('btnVerifyCorrect')}</ActionBtn>
              <ActionBtn type="defective" onClick={() => onVerify(p.id, 'defective')}>{t('btnVerifyDefective')}</ActionBtn>
              <ActionBtn type="missing" onClick={() => onVerify(p.id, 'missing')}>{t('btnVerifyMissing')}</ActionBtn>
            </>
          )}
          {status === 'to_ship' && (
            <ActionBtn type="ship" icon={<Send size={12} />} onClick={() => onShip(p.id)} fullWidth>{t('btnMarkShipped')}</ActionBtn>
          )}
          {(status === 'shipped' || status === 'cancelled') && (
            <ActionBtn type="archive" bordered icon={<Info size={12} />} onClick={() => onViewTimeline(p)} fullWidth>{t('btnViewTimeline')}</ActionBtn>
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
  isDanger?: boolean;
  onClick: () => void;
}
function DropdownItem({ icon, label, isDanger, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`dropdown-menu-item ${isDanger ? 'danger' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

interface ActionBtnProps {
  type: 'correct' | 'defective' | 'missing' | 'ship' | 'archive';
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  bordered?: boolean;
}
function ActionBtn({ type, onClick, children, icon, fullWidth, bordered }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`action-btn action-btn--${type} ${fullWidth ? 'action-btn--full' : ''} ${bordered ? 'action-btn--bordered' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}
