import React from 'react';
import { Building2, MapPin } from 'lucide-react';
import { TranslationKey } from '../../services/translations';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';

interface MfrBusinessFieldsProps {
  t: (key: TranslationKey) => string;
  city: string;
  setCity: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  keywords: string[];
  handleToggleKeyword: (cat: string) => void;
}

export default function MfrBusinessFields({
  t,
  city,
  setCity,
  address,
  setAddress,
  bio,
  setBio,
  keywords,
  handleToggleKeyword,
}: MfrBusinessFieldsProps) {
  return (
    <>
      <div className="profile-mfr-divider">
        <h3>
          <Building2 size={16} />
          {t('mfrBusinessInfo')}
        </h3>
      </div>

      {/* City & Address */}
      <div className="form-row-responsive">
        <div className="form-group">
          <label>{t('cityLabel')}</label>
          <div className="form-group-with-icon">
            <MapPin size={14} />
            <input 
              type="text" 
              placeholder={t('cityPlaceholder')}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
        </div>
        <div className="form-group flex-2">
          <label>{t('addressLabel')}</label>
          <input 
            type="text" 
            placeholder={t('addressLabel')}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
      </div>

      {/* Biography (Bio) */}
      <div className="form-group">
        <div className="bio-header">
          <label>{t('bioLabel')}</label>
          <span style={{ fontSize: '11px', color: bio.length > 500 ? 'var(--danger)' : 'var(--muted)' }}>
            {bio.length} / 500
          </span>
        </div>
        <textarea 
          placeholder={t('bioPlaceholder')}
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          rows={4}
          className="bio-textarea"
        />
      </div>

      {/* Keywords/Categories selection (Max 3) */}
      <div className="form-group">
        <label>{t('keywordsLabel')}</label>
        <div className="keywords-grid">
          {MANUFACTURER_CATEGORIES.map((cat) => {
            const isSelected = keywords.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleToggleKeyword(cat)}
                className={`btn-keyword ${isSelected ? 'active' : ''}`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
