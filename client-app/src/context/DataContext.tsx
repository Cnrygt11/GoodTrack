import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
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
}

const DataContext = createContext<DataContextType | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [connections, setConnections] = useState<ConnectionUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<ConnectionRequest[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [extraFieldDefs, setExtraFieldDefs] = useState<ExtraFieldDef[]>([]);

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
      setProducts
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
