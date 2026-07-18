import { useState } from 'react';
import { api, Product } from '../services/apiClient';

/**
 * Sipariş kartı görsel büyütme akışı. Liste yanıtı yalnız thumbnail taşır;
 * lightbox açıldığında tam görsel talep üzerine çekilir (başarısız olursa
 * thumbnail ile devam edilir).
 */
export function useOrderLightbox(p: Product) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(p.image);

  const thumb = p.thumbnailImage ?? p.image;

  const openLightbox = () => {
    setIsLightboxOpen(true);
    if (!fullImage && p.id) {
      api
        .getProductById(p.id)
        .then((f) => setFullImage(f.image))
        .catch(() => {
          /* thumbnail yeterli */
        });
    }
  };

  return { isLightboxOpen, setIsLightboxOpen, fullImage, thumb, openLightbox };
}
