import { useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';
import { SubscriptionPlanDetail } from '../services/api';

/**
 * Return type interface for the useCredits custom hook.
 */
export interface UseCreditsReturn {
  /** The current user's remaining credits */
  balance: number;
  /** The current subscription plan name */
  plan: string;
  /** Renewal date of the current plan cycle */
  renewsAt: string;
  /** List of all available subscription plans and details */
  planDetails: SubscriptionPlanDetail[];
  /** Loading state flag */
  isLoading: boolean;
  /** Action state flag for upgrading process */
  isUpgrading: boolean;
  /** Upgrades the user's plan to the target plan */
  upgradePlan: (planName: string) => Promise<boolean>;
  /** Refetches the user's credit status from backend */
  fetchCredits: () => Promise<void>;
}

/**
 * Custom hook to manage the billing and subscription credit operations.
 * Delegates states and api logic to global DataContext for seamless synchronization.
 */
export default function useCredits(): UseCreditsReturn {
  const {
    balance,
    plan,
    renewsAt,
    planDetails,
    isCreditsLoading,
    isUpgrading,
    refreshCredits,
    upgradePlan: upgradePlanContext
  } = useData();

  const { showToast } = useToast();
  const { t } = useSettings();

  const upgradePlan = useCallback(async (planName: string): Promise<boolean> => {
    try {
      const success = await upgradePlanContext(planName);
      if (success) {
        showToast(t('upgradeSuccess'));
      }
      return success;
    } catch (err: unknown) {
      showToast(extractErrorMessage(err));
      return false;
    }
  }, [upgradePlanContext, showToast, t]);

  return {
    balance,
    plan,
    renewsAt,
    planDetails,
    isLoading: isCreditsLoading,
    isUpgrading,
    upgradePlan,
    fetchCredits: refreshCredits,
  };
}
