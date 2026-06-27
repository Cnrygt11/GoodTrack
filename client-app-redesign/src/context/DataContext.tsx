import React, { createContext, useState, useContext, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { api, Product, ConnectionUser, ConnectionRequest, CatalogProduct, ExtraFieldDef, SubscriptionPlanDetail } from '../services/api';
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

  // Credits & Billing System
  balance: number;
  plan: string;
  renewsAt: string;
  planDetails: SubscriptionPlanDetail[];
  isCreditsLoading: boolean;
  isUpgrading: boolean;
  refreshCredits: () => Promise<void>;
  upgradePlan: (planName: string) => Promise<boolean>;

  // Semantic optimistic actions — replaces raw setState dispatchers
  optimisticAddSentRequest: (req: ConnectionRequest) => void;
  optimisticRemoveSentRequest: (requestId: string) => void;
  rollbackSentRequests: (prev: ConnectionRequest[]) => void;

  optimisticAddConnection: (conn: ConnectionUser) => void;
  optimisticRemoveConnection: (targetId: string) => void;
  rollbackConnections: (prev: ConnectionUser[]) => void;

  optimisticRemoveIncoming: (requestId: string) => void;
  rollbackIncomingRequests: (prev: ConnectionRequest[]) => void;

  optimisticAddProduct: (prod: Product) => void;
  optimisticUpdateProduct: (prod: Product) => void;
  optimisticRemoveProduct: (productId: string) => void;
  rollbackProducts: (prev: Product[]) => void;
  markStatusAsReadLocally: (status: string, role: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [products, setProductsState] = useState<Product[]>([]);
  const [connections, setConnectionsState] = useState<ConnectionUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [extraFieldDefs, setExtraFieldDefs] = useState<ExtraFieldDef[]>([]);

  // Credits States
  const [balance, setBalance] = useState<number>(0);
  const [plan, setPlan] = useState<string>('Free');
  const [renewsAt, setRenewsAt] = useState<string>('');
  const [planDetails, setPlanDetails] = useState<SubscriptionPlanDetail[]>([]);
  const [isCreditsLoading, setIsCreditsLoading] = useState<boolean>(true);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);

  // Optimistic tracking — kept internal, not exposed via context
  const optimisticConnections = useRef<Map<string, { user: ConnectionUser, timestamp: number }>>(new Map());
  const optimisticRemovals = useRef<Map<string, number>>(new Map());

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

  /**
   * Smart setConnections: merges optimistic additions and removals into
   * server-returned lists to prevent flicker during in-flight requests.
   * When called with a function (optimistic mutation) it updates the tracking maps.
   * When called with an array (server data load) it applies active optimistic state.
   */
  const setConnections = useCallback((value: React.SetStateAction<ConnectionUser[]>) => {
    setConnectionsState(prev => {
      const next = value instanceof Function ? value(prev) : value;
      const now = Date.now();

      if (typeof value === 'function') {
        // Optimistic change — update tracking maps
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
        // API Load or Rollback — clean up expired entries (TTL 15s) then merge
        for (const [id, item] of optimisticConnections.current.entries()) {
          if (now - item.timestamp > 15000) optimisticConnections.current.delete(id);
        }
        for (const [id, timestamp] of optimisticRemovals.current.entries()) {
          if (now - timestamp > 15000) optimisticRemovals.current.delete(id);
        }

        // Apply active removals then active additions
        let merged = next.filter((c: ConnectionUser) => !optimisticRemovals.current.has(c.id));
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

  // ─── Load actions ───────────────────────────────────────────────────────────

  const loadProducts = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load products:', extractErrorMessage(err));
    }
  }, [user]);

  const refreshConnections = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err: unknown) {
      console.error('Failed to load connections:', extractErrorMessage(err));
    }
  }, [user, setConnections]);

  const loadIncomingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getIncomingRequests();
      setIncomingRequests(data);
    } catch (err: unknown) {
      console.error('Failed to load incoming connection requests:', extractErrorMessage(err));
    }
  }, [user]);

  const loadSentRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getSentRequests();
      setSentRequests(data);
    } catch (err: unknown) {
      console.error('Failed to load sent connection requests:', extractErrorMessage(err));
    }
  }, [user]);

  const loadCatalog = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getCatalog();
      setCatalogProducts(data);
    } catch (err: unknown) {
      console.error('Failed to load catalog:', extractErrorMessage(err));
    }
  }, [user]);

  const loadExtraFields = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getFields();
      setExtraFieldDefs(data);
    } catch (err: unknown) {
      console.error('Failed to load extra fields:', extractErrorMessage(err));
    }
  }, [user]);

  // ─── Semantic optimistic actions ────────────────────────────────────────────

  const optimisticAddSentRequest = useCallback((req: ConnectionRequest) => {
    setSentRequests(prev => [...prev, req]);
  }, []);

  const optimisticRemoveSentRequest = useCallback((requestId: string) => {
    setSentRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const rollbackSentRequests = useCallback((prev: ConnectionRequest[]) => {
    setSentRequests(prev);
  }, []);

  const optimisticAddConnection = useCallback((conn: ConnectionUser) => {
    setConnections(prev => [...prev, conn]);
  }, [setConnections]);

  const optimisticRemoveConnection = useCallback((targetId: string) => {
    setConnections(prev => prev.filter(c => c.id !== targetId));
  }, [setConnections]);

  const rollbackConnections = useCallback((prev: ConnectionUser[]) => {
    // Direct rollback: clear optimistic tracking for the rolled-back items then restore
    optimisticConnections.current.clear();
    optimisticRemovals.current.clear();
    setConnectionsState(prev);
  }, []);

  const optimisticRemoveIncoming = useCallback((requestId: string) => {
    setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const rollbackIncomingRequests = useCallback((prev: ConnectionRequest[]) => {
    setIncomingRequests(prev);
  }, []);

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

  // --- Credits Callbacks ---
  const refreshCredits = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getCredits();
      setBalance(data.credits);
      setPlan(data.plan);
      setRenewsAt(data.renewsAt);
    } catch (err: unknown) {
      console.error('Failed to load user credits:', err);
    }
  }, [user]);

  const loadPlans = useCallback(async () => {
    try {
      const data = await api.getPlans();
      setPlanDetails(data);
    } catch (err: unknown) {
      console.error('Failed to load subscription plans:', err);
    }
  }, []);

  const upgradePlan = useCallback(async (planName: string): Promise<boolean> => {
    setIsUpgrading(true);
    try {
      const res = await api.upgradePlan(planName);
      setBalance(res.credits.credits);
      setPlan(res.credits.plan);
      setRenewsAt(res.credits.renewsAt);
      setIsUpgrading(false);
      return true;
    } catch (err: unknown) {
      setIsUpgrading(false);
      throw err;
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (user) {
      loadProducts();
      refreshConnections();
      loadIncomingRequests();
      loadSentRequests();
      if (user.role === 'seller') {
        loadExtraFields();
        loadCatalog();
        
        setIsCreditsLoading(true);
        Promise.all([refreshCredits(), loadPlans()]).finally(() => {
          setIsCreditsLoading(false);
        });
      }
    } else {
      setProducts([]);
      setConnections([]);
      setIncomingRequests([]);
      setSentRequests([]);
      setCatalogProducts([]);
      setExtraFieldDefs([]);
      
      setBalance(0);
      setPlan('Free');
      setRenewsAt('');
      setPlanDetails([]);
    }
  }, [user, loadProducts, loadExtraFields, loadCatalog, refreshConnections, loadIncomingRequests, loadSentRequests, setConnections, refreshCredits, loadPlans]);

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
      optimisticAddSentRequest,
      optimisticRemoveSentRequest,
      rollbackSentRequests,
      optimisticAddConnection,
      optimisticRemoveConnection,
      rollbackConnections,
      optimisticRemoveIncoming,
      rollbackIncomingRequests,
      optimisticAddProduct,
      optimisticUpdateProduct,
      optimisticRemoveProduct,
      rollbackProducts,
      markStatusAsReadLocally,
      balance,
      plan,
      renewsAt,
      planDetails,
      isCreditsLoading,
      isUpgrading,
      refreshCredits,
      upgradePlan,
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
