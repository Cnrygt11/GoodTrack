import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthPage from '../components/auth/AuthPage';
import LandingPage from '../components/home/LandingPage';
import SellerPage from '../components/seller/SellerPage';
import MfrPage from '../components/mfr/MfrPage';
import MyAccountPage from '../components/profile/MyAccountPage';
import SearchMfrPage from '../components/seller/SearchMfrPage';
import OrderDetailPage from '../components/orders/OrderDetailPage';
import ConnectionsPage from '../components/connections/ConnectionsPage';
import UserProfileDetailPage from '../components/profile/UserProfileDetailPage';
import AdminDashboardPage from '../components/admin/AdminDashboardPage';
import AdminFeedbacksPage from '../components/admin/AdminFeedbacksPage';
import CreditsPage from '../components/credits/CreditsPage';
import PrivacyPolicyPage from '../components/legal/PrivacyPolicyPage';
import TermsOfServicePage from '../components/legal/TermsOfServicePage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('seller' | 'mfr' | 'admin')[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to={user.role === 'mfr' ? '/mfr/orders' : '/seller/orders'} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to={user.role === 'mfr' ? '/mfr/orders' : '/seller/orders'} replace />;
  }

  return <>{children}</>;
}

function OrderDetailRedirect() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return (
    <Navigate to={user.role === 'mfr' ? `/mfr/orders/${id}` : `/seller/orders/${id}`} replace />
  );
}

function ProfileRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to={user.role === 'mfr' ? '/mfr/profile' : '/seller/profile'} replace />;
}

function ConnectionsRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to={user.role === 'mfr' ? '/mfr/connections' : '/seller/connections'} replace />;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <Navigate to={user.role === 'mfr' ? '/mfr/orders' : '/seller/orders'} replace />
            )
          ) : (
            <LandingPage />
          )
        }
      />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthPage mode="register" />
          </PublicRoute>
        }
      />

      {/* Seller Nested Routes */}
      <Route path="/seller" element={<Navigate to="/seller/orders" replace />} />

      <Route path="/seller/order-page" element={<Navigate to="/seller/orders" replace />} />

      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <SellerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/search-mfr"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <SearchMfrPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/profile"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <MyAccountPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/profile/:username"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <UserProfileDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/connections"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <ConnectionsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/seller/credits"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <CreditsPage />
          </ProtectedRoute>
        }
      />

      {/* Manufacturer Nested Routes */}
      <Route path="/mfr" element={<Navigate to="/mfr/orders" replace />} />

      <Route
        path="/mfr/orders"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <MfrPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mfr/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mfr/profile"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <MyAccountPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mfr/profile/:username"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <UserProfileDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/mfr/connections"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <ConnectionsPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Protected Routes */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/feedbacks"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminFeedbacksPage />
          </ProtectedRoute>
        }
      />

      {/* Legacy/General Fallback Routes */}
      <Route path="/catalog" element={<Navigate to="/seller/orders" replace />} />

      <Route path="/search-mfr" element={<Navigate to="/seller/search-mfr" replace />} />

      <Route path="/profile" element={<ProfileRedirect />} />

      <Route path="/orders/:id" element={<OrderDetailRedirect />} />

      <Route path="/connections" element={<ConnectionsRedirect />} />

      {/* Public legal pages (Etsy başvurusu + kullanıcılar için, login gerektirmez) */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
