import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useIncomingRequestsQuery } from '../hooks/useConnectionsData';
import { ROUTES } from '../constants/routes';
import { Package, Users, LogOut, Sun, Moon, Search } from 'lucide-react';
import FeedbackModal from './ui/FeedbackModal';
import AccountMenu from './AccountMenu';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const { incomingRequests } = useIncomingRequestsQuery();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;

  const [lastViewed, setLastViewed] = useState<string | null>(() => {
    return user ? localStorage.getItem(`lastViewedConnectionsTime_${user.username}`) : null;
  });

  // Scoped last viewed timestamp for connection requests
  useEffect(() => {
    if (user) {
      setLastViewed(localStorage.getItem(`lastViewedConnectionsTime_${user.username}`));
    } else {
      setLastViewed(null);
    }
  }, [user]);

  // Update viewed timestamp when navigating to connections page
  useEffect(() => {
    if (user && (currentPath === ROUTES.sellerConnections || currentPath === ROUTES.mfrConnections)) {
      const now = new Date().toISOString();
      localStorage.setItem(`lastViewedConnectionsTime_${user.username}`, now);
      setLastViewed(now);
    }
  }, [currentPath, user]);

  if (!user) return <>{children}</>;

  const hasNewRequests = incomingRequests.some(req => {
    if (!lastViewed) return true;
    return new Date(req.createdAt) > new Date(lastViewed);
  });

  const handleLogoClick = () => {
    if (user.role === 'admin') {
      navigate(ROUTES.adminDashboard);
    } else {
      navigate(user.role === 'mfr' ? ROUTES.mfrOrders : ROUTES.sellerOrders);
    }
  };

  const themeClass = user.role === 'mfr' ? 'mfr-theme' : (user.role === 'admin' ? 'admin-theme' : 'seller-theme');

  return (
    <div className={themeClass}>
      <header className="topbar">
        <div className="topbar-title" onClick={handleLogoClick}>
          {t('appTitle')}{' '}
          <span className="topbar-subtitle">
            {t('appSubTitle')}
          </span>
        </div>
        
        <div className="topbar-actions">
          {/* Theme & Language Switchers */}
          <div className="topbar-switchers">
            {/* Theme Toggle */}
            <button
              type="button"
              className="btn-secondary btn-icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              className="btn-secondary btn-lang"
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            >
              {t('langToggleLabel')}
            </button>
          </div>

          {user.role === 'admin' && (
            <span className="topbar-user-label">
              {t('userLabel')}:{' '}
              <strong className="topbar-username">
                {user.username}
              </strong>
            </span>
          )}

          {user.role === 'admin' && (
            <>
              <button 
                className={`nav-btn ${currentPath === ROUTES.adminDashboard ? 'nav-btn--active nav-btn--admin' : ''}`}
                onClick={() => navigate(ROUTES.adminDashboard)}
              >
                <Package size={14} />
                {t('tabUsers')}
              </button>

              <button 
                className={`nav-btn ${currentPath === ROUTES.adminFeedbacks ? 'nav-btn--active nav-btn--admin' : ''}`}
                onClick={() => navigate(ROUTES.adminFeedbacks)}
              >
                <Users size={14} />
                {t('tabFeedbacks')}
              </button>
            </>
          )}
          
          {user.role === 'mfr' && (
            <button 
              className={`nav-btn ${currentPath === ROUTES.mfrOrders ? 'nav-btn--active nav-btn--mfr' : ''}`}
              onClick={() => navigate(ROUTES.mfrOrders)}
            >
              <Package size={14} />
              {t('btnOrderScreen')}
            </button>
          )}

          {user.role === 'seller' && (
            <>
              <button
                className={`nav-btn ${currentPath === ROUTES.sellerOrders ? 'nav-btn--active nav-btn--seller' : ''}`}
                onClick={() => navigate(ROUTES.sellerOrders)}
              >
                <Package size={14} />
                {t('btnOrderScreen')}
              </button>

              <button
                className={`nav-btn ${currentPath === ROUTES.sellerSearch ? 'nav-btn--active nav-btn--seller' : ''}`}
                onClick={() => navigate(currentPath === ROUTES.sellerSearch ? ROUTES.sellerOrders : ROUTES.sellerSearch)}
              >
                <Search size={14} />
                {t('findMfrTab')}
              </button>
            </>
          )}

          {user.role !== 'admin' && <AccountMenu hasNewRequests={hasNewRequests} />}

          <button
            className="btn-back" 
            onClick={logout}
          >
            <LogOut size={14} />
            {t('btnLogout')}
          </button>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>
      {user.role !== 'admin' && <FeedbackModal />}
    </div>
  );
}
