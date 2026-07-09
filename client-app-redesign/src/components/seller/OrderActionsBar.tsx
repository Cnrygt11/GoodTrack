import React from 'react';
import { Product } from '../../services/apiClient';
import { Send, Info } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface OrderActionsBarProps {
  product: Product;
  status: string;
  onVerify: (productId: string, action: 'correct' | 'defective' | 'missing') => void;
  onShip: (productId: string) => Promise<void>;
  onViewTimeline: (product: Product) => void;
}

export default function OrderActionsBar({
  product: p,
  status,
  onVerify,
  onShip,
  onViewTimeline,
}: OrderActionsBarProps) {
  const { t } = useSettings();

  return (
    <div className="order-action-bar">
      {status === 'delivered' && (
        <>
          <ActionBtn type="correct" onClick={() => onVerify(p.id, 'correct')}>{t('btnVerifyCorrect')}</ActionBtn>
          <ActionBtn type="defective" onClick={() => onVerify(p.id, 'defective')}>{t('btnVerifyDefective')}</ActionBtn>
          <ActionBtn type="missing" onClick={() => onVerify(p.id, 'missing')}>{t('btnVerifyMissing')}</ActionBtn>
        </>
      )}
      {status === 'to_ship' && (
        <ActionBtn type="ship" icon={<Send size={12} />} onClick={() => onShip(p.id)} fullWidth>{t('btnMarkShipped')}</ActionBtn>
      )}
      {(status === 'shipped' || status === 'cancelled') && (
        <ActionBtn type="archive" bordered icon={<Info size={12} />} onClick={() => onViewTimeline(p)} fullWidth>{t('btnViewTimeline')}</ActionBtn>
      )}
    </div>
  );
}

interface ActionBtnProps {
  type: 'correct' | 'defective' | 'missing' | 'ship' | 'archive';
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  bordered?: boolean;
}
function ActionBtn({ type, onClick, children, icon, fullWidth, bordered }: ActionBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`action-btn action-btn--${type} ${fullWidth ? 'action-btn--full' : ''} ${bordered ? 'action-btn--bordered' : ''}`}
    >
      {icon}
      {children}
    </button>
  );
}

