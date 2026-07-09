import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api, CatalogProduct, ExtraFieldDef } from '../services/apiClient';

/**
 * React Query anahtarları — katalog ve özel alan verisini invalidate etmek için paylaşılır.
 * (Bu domain'lerde optimistic merge yoktu; düz sunucu-durumu, RQ'ya birebir taşınır.)
 */
export const catalogKeys = {
  catalog: ['catalog'] as const,
  extraFields: ['extraFields'] as const,
};

export function useCatalogProducts(): {
  catalogProducts: CatalogProduct[];
  loadCatalog: () => Promise<void>;
  isLoading: boolean;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: catalogKeys.catalog,
    queryFn: () => api.getCatalog(),
    enabled: user?.role === 'seller',
  });

  const loadCatalog = useCallback(
    () => queryClient.invalidateQueries({ queryKey: catalogKeys.catalog }),
    [queryClient]
  );

  return { catalogProducts: query.data ?? [], loadCatalog, isLoading: query.isLoading };
}

export function useExtraFieldDefs(): {
  extraFieldDefs: ExtraFieldDef[];
  loadExtraFields: () => Promise<void>;
} {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: catalogKeys.extraFields,
    queryFn: () => api.getFields(),
    enabled: user?.role === 'seller',
  });

  const loadExtraFields = useCallback(
    () => queryClient.invalidateQueries({ queryKey: catalogKeys.extraFields }),
    [queryClient]
  );

  return { extraFieldDefs: query.data ?? [], loadExtraFields };
}
