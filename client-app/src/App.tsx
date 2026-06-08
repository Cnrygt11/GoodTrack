import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SignalRProvider } from './context/SignalRContext';
import Layout from './components/Layout';
import AppRoutes from './routes/AppRoutes';
import ConnectionsModal from './components/connections/ConnectionsModal';
import Toast from './components/ui/Toast';

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      {user ? (
        <Layout>
          <AppRoutes />
          <ConnectionsModal />
        </Layout>
      ) : (
        <AppRoutes />
      )}
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <SignalRProvider>
                <AppContent />
              </SignalRProvider>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
