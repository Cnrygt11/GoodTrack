import { useState } from 'react';
import useCredits from '../../hooks/useCredits';
import { useSettings } from '../../context/SettingsContext';
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
    isLoading, 
    isUpgrading, 
    upgradePlan 
  } = useCredits();
  
  const { language, t } = useSettings();

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [selectedPlanDetail, setSelectedPlanDetail] = useState<{ plan: string; price: number } | null>(null);

  const handleUpgrade = (planName: string) => {
    if (isUpgrading) return;
    
    const detail = planDetails.find(p => p.plan.toLowerCase() === planName.toLowerCase());
    const price = detail ? detail.price : 0;
    
    setSelectedPlanDetail({ plan: planName, price });
    setIsPaymentOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlanDetail) return;
    const success = await upgradePlan(selectedPlanDetail.plan);
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
        day: 'numeric'
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
        {planDetails.map((tier) => {
          const isActive = tier.plan.toLowerCase() === plan.toLowerCase();
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
                      <span>{t(featureKey as any)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles['plan-footer']}>
                {isActive ? (
                  <button type="button" className={styles['btn-plan-active']} disabled>
                    {t('currentPlanBadge')}
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

      {/* Mock Payment Dialog for Sandbox Upgrades */}
      {selectedPlanDetail && (
        <MockPaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          planName={selectedPlanDetail.plan}
          planPrice={selectedPlanDetail.price}
          onSuccess={handleConfirmUpgrade}
        />
      )}
    </div>
  );
}
