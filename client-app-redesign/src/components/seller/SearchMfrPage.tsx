import { useState } from 'react';
import useSearchMfr from '../../hooks/useSearchMfr';
import { MapPin, Sparkles, Image as ImageIcon, Loader2, RefreshCw, XCircle, Lock } from 'lucide-react';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';
import Lightbox from '../ui/Lightbox';
import { TranslationKey } from '../../services/translations';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export default function SearchMfrPage() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const {
    loading, error,
    selectedCities, selectedCategories,
    mustHaveGallery, setMustHaveGallery,
    mustHaveAvatar, setMustHaveAvatar,
    availableCities,
    filteredAndSortedManufacturers,
    hasMore,
    handleToggleCity, handleToggleCategory,
    handleResetFilters,
    fetchManufacturers, loadMore,
    isLocked, lockReason, completedCount,
    t,
  } = useSearchMfr();

  const hasActiveFilters = selectedCities.length > 0 || selectedCategories.length > 0 || mustHaveGallery || mustHaveAvatar;

  const pageContent = (
    <div className={`smfr-page ${isLocked ? 'smfr-locked-blur' : ''}`}>

      {/* Page Header */}
      <div className="smfr-header">
        <h1>{t('b2bDirectoryTitle')}</h1>
        <p>{t('b2bDirectorySubtitle')}</p>
      </div>

      {/* Main Grid */}
      <div className="b2b-grid">

        {/* ── LEFT: Filters ── */}
        <div className="smfr-sidebar">
          <div className={`card smfr-filters-card ${isLocked ? 'smfr-filters-card--disabled' : ''}`}>

            <div className="smfr-filters-header">
              <h3 className="smfr-filters-title">
                <Sparkles size={16} />
                {t('filtersHeader')}
              </h3>
              {hasActiveFilters && (
                <button className="smfr-reset-btn" onClick={handleResetFilters} disabled={isLocked}>
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
                    const isChecked = selectedCities.includes(city);
                    return (
                      <label
                        key={city}
                        className={`filter-checkbox-item ${isChecked ? 'filter-checkbox-item--checked' : 'filter-checkbox-item--unchecked'} ${isLocked ? 'filter-checkbox-item--disabled' : ''}`}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={() => !isLocked && handleToggleCity(city)} 
                          disabled={isLocked}
                          className={isLocked ? "cursor-not-allowed" : "cursor-pointer"} 
                        />
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
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className={`filter-checkbox-item ${isChecked ? 'filter-checkbox-item--checked' : 'filter-checkbox-item--unchecked'} ${isLocked ? 'filter-checkbox-item--disabled' : ''}`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => !isLocked && handleToggleCategory(cat)} 
                        disabled={isLocked}
                        className={isLocked ? "cursor-not-allowed" : "cursor-pointer"} 
                      />
                      <span>{t(`category_${cat.replace(/\s+/g, '_')}` as TranslationKey)}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Toggle Filters */}
            <div className="filter-toggles">
              <label className={`filter-toggle-item ${isLocked ? 'filter-toggle-item--disabled' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={mustHaveGallery} 
                  onChange={(e) => !isLocked && setMustHaveGallery(e.target.checked)} 
                  disabled={isLocked}
                />
                <span>{t('hasShowcaseFilter')}</span>
              </label>
              <label className={`filter-toggle-item ${isLocked ? 'filter-toggle-item--disabled' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={mustHaveAvatar} 
                  onChange={(e) => !isLocked && setMustHaveAvatar(e.target.checked)} 
                  disabled={isLocked}
                />
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
                              <span key={kw} className="mfr-keyword-chip">{t(`category_${kw.replace(/\s+/g, '_')}` as TranslationKey)}</span>
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

  if (isLocked) {
    const isUpgradeLock = lockReason === 'upgrade';
    return (
      <div className="smfr-locked-container">
        {pageContent}
        <div 
          className={`smfr-lock-overlay ${isUpgradeLock ? 'smfr-lock-overlay--clickable' : ''}`}
          onClick={() => {
            if (isUpgradeLock) {
              navigate(ROUTES.sellerCredits);
            }
          }}
        >
          <div className="smfr-lock-card">
            <Lock size={48} className="smfr-lock-icon" />
            <h2 className="smfr-lock-title">
              {isUpgradeLock ? t('findMfrUpgradeToUnlock') : t('findMfrLocked')}
            </h2>
            {!isUpgradeLock && (
              <div className="smfr-lock-progress">
                {t('currentCompletedCount').replace('{count}', String(completedCount))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return pageContent;
}
