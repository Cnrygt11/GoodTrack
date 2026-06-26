import { useNavigate } from 'react-router-dom';
import useCredits from '../../hooks/useCredits';
import { useSettings } from '../../context/SettingsContext';
import { ROUTES } from '../../constants/routes';
import { Coins } from 'lucide-react';

/**
 * Navbar widget displaying the seller's subscription plan and remaining credits.
 */
export default function CreditsWidget() {
  const navigate = useNavigate();
  const { balance, plan, isLoading } = useCredits();
  const { t } = useSettings();

  if (isLoading) {
    return (
      <div className="credits-widget credits-widget--loading">
        <span className="credits-widget-spinner" />
      </div>
    );
  }

  const isLow = balance <= 5;
  const widgetClass = `credits-widget ${isLow ? 'credits-widget--low' : ''}`;

  return (
    <button
      type="button"
      className={widgetClass}
      onClick={() => navigate(ROUTES.sellerCredits)}
      title={isLow ? t('creditsLowWarning') : t('creditsTitle')}
    >
      <Coins size={14} className="credits-widget-icon" />
      <span className="credits-widget-plan">{plan}</span>
      <span className="credits-widget-divider">|</span>
      <span className="credits-widget-balance">
        {balance} {t('navCredits')}
      </span>
    </button>
  );
}
