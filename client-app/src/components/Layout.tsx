import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Package, Users, LogOut, Sun, Moon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout, activeScreen, setActiveScreen, setIsConnectionsModalOpen } = useAuth();
  const { theme, language, toggleTheme, setLanguage, t } = useSettings();

  if (!user) return <>{children}</>;

  const handleCatalogToggle = () => {
    if (activeScreen === 'catalog') {
      setActiveScreen('seller');
    } else {
      setActiveScreen('catalog');
    }
  };

  return (
    <div className={user.role === 'mfr' ? 'mfr-theme' : 'seller-theme'}>
      <header className="topbar">
        <div className="topbar-title">
          {t('appTitle')}{' '}
          <span 
            style={{ 
              color: user.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' 
            }}
          >
            {t('appSubTitle')}
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Theme & Language Switchers */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid var(--border)', paddingRight: '16px' }}>
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
          
          {user.role === 'seller' && (
            <button 
              className="btn-secondary" 
              onClick={handleCatalogToggle}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
            >
              <Package size={14} />
              {activeScreen === 'catalog' ? t('btnOrderScreen') : t('btnMyProducts')}
            </button>
          )}
          
          <button 
            className="btn-secondary" 
            onClick={() => setIsConnectionsModalOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '13px', borderRadius: '6px' }}
          >
            <Users size={14} />
            {user.role === 'seller' ? t('btnMyManufacturers') : t('btnMySellers')}
          </button>
          
          <button 
            className="btn-back" 
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
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
