import React from 'react';
import { Package, Edit2, Trash2 } from 'lucide-react';
import { CatalogProduct } from '../../services/api';
import Lightbox from '../ui/Lightbox';
import { useSettings } from '../../context/SettingsContext';

interface CatalogItemCardProps {
  product: CatalogProduct;
  onEdit: (product: CatalogProduct) => void;
  onDelete: (id: string) => void;
}

export default function CatalogItemCard({
  product,
  onEdit,
  onDelete
}: CatalogItemCardProps) {
  const { t, language } = useSettings();
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  return (
    <div className="product-card">
      {product.image ? (
        <div 
          className="product-thumb"
          onClick={() => setIsLightboxOpen(true)}
          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          title={t('clickToInspectDetails')}
        >
          <img src={product.image} alt="ürün" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={24} style={{ color: 'var(--muted)' }} />
        </div>
      )}
      <div className="product-info">
        <div className="product-code">{product.productCode}</div>
        <div className="product-fields" style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
          <div className="product-field-chip" style={{ border: '1px solid var(--accent-mfr)', color: 'var(--accent-mfr)' }}>
            <strong>{t('assignedManufacturerLabel')}:</strong> {product.mfrName}
          </div>
          {product.extras && Object.values(product.extras).map((val, idx) => {
            if (!val.value) return null;
            return (
              <div className="product-field-chip" key={idx} title={`${val.name}: ${val.value}`}>
                <strong>{val.name}:</strong> {val.value}
              </div>
            );
          })}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
        <button 
          type="button"
          className="btn-secondary" 
          style={{ 
            borderColor: 'var(--accent-seller)', 
            color: 'var(--accent-seller)', 
            fontSize: '12px', 
            padding: '6px 12px', 
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            justifyContent: 'center'
          }}
          onClick={() => onEdit(product)}
        >
          <Edit2 size={14} />
          {t('editBtn')}
        </button>
        <button 
          type="button"
          className="btn-secondary" 
          style={{ 
            borderColor: 'var(--danger)', 
            color: 'var(--danger)', 
            fontSize: '12px', 
            padding: '6px 12px', 
            borderRadius: '6px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            flex: 1,
            justifyContent: 'center'
          }}
          onClick={() => onDelete(product.id)}
        >
          <Trash2 size={14} />
          {t('deleteBtn')}
        </button>
      </div>
      {product.image && (
        <Lightbox
          isOpen={isLightboxOpen}
          src={product.image}
          onClose={() => setIsLightboxOpen(false)}
          altText={product.productCode}
        />
      )}
    </div>
  );
}
