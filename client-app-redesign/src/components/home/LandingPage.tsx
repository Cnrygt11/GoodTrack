import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { Sun, Moon, ArrowRight, Package, Layers, CheckCircle } from 'lucide-react';

export default function LandingPage() {
  const { language, setLanguage, theme, toggleTheme, t } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div id="splash" className="landing-splash-container">
      {/* Top Navbar */}
      <div className="landing-navbar">
        <div className="landing-logo">
          GOOD<span style={{ color: 'var(--accent-seller)' }}>TRACK</span>
        </div>

        <div className="landing-nav-actions">
          {/* Language Selector */}
          <button
            type="button"
            className="btn-secondary landing-btn-lang"
            onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
          >
            {t('landingLangOption')}
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            className="btn-secondary landing-btn-theme"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Dashboard Action Button (only if logged in) */}
          {user && (
            <button
              onClick={() => navigate(user.role === 'mfr' ? '/mfr/orders' : '/seller/orders')}
              className={`btn-primary landing-panel-btn ${user.role}`}
            >
              {t('landingGoToPanel')}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Hero Content */}
      <div className="landing-hero">
        <h1 className="splash-title landing-hero-title">
          {t('landingHeroTitle1')}<br />
          <span>{t('landingHeroTitle2')}</span>
        </h1>
        
        <p className="landing-hero-desc">
          {t('landingHeroDesc')}
        </p>

        {!user && (
          <div className="landing-cta-row">
            <Link
              to="/register"
              className="btn-primary landing-cta-btn-primary"
            >
              {t('landingGetStartedFree')}
              <ArrowRight size={16} />
            </Link>

            <Link
              to="/login"
              className="btn-secondary landing-cta-btn-secondary"
            >
              {t('landingLoginBtn')}
            </Link>
          </div>
        )}
      </div>

      {/* Role Feature Grids */}
      <div className="landing-features-grid">
        {/* For Sellers */}
        <div className="feature-card seller">
          <div className="landing-feature-icon">
            <Package size={24} />
          </div>
          <h3>
            {t('landingForSellers')}
          </h3>
          <p>
            {t('landingForSellersDesc')}
          </p>
          <ul>
            <li>
              <CheckCircle size={14} />
              {t('landingSellerFeature1')}
            </li>
            <li>
              <CheckCircle size={14} />
              {t('landingSellerFeature2')}
            </li>
            <li>
              <CheckCircle size={14} />
              {t('landingSellerFeature3')}
            </li>
          </ul>
        </div>

        {/* For Manufacturers */}
        <div className="feature-card mfr">
          <div className="landing-feature-icon">
            <Layers size={24} />
          </div>
          <h3>
            {t('landingForMfrs')}
          </h3>
          <p>
            {t('landingForMfrsDesc')}
          </p>
          <ul>
            <li>
              <CheckCircle size={14} />
              {t('landingMfrFeature1')}
            </li>
            <li>
              <CheckCircle size={14} />
              {t('landingMfrFeature2')}
            </li>
            <li>
              <CheckCircle size={14} />
              {t('landingMfrFeature3')}
            </li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="landing-footer">
        &copy; {new Date().getFullYear()} GOODTRACK. {t('landingAllRightsReserved')}
      </div>
    </div>
  );
}
