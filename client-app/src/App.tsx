import React from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SignalRProvider } from './context/SignalRContext';
import Layout from './components/Layout';
import AuthPage from './components/auth/AuthPage';
import SellerPage from './components/seller/SellerPage';
import CatalogPage from './components/catalog/CatalogPage';
import MfrPage from './components/mfr/MfrPage';
import ConnectionsModal from './components/connections/ConnectionsModal';
import Toast from './components/ui/Toast';
import MyAccountPage from './components/profile/MyAccountPage';
import SearchMfrPage from './components/seller/SearchMfrPage';

function AppContent() {
  const { user, activeScreen } = useAuth();

  if (!user) {
    return (
      <>
        <AuthPage />
        <Toast />
      </>
    );
  }

  return (
    <Layout>
      {activeScreen === 'profile' ? (
        <MyAccountPage />
      ) : activeScreen === 'search-mfr' ? (
        <SearchMfrPage />
      ) : user.role === 'seller' ? (
        activeScreen === 'catalog' ? <CatalogPage /> : <SellerPage />
      ) : (
        <MfrPage />
      )}
      
      {/* Global overlays */}
      <ConnectionsModal />
      <Toast />
    </Layout>
  );
}

export default function App() {
  return (
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
  );
}

