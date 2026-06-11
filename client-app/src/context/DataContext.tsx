import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api, Product, ConnectionUser, ConnectionRequest, CatalogProduct, ExtraFieldDef } from '../services/api';
import { extractErrorMessage } from '../utils/errorUtils';

interface DataContextType {
  products: Product[];
  connections: ConnectionUser[];
  incomingRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  catalogProducts: CatalogProduct[];
  extraFieldDefs: ExtraFieldDef[];
  loadProducts: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;
  loadSentRequests: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  loadExtraFields: () => Promise<void>;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionUser[]>>;
  setIncomingRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setSentRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  optimisticConnections: React.MutableRefObject<Map<string, { user: ConnectionUser, timestamp: number }>>;
  optimisticRemovals: React.MutableRefObject<Map<string, number>>;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [connections, setConnectionsState] = useState<ConnectionUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [extraFieldDefs, setExtraFieldDefs] = useState<ExtraFieldDef[]>([]);

  const optimisticConnections = useRef<Map<string, { user: ConnectionUser, timestamp: number }>>(new Map());
  const optimisticRemovals = useRef<Map<string, number>>(new Map());

  const setConnections = useCallback((value: React.SetStateAction<ConnectionUser[]>) => {
    setConnectionsState(prev => {
      const next = typeof value === 'function' ? (value as Function)(prev) : value;
      const now = Date.now();

      if (typeof value === 'function') {
        // Optimistic change
        if (next.length > prev.length) {
          const added = next.filter((n: ConnectionUser) => !prev.some((p: ConnectionUser) => p.id === n.id));
          for (const conn of added) {
            optimisticRemovals.current.delete(conn.id);
            optimisticConnections.current.set(conn.id, { user: conn, timestamp: now });
          }
        } else if (next.length < prev.length) {
          const removed = prev.filter((p: ConnectionUser) => !next.some((n: ConnectionUser) => n.id === p.id));
          for (const conn of removed) {
            optimisticConnections.current.delete(conn.id);
            optimisticRemovals.current.set(conn.id, now);
          }
        }
        return next;
      } else {
        // API Load or Manual Overwrite/Rollback
        // Clean up expired entries (TTL 15s)
        for (const [id, item] of optimisticConnections.current.entries()) {
          if (now - item.timestamp > 15000) {
            optimisticConnections.current.delete(id);
          }
        }
        for (const [id, timestamp] of optimisticRemovals.current.entries()) {
          if (now - timestamp > 15000) {
            optimisticRemovals.current.delete(id);
          }
        }

        // Apply active removals
        let merged = next.filter((c: ConnectionUser) => !optimisticRemovals.current.has(c.id));

        // Apply active additions
        for (const [id, item] of optimisticConnections.current.entries()) {
          if (merged.some((c: ConnectionUser) => c.id === id)) {
            optimisticConnections.current.delete(id);
          } else {
            merged.push(item.user);
          }
        }

        return merged;
      }
    });
  }, []);

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error('Sipariş yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  const refreshConnections = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err: unknown) {
      console.error('Bağlantı yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  const loadIncomingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getIncomingRequests();
      setIncomingRequests(data);
    } catch (err: unknown) {
      console.error('Gelen istek yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  const loadSentRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getSentRequests();
      setSentRequests(data);
    } catch (err: unknown) {
      console.error('Gönderilen istek yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  const loadCatalog = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getCatalog();
      setCatalogProducts(data);
    } catch (err: unknown) {
      console.error('Katalog yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  const loadExtraFields = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getFields();
      setExtraFieldDefs(data);
    } catch (err: unknown) {
      console.error('Özellik yükleme hatası:', extractErrorMessage(err));
    }
  }, [user]);

  // Initial load when user connects
  useEffect(() => {
    if (user) {
      loadProducts();
      refreshConnections(); // Both roles need their connections list
      loadIncomingRequests();
      loadSentRequests();
      if (user.role === 'seller') {
        loadExtraFields();
        loadCatalog();
      }
    } else {
      setProducts([]);
      setConnections([]);
      setIncomingRequests([]);
      setSentRequests([]);
      setCatalogProducts([]);
      setExtraFieldDefs([]);
    }
  }, [user, loadProducts, loadExtraFields, loadCatalog, refreshConnections, loadIncomingRequests, loadSentRequests]);

  return (
    <DataContext.Provider value={{
      products,
      connections,
      incomingRequests,
      sentRequests,
      catalogProducts,
      extraFieldDefs,
      loadProducts,
      refreshConnections,
      loadIncomingRequests,
      loadSentRequests,
      loadCatalog,
      loadExtraFields,
      setConnections,
      setIncomingRequests,
      setSentRequests,
      setProducts,
      optimisticConnections,
      optimisticRemovals
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
