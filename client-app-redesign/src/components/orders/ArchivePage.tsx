import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Package } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../context/ToastContext';
import { api, Product } from '../../services/apiClient';
import { getStatusConfig } from '../../utils/statusConfig';
import { extractErrorMessage } from '../../utils/errorUtils';
import Pagination from '../ui/Pagination';

const PAGE_SIZE = 20;

/**
 * Arşivlenmiş (kargolandı/iptal) siparişlerin sayfalı listesi. Ana sipariş akışından ayrıdır;
 * Hesabım menüsünden erişilir. 30 günden eski kayıtlar "özet kayıt"tır: görseller ve müşteri
 * bilgileri kalıcı temizlenmiştir, minimum veri gösterilir.
 */
export default function ArchivePage() {
  const { user } = useAuth();
  const { t } = useSettings();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [items, setItems] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      try {
        const result = await api.getArchivedProducts(nextPage, PAGE_SIZE);
        setItems(result.items);
        setTotalCount(result.totalCount ?? result.items.length);
        setPage(nextPage);
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  if (!user) return null;

  const isMfr = user.role === 'mfr';
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const openTimeline = (p: Product) => {
    navigate(isMfr ? `/mfr/orders/${p.id}` : `/seller/orders/${p.id}`);
  };

  return (
    <div className="page-container archive-page">
      <h2 className="archive-title">
        <Archive size={22} />
        <span>{t('archiveTitle')}</span>
        {totalCount > 0 && (
          <span className="archive-title-count">
            ({totalCount} {t('archiveTotalCount')})
          </span>
        )}
      </h2>
      <p className="archive-description">{t('archiveDescription')}</p>

      {loading ? (
        <div className="order-detail-loading-wrapper">
          <p className="order-detail-loading-text">…</p>
        </div>
      ) : items.length === 0 ? (
        <div className="archive-empty">
          <Package size={36} />
          <p>{t('archiveEmpty')}</p>
        </div>
      ) : (
        <div className="product-list">
          {items.map((p) => {
            const sc = getStatusConfig(p.status || 'shipped', t, { iconSize: 11 });
            const thumb = p.thumbnailImage ?? p.image;
            const dateStr = p.archivedAt
              ? new Date(p.archivedAt).toLocaleDateString(t('dateLocale'), {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—';
            return (
              <div
                key={p.id}
                className="product-card product-card--clickable"
                onClick={() => openTimeline(p)}
                title={t('btnViewTimeline')}
              >
                <div className="product-thumb">
                  {thumb ? <img src={thumb} alt={p.code} /> : <Package size={26} />}
                </div>
                <div className="product-info">
                  <div className="product-code">{p.code}</div>
                  <div className="product-fields">
                    <span
                      className="product-field-chip product-field-chip--status"
                      style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
                    >
                      {sc.icon} {sc.label}
                    </span>
                    <span className="product-field-chip">{dateStr}</span>
                    {(p.quantity ?? 1) > 1 && (
                      <span className="product-field-chip">x{p.quantity}</span>
                    )}
                    <span className="product-field-chip">
                      <strong>{isMfr ? p.sellerName : p.mfrName}</strong>
                    </span>
                    {p.slimmedAt && (
                      <span className="product-field-chip" title={t('archiveDescription')}>
                        {t('archiveSummaryRecord')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={loadPage} />
    </div>
  );
}
