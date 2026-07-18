import { ORDER_STATUS } from './constants';

/**
 * Bir siparişin efektif durumunu türetir. Yeni kayıtlar `status` alanını taşır;
 * eski kayıtlar için boolean bayraklardan (isDefective/completed/isPendingApproval)
 * geri düşülür.
 */
export function deriveStatus(p: {
  status?: string;
  isDefective?: boolean;
  completed?: boolean;
  isPendingApproval?: boolean;
}): string {
  return (
    p.status ||
    (p.isDefective
      ? ORDER_STATUS.DEFECTIVE
      : p.completed
        ? ORDER_STATUS.COMPLETED
        : p.isPendingApproval
          ? ORDER_STATUS.AWAITING
          : ORDER_STATUS.PRODUCTION)
  );
}
