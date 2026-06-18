import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { SignalRProvider } from './context/SignalRContext';
import Layout from './components/Layout';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/ui/Toast';

function AppContent() {
  const { user } = useAuth();

  return (
    <>
      {user ? (
        <Layout>
          <AppRoutes />
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
        <ConfirmProvider>
          <ToastProvider>
            <AuthProvider>
              <DataProvider>
                <SignalRProvider>
                  <AppContent />
                </SignalRProvider>
              </DataProvider>
            </AuthProvider>
          </ToastProvider>
        </ConfirmProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}
