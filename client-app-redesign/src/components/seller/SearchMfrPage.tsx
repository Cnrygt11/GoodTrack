import { useState } from 'react';
import useSearchMfr from '../../hooks/useSearchMfr';
import {
  MapPin,
  Sparkles,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  X,
  XCircle,
  Lock,
  Search,
} from 'lucide-react';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';
import Lightbox from '../ui/Lightbox';
import CitySelect from '../ui/CitySelect';
import { TranslationKey } from '../../services/translations';
import { api } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

/**
 * Üretici kartındaki ürün galerisi. Dizin liste yanıtı artık galeri görsellerini taşımaz (yalnız
 * sayı gelir); tam galeri, "Galeriyi Gör" tıklanınca talep üzerine tek üretici için çekilir.
 */
function ManufacturerGalleryStrip({
  manufacturerId,
  galleryCount,
  onZoom,
  t,
}: {
  manufacturerId?: string;
  galleryCount: number;
  onZoom: (img: string) => void;
  t: (key: TranslationKey) => string;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const [images, setImages] = useState<string[]>([]);

  if (galleryCount <= 0) return null;

  const load = async () => {
    if (!manufacturerId || status === 'loading' || status === 'loaded') return;
    setStatus('loading');
    try {
      const imgs = await api.getManufacturerGallery(manufacturerId);
      setImages(imgs);
      setStatus('loaded');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'loaded' && images.length > 0) {
    return (
      <div className="mfr-gallery">
        <span className="mfr-gallery-label">
          <ImageIcon size={11} />
          {t('productGalleryLabel')} ({images.length})
        </span>
        <div className="mfr-gallery-strip">
          {images.map((img, idx) => (
            <div key={idx} className="mfr-gallery-thumb" onClick={() => onZoom(img)}>
              <img src={img} alt="Product showcase" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="mfr-gallery-load-btn"
      onClick={load}
      disabled={status === 'loading'}
    >
      {status === 'loading' ? (
        <Loader2 size={13} className="animate-spin" />
      ) : (
        <ImageIcon size={13} />
      )}
      {t('viewGalleryBtn')} ({galleryCount})
    </button>
  );
}

export default function SearchMfrPage() {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    loading,
    error,
    selectedCities,
    selectedCategories,
    searchName,
    setSearchName,
    sortOption,
    setSortOption,
    filteredAndSortedManufacturers,
    hasMore,
    handleToggleCity,
    handleToggleCategory,
    handleResetFilters,
    fetchManufacturers,
    loadMore,
    isLocked,
    lockReason,
    completedCount,
    t,
  } = useSearchMfr();

  const hasActiveFilters =
    selectedCities.length > 0 ||
    selectedCategories.length > 0 ||
    searchName.trim().length > 0 ||
    sortOption !== 'completeness';

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
          <div
            className={`card smfr-filters-card ${isLocked ? 'smfr-filters-card--disabled' : ''}`}
          >
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

            {/* City Filter — 81 il, aramalı dropdown; seçilenler çip olarak listelenir */}
            <div>
              <label className="filter-label">{t('filterByCity')}</label>
              <CitySelect
                value=""
                clearOnSelect
                onSelect={(city) => {
                  if (!isLocked && !selectedCities.includes(city)) handleToggleCity(city);
                }}
                placeholder={t('citySelectPlaceholder')}
                noMatchText={t('noCityMatch')}
                disabled={isLocked}
              />
              {selectedCities.length > 0 && (
                <div className="city-chips">
                  {selectedCities.map((city) => (
                    <span key={city} className="city-chip">
                      {city}
                      <button
                        type="button"
                        onClick={() => !isLocked && handleToggleCity(city)}
                        title={t('resetFiltersBtn')}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
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
                        className={isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}
                      />
                      <span>{t(`category_${cat.replace(/\s+/g, '_')}` as TranslationKey)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="smfr-results">
          {/* Search + sort toolbar */}
          <div className="smfr-toolbar">
            <div className="smfr-search-box">
              <Search size={15} />
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder={t('searchByNamePlaceholder')}
                disabled={isLocked}
              />
            </div>
            <select
              className="smfr-sort-select"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'completeness' | 'name' | 'city')}
              disabled={isLocked}
              aria-label={t('sortLabel')}
            >
              <option value="completeness">{t('sortCompleteness')}</option>
              <option value="name">{t('sortByName')}</option>
              <option value="city">{t('sortByCity')}</option>
            </select>
          </div>

          <div className="smfr-results-bar">
            <span>
              {t('manufacturersFound')} <strong>{filteredAndSortedManufacturers.length}</strong>
            </span>
          </div>

          {loading && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card smfr-loading-card">
              <Loader2 className="animate-spin smfr-loader-icon" size={36} />
              <span className="smfr-loading-text">{t('loadingDirectory')}</span>
            </div>
          ) : error && filteredAndSortedManufacturers.length === 0 ? (
            <div className="card smfr-error-card">
              <XCircle size={44} className="smfr-error-icon" />
              <h3 className="smfr-error-title">{t('connectionError')}</h3>
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
                            {mfr.profileThumbnail || mfr.profilePicture ? (
                              <img
                                src={mfr.profileThumbnail || mfr.profilePicture}
                                alt={mfr.username}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLightboxImage(
                                    mfr.profileThumbnail || mfr.profilePicture || null,
                                  );
                                }}
                                title={t('zoomImage')}
                              />
                            ) : (
                              <span className="mfr-avatar-initials">
                                {(mfr.firstName?.charAt(0) || '').toUpperCase()}
                                {(mfr.lastName?.charAt(0) || '').toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="mfr-name-block">
                            <strong className="mfr-fullname">
                              {mfr.firstName} {mfr.lastName}
                            </strong>
                            <span className="mfr-handle">
                              {mfr.phoneNumber || t('noPhoneNumber')}
                            </span>
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
                          <p className="mfr-bio" title={mfr.bio}>
                            {mfr.bio}
                          </p>
                        ) : (
                          <p className="mfr-bio--empty">{t('noIntroText')}</p>
                        )}

                        {/* Keywords */}
                        {mfr.keywords && mfr.keywords.length > 0 && (
                          <div className="mfr-keywords">
                            {mfr.keywords.map((kw) => (
                              <span key={kw} className="mfr-keyword-chip">
                                {t(`category_${kw.replace(/\s+/g, '_')}` as TranslationKey)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Gallery — talep üzerine yüklenir (liste yanıtı galeri görsellerini taşımaz) */}
                        <ManufacturerGalleryStrip
                          manufacturerId={mfr.id}
                          galleryCount={mfr.galleryCount ?? 0}
                          onZoom={setLightboxImage}
                          t={t}
                        />
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
        <Lightbox
          isOpen={!!lightboxImage}
          src={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
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
