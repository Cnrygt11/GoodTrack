import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSearchMfr from '../../hooks/useSearchMfr';
import { MapPin, Search, Sparkles, Image as ImageIcon, CheckCircle2, Clock, Plus, Loader2, RefreshCw, XCircle } from 'lucide-react';
import Lightbox from '../ui/Lightbox';

const CATEGORIES = ['Deri', 'Gümüş', 'Altın', 'Ahşap', 'Takı', 'Bijuteri', 'Terzi', 'Lazer Kesim'];

export default function SearchMfrPage() {
  const navigate = useNavigate();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const {
    loading,
    error,
    actionLoading,
    searchQuery,
    setSearchQuery,
    selectedCities,
    selectedCategories,
    mustHaveGallery,
    setMustHaveGallery,
    mustHaveAvatar,
    setMustHaveAvatar,
    availableCities,
    filteredAndSortedManufacturers,
    connections,
    sentRequests,
    handleToggleCity,
    handleToggleCategory,
    handleResetFilters,
    handleSendConnection,
    fetchManufacturers,
    language,
    t
  } = useSearchMfr();

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
        <Loader2 className="animate-spin" size={36} style={{ color: 'var(--accent-seller)' }} />
        <span style={{ fontSize: '15px', color: 'var(--muted)' }}>
          {language === 'tr' ? 'Üretici veri tabanı yükleniyor...' : 'Loading manufacturer directory...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <XCircle size={44} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3 style={{ color: 'var(--danger)', marginBottom: '12px' }}>{language === 'tr' ? 'Bağlantı Hatası' : 'Connection Error'}</h3>
        <p style={{ color: 'var(--muted)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px auto' }}>{error}</p>
        <button className="btn-secondary" onClick={fetchManufacturers} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} />
          {language === 'tr' ? 'Yeniden Dene' : 'Try Again'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Page Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', letterSpacing: '1px', color: 'var(--text)' }}>
          {t('b2bDirectoryTitle')}
        </h1>
        <p style={{ margin: '8px 0 0 0', color: 'var(--muted)', fontSize: '14px' }}>
          {t('b2bDirectorySubtitle')}
        </p>
      </div>

      {/* Main Grid Layout: Left Sidebar Filters, Right Results list */}
      <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 850 ? '1fr' : '260px 1fr', gap: '24px' }}>
        
        {/* Filters Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '20px', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '15px', letterSpacing: '0.5px', color: 'var(--accent-seller)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} />
                {t('filtersHeader')}
              </h3>
              {(searchQuery || selectedCities.length > 0 || selectedCategories.length > 0 || mustHaveGallery || mustHaveAvatar) && (
                <button 
                  onClick={handleResetFilters} 
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  {t('resetFiltersBtn')}
                </button>
              )}
            </div>

            {/* Text Search Input */}
            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                <input 
                  type="text"
                  placeholder={language === 'tr' ? 'İsim, kullanıcı adı, bio...' : 'Search name, username...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '36px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* City Checkbox Multi-Select (Strict Match) */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                {t('filterByCity')}
              </label>
              {availableCities.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  {language === 'tr' ? 'Kayıtlı şehir bulunamadı.' : 'No cities found.'}
                </span>
              ) : (
                <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  {availableCities.map((city) => {
                    const isChecked = selectedCities.includes(city);
                    return (
                      <label key={city} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', padding: '4px 6px', borderRadius: '4px', background: isChecked ? 'var(--accent-seller-glow)' : 'transparent' }}>
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCity(city)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ color: isChecked ? 'var(--accent-seller)' : 'var(--text)' }}>{city}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category Checkbox Multi-Select */}
            <div>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                {t('filterByCategory')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px', background: 'var(--surface)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedCategories.includes(cat);
                  return (
                    <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', padding: '4px 6px', borderRadius: '4px', background: isChecked ? 'var(--accent-seller-glow)' : 'transparent' }}>
                      <input 
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleCategory(cat)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ color: isChecked ? 'var(--accent-seller)' : 'var(--text)' }}>{cat}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Additional Toggle Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={mustHaveGallery}
                  onChange={(e) => setMustHaveGallery(e.target.checked)}
                />
                <span>{t('hasShowcaseFilter')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={mustHaveAvatar}
                  onChange={(e) => setMustHaveAvatar(e.target.checked)}
                />
                <span>{t('hasAvatarFilter')}</span>
              </label>
            </div>

          </div>
        </div>

        {/* Results Side */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {language === 'tr' ? 'Bulunan Üretici Sayısı:' : 'Manufacturers Found:'}{' '}
              <strong style={{ color: 'var(--text)' }}>{filteredAndSortedManufacturers.length}</strong>
            </span>
          </div>

          {filteredAndSortedManufacturers.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center' }}>
              <ImageIcon size={32} style={{ color: 'var(--muted)', marginBottom: '12px' }} />
              <p style={{ color: 'var(--muted)', margin: 0 }}>{t('searchNoResults')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredAndSortedManufacturers.map((mfr) => {
                const isConnected = connections.some(c => c.username === mfr.username);
                const isPending = sentRequests.some(r => r.receiverUsername === mfr.username && r.status === 'pending');

                // Category match count score
                const matchCount = mfr.keywords?.filter((k) => selectedCategories.includes(k)).length ?? 0;

                return (
                  <div 
                    key={mfr.username} 
                    className="card" 
                    style={{ 
                      padding: '20px', 
                      background: 'var(--surface2)', 
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      height: '100%',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div>
                      {/* Avatar & Title Row */}
                      <div 
                        onClick={() => navigate(`/seller/profile/${mfr.username}`)}
                        style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', cursor: 'pointer' }}
                        title={language === 'tr' ? 'Profili Görüntüle' : 'View Profile'}
                      >
                        {/* Avatar */}
                        <div style={{ 
                          width: '46px', 
                          height: '46px', 
                          borderRadius: '50%', 
                          background: 'var(--surface3)', 
                          border: `1.5px solid var(--border)`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {mfr.profilePicture ? (
                            <img 
                              src={mfr.profilePicture} 
                              alt={mfr.username} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxImage(mfr.profilePicture);
                              }}
                              title={language === 'tr' ? 'Resmi Büyüt' : 'Zoom Image'}
                            />
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--accent-mfr)', fontSize: '15px' }}>
                              {(mfr.firstName?.charAt(0) || '').toUpperCase()}{(mfr.lastName?.charAt(0) || '').toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Name and Handle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <strong style={{ fontSize: '14.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--accent-seller)' }}>
                              {mfr.firstName} {mfr.lastName}
                            </strong>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>@{mfr.username}</span>
                          </div>
                        </div>
                      </div>

                      {/* City Badge & Category Match Score */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                        {mfr.city && (
                          <span style={{ fontSize: '11px', background: 'var(--surface3)', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid var(--border)', color: 'var(--text)' }}>
                            <MapPin size={11} style={{ color: 'var(--danger)' }} />
                            {mfr.city}
                          </span>
                        )}

                        {selectedCategories.length > 0 && matchCount > 0 && (
                          <span style={{ fontSize: '11px', background: 'var(--accent-seller-glow)', color: 'var(--accent-seller)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--accent-seller)', fontWeight: 600 }}>
                            {matchCount} / {selectedCategories.length} {t('matchingCatCount')}
                          </span>
                        )}
                      </div>

                      {/* Biography description */}
                      {mfr.bio ? (
                        <p style={{ 
                          fontSize: '13px', 
                          color: 'var(--muted)', 
                          margin: '0 0 14px 0', 
                          lineHeight: '1.5',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }} title={mfr.bio}>
                          {mfr.bio}
                        </p>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic', margin: '0 0 14px 0' }}>
                          {language === 'tr' ? 'Tanıtım metni bulunmuyor.' : 'No description available.'}
                        </p>
                      )}

                      {/* Category Keywords */}
                      {mfr.keywords && mfr.keywords.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '14px' }}>
                          {mfr.keywords.map((kw) => (
                            <span 
                              key={kw} 
                              style={{ 
                                fontSize: '10px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                background: 'var(--surface)', 
                                color: 'var(--muted)',
                                border: '1px solid var(--border)',
                                fontWeight: 500
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Product Showcase Gallery row */}
                      {mfr.productImages && mfr.productImages.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                            <ImageIcon size={11} />
                            {language === 'tr' ? 'Ürün Galerisi' : 'Product Showcase'} ({mfr.productImages.length})
                          </span>
                          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {mfr.productImages.map((img, idx) => (
                              <div 
                                key={idx} 
                                onClick={() => setLightboxImage(img)}
                                style={{ 
                                  width: '48px', 
                                  height: '48px', 
                                  borderRadius: '4px', 
                                  overflow: 'hidden', 
                                  border: '1px solid var(--border)', 
                                  flexShrink: 0, 
                                  cursor: 'zoom-in',
                                  display: 'block' 
                                }}
                              >
                                <img src={img} alt="Product showcase" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                      {isConnected ? (
                        <div style={{ 
                          width: '100%',
                          padding: '8px',
                          background: 'var(--surface3)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          color: 'var(--success)',
                          fontSize: '13px',
                          fontWeight: 600
                        }}>
                          <CheckCircle2 size={16} />
                          {language === 'tr' ? 'Bağlantı Aktif' : 'Connected'}
                        </div>
                      ) : isPending ? (
                        <div style={{ 
                          width: '100%',
                          padding: '8px',
                          background: 'var(--surface3)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          color: 'var(--accent-seller)',
                          fontSize: '13px',
                          fontWeight: 600
                        }}>
                          <Clock size={16} />
                          {language === 'tr' ? 'İstek Beklemede' : 'Request Pending'}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSendConnection(mfr.username)}
                          className="btn-primary"
                          style={{ 
                            width: '100%', 
                            background: 'var(--accent-seller)', 
                            color: '#0b0f19',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            fontWeight: 600
                          }}
                          disabled={actionLoading}
                        >
                          {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                          {t('connectBtn')}
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

      {lightboxImage && (
        <Lightbox 
          imageUrl={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
        />
      )}
    </div>
  );
}
