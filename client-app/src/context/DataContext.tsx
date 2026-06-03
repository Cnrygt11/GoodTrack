import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api, Product, ConnectionUser, ConnectionRequest, CatalogProduct, ExtraFieldDef } from '../services/api';

interface DataContextType {
  products: Product[];
  connections: ConnectionUser[];
  incomingRequests: ConnectionRequest[];
  sentRequests: ConnectionRequest[];
  catalogProducts: CatalogProduct[];
  extraFieldDefs: ExtraFieldDef[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  setConnections: React.Dispatch<React.SetStateAction<ConnectionUser[]>>;
  setIncomingRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setSentRequests: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  setCatalogProducts: React.Dispatch<React.SetStateAction<CatalogProduct[]>>;
  setExtraFieldDefs: React.Dispatch<React.SetStateAction<ExtraFieldDef[]>>;
  loadProducts: () => Promise<void>;
  refreshConnections: () => Promise<void>;
  loadIncomingRequests: () => Promise<void>;
  loadSentRequests: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  loadExtraFields: () => Promise<void>;
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
    } catch (err: any) {
      console.error('Sipariş yükleme hatası:', err.message);
    }
  }, [user]);

  const refreshConnections = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getConnections();
      setConnections(data);
    } catch (err: any) {
      console.error('Bağlantı yükleme hatası:', err.message);
    }
  }, [user]);

  const loadIncomingRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getIncomingRequests();
      setIncomingRequests(data);
    } catch (err: any) {
      console.error('Gelen istek yükleme hatası:', err.message);
    }
  }, [user]);

  const loadSentRequests = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getSentRequests();
      setSentRequests(data);
    } catch (err: any) {
      console.error('Gönderilen istek yükleme hatası:', err.message);
    }
  }, [user]);

  const loadCatalog = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getCatalog();
      setCatalogProducts(data);
    } catch (err: any) {
      console.error('Katalog yükleme hatası:', err.message);
    }
  }, [user]);

  const loadExtraFields = useCallback(async () => {
    if (!user || user.role !== 'seller') return;
    try {
      const data = await api.getFields();
      setExtraFieldDefs(data);
    } catch (err: any) {
      console.error('Özellik yükleme hatası:', err.message);
    }
  }, [user]);

  // Initial load when user connects
  useEffect(() => {
    if (user) {
      loadProducts();
      if (user.role === 'seller') {
        loadExtraFields();
        loadCatalog();
        refreshConnections();
      }
    } else {
      setProducts([]);
      setConnections([]);
      setIncomingRequests([]);
      setSentRequests([]);
      setCatalogProducts([]);
      setExtraFieldDefs([]);
    }
  }, [user, loadProducts, loadExtraFields, loadCatalog, refreshConnections]);

  return (
    <DataContext.Provider value={{
      products,
      connections,
      incomingRequests,
      sentRequests,
      catalogProducts,
      extraFieldDefs,
      setProducts,
      setConnections,
      setIncomingRequests,
      setSentRequests,
      setCatalogProducts,
      setExtraFieldDefs,
      loadProducts,
      refreshConnections,
      loadIncomingRequests,
      loadSentRequests,
      loadCatalog,
      loadExtraFields
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
