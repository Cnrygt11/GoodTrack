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
  Search,
  Bell,
  Zap,
  ShieldCheck,
  RefreshCw,
  Coins,
  Check,
} from 'lucide-react';
import { TranslationKey } from '../../services/translations';

const FEATURES: Array<{
  icon: ReactNode;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  tone: 'seller' | 'mfr' | 'success';
}> = [
  {
    icon: <PackageSearch size={20} />,
    titleKey: 'landingFeatOrdersTitle',
    descKey: 'landingFeatOrdersDesc',
    tone: 'seller',
  },
  {
    icon: <BellRing size={20} />,
    titleKey: 'landingFeatRealtimeTitle',
    descKey: 'landingFeatRealtimeDesc',
    tone: 'mfr',
  },
  {
    icon: <Camera size={20} />,
    titleKey: 'landingFeatDefectTitle',
    descKey: 'landingFeatDefectDesc',
    tone: 'success',
  },
  {
    icon: <LayoutGrid size={20} />,
    titleKey: 'landingFeatCatalogTitle',
    descKey: 'landingFeatCatalogDesc',
    tone: 'mfr',
  },
  {
    icon: <Store size={20} />,
    titleKey: 'landingFeatEtsyTitle',
    descKey: 'landingFeatEtsyDesc',
    tone: 'seller',
  },
  {
    icon: <CreditCard size={20} />,
    titleKey: 'landingFeatPlansTitle',
    descKey: 'landingFeatPlansDesc',
    tone: 'success',
  },
];

const STEPS: Array<{ titleKey: TranslationKey; descKey: TranslationKey }> = [
  { titleKey: 'landingStep1Title', descKey: 'landingStep1Desc' },
  { titleKey: 'landingStep2Title', descKey: 'landingStep2Desc' },
  { titleKey: 'landingStep3Title', descKey: 'landingStep3Desc' },
];

const TRUST_ITEMS: Array<{ icon: ReactNode; key: TranslationKey }> = [
  { icon: <Zap size={16} />, key: 'landingTrust1' },
  { icon: <ShieldCheck size={16} />, key: 'landingTrust2' },
  { icon: <RefreshCw size={16} />, key: 'landingTrust3' },
  { icon: <Coins size={16} />, key: 'landingTrust4' },
];

const HERO_POINTS: TranslationKey[] = [
  'landingHeroPoint1',
  'landingHeroPoint2',
  'landingHeroPoint3',
];

const FAQ_ITEMS: Array<{ qKey: TranslationKey; aKey: TranslationKey }> = [
  { qKey: 'landingFaq1Q', aKey: 'landingFaq1A' },
  { qKey: 'landingFaq2Q', aKey: 'landingFaq2A' },
  { qKey: 'landingFaq3Q', aKey: 'landingFaq3A' },
  { qKey: 'landingFaq4Q', aKey: 'landingFaq4A' },
];

export default function LandingPage() {
  const { language, setLanguage, theme, toggleTheme, t } = useSettings();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="landing-page">
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
            <a href="#faq">{t('landingNavFaq')}</a>
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
              <>
                <Link to="/login" className="landing-btn-ghost">
                  {t('landingLoginBtn')}
                </Link>
                <Link to="/register" className="landing-btn-solid seller landing-nav-register">
                  {t('landingGetStartedFree')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="landing-hero">
        <div className="landing-hero-backdrop" aria-hidden="true" />
        <span className="landing-badge">
          <span className="landing-badge-pulse" aria-hidden="true" />
          {t('landingBadge')}
        </span>
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

        <ul className="landing-hero-points">
          {HERO_POINTS.map((key) => (
            <li key={key}>
              <Check size={14} />
              {t(key)}
            </li>
          ))}
        </ul>

        {/* Stylized dashboard preview (decorative) */}
        <div className="landing-preview" aria-hidden="true">
          <div className="lp-window">
            <div className="lp-titlebar">
              <span />
              <span />
              <span />
              <div className="lp-search">
                <Search size={11} />
                <i className="lp-line w30" />
              </div>
              <div className="lp-bell">
                <Bell size={12} />
                <em />
              </div>
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
                    <span className="lp-progress">
                      <i style={{ width: '55%' }} className="prod" />
                    </span>
                    <span className="lp-pill prod">{t('landingPvInProd')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w35" />
                    <span className="lp-progress">
                      <i style={{ width: '80%' }} className="ship" />
                    </span>
                    <span className="lp-pill ship">{t('landingPvShipped')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w25" />
                    <span className="lp-progress">
                      <i style={{ width: '100%' }} className="done" />
                    </span>
                    <span className="lp-pill done">{t('landingPvDelivered')}</span>
                  </div>
                  <div className="lp-row">
                    <span className="lp-dot" />
                    <span className="lp-line w32" />
                    <span className="lp-progress">
                      <i style={{ width: '35%' }} className="prod" />
                    </span>
                    <span className="lp-pill prod">{t('landingPvInProd')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating notification cards */}
          <div className="lp-float lp-float-order">
            <span className="lp-float-icon seller">
              <Package size={14} />
            </span>
            <div>
              <strong>{t('landingPvNewOrder')}</strong>
              <i className="lp-line w40" />
            </div>
          </div>
          <div className="lp-float lp-float-defect">
            <span className="lp-float-icon mfr">
              <Camera size={14} />
            </span>
            <div>
              <strong>{t('landingPvDefectNote')}</strong>
              <i className="lp-line w40" />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <ul className="landing-trust-strip">
          {TRUST_ITEMS.map((item) => (
            <li key={item.key}>
              {item.icon}
              {t(item.key)}
            </li>
          ))}
        </ul>
      </section>

      {/* ===== Features ===== */}
      <section id="features" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">{t('landingNavFeatures')}</span>
          <h2>{t('landingFeaturesTitle')}</h2>
          <p>{t('landingFeaturesDesc')}</p>
        </div>
        <div className="landing-feature-grid">
          {FEATURES.map((feature) => (
            <div className={`landing-feature-item ${feature.tone}`} key={feature.titleKey}>
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
          <span className="landing-eyebrow">{t('landingNavHow')}</span>
          <h2>{t('landingHowTitle')}</h2>
          <p>{t('landingHowDesc')}</p>
        </div>
        <div className="landing-steps">
          {STEPS.map((step, index) => (
            <div className="landing-step" key={step.titleKey}>
              <div className="landing-step-track" aria-hidden="true">
                <span className="landing-step-marker">{index + 1}</span>
                {index < STEPS.length - 1 && <span className="landing-step-connector" />}
              </div>
              <h3>{t(step.titleKey)}</h3>
              <p>{t(step.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Roles ===== */}
      <section id="roles" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">{t('landingNavRoles')}</span>
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

      {/* ===== FAQ ===== */}
      <section id="faq" className="landing-section">
        <div className="landing-section-head">
          <span className="landing-eyebrow">{t('landingNavFaq')}</span>
          <h2>{t('landingFaqTitle')}</h2>
          <p>{t('landingFaqDesc')}</p>
        </div>
        <div className="landing-faq-list">
          {FAQ_ITEMS.map((item) => (
            <details className="landing-faq-item" key={item.qKey}>
              <summary>
                {t(item.qKey)}
                <ArrowRight size={15} className="landing-faq-chevron" />
              </summary>
              <p>{t(item.aKey)}</p>
            </details>
          ))}
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
          <div className="landing-footer-brand">
            <Link to="/" className="auth-wordmark">
              <span className="auth-wordmark-mark" aria-hidden="true">
                G
              </span>
              Good<span className="auth-wordmark-accent">Track</span>
            </Link>
            <p>{t('landingFooterTagline')}</p>
          </div>
          <div className="landing-footer-col">
            <h4>{t('landingFooterProduct')}</h4>
            <a href="#features">{t('landingNavFeatures')}</a>
            <a href="#how-it-works">{t('landingNavHow')}</a>
            <a href="#roles">{t('landingNavRoles')}</a>
            <a href="#faq">{t('landingNavFaq')}</a>
          </div>
          <div className="landing-footer-col">
            <h4>{t('landingFooterLegal')}</h4>
            <Link to="/privacy">{t('footerPrivacy')}</Link>
            <Link to="/terms">{t('footerTerms')}</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span className="landing-footer-copy">
            © {new Date().getFullYear()} GoodTrack. {t('landingAllRightsReserved')}
          </span>
          {/* Etsy API kullanım koşullarının istediği birebir atıf kalıbı */}
          <span className="landing-footer-attribution">{t('etsyOfficialAttribution')}</span>
        </div>
      </footer>
    </div>
  );
}
