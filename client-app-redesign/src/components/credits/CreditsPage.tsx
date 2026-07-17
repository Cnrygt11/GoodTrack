import { useState } from 'react';
import useCredits from '../../hooks/useCredits';
import { useSettings } from '../../context/SettingsContext';
import { TranslationKey } from '../../services/translations';
import { Check, ShieldCheck, Zap } from 'lucide-react';
import MockPaymentModal from '../ui/MockPaymentModal';
import styles from './CreditsPage.module.css';

/**
 * CreditsPage component rendering the subscription management dashboard.
 * Features plan details comparison, active tier highlighting, and tier upgrading.
 */
export default function CreditsPage() {
  const {
    balance,
    plan,
    renewsAt,
    planDetails,
    packages,
    isLoading,
    isUpgrading,
    isToppingUp,
    upgradePlan,
    topUp,
  } = useCredits();

  const { language, t } = useSettings();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  // Ödeme modali hem plan yükseltme hem kredi paketi satın alma için kullanılır.
  const [purchase, setPurchase] = useState<{
    label: string;
    price: number;
    confirm: () => Promise<boolean>;
  } | null>(null);

  // Alt plana geçiş kapalı: planDetails sunucudan artan sırada gelir (Free→Pro→Enterprise),
  // dizin sırası plan kademesi olarak kullanılır.
  const currentPlanRank = planDetails.findIndex((p) => p.plan.toLowerCase() === plan.toLowerCase());

  const handleUpgrade = (planName: string) => {
    if (isUpgrading) return;

    const detail = planDetails.find((p) => p.plan.toLowerCase() === planName.toLowerCase());
    const price = detail ? detail.price : 0;

    setPurchase({ label: planName, price, confirm: () => upgradePlan(planName) });
    setIsPaymentOpen(true);
  };

  const handleBuyPackage = (pkg: { id: string; credits: number; price: number }) => {
    if (isToppingUp) return;
    setPurchase({
      label: `${pkg.credits} ${t('navCredits')}`,
      price: pkg.price,
      confirm: () => topUp(pkg.id),
    });
    setIsPaymentOpen(true);
  };

  const handleConfirmPurchase = async () => {
    if (!purchase) return;
    const success = await purchase.confirm();
    if (!success) {
      throw new Error(t('creditWarnToast'));
    }
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoading) {
    return (
      <div className={styles['credits-page-loading']}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className={styles['credits-container']}>
      {/* Current Balance Overview */}
      <section className={styles['current-credits-panel']}>
        <div className={styles['credits-info-box']}>
          <h2 className={styles['credits-panel-title']}>{t('creditsTitle')}</h2>
          <p className={styles['credits-panel-subtitle']}>
            {t('currentPlan')}: <strong className={styles['highlight-plan-name']}>{plan}</strong>
          </p>
          {renewsAt && (
            <p className={styles['credits-panel-date']}>
              {t('renewDate')}: <span>{formatDate(renewsAt)}</span>
            </p>
          )}
        </div>
        <div className={styles['credits-value-box']}>
          <div className={styles['credits-large-number']}>{balance}</div>
          <div className={styles['credits-large-label']}>{t('remainingCredits')}</div>
        </div>
      </section>

      {/* Plan Grid */}
      <h3 className={styles['section-title-pricing']}>{t('subscriptionPlans')}</h3>
      <div className={styles['plans-grid']}>
        {planDetails.map((tier, tierRank) => {
          const isActive = tier.plan.toLowerCase() === plan.toLowerCase();
          const isLowerPlan = currentPlanRank >= 0 && tierRank < currentPlanRank;
          const cardClass = `${styles['plan-card']} ${isActive ? styles['plan-card--active'] : ''} ${styles['plan-card--' + tier.plan.toLowerCase()] || ''}`;

          return (
            <div key={tier.plan} className={cardClass}>
              {isActive && (
                <div className={styles['active-badge']}>
                  <ShieldCheck size={14} className={styles['active-badge-icon']} />
                  {t('currentPlanBadge')}
                </div>
              )}

              <div className={styles['plan-header']}>
                <h4 className={styles['plan-name']}>{tier.plan}</h4>
                <div className={styles['plan-price']}>
                  <span className={styles['price-currency']}>$</span>
                  <span className={styles['price-amount']}>{tier.price}</span>
                  <span className={styles['price-period']}>/mo</span>
                </div>
                <div className={styles['plan-credits-allocation']}>
                  {tier.credits} {t('navCredits')}
                </div>
              </div>

              <div className={styles['plan-body']}>
                <div className={styles['features-label']}>{t('features')}</div>
                <ul className={styles['plan-features-list']}>
                  {tier.features.map((featureKey) => (
                    <li key={featureKey} className={styles['feature-item']}>
                      <Check size={14} className={styles['feature-check-icon']} />
                      <span>{t(featureKey as TranslationKey)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles['plan-footer']}>
                {isActive ? (
                  <button type="button" className={styles['btn-plan-active']} disabled>
                    {`${tier.plan} ${t('ownedPlanSuffix')}`}
                  </button>
                ) : isLowerPlan ? (
                  // Alt plana geçiş kapalı (bakiye/özellik kaybı olmasın).
                  <button type="button" className={styles['btn-plan-active']} disabled>
                    {t('lowerPlanLocked')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles['btn-plan-upgrade']}
                    disabled={isUpgrading}
                    onClick={() => handleUpgrade(tier.plan)}
                  >
                    <Zap size={14} className={styles['btn-upgrade-icon']} />
                    {isUpgrading ? '...' : t('upgradeBtn')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Ek Kredi Paketleri — tek seferlik dolum; kredisi biten kullanıcı plana
          dokunmadan bakiye yükleyebilir. Paket kredileri aylık yenilemede silinmez. */}
      {packages.length > 0 && (
        <>
          <h3 className={styles['section-title-pricing']}>{t('creditPackagesTitle')}</h3>
          <p className={styles['packages-subtitle']}>{t('creditPackagesSubtitle')}</p>
          <div className={styles['packages-grid']}>
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`${styles['package-card']} ${pkg.popular ? styles['package-card--popular'] : ''}`}
              >
                {pkg.popular && (
                  <div className={styles['package-popular-badge']}>{t('popularBadge')}</div>
                )}
                <div className={styles['package-credits']}>
                  {pkg.credits} <span>{t('navCredits')}</span>
                </div>
                <div className={styles['package-price']}>
                  <span className={styles['price-currency']}>$</span>
                  <span className={styles['price-amount']}>{pkg.price}</span>
                </div>
                <button
                  type="button"
                  className={styles['btn-plan-upgrade']}
                  disabled={isToppingUp}
                  onClick={() => handleBuyPackage(pkg)}
                >
                  <Zap size={14} className={styles['btn-upgrade-icon']} />
                  {isToppingUp ? '...' : t('buyCreditsBtn')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Mock Payment Dialog (plan yükseltme + kredi paketi satın alma) */}
      {purchase && (
        <MockPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          planName={purchase.label}
          planPrice={purchase.price}
          onSuccess={handleConfirmPurchase}
        />
      )}
    </div>
  );
}
