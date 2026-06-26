import { useState } from 'react';
import useCredits from '../../hooks/useCredits';
import { useSettings } from '../../context/SettingsContext';
import { Check, ShieldCheck, Zap } from 'lucide-react';
import MockPaymentModal from '../ui/MockPaymentModal';

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
      <div className="credits-page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="credits-container">
      {/* Current Balance Overview */}
      <section className="current-credits-panel">
        <div className="credits-info-box">
          <h2 className="credits-panel-title">{t('creditsTitle')}</h2>
          <p className="credits-panel-subtitle">
            {t('currentPlan')}: <strong className="highlight-plan-name">{plan}</strong>
          </p>
          {renewsAt && (
            <p className="credits-panel-date">
              {t('renewDate')}: <span>{formatDate(renewsAt)}</span>
            </p>
          )}
        </div>
        <div className="credits-value-box">
          <div className="credits-large-number">{balance}</div>
          <div className="credits-large-label">{t('remainingCredits')}</div>
        </div>
      </section>

      {/* Plan Grid */}
      <h3 className="section-title-pricing">{t('subscriptionPlans')}</h3>
      <div className="plans-grid">
        {planDetails.map((tier) => {
          const isActive = tier.plan.toLowerCase() === plan.toLowerCase();
          const cardClass = `plan-card ${isActive ? 'plan-card--active' : ''} plan-card--${tier.plan.toLowerCase()}`;

          return (
            <div key={tier.plan} className={cardClass}>
              {isActive && (
                <div className="active-badge">
                  <ShieldCheck size={14} className="active-badge-icon" />
                  {t('currentPlanBadge')}
                </div>
              )}
              
              <div className="plan-header">
                <h4 className="plan-name">{tier.plan}</h4>
                <div className="plan-price">
                  <span className="price-currency">$</span>
                  <span className="price-amount">{tier.price}</span>
                  <span className="price-period">/mo</span>
                </div>
                <div className="plan-credits-allocation">
                  {tier.credits} {t('navCredits')}
                </div>
              </div>

              <div className="plan-body">
                <div className="features-label">{t('features')}</div>
                <ul className="plan-features-list">
                  {tier.features.map((featureKey) => (
                    <li key={featureKey} className="feature-item">
                      <Check size={14} className="feature-check-icon" />
                      <span>{t(featureKey as any)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plan-footer">
                {isActive ? (
                  <button type="button" className="btn-plan-active" disabled>
                    {t('currentPlanBadge')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-plan-upgrade"
                    disabled={isUpgrading}
                    onClick={() => handleUpgrade(tier.plan)}
                  >
                    <Zap size={14} className="btn-upgrade-icon" />
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
