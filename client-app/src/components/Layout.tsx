import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useData } from '../context/DataContext';
import { ROUTES } from '../constants/routes';
import { Package, Users, LogOut, Sun, Moon, User, Search } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();
  const { incomingRequests } = useData();
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
    navigate(user.role === 'mfr' ? ROUTES.mfrOrders : ROUTES.sellerOrders);
  };

  return (
    <div className={user.role === 'mfr' ? 'mfr-theme' : 'seller-theme'}>
      <header className="topbar">
        <div className="topbar-title" onClick={handleLogoClick} style={{ cursor: 'pointer', userSelect: 'none' }}>
          {t('appTitle')}{' '}
          <span 
            style={{ 
              color: user.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' 
            }}
          >
            {t('appSubTitle')}
          </span>
        </div>
        
        <div className="topbar-actions">
          {/* Theme & Language Switchers */}
          <div className="topbar-switchers">
            {/* Theme Toggle */}
            <button
              type="button"
              className="btn-secondary"
              onClick={toggleTheme}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '6px' }}
              title={theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              style={{ padding: '6px 10px', fontSize: '12px', fontWeight: 'bold', borderRadius: '6px' }}
            >
              {language === 'tr' ? 'EN' : 'TR'}
            </button>
          </div>

          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {t('userLabel')}:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {user.username}
            </strong>
          </span>
          
          <span className={`badge-role ${user.role}`}>
            {user.role === 'seller' ? t('roleSeller') : t('roleMfr')}
          </span>
          
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
          
          <button 
            className={`nav-btn ${
              currentPath === ROUTES.sellerConnections || currentPath === ROUTES.mfrConnections 
                ? `nav-btn--active nav-btn--${user.role}` 
                : ''
            }`}
            onClick={() => navigate(user.role === 'seller' ? ROUTES.sellerConnections : ROUTES.mfrConnections)}
            style={{ position: 'relative' }}
          >
            <Users size={14} />
            {user.role === 'seller' ? t('btnMyManufacturers') : t('btnMySellers')}
            {hasNewRequests && (
              <span 
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger, #ef4444)',
                  boxShadow: '0 0 0 2px var(--surface1)',
                }}
              />
            )}
          </button>

          <button 
            className={`nav-btn ${
              currentPath === ROUTES.sellerProfile || currentPath === ROUTES.mfrProfile 
                ? `nav-btn--active nav-btn--${user.role}` 
                : ''
            }`}
            onClick={() => navigate(user.role === 'mfr' ? ROUTES.mfrProfile : ROUTES.sellerProfile)}
          >
            <User size={14} />
            {t('btnMyAccount')}
          </button>
          
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
    </div>
  );
}
