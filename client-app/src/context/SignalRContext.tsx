import React, { createContext, useContext, useEffect, useState } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

const SignalRContext = createContext<HubConnection | null>(null);

export function SignalRProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { loadProducts, loadIncomingRequests, loadSentRequests, refreshConnections } = useData();
  const [connection, setConnection] = useState<HubConnection | null>(null);

  useEffect(() => {
    if (!user) {
      if (connection) {
        connection.stop().then(() => setConnection(null));
      }
      return;
    }

    // Build the Hub connection
    const newConnection = new HubConnectionBuilder()
      .withUrl('/hubs/tracking', {
        accessTokenFactory: () => user.token
      })
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    // Setup event listeners
    newConnection.on('ReceiveOrderUpdate', () => {
      console.log('[SignalR] Received Order Update Notification.');
      loadProducts();
    });

    newConnection.on('ReceiveConnectionRequest', () => {
      console.log('[SignalR] Received Connection Request List Notification.');
      loadIncomingRequests();
      loadSentRequests();
    });

    newConnection.on('ReceiveConnectionUpdate', () => {
      console.log('[SignalR] Received Connection Listing Notification.');
      refreshConnections();
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
  }, [user, loadProducts, loadIncomingRequests, loadSentRequests, refreshConnections]);

  return (
    <SignalRContext.Provider value={connection}>
      {children}
    </SignalRContext.Provider>
  );
}

export function useSignalR() {
  return useContext(SignalRContext);
}
