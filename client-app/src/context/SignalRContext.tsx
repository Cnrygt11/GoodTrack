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
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    // Setup event listeners — always call the latest version via ref
    newConnection.on('ReceiveOrderUpdate', () => {
      console.log('[SignalR] Received Order Update Notification.');
      loadProductsRef.current();
    });

    newConnection.on('ReceiveConnectionRequest', () => {
      console.log('[SignalR] Received Connection Request List Notification.');
      loadIncomingRequestsRef.current();
      loadSentRequestsRef.current();
    });

    newConnection.on('ReceiveConnectionUpdate', () => {
      console.log('[SignalR] Received Connection Listing Notification.');
      refreshConnectionsRef.current();
    });

    // Start connection
    newConnection.start()
      .then(() => {
        console.log('[SignalR] Connected to Tracking Hub.');
        setConnection(newConnection);
      })
      .catch(err => {
        console.error('[SignalR] Error establishing Tracking Hub connection:', err);
      });

    return () => {
      newConnection.stop().then(() => {
        console.log('[SignalR] Stopped Tracking Hub Connection.');
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
