import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sun,
  Moon,
  ArrowRight,
  Package,
  Layers,
  CheckCircle,
  PackageSearch,
  BellRing,
  Camera,
  LayoutGrid,
  Store,
  CreditCard,
} from 'lucide-react';
import { TranslationKey } from '../../services/translations';
import ScrollGlowDot from './ScrollGlowDot';

const FEATURES: Array<{
  icon: ReactNode;
  titleKey: TranslationKey;
  descKey: TranslationKey;
}> = [
  {
    icon: <PackageSearch size={20} />,
    titleKey: 'landingFeatOrdersTitle',
    descKey: 'landingFeatOrdersDesc',
  },
  {
    icon: <BellRing size={20} />,
    titleKey: 'landingFeatRealtimeTitle',
    descKey: 'landingFeatRealtimeDesc',
  },
  {
    icon: <Camera size={20} />,
    titleKey: 'landingFeatDefectTitle',
    descKey: 'landingFeatDefectDesc',
  },
  {
    icon: <LayoutGrid size={20} />,
    titleKey: 'landingFeatCatalogTitle',
    descKey: 'landingFeatCatalogDesc',
  },
  { icon: <Store size={20} />, titleKey: 'landingFeatEtsyTitle', descKey: 'landingFeatEtsyDesc' },
  {
    icon: <CreditCard size={20} />,
    titleKey: 'landingFeatPlansTitle',
    descKey: 'landingFeatPlansDesc',
  },
];

const STEPS: Array<{ titleKey: TranslationKey; descKey: TranslationKey }> = [
  { titleKey: 'landingStep1Title', descKey: 'landingStep1Desc' },
  { titleKey: 'landingStep2Title', descKey: 'landingStep2Desc' },
  { titleKey: 'landingStep3Title', descKey: 'landingStep3Desc' },
];

export default function LandingPage() {
  const { language, setLanguage, theme, toggleTheme, t } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <ScrollGlowDot />
      {/* ===== Navbar ===== */}
      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <Link to="/" className="auth-wordmark">
            <span className="auth-wordmark-mark" aria-hidden="true">
              G
            </span>
            Good<span className="auth-wordmark-accent">Track</span>
          </Link>

          <nav className="landing-nav-links">
            <a href="#features">{t('landingNavFeatures')}</a>
            <a href="#how-it-works">{t('landingNavHow')}</a>
            <a href="#roles">{t('landingNavRoles')}</a>
          </nav>

          <div className="landing-nav-actions">
            <button
              type="button"
              className="auth-topbar-btn"
              onClick={toggleTheme}
              title={
                theme === 'dark' ? 'Aydınlık Tema / Light Theme' : 'Karanlık Tema / Dark Theme'
              }
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              type="button"
              className="auth-topbar-btn"
              onClick={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
            >
              {t('landingLangOption')}
            </button>
            {user ? (
              <button
                type="button"
                onClick={() => navigate(user.role === 'mfr' ? '/mfr/orders' : '/seller/orders')}
                className={`landing-btn-solid ${user.role === 'mfr' ? 'mfr' : 'seller'}`}
              >
                {t('landingGoToPanel')}
                <ArrowRight size={14} />
              </button>
            ) : (
              <Link to="/login" className="landing-btn-ghost">
                {t('landingLoginBtn')}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="landing-hero">
        <span className="landing-badge">{t('landingBadge')}</span>
        <h1 className="landing-hero-title">
          {t('landingHeroTitleA')}
          <br />
          <span>{t('landingHeroTitleB')}</span>
        </h1>
        <p className="landing-hero-desc">{t('landingHeroDesc')}</p>

        {!user && (
          <div className="landing-cta-row">
            <Link to="/register" className="landing-btn-solid seller lg">
              {t('landingGetStartedFree')}
              <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="landing-btn-ghost lg">
              {t('landingLoginBtn')}
            </Link>
          </div>
        )}

        {/* Stylized dashboard preview (decorative) */}
        <div className="landing-preview" aria-hidden="true">
          <div className="lp-window">
            <div className="lp-titlebar">
              <span />
              <span />
              <span />
            </div>
            <div className="lp-body">
              <div className="lp-sidebar">
                <div className="lp-side-item active" />
                <div className="lp-side-item" />
                <div className="lp-side-item" />
                <div className="lp-side-item" />
                <div className="lp-side-item" />
              </div>
              <div className="lp-main">
                <div className="lp-stats">
                  <div className="lp-stat">
                    <span className="lp-line w40" />
                    <span className="lp-num seller" />
                    <div className="lp-spark">
                      <i style={{ height: '40%' }} />
                      <i style={{ height: '65%' }} />
                      <i style={{ height: '50%' }} />
                      <i style={{ height: '80%' }} />
                      <i style={{ height: '100%' }} />
                    </div>
                  </div>
                  <div className="lp-stat">
                    <span className="lp-line w40" />
                    <span className="lp-num mfr" />
                    <div className="lp-spark mfr">
                      <i style={{ height: '30%' }} />
                      <i style={{ height: '55%' }} />
                      <i style={{ height: '90%' }} />
                      <i style={{ height: '60%' }} />
                      <i style={{ height: '75%' }} />
                    </div>
                  </div>
                  <div className="lp-stat">
                    <span className="lp-line w40" />
                    <span className="lp-num success" />
                    <div className="lp-spark success">
                      <i style={{ height: '50%' }} />
                      <i style={{ height: '45%' }} />
                      <i style={{ height: '70%' }} />
                      <i style={{ height: '85%' }} />
                      <i style={{ height: '95%' }} />
                    </div>
                  </div>
                </div>
                <div className="lp-rows">
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w30" />
                    <span className="lp-line w20" />
                    <span className="lp-pill prod">{t('landingPvInProd')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w35" />
                    <span className="lp-line w15" />
                    <span className="lp-pill ship">{t('landingPvShipped')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w25" />
                    <span className="lp-line w20" />
                    <span className="lp-pill done">{t('landingPvDelivered')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w32" />
                    <span className="lp-line w18" />
                    <span className="lp-pill prod">{t('landingPvInProd')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <h2>{t('landingFeaturesTitle')}</h2>
          <p>{t('landingFeaturesDesc')}</p>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <div className="landing-feature-item" key={feature.titleKey}>
              <span className="landing-feature-item-icon">{feature.icon}</span>
              <h3>{t(feature.titleKey)}</h3>
              <p>{t(feature.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how-it-works" className="landing-section">
        <div className="landing-section-head">
          <h2>{t('landingHowTitle')}</h2>
          <p>{t('landingHowDesc')}</p>
        </div>
        <div className="landing-steps">
          {STEPS.map((step, index) => (
            <div className="landing-step" key={step.titleKey}>
              <span className="landing-step-num">{String(index + 1).padStart(2, '0')}</span>
              <h3>{t(step.titleKey)}</h3>
              <p>{t(step.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Roles ===== */}
      <section id="roles" className="landing-section">
        <div className="landing-section-head">
          <h2>{t('landingRolesTitle')}</h2>
          <p>{t('landingRolesDesc')}</p>
        </div>
        <div className="landing-roles-grid">
          <div className="landing-role-card seller">
            <div className="landing-role-icon">
              <Package size={22} />
            </div>
            <h3>{t('landingForSellers')}</h3>
            <p>{t('landingForSellersDesc')}</p>
            <ul>
              <li>
                <CheckCircle size={15} />
                {t('landingSellerFeature1')}
              </li>
              <li>
                <CheckCircle size={15} />
                {t('landingSellerFeature2')}
              </li>
              <li>
                <CheckCircle size={15} />
                {t('landingSellerFeature3')}
              </li>
            </ul>
          </div>

          <div className="landing-role-card mfr">
            <div className="landing-role-icon">
              <Layers size={22} />
            </div>
            <h3>{t('landingForMfrs')}</h3>
            <p>{t('landingForMfrsDesc')}</p>
            <ul>
              <li>
                <CheckCircle size={15} />
                {t('landingMfrFeature1')}
              </li>
              <li>
                <CheckCircle size={15} />
                {t('landingMfrFeature2')}
              </li>
              <li>
                <CheckCircle size={15} />
                {t('landingMfrFeature3')}
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== CTA Banner ===== */}
      {!user && (
        <section className="landing-section">
          <div className="landing-cta-banner">
            <h2>{t('landingCtaTitle')}</h2>
            <p>{t('landingCtaDesc')}</p>
            <Link to="/register" className="landing-btn-solid inverse lg">
              {t('landingGetStartedFree')}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

      {/* ===== Footer ===== */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Link to="/" className="auth-wordmark">
            <span className="auth-wordmark-mark" aria-hidden="true">
              G
            </span>
            Good<span className="auth-wordmark-accent">Track</span>
          </Link>
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} GoodTrack. {t('landingAllRightsReserved')}
          </span>
        </div>
      </footer>
    </div>
  );
}
