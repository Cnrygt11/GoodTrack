import React from 'react';
import { Package, Edit2, Trash2 } from 'lucide-react';
import { CatalogProduct } from '../../services/api';

interface CatalogItemCardProps {
  product: CatalogProduct;
  language: string;
  onEdit: (product: CatalogProduct) => void;
  onDelete: (id: string) => void;
}

export default function CatalogItemCard({
  product,
  language,
  onEdit,
  onDelete
}: CatalogItemCardProps) {
  return (
    <div className="product-card">
      {product.image ? (
        <div className="product-thumb">
          <img src={product.image} alt="ürün" />
        </div>
      ) : (
        <div className="product-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={24} style={{ color: 'var(--muted)' }} />
        </div>
      )}
      <div className="product-info">
        <div className="product-code">{product.productCode}</div>
        <div className="product-fields">
          <div className="product-field-chip" style={{ border: '1px solid var(--accent-mfr)', color: 'var(--accent-mfr)' }}>
            <strong>{language === 'tr' ? 'Atanmış Üretici' : 'Assigned Manufacturer'}:</strong> {product.mfrName}
          </div>
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
          {language === 'tr' ? 'Düzenle' : 'Edit'}
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
          {language === 'tr' ? 'Sil' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
