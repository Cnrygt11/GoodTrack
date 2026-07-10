import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * Numaralı sayfa gezinimi. Çok sayfada kısaltma uygular (1 … 4 5 6 … 20).
 * Tek sayfa veya boş liste durumunda hiçbir şey render etmez.
 */
export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const { t } = useSettings();

  if (totalPages <= 1) return null;

  const pages = buildPageList(currentPage, totalPages);

  return (
    <nav className="pagination" aria-label={t('paginationLabel')}>
      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label={t('paginationPrev')}
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map((page, idx) =>
        page === 'ellipsis' ? (
          <span key={`e-${idx}`} className="pagination-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={`pagination-btn${page === currentPage ? ' pagination-btn--active' : ''}`}
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        className="pagination-btn pagination-nav"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label={t('paginationNext')}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}

/**
 * İlk, son ve geçerli sayfanın komşularını gösterip aradaki boşluklara
 * '…' yerleştiren sayfa listesini üretir.
 */
function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  const delta = 1; // geçerli sayfanın her iki yanında gösterilecek komşu sayısı
  const range: number[] = [];
  for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
    range.push(i);
  }

  const result: (number | 'ellipsis')[] = [1];
  if (range.length > 0 && range[0] > 2) result.push('ellipsis');
  result.push(...range);
  if (range.length > 0 && range[range.length - 1] < total - 1) result.push('ellipsis');
  else if (range.length === 0 && total > 2) result.push('ellipsis');
  if (total > 1) result.push(total);

  return result;
}
