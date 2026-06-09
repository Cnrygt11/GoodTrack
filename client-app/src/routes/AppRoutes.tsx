import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthPage from '../components/auth/AuthPage';
import LandingPage from '../components/home/LandingPage';
import SellerPage from '../components/seller/SellerPage';
import CatalogPage from '../components/catalog/CatalogPage';
import MfrPage from '../components/mfr/MfrPage';
import MyAccountPage from '../components/profile/MyAccountPage';
import SearchMfrPage from '../components/seller/SearchMfrPage';
import OrderDetailPage from '../components/orders/OrderDetailPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('seller' | 'mfr')[];
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'mfr' ? '/mfr' : '/seller/orders'} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={user.role === 'mfr' ? '/mfr' : '/seller/orders'} replace />;
  }

  return <>{children}</>;
}

function OrderDetailRedirect() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'mfr' ? `/mfr/orders/${id}` : `/seller/orders/${id}`} replace />;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            <Navigate to={user.role === 'mfr' ? '/mfr' : '/seller/orders'} replace />
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

      <Route
        path="/seller"
        element={<Navigate to="/seller/orders" replace />}
      />

      <Route
        path="/seller/order-page"
        element={<Navigate to="/seller/orders" replace />}
      />

      <Route
        path="/seller/orders"
        element={
          <ProtectedRoute allowedRoles={['seller']}>
            <SellerPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/catalog"
        element={<Navigate to="/seller/orders" replace />}
      />

      <Route
        path="/search-mfr"
        element={<Navigate to="/seller/search-mfr" replace />}
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
        path="/mfr"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <MfrPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <MyAccountPage />
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
        path="/mfr/orders/:id"
        element={
          <ProtectedRoute allowedRoles={['mfr']}>
            <OrderDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/orders/:id"
        element={<OrderDetailRedirect />}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
