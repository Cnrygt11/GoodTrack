import React from 'react';
import { Product } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { Edit2, Info, Ban, Trash2 } from 'lucide-react';
import { ORDER_STATUS } from '../../utils/constants';

interface OrderMenuDropdownProps {
  product: Product;
  status: string;
  isEditable: boolean;
  onDropdownToggle: (id: string | null) => void;
  onEdit: (product: Product) => void;
  onViewTimeline: (product: Product) => void;
  onCancel: (productId: string) => Promise<void>;
  onDelete: (product: Product) => Promise<void>;
  onRequestCancel?: (productId: string) => Promise<void>;
}

export default function OrderMenuDropdown({
  product: p,
  status,
  isEditable,
  onDropdownToggle,
  onEdit,
  onViewTimeline,
  onCancel,
  onDelete,
  onRequestCancel,
}: OrderMenuDropdownProps) {
  const { language, t } = useSettings();

  return (
    <div className="dropdown-menu">
      {isEditable && (
        <DropdownItem 
          icon={<Edit2 size={13} className="color-accent" />} 
          label={language === 'tr' ? 'Düzenle' : 'Edit'} 
          onClick={() => { onEdit(p); onDropdownToggle(null); }} 
        />
      )}
      <DropdownItem 
        icon={<Info size={13} className="color-info" />} 
        label={t('btnViewTimeline')} 
        onClick={() => { onViewTimeline(p); onDropdownToggle(null); }} 
      />
      {isEditable && (
        <>
          <div className="dropdown-divider" />
          <DropdownItem 
            icon={<Ban size={13} className="color-danger" />} 
            label={t('btnCancelOrder')} 
            isDanger 
            onClick={() => { onCancel(p.id); onDropdownToggle(null); }} 
          />
          {status === ORDER_STATUS.AWAITING && (
            <DropdownItem 
              icon={<Trash2 size={13} className="color-danger" />} 
              label={language === 'tr' ? 'Sil' : 'Delete'} 
              isDanger 
              onClick={() => { onDelete(p); onDropdownToggle(null); }} 
            />
          )}
        </>
      )}
      {status === ORDER_STATUS.PRODUCTION && !p.cancelRequested && (
        <>
          <div className="dropdown-divider" />
          <DropdownItem
            icon={<Ban size={13} className="color-danger" />}
            label={language === 'tr' ? 'İptal Talebi Gönder' : 'Request Cancellation'}
            isDanger
            onClick={() => {
              onRequestCancel?.(p.id);
              onDropdownToggle(null);
            }}
          />
        </>
      )}
    </div>
  );
}

interface DropdownItemProps {
  icon: React.ReactNode;
  label: string;
  isDanger?: boolean;
  onClick: () => void;
}
function DropdownItem({ icon, label, isDanger, onClick }: DropdownItemProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`dropdown-menu-item ${isDanger ? 'danger' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}
