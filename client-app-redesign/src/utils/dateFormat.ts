/** Sipariş kartlarındaki tarih gösterimi (örn. "05 Tem 2026"). Boşsa "—". */
export function formatOrderDate(createdAt: string | undefined | null, locale: string): string {
  if (!createdAt) return '—';
  return new Date(createdAt).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Sipariş kartlarındaki saat gösterimi (örn. "14:05"). Boşsa "". */
export function formatOrderTime(createdAt: string | undefined | null, locale: string): string {
  if (!createdAt) return '';
  return new Date(createdAt).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
