import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { User } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  activeScreen: 'seller' | 'catalog' | 'mfr' | 'mfr-completed' | 'profile' | 'search-mfr';
  isConnectionsModalOpen: boolean;
  login: (token: string, username: string, role: 'seller' | 'mfr', userId: string) => void;
  logout: () => void;
  setActiveScreen: (screen: 'seller' | 'catalog' | 'mfr' | 'mfr-completed' | 'profile' | 'search-mfr') => void;
  setIsConnectionsModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  const [user, setUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role') as 'seller' | 'mfr' | null;
    const userId = localStorage.getItem('userId');
    return token && username && role && userId ? { token, username, role, userId } : null;
  });

  const [activeScreen, setActiveScreen] = useState<'seller' | 'catalog' | 'mfr' | 'mfr-completed' | 'profile' | 'search-mfr'>(() => {
    const role = localStorage.getItem('role');
    return role === 'mfr' ? 'mfr' : 'seller';
  });

  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);

  const login = useCallback((token: string, username: string, role: 'seller' | 'mfr', userId: string) => {
    localStorage.setItem('token', token);
    localStorage.setItem('username', username);
    localStorage.setItem('role', role);
    localStorage.setItem('userId', userId);
    setUser({ token, username, role, userId });
    setActiveScreen(role === 'mfr' ? 'mfr' : 'seller');
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setUser(null);
    setIsConnectionsModalOpen(false);
  }, []);

  // Listen to automatic token invalidation events from API client
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
      showToast('Oturumunuz sonlandırıldı. Lütfen tekrar giriş yapın.');
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [logout, showToast]);

  return (
    <AuthContext.Provider value={{
      user,
      activeScreen,
      isConnectionsModalOpen,
      login,
      logout,
      setActiveScreen,
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
