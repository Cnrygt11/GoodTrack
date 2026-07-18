import React from 'react';
import { Package, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api, CatalogProduct, ConnectionUser } from '../../services/apiClient';
import Lightbox from '../ui/Lightbox';
import { useSettings } from '../../context/SettingsContext';

interface CatalogItemCardProps {
  product: CatalogProduct;
  connections: ConnectionUser[];
  onDelete: (id: string) => void;
  onAssignMfr: (productId: string, selectedMfrId: string) => Promise<void>;
}

export default function CatalogItemCard({
  product,
  connections,
  onDelete,
  onAssignMfr,
}: CatalogItemCardProps) {
  const { t } = useSettings();
  const [isLightboxOpen, setIsLightboxOpen] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');
  // Liste yanıtı yalnız thumbnail taşır; tam görsel lightbox ilk açıldığında çekilip cache'lenir.
  const [fullImage, setFullImage] = React.useState<string | null>(null);

  // Kart görseli: liste yanıtındaki thumbnail (legacy kayıtlar için server tam görsele düşer).
  const cardImage = product.thumbnailImage ?? product.image;

  const openLightbox = () => {
    setIsLightboxOpen(true);
    if (fullImage || product.image) return; // Zaten çekilmiş veya listede tam görsel var.
    api
      .getCatalogById(product.id)
      .then((full) => {
        if (full.image) setFullImage(full.image);
      })
      .catch(() => {
        // Tam görsel alınamazsa thumbnail ile devam edilir.
      });
  };

  const isUnassigned = !product.mfrId || product.mfrId === '00000000-0000-0000-0000-000000000000';

  return (
    <div className="product-card catalog-card">
      {cardImage ? (
        <div
          className="product-thumb product-thumb--clickable"
          onClick={openLightbox}
          title={t('clickToInspectDetails')}
        >
          <img src={cardImage} alt="ürün" />
        </div>
      ) : (
        <div className="product-thumb product-thumb--placeholder">
          <Package size={24} style={{ color: 'var(--muted)' }} />
        </div>
      )}

      <div className="product-info">
        <div className="product-code">{product.productCode}</div>

        {/* Warning Badge for Unassigned Manufacturer */}
        {isUnassigned && (
          <div className="mfr-warning-badge">
            <AlertCircle size={14} />
            {t('mfrNotAssigned') || 'Üretici atanmadı'}
          </div>
        )}

        <div className="product-fields">
          {product.extras &&
            Object.values(product.extras).map((val, idx) => {
              if (!val.value) return null;
              return (
                <div className="product-field-chip" key={idx} title={`${val.name}: ${val.value}`}>
                  <strong>{val.name}:</strong> {val.value}
                </div>
              );
            })}
        </div>
      </div>

      {/* Bottom Dropdown & Action Area */}
      <div className="catalog-card-actions">
        <span className="catalog-assign-label">{t('assignedManufacturerLabel')}:</span>
        <select
          value={product.mfrId || ''}
          onChange={async (e) => {
            const val = e.target.value;
            try {
              setSaveStatus('saving');
              await onAssignMfr(product.id, val);
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 1500);
            } catch {
              setSaveStatus('idle');
            }
          }}
          disabled={saveStatus === 'saving'}
          className="catalog-mfr-select"
        >
          <option value="">{t('selectManufacturerPlaceholder') || 'Üretici Seçin...'}</option>
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.username}
            </option>
          ))}
        </select>

        {/* Action Status Micro-animation Icon */}
        {saveStatus !== 'idle' && (
          <div className="catalog-save-status">
            {saveStatus === 'saving' && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ color: 'var(--accent-seller)' }}
              />
            )}
            {saveStatus === 'saved' && (
              <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            )}
          </div>
        )}

        {/* Delete Button */}
        <button
          type="button"
          className="btn-secondary catalog-delete-btn"
          onClick={() => onDelete(product.id)}
          title={t('deleteBtn')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {cardImage && (
        <Lightbox
          isOpen={isLightboxOpen}
          src={fullImage ?? product.image ?? cardImage}
          onClose={() => setIsLightboxOpen(false)}
          altText={product.productCode}
        />
      )}
    </div>
  );
}
