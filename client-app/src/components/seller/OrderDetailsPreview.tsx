import { Product } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { getStatusConfig } from '../../utils/statusConfig';
import { ORDER_STATUS } from '../../utils/constants';
import { Tag, Ruler, Factory, CheckCircle2, Calendar, Info, AlertTriangle } from 'lucide-react';

interface OrderDetailsPreviewProps {
  product: Product;
  status: string;
  dateStr: string;
  timeStr: string;
  sc: ReturnType<typeof getStatusConfig>;
  onViewTimeline: (product: Product) => void;
  onViewBrokenNote?: (product: Product) => void;
}

export default function OrderDetailsPreview({
  product: p,
  status,
  dateStr,
  timeStr,
  sc,
  onViewTimeline,
  onViewBrokenNote,
}: OrderDetailsPreviewProps) {
  const { t } = useSettings();

  return (
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
            <strong>{t('lengthLabel')}:</strong> {p.length} {t('inchSuffix')}
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
            {t('completedDateLabel')}: <strong>{new Date(p.completedAt).toLocaleDateString(t('dateLocale'), { day: '2-digit', month: 'short' })}</strong>
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
  );
}
