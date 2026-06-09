import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { User } from '../services/api';
import { useToast } from './ToastContext';
import { AUTH_STORAGE_KEYS, AUTH_EVENTS } from '../constants/authKeys';

interface AuthContextType {
  user: User | null;
  isConnectionsModalOpen: boolean;
  login: (token: string, username: string, role: 'seller' | 'mfr', userId: string) => void;
  logout: () => void;
  setIsConnectionsModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
    const username = localStorage.getItem(AUTH_STORAGE_KEYS.username);
    const role = localStorage.getItem(AUTH_STORAGE_KEYS.role) as 'seller' | 'mfr' | null;
    const userId = localStorage.getItem(AUTH_STORAGE_KEYS.userId);
    return token && username && role && userId ? { token, username, role, userId } : null;
  });

  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);

  const login = useCallback((token: string, username: string, role: 'seller' | 'mfr', userId: string) => {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
    localStorage.setItem(AUTH_STORAGE_KEYS.username, username);
    localStorage.setItem(AUTH_STORAGE_KEYS.role, role);
    localStorage.setItem(AUTH_STORAGE_KEYS.userId, userId);
    setUser({ token, username, role, userId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.username);
    localStorage.removeItem(AUTH_STORAGE_KEYS.role);
    localStorage.removeItem(AUTH_STORAGE_KEYS.userId);
    setUser(null);
    setIsConnectionsModalOpen(false);
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
      isConnectionsModalOpen,
      login,
      logout,
      setIsConnectionsModalOpen
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
