import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';
import { getHubUrl } from '../services/api';

const SignalRContext = createContext<HubConnection | null>(null);

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { loadProducts, loadIncomingRequests, loadSentRequests, refreshConnections } = useData();
  const [connection, setConnection] = useState<HubConnection | null>(null);

  // Store latest callbacks in refs so the effect doesn't re-run when they are recreated.
  // This prevents unnecessary WebSocket disconnects/reconnects on every render.
  const loadProductsRef = useRef(loadProducts);
  const loadIncomingRequestsRef = useRef(loadIncomingRequests);
  const loadSentRequestsRef = useRef(loadSentRequests);
  const refreshConnectionsRef = useRef(refreshConnections);

  useEffect(() => { loadProductsRef.current = loadProducts; }, [loadProducts]);
  useEffect(() => { loadIncomingRequestsRef.current = loadIncomingRequests; }, [loadIncomingRequests]);
  useEffect(() => { loadSentRequestsRef.current = loadSentRequests; }, [loadSentRequests]);
  useEffect(() => { refreshConnectionsRef.current = refreshConnections; }, [refreshConnections]);

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
        accessTokenFactory: () => user.token
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
        }
      })
      .withAutomaticReconnect()
      .build();

    // Setup event listeners — always call the latest version via ref
    newConnection.on('ReceiveOrderUpdate', () => {
      if (import.meta.env.DEV) console.log('[SignalR] Received Order Update Notification.');
      loadProductsRef.current();
    });

    newConnection.on('ReceiveConnectionRequest', () => {
      if (import.meta.env.DEV) console.log('[SignalR] Received Connection Request List Notification. Scheduling fetch...');
      setTimeout(() => {
        loadIncomingRequestsRef.current();
        loadSentRequestsRef.current();
      }, 1000);
    });

    newConnection.on('ReceiveConnectionUpdate', () => {
      if (import.meta.env.DEV) console.log('[SignalR] Received Connection Listing Notification. Scheduling fetch...');
      setTimeout(() => {
        refreshConnectionsRef.current();
      }, 1000);
    });

    let active = true;

    // Start connection
    newConnection.start()
      .then(() => {
        if (active) {
          if (import.meta.env.DEV) console.log('[SignalR] Connected to Tracking Hub.');
          setConnection(newConnection);
        }
      })
      .catch(err => {
        if (!active) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('stopped during negotiation') || errMsg.includes('AbortError')) {
          console.warn('[SignalR] Connection start aborted during negotiation (likely due to React StrictMode or HMR).');
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

  return (
    <SignalRContext.Provider value={connection}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  return useContext(SignalRContext);
}
