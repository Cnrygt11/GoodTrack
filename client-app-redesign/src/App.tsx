import { BrowserRouter } from 'react-router-dom';
import { SettingsProvider } from './context/SettingsContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SignalRProvider } from './context/SignalRContext';
import Layout from './components/Layout';
import AppRoutes from './routes/AppRoutes';
import Toast from './components/ui/Toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';

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
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsProvider>
          <ConfirmProvider>
            <ToastProvider>
              <AuthProvider>
                <SignalRProvider>
                  <AppContent />
                </SignalRProvider>
              </AuthProvider>
            </ToastProvider>
          </ConfirmProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
