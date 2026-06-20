import { Camera, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { TranslationKey } from '../../services/translations';

interface ProductShowcaseGalleryProps {
  t: (key: TranslationKey) => string;
  productImages: string[];
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  replaceInputRefs: React.MutableRefObject<(HTMLInputElement | null)[]>;
  handleAddProductImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProductImage: (index: number) => void;
  handleReplaceProductImage: (index: number, e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProductShowcaseGallery({
  t,
  productImages,
  galleryInputRef,
  replaceInputRefs,
  handleAddProductImage,
  handleRemoveProductImage,
  handleReplaceProductImage,
}: ProductShowcaseGalleryProps) {
  return (
    <div className="form-group">
      <div className="showcase-header">
        <label>{t('productImagesLabel')}</label>
        <span style={{ fontSize: '11px', color: (productImages.length < 3 || productImages.length > 10) ? 'var(--danger)' : 'var(--success)' }}>
          {productImages.length} / 10
        </span>
      </div>

      <div className="profile-img-grid">
        {productImages.map((img, index) => (
          <div 
            key={img.substring(0, 50)} 
            className="profile-img-item"
          >
            <img src={img} alt={`Showcase ${index + 1}`} />
            
            {/* Hover Overlay Actions */}
            <div className="profile-img-overlay">
              <button
                type="button"
                onClick={() => replaceInputRefs.current[index]?.click()}
                title={t('btnReplace')}
              >
                <Camera size={14} />
              </button>
              <button
                type="button"
                onClick={() => handleRemoveProductImage(index)}
                className="delete"
                title={t('deleteBtn')}
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Hidden input for replacing */}
            <input 
              type="file"
              ref={(el) => { replaceInputRefs.current[index] = el; }}
              onChange={(e) => handleReplaceProductImage(index, e)}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
        ))}

        {/* Add Image Button */}
        {productImages.length < 10 && (
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="profile-add-img-btn"
          >
            <Plus size={20} />
            <span>{t('btnAddImage')}</span>
          </button>
        )}
      </div>
      
      <input 
        type="file"
        ref={galleryInputRef}
        onChange={handleAddProductImage}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
      />

      {productImages.length < 3 && (
        <div className="showcase-warning">
          <ImageIcon size={14} />
          {t('mfrVisibilityWarning')}
        </div>
      )}
    </div>
  );
}
