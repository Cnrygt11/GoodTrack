import React, { createContext, useContext, useEffect, useState } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { connectionKeys } from '../hooks/useConnectionsData';
import { productKeys } from '../hooks/useProductsData';
import { api, getHubUrl, ApiError, Product } from '../services/apiClient';
import { AUTH_STORAGE_KEYS } from '../constants/authKeys';

const SignalRContext = createContext<HubConnection | null>(null);

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<HubConnection | null>(null);

  useEffect(() => {
    if (!user) {
      if (connection) {
        connection.stop().then(() => setConnection(null));
      }
      return;
    }

    // Build the Hub connection
    const hubUrl = getHubUrl('/hubs/tracking');

    const newConnection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem(AUTH_STORAGE_KEYS.token) || '',
      })
      .configureLogging({
        log(logLevel, message) {
          if (message.includes('stopped during negotiation') || message.includes('AbortError')) {
            return;
          }
          if (logLevel === LogLevel.Error) {
            console.error('[SignalR]', message);
          } else if (logLevel === LogLevel.Warning) {
            console.warn('[SignalR]', message);
          } else if (logLevel === LogLevel.Information && import.meta.env.DEV) {
            console.log('[SignalR]', message);
          }
        },
      })
      .withAutomaticReconnect()
      .build();

    // Setup event listeners — always call the latest version via ref
    newConnection.on('ReceiveOrderUpdate', (orderId?: string) => {
      if (import.meta.env.DEV)
        console.log('[SignalR] Received Order Update Notification.', orderId);

      // Payload yoksa (eski davranış) tam listeyi tazele.
      if (!orderId) {
        queryClient.invalidateQueries({ queryKey: productKeys.products });
        return;
      }

      // Hedefli güncelleme: yalnız etkilenen siparişi çekip cache'i yamala (tam-liste refetch yerine).
      api
        .getProductById(orderId)
        .then((updated) => {
          queryClient.setQueryData<Product[]>(productKeys.products, (old) => {
            if (!old) return old;
            return old.some((p) => p.id === updated.id)
              ? old.map((p) => (p.id === updated.id ? updated : p))
              : [updated, ...old];
          });
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) {
            // Sipariş silinmiş: cache'ten çıkar.
            queryClient.setQueryData<Product[]>(productKeys.products, (old) =>
              old?.filter((p) => p.id !== orderId),
            );
          } else {
            // Beklenmedik hata: güvenli tarafta kal, tam listeyi tazele.
            queryClient.invalidateQueries({ queryKey: productKeys.products });
          }
        });
    });

    newConnection.on('ReceiveConnectionRequest', () => {
      if (import.meta.env.DEV)
        console.log('[SignalR] Received Connection Request List Notification. Scheduling fetch...');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.incoming });
        queryClient.invalidateQueries({ queryKey: connectionKeys.sent });
      }, 1000);
    });

    newConnection.on('ReceiveConnectionUpdate', () => {
      if (import.meta.env.DEV)
        console.log('[SignalR] Received Connection Listing Notification. Scheduling fetch...');
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: connectionKeys.connections });
      }, 1000);
    });

    let active = true;

    // Start connection
    newConnection
      .start()
      .then(() => {
        if (active) {
          if (import.meta.env.DEV) console.log('[SignalR] Connected to Tracking Hub.');
          setConnection(newConnection);
        }
      })
      .catch((err) => {
        if (!active) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('stopped during negotiation') || errMsg.includes('AbortError')) {
          console.warn(
            '[SignalR] Connection start aborted during negotiation (likely due to React StrictMode or HMR).',
          );
          return;
        }
        console.error('[SignalR] Error establishing Tracking Hub connection:', err);
      });

    return () => {
      active = false;
      newConnection.stop().then(() => {
        if (import.meta.env.DEV) console.log('[SignalR] Stopped Tracking Hub Connection.');
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only re-run when user changes (login/logout), not when callbacks change

  return <SignalRContext.Provider value={connection}>{children}</SignalRContext.Provider>;
}

export function useSignalR() {
  return useContext(SignalRContext);
}
