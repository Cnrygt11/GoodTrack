import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSearchMfr from '../../hooks/useSearchMfr';
import { MapPin, Search, Sparkles, Image as ImageIcon, CheckCircle2, Clock, Plus, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';
import Lightbox from '../ui/Lightbox';

export default function SearchMfrPage() {
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const {
    loading, error,
    selectedCity, selectedCategory,
    mustHaveGallery, setMustHaveGallery,
    mustHaveAvatar, setMustHaveAvatar,
    availableCities,
    filteredAndSortedManufacturers,
    hasMore,
    handleToggleCity, handleToggleCategory,
    handleResetFilters,
    fetchManufacturers, loadMore,
    language, t,
  } = useSearchMfr();



  const hasActiveFilters = selectedCity || selectedCategory || mustHaveGallery || mustHaveAvatar;

  return (
    <div className="smfr-page">

      {/* Page Header */}
      <div className="smfr-header">
        <h1>{t('b2bDirectoryTitle')}</h1>
        <p>{t('b2bDirectorySubtitle')}</p>
      </div>

      {/* Main Grid */}
      <div className="b2b-grid">

        {/* ── LEFT: Filters ── */}
        <div className="smfr-sidebar">
          <div className="card smfr-filters-card">

            <div className="smfr-filters-header">
              <h3 className="smfr-filters-title">
                <Sparkles size={16} />
                {t('filtersHeader')}
              </h3>
              {hasActiveFilters && (
                <button className="smfr-reset-btn" onClick={handleResetFilters}>
                  {t('resetFiltersBtn')}
                </button>
              )}
            </div>



            {/* City Filter */}
            <div>
              <label className="filter-label">{t('filterByCity')}</label>
              {availableCities.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {language === 'tr' ? 'Kayıtlı şehir bulunamadı.' : 'No cities found.'}
                </span>
              ) : (
                <div className="filter-checkbox-list">
                  {availableCities.map((city) => {
                    const isChecked = selectedCity === city;
                    return (
                      <label
                        key={city}
                        className={`filter-checkbox-item ${isChecked ? 'filter-checkbox-item--checked' : 'filter-checkbox-item--unchecked'}`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => handleToggleCity(city)} style={{ cursor: 'pointer' }} />
                        <span>{city}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <label className="filter-label">{t('filterByCategory')}</label>
              <div className="filter-checkbox-list--full">
                {MANUFACTURER_CATEGORIES.map((cat) => {
                  const isChecked = selectedCategory === cat;
                  return (
                    <label
                      key={cat}
                      className={`filter-checkbox-item ${isChecked ? 'filter-checkbox-item--checked' : 'filter-checkbox-item--unchecked'}`}
                    >
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleCategory(cat)} style={{ cursor: 'pointer' }} />
                      <span>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="filter-toggles">
              <label className="filter-toggle-item">
                <input type="checkbox" checked={mustHaveGallery} onChange={(e) => setMustHaveGallery(e.target.checked)} />
                <span>{t('hasShowcaseFilter')}</span>
              </label>
              <label className="filter-toggle-item">
                <input type="checkbox" checked={mustHaveAvatar} onChange={(e) => setMustHaveAvatar(e.target.checked)} />
                <span>{t('hasAvatarFilter')}</span>
              </label>
            </div>

          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="smfr-results">

          <div className="smfr-results-bar">
            <span>
              {language === 'tr' ? 'Bulunan Üretici Sayısı:' : 'Manufacturers Found:'}{' '}
              <strong>{filteredAndSortedManufacturers.length}</strong>
            </span>
          </div>

          {loading && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
              <Loader2 className="animate-spin" size={36} style={{ color: 'var(--accent-seller)' }} />
              <span style={{ fontSize: '15px', color: 'var(--muted)' }}>
                {language === 'tr' ? 'Üretici veri tabanı yükleniyor...' : 'Loading manufacturer directory...'}
              </span>
            </div>
          ) : error && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
              <XCircle size={44} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
              <h3 style={{ color: 'var(--danger)', marginBottom: '12px' }}>
                {language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error'}
              </h3>
              <p style={{ color: 'var(--muted)', maxWidth: '400px', margin: '0 auto 24px auto' }}>{error}</p>
              <button className="btn-secondary" onClick={fetchManufacturers} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} />
                {language === 'tr' ? 'Yeniden Dene' : 'Try Again'}
              </button>
            </div>
          ) : filteredAndSortedManufacturers.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <ImageIcon size={32} style={{ color: 'var(--muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--muted)', margin: 0 }}>{t('searchNoResults')}</p>
            </div>
          ) : (
            <>
              <div className="smfr-card-grid">
                {filteredAndSortedManufacturers.map((mfr) => {
                  return (
                    <div key={mfr.username} className="card mfr-card">

                      <div>
                        {/* Avatar & Name */}
                        <div className="mfr-card-header">
                          <div className="mfr-avatar">
                            {mfr.profilePicture ? (
                              <img
                                src={mfr.profilePicture}
                                alt={mfr.username}
                                onClick={(e) => { e.stopPropagation(); setLightboxImage(mfr.profilePicture || null); }}
                                title={language === 'tr' ? 'Resmi Büyüt' : 'Zoom Image'}
                              />
                            ) : (
                              <span className="mfr-avatar-initials">
                                {(mfr.firstName?.charAt(0) || '').toUpperCase()}{(mfr.lastName?.charAt(0) || '').toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="mfr-name-block">
                            <strong className="mfr-fullname">{mfr.firstName} {mfr.lastName}</strong>
                            <span className="mfr-handle">{mfr.phoneNumber || (language === 'tr' ? 'Telefon numarası bulunmuyor' : 'No phone number')}</span>
                          </div>
                        </div>

                        {/* City & Match */}
                        <div className="mfr-meta">
                          {mfr.city && (
                            <span className="mfr-city-badge">
                              <MapPin size={11} style={{ color: 'var(--danger)' }} />
                              {mfr.city}
                            </span>
                          )}
                          {selectedCategory && mfr.keywords?.includes(selectedCategory) && (
                            <span className="mfr-match-badge">
                              {selectedCategory} ({t('matchingCatCount')})
                            </span>
                          )}
                        </div>

                        {/* Bio */}
                        {mfr.bio ? (
                          <p className="mfr-bio" title={mfr.bio}>{mfr.bio}</p>
                        ) : (
                          <p className="mfr-bio--empty">
                            {language === 'tr' ? 'Tanıtım metni bulunmuyor.' : 'No description available.'}
                          </p>
                        )}

                        {/* Keywords */}
                        {mfr.keywords && mfr.keywords.length > 0 && (
                          <div className="mfr-keywords">
                            {mfr.keywords.map((kw) => (
                              <span key={kw} className="mfr-keyword-chip">{kw}</span>
                            ))}
                          </div>
                        )}

                        {/* Gallery */}
                        {mfr.productImages && mfr.productImages.length > 0 && (
                          <div className="mfr-gallery">
                            <span className="mfr-gallery-label">
                              <ImageIcon size={11} />
                              {language === 'tr' ? 'Ürün Galerisi' : 'Product Showcase'} ({mfr.productImages.length})
                            </span>
                            <div className="mfr-gallery-strip">
                              {mfr.productImages.map((img, idx) => (
                                <div key={idx} className="mfr-gallery-thumb" onClick={() => setLightboxImage(img)}>
                                  <img src={img} alt="Product showcase" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '28px', paddingBottom: '20px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={loadMore}
                    disabled={loading}
                    style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : null}
                    {language === 'tr' ? 'Daha Fazla Yükle' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {lightboxImage && (
        <Lightbox isOpen={!!lightboxImage} src={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
}
