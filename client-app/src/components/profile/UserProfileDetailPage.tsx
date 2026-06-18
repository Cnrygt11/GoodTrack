import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useUserProfileDetail from '../../hooks/useUserProfileDetail';
import { ArrowLeft, Loader2, AlertTriangle, Mail, Phone, MapPin, Globe, Award, Image as ImageIcon } from 'lucide-react';
import Lightbox from '../ui/Lightbox';

export default function UserProfileDetailPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { profile, loading, error, currentUser, t } = useUserProfileDetail(username);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(currentUser?.role === 'mfr' ? '/mfr/orders' : '/seller/orders');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading-container">
        <Loader2 size={36} className="animate-spin" />
        <span>{t('loadingText')}</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card profile-error-container">
        <AlertTriangle size={48} className="profile-error-icon" />
        <h3>{t('anErrorOccurred')}</h3>
        <p>{error}</p>
        <button onClick={handleBack} className="btn-secondary profile-detail-back-btn">
          <ArrowLeft size={14} />
          {t('goBack')}
        </button>
      </div>
    );
  }

  const isMfr = profile.role === 'mfr';
  const roleLabel = isMfr ? t('mfr') : t('seller');

  return (
    <div className="profile-detail-container">
      
      {/* Back breadcrumb */}
      <button 
        onClick={handleBack}
        className="btn-back profile-detail-back-btn"
      >
        <ArrowLeft size={14} />
        {t('goBack')}
      </button>

      {/* Main Profile Showcase Card */}
      <div className={`card profile-detail-card role-${profile.role}`}>
        {/* Cover banner */}
        <div className="profile-detail-banner" />

        {/* Profile Info Details Header */}
        <div className="profile-detail-body">
          {/* Avatar positioning */}
          <div className="profile-detail-header-row">
            {profile.profilePicture ? (
              <img 
                src={profile.profilePicture} 
                alt={profile.username}
                onClick={() => setLightboxImage(profile.profilePicture!)}
                className="profile-detail-avatar clickable"
              />
            ) : (
              <div className="profile-detail-avatar-fallback">
                {profile.username.substring(0, 2).toUpperCase()}
              </div>
            )}

            <span className={`badge-role ${profile.role} profile-detail-badge-role`}>
              {roleLabel}
            </span>
          </div>

          <h1 className="profile-detail-name">
            {profile.firstName || profile.lastName 
              ? `${profile.firstName} ${profile.lastName}`.trim() 
              : profile.username}
          </h1>
          <p className="profile-detail-username">
            @{profile.username}
          </p>

          {profile.bio && (
            <p className="profile-detail-bio">
              {profile.bio}
            </p>
          )}

          {/* Contact & Location Info Details */}
          <div className="profile-detail-info-grid">
            <div className="profile-detail-info-item">
              <Mail size={16} />
              <span>{profile.email}</span>
            </div>

            <div className="profile-detail-info-item">
              <Phone size={16} />
              <span>{profile.phoneNumber || t('notSpecified')}</span>
            </div>

            <div className="profile-detail-info-item">
              <MapPin size={16} />
              <span>
                {profile.city 
                  ? `${profile.address ? profile.address + ', ' : ''}${profile.city}` 
                  : t('notSpecified')}
              </span>
            </div>

            <div className="profile-detail-info-item">
              <Award size={16} />
              <span>
                {isMfr ? t('mfrProfile') : t('sellerProfile')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords / Tags Section */}
      {profile.keywords && profile.keywords.length > 0 && (
        <div className={`profile-detail-section-card card role-${profile.role}`}>
          <h3 className="profile-detail-section-title">
            <Globe size={18} />
            {t('specialtiesKeywords')}
          </h3>
          <div className="profile-detail-tags-list">
            {profile.keywords.map((tag, idx) => (
              <span 
                key={idx} 
                className="profile-detail-tag"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Product Showcase Gallery Section */}
      {profile.productImages && profile.productImages.length > 0 && (
        <div className={`profile-detail-section-card card role-${profile.role}`}>
          <h3 className="profile-detail-section-title">
            <ImageIcon size={18} />
            {isMfr ? t('productShowcaseGallery') : t('sampleCatalog')}
          </h3>
          <div className="profile-detail-gallery-grid">
            {profile.productImages.map((imgUrl, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxImage(imgUrl)}
                className="profile-detail-gallery-item"
              >
                <img 
                  src={imgUrl} 
                  alt={`Showcase ${idx}`} 
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <Lightbox 
          isOpen={!!lightboxImage} 
          src={lightboxImage} 
          onClose={() => setLightboxImage(null)} 
        />
      )}

    </div>
  );
}
