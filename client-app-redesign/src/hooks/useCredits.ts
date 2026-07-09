import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';
import { api, SubscriptionPlanDetail } from '../services/apiClient';

/**
 * React Query anahtarları — kredi/plan verisini geçersiz kılmak (invalidate) için paylaşılır.
 */
export const creditsKeys = {
  credits: ['credits'] as const,
  plans: ['credits', 'plans'] as const,
};

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
 * Abonelik/kredi durumunu React Query ile yöneten hook. Sunucu durumu artık
 * DataContext yerine React Query cache'inde tutulur (yalnız seller rolü için çekilir).
 */
export default function useCredits(): UseCreditsReturn {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useSettings();
  const queryClient = useQueryClient();

  const isSeller = user?.role === 'seller';

  const creditsQuery = useQuery({
    queryKey: creditsKeys.credits,
    queryFn: () => api.getCredits(),
    enabled: isSeller,
  });

  const plansQuery = useQuery({
    queryKey: creditsKeys.plans,
    queryFn: () => api.getPlans(),
    enabled: isSeller,
  });

  const upgradeMutation = useMutation({
    mutationFn: (planName: string) => api.upgradePlan(planName),
    onSuccess: (res) => {
      // Yükseltme sonucu güncel krediyi döndürür; cache'i doğrudan tazele.
      queryClient.setQueryData(creditsKeys.credits, res.credits);
    },
  });

  const upgradePlan = useCallback(
    async (planName: string): Promise<boolean> => {
      try {
        await upgradeMutation.mutateAsync(planName);
        showToast(t('upgradeSuccess'));
        return true;
      } catch (err: unknown) {
        showToast(extractErrorMessage(err));
        return false;
      }
    },
    [upgradeMutation, showToast, t]
  );

  const fetchCredits = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: creditsKeys.credits });
  }, [queryClient]);

  return {
    balance: creditsQuery.data?.credits ?? 0,
    plan: creditsQuery.data?.plan ?? 'Free',
    renewsAt: creditsQuery.data?.renewsAt ?? '',
    planDetails: plansQuery.data ?? [],
    isLoading: creditsQuery.isLoading,
    isUpgrading: upgradeMutation.isPending,
    upgradePlan,
    fetchCredits,
  };
}
