import { useEffect, useMemo, useState } from 'react';

/**
 * İstemci tarafı sayfalama için paylaşımlı yardımcı hook.
 *
 * - `resetKey` değiştiğinde 1. sayfaya döner (sekme/filtre/sıralama değişimi).
 * - Liste küçüldüğünde geçerli sayfayı [1, totalPages] aralığına kıstırır
 *   (ör. son sayfadaki tek kayıt silinince boş sayfada kalınmaz).
 * - Reset yalnızca `resetKey`'e bağlıdır; dizi kimliği değişse de (optimistic
 *   güncelleme gibi) kullanıcı bulunduğu sayfada kalır.
 */
export default function usePagination<T>(
  items: T[],
  pageSize: number,
  resetKey?: string,
): {
  pageItems: T[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
} {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Sekme/filtre/sıralama değişince başa dön
  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  // Liste küçülünce geçerli sayfayı sınıra çek
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const pageItems = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, totalPages, pageSize]);

  return { pageItems, currentPage, totalPages, setCurrentPage };
}
