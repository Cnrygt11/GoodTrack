import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { api, Product } from '../services/apiClient';
import { extractErrorMessage } from '../utils/errorUtils';

// NOTE: Credits, catalog, extra-fields and the connections/requests domains have all
// been migrated to React Query (see hooks/useCredits, useCatalogData, useConnectionsData).
// DataContext now owns only the orders (products) domain, which still uses the hand-rolled
// optimistic-merge engine below; migrating it to React Query is the remaining step.

interface DataContextType {
  products: Product[];
  loadProducts: () => Promise<void>;

  // Semantic optimistic actions — replaces raw setState dispatchers
  optimisticAddProduct: (prod: Product) => void;
  optimisticUpdateProduct: (prod: Product) => void;
  optimisticRemoveProduct: (productId: string) => void;
  rollbackProducts: (prev: Product[]) => void;
  markStatusAsReadLocally: (status: string, role: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [products, setProductsState] = useState<Product[]>([]);

  // Optimistic tracking for products
  const optimisticProducts = useRef<Map<string, { product: Product, timestamp: number }>>(new Map());
  const optimisticProductUpdates = useRef<Map<string, { product: Product, timestamp: number }>>(new Map());
  const optimisticProductRemovals = useRef<Map<string, number>>(new Map());

  /**
   * Smart setProducts: merges optimistic product additions, updates, and removals
   * into server-returned lists to prevent flicker during in-flight requests.
   */
  const setProducts = useCallback((value: React.SetStateAction<Product[]>) => {
    setProductsState(prev => {
      const next = value instanceof Function ? value(prev) : value;
      const now = Date.now();

      if (typeof value === 'function') {
        if (next.length > prev.length) {
          const added = next.filter((n: Product) => !prev.some((p: Product) => p.id === n.id));
          for (const prod of added) {
            optimisticProductRemovals.current.delete(prod.id);
            optimisticProducts.current.set(prod.id, { product: prod, timestamp: now });
          }
        } else if (next.length < prev.length) {
          const removed = prev.filter((p: Product) => !next.some((n: Product) => n.id === p.id));
          for (const prod of removed) {
            optimisticProducts.current.delete(prod.id);
            optimisticProductUpdates.current.delete(prod.id);
            optimisticProductRemovals.current.set(prod.id, now);
          }
        } else {
          // Same length, look for updates
          const updated = next.filter((n: Product) => {
            const p = prev.find(x => x.id === n.id);
            return p && JSON.stringify(p) !== JSON.stringify(n);
          });
          for (const prod of updated) {
            optimisticProductUpdates.current.set(prod.id, { product: prod, timestamp: now });
          }
        }
        return next;
      } else {
        // API Load or Rollback — clean up expired entries (TTL 15s) then merge
        if (next.length === 0) {
          optimisticProducts.current.clear();
          optimisticProductUpdates.current.clear();
          optimisticProductRemovals.current.clear();
          return next;
        }

        for (const [id, item] of optimisticProducts.current.entries()) {
          if (now - item.timestamp > 15000) optimisticProducts.current.delete(id);
        }
        for (const [id, item] of optimisticProductUpdates.current.entries()) {
          if (now - item.timestamp > 15000) optimisticProductUpdates.current.delete(id);
        }
        for (const [id, timestamp] of optimisticProductRemovals.current.entries()) {
          if (now - timestamp > 15000) optimisticProductRemovals.current.delete(id);
        }

        // Apply active removals
        let merged = next.filter((p: Product) => !optimisticProductRemovals.current.has(p.id));

        // Apply active updates
        merged = merged.map((p: Product) => {
          const optUpdate = optimisticProductUpdates.current.get(p.id);
          if (optUpdate) {
            if (p.status === optUpdate.product.status &&
                p.cancelRequested === optUpdate.product.cancelRequested &&
                p.defectNote === optUpdate.product.defectNote &&
                p.defectImage === optUpdate.product.defectImage) {
              optimisticProductUpdates.current.delete(p.id);
              return p;
            }
            return optUpdate.product;
          }
          return p;
        });

        // Apply active additions
        for (const [id, item] of optimisticProducts.current.entries()) {
          const index = merged.findIndex((p: Product) => p.id === id);
          if (index !== -1) {
            optimisticProducts.current.delete(id);
            const optUpdate = optimisticProductUpdates.current.get(id);
            if (optUpdate) {
              merged[index] = optUpdate.product;
            }
          } else {
            merged.push(item.product);
          }
        }

        return merged;
      }
    });
  }, []);

  // ─── Load actions ───────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load products:', extractErrorMessage(err));
      showToast('Siparişler yüklenirken hata oluştu.');
    }
  }, [user, showToast, setProducts]);

  // ─── Semantic optimistic actions ────────────────────────────────────────────

  const optimisticAddProduct = useCallback((prod: Product) => {
    setProducts(prev => [...prev, prod]);
  }, [setProducts]);

  const optimisticUpdateProduct = useCallback((prod: Product) => {
    setProducts(prev => prev.map(p => p.id === prod.id ? prod : p));
  }, [setProducts]);

  const optimisticRemoveProduct = useCallback((productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  }, [setProducts]);

  const rollbackProducts = useCallback((prev: Product[]) => {
    optimisticProducts.current.clear();
    optimisticProductUpdates.current.clear();
    optimisticProductRemovals.current.clear();
    setProductsState(prev);
  }, []);

  const markStatusAsReadLocally = useCallback((status: string, role: string) => {
    setProductsState(prev => prev.map(p => {
      const currentStatus = p.status || (p.isDefective ? 'defective' : (p.completed ? 'completed' : (p.isPendingApproval ? 'awaiting' : 'production')));

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
        if (role === 'seller') {
          return { ...p, isReadBySeller: true };
        } else {
          return { ...p, isReadByMfr: true };
        }
      }
      return p;
    }));
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadProducts();
    } else {
      setProducts([]);
    }
  }, [user, loadProducts, setProducts]);

  return (
    <DataContext.Provider value={{
      products,
      loadProducts,
      optimisticAddProduct,
      optimisticUpdateProduct,
      optimisticRemoveProduct,
      rollbackProducts,
      markStatusAsReadLocally,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
