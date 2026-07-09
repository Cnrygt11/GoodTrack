import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { User } from '../services/apiClient';
import { useToast } from './ToastContext';
import { AUTH_STORAGE_KEYS, AUTH_EVENTS } from '../constants/authKeys';

interface AuthContextType {
  user: User | null;
  login: (token: string, refreshToken: string, username: string, role: 'seller' | 'mfr' | 'admin', userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
    const username = localStorage.getItem(AUTH_STORAGE_KEYS.username);
    const role = localStorage.getItem(AUTH_STORAGE_KEYS.role) as 'seller' | 'mfr' | 'admin' | null;
    const userId = localStorage.getItem(AUTH_STORAGE_KEYS.userId);
    return token && refreshToken && username && role && userId ? { token, refreshToken, username, role, userId } : null;
  });



  const login = useCallback((token: string, refreshToken: string, username: string, role: 'seller' | 'mfr' | 'admin', userId: string) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    localStorage.setItem(AUTH_STORAGE_KEYS.refreshToken, refreshToken);
    localStorage.setItem(AUTH_STORAGE_KEYS.username, username);
    localStorage.setItem(AUTH_STORAGE_KEYS.role, role);
    localStorage.setItem(AUTH_STORAGE_KEYS.userId, userId);
    setUser({ token, refreshToken, username, role, userId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
    localStorage.removeItem(AUTH_STORAGE_KEYS.username);
    localStorage.removeItem(AUTH_STORAGE_KEYS.role);
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    setUser(null);
  }, []);

  // Listen to automatic token invalidation events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      showToast('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
    };
    window.addEventListener(AUTH_EVENTS.unauthorized, handleUnauthorized);
    return () => window.removeEventListener(AUTH_EVENTS.unauthorized, handleUnauthorized);
  }, [logout, showToast]);

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

