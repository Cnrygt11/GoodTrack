import { useState } from 'react';
import useSearchMfr from '../../hooks/useSearchMfr';
import { MapPin, Sparkles, Image as ImageIcon, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';
import Lightbox from '../ui/Lightbox';

export default function SearchMfrPage() {
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
    t,
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
                <span className="smfr-no-cities-msg">
                  {t('noCitiesFound')}
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
                        <input type="checkbox" checked={isChecked} onChange={() => handleToggleCity(city)} className="cursor-pointer" />
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
                      <input type="checkbox" checked={isChecked} onChange={() => handleToggleCategory(cat)} className="cursor-pointer" />
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
              {t('manufacturersFound')}{' '}
              <strong>{filteredAndSortedManufacturers.length}</strong>
            </span>
          </div>

          {loading && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card smfr-loading-card">
              <Loader2 className="animate-spin smfr-loader-icon" size={36} />
              <span className="smfr-loading-text">
                {t('loadingDirectory')}
              </span>
            </div>
          ) : error && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card smfr-error-card">
              <XCircle size={44} className="smfr-error-icon" />
              <h3 className="smfr-error-title">
                {t('connectionError')}
              </h3>
              <p className="smfr-error-msg">{error}</p>
              <button className="btn-secondary smfr-retry-btn" onClick={fetchManufacturers}>
                <RefreshCw size={14} />
                {t('btnTryAgain')}
              </button>
            </div>
          ) : filteredAndSortedManufacturers.length === 0 ? (
            <div className="card smfr-empty-card">
              <ImageIcon size={32} className="smfr-empty-icon" />
              <p className="smfr-loading-text">{t('searchNoResults')}</p>
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
                                title={t('zoomImage')}
                              />
                            ) : (
                              <span className="mfr-avatar-initials">
                                {(mfr.firstName?.charAt(0) || '').toUpperCase()}{(mfr.lastName?.charAt(0) || '').toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="mfr-name-block">
                            <strong className="mfr-fullname">{mfr.firstName} {mfr.lastName}</strong>
                            <span className="mfr-handle">{mfr.phoneNumber || t('noPhoneNumber')}</span>
                          </div>
                        </div>

                        {/* City & Match */}
                        <div className="mfr-meta">
                          {mfr.city && (
                            <span className="mfr-city-badge">
                              <MapPin size={11} className="smfr-map-pin" />
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
                            {t('noIntroText')}
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
                              {t('productGalleryLabel')} ({mfr.productImages.length})
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
                <div className="smfr-loadmore-wrapper">
                  <button
                    type="button"
                    className="btn-secondary smfr-loadmore-btn"
                    onClick={loadMore}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" size={14} /> : null}
                    {t('loadMoreBtn')}
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
