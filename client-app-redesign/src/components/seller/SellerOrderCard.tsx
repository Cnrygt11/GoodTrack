import { Product } from '../../services/apiClient';
import { ListFilter } from '../../types/orders';
import { getStatusConfig } from '../../utils/statusConfig';
import { formatOrderDate, formatOrderTime } from '../../utils/dateFormat';
import { useOrderLightbox } from '../../hooks/useOrderLightbox';
import { useSettings } from '../../context/SettingsContext';
import Lightbox from '../ui/Lightbox';
import { ORDER_STATUS } from '../../utils/constants';
import { deriveStatus } from '../../utils/orderStatus';
import { Package, MoreVertical } from 'lucide-react';
import OrderDetailsPreview from './OrderDetailsPreview';
import OrderActionsBar from './OrderActionsBar';
import OrderMenuDropdown from './OrderMenuDropdown';

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
  product: p,
  listFilter,
  isUnseen,
  isDropdownOpen,
  onDropdownToggle,
  onEdit,
  onDelete,
  onCancel,
  onVerify,
  onShip,
  onViewTimeline,
  onMarkSeen,
  onViewBrokenNote,
  onRequestCancel,
}: SellerOrderCardProps) {
  const { t } = useSettings();
  const { isLightboxOpen, setIsLightboxOpen, fullImage, thumb, openLightbox } = useOrderLightbox(p);

  const dateStr = formatOrderDate(p.createdAt, t('dateLocale'));
  const timeStr = formatOrderTime(p.createdAt, t('dateLocale'));

  const status = deriveStatus(p);
  const isEditable =
    status === ORDER_STATUS.AWAITING ||
    status === ORDER_STATUS.CORRECTED ||
    status === ORDER_STATUS.BROKEN;
  const sc = getStatusConfig(status, t, {
    iconSize: 11,
    role: 'seller',
    isReproduction: p.isReproduction,
  });

  const hasActionBar =
    status === ORDER_STATUS.DELIVERED ||
    status === ORDER_STATUS.TO_SHIP ||
    status === ORDER_STATUS.SHIPPED ||
    status === ORDER_STATUS.CANCELLED;

  return (
    <div className={`seller-order-card status-${status} ${isDropdownOpen ? 'dropdown-open' : ''}`}>
      {/* Colored left accent bar */}
      <div className="seller-order-card-accent-bar" />

      {/* Unseen glow dot */}
      {isUnseen && (
        <div
          className="seller-order-card-unseen-dot"
          title={t('unseenDotTitle')}
          onClick={(e) => {
            e.stopPropagation();
            onMarkSeen(p.id, listFilter);
          }}
        />
      )}

      {/* Main content */}
      <div className="seller-order-card-content">
        {/* Thumbnail */}
        <div
          onClick={thumb ? openLightbox : undefined}
          className={`seller-order-card-thumb ${thumb ? 'clickable' : ''}`}
          title={thumb ? t('clickToInspectDetails') : undefined}
        >
          {thumb ? <img src={thumb} alt="ürün" /> : <Package size={28} />}
        </div>

        {/* Info block */}
        <OrderDetailsPreview
          product={p}
          status={status}
          dateStr={dateStr}
          timeStr={timeStr}
          sc={sc}
          onViewTimeline={onViewTimeline}
          onViewBrokenNote={onViewBrokenNote}
        />

        {/* Right: three-dot menu */}
        <div className="seller-order-card-dropdown-wrapper" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDropdownToggle(isDropdownOpen ? null : p.id);
            }}
            className="icon-btn"
          >
            <MoreVertical size={16} />
          </button>

          {isDropdownOpen && (
            <OrderMenuDropdown
              product={p}
              status={status}
              isEditable={isEditable}
              onDropdownToggle={onDropdownToggle}
              onEdit={onEdit}
              onViewTimeline={onViewTimeline}
              onCancel={onCancel}
              onDelete={onDelete}
              onRequestCancel={onRequestCancel}
            />
          )}
        </div>
      </div>

      {/* Action Bar */}
      {hasActionBar && (
        <OrderActionsBar
          product={p}
          status={status}
          onVerify={onVerify}
          onShip={onShip}
          onViewTimeline={onViewTimeline}
        />
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
