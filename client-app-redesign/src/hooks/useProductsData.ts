import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api, Product } from '../services/apiClient';

/**
 * React Query anahtarı — siparişler (products) domain'i.
 * Optimistic güncellemeler queryClient.setQueryData ile bu anahtar üzerinden yapılır;
 * DataContext'in elle yazılmış optimistic-merge motorunun yerini alır.
 */
export const productKeys = {
  products: ['products'] as const,
};

export function useProductsQuery() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: productKeys.products,
    queryFn: () => api.getProducts(),
    enabled: !!user,
  });
  return { products: query.data ?? [], isLoading: query.isLoading };
}

/**
 * Sipariş listesinde optimistic mutasyon + refetch yardımcıları. İmzalar eski
 * DataContext API'siyle birebir aynıdır, böylece tüketiciler minimal değişir.
 */
export function useProductActions() {
  const queryClient = useQueryClient();

  const setProducts = useCallback(
    (updater: (old: Product[]) => Product[]) =>
      queryClient.setQueryData<Product[]>(productKeys.products, (old) => updater(old ?? [])),
    [queryClient]
  );

  const loadProducts = useCallback(
    () => queryClient.invalidateQueries({ queryKey: productKeys.products }).then(() => {}),
    [queryClient]
  );

  const optimisticAddProduct = useCallback(
    (prod: Product) => setProducts((old) => [...old, prod]),
    [setProducts]
  );

  const optimisticUpdateProduct = useCallback(
    (prod: Product) => setProducts((old) => old.map((p) => (p.id === prod.id ? prod : p))),
    [setProducts]
  );

  const optimisticRemoveProduct = useCallback(
    (productId: string) => setProducts((old) => old.filter((p) => p.id !== productId)),
    [setProducts]
  );

  const rollbackProducts = useCallback(
    (prev: Product[]) => queryClient.setQueryData<Product[]>(productKeys.products, prev),
    [queryClient]
  );

  const markStatusAsReadLocally = useCallback(
    (status: string, role: string) =>
      setProducts((old) =>
        old.map((p) => {
          const currentStatus =
            p.status ||
            (p.isDefective ? 'defective' : p.completed ? 'completed' : p.isPendingApproval ? 'awaiting' : 'production');

          let match = false;
          const lowerStatus = status.toLowerCase();
          const lowerCurrent = currentStatus.toLowerCase();

          if (lowerStatus === 'defective') {
            match = lowerCurrent === 'defective' || lowerCurrent === 'missing';
          } else if (lowerStatus === 'shipped') {
            match = lowerCurrent === 'shipped' || lowerCurrent === 'cancelled' || (role === 'mfr' && lowerCurrent === 'to_ship');
          } else if (lowerStatus === 'awaiting') {
            match = lowerCurrent === 'awaiting' || lowerCurrent === 'corrected';
          } else {
            match = lowerCurrent === lowerStatus;
          }

          if (match) {
            return role === 'seller' ? { ...p, isReadBySeller: true } : { ...p, isReadByMfr: true };
          }
          return p;
        })
      ),
    [setProducts]
  );

  return {
    loadProducts,
    optimisticAddProduct,
    optimisticUpdateProduct,
    optimisticRemoveProduct,
    rollbackProducts,
    markStatusAsReadLocally,
  };
}
