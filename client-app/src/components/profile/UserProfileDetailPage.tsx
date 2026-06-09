import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { api, UserProfile } from '../../services/api';
import { ArrowLeft, Loader2, AlertTriangle, Mail, Phone, MapPin, Globe, Award, Image as ImageIcon } from 'lucide-react';
import Lightbox from '../ui/Lightbox';

export default function UserProfileDetailPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { language, t } = useSettings();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getProfileByUsername(username);
        setProfile(data);
      } catch (err: unknown) {
        console.error(err);
        setError(
          language === 'tr' 
            ? 'Kullanıcı profili yüklenemedi. Böyle bir kullanıcı bulunamadı veya profil gizli.' 
            : 'Failed to load user profile. User not found or profile is private.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, language]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(currentUser?.role === 'mfr' ? '/mfr/orders' : '/seller/orders');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: currentUser?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', textAlign: 'center' }} className="card">
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3 style={{ marginBottom: '8px' }}>{language === 'tr' ? 'Hata Oluştu' : 'Error Occurred'}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>{error}</p>
        <button onClick={handleBack} className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={14} />
          {language === 'tr' ? 'Geri Dön' : 'Go Back'}
        </button>
      </div>
    );
  }

  const isMfr = profile.role === 'mfr';
  const roleLabel = isMfr ? (language === 'tr' ? 'Üretici' : 'Manufacturer') : (language === 'tr' ? 'Satıcı' : 'Seller');
  const accentColor = profile.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = profile.role === 'seller' ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '40px' }}>
      
      {/* Back breadcrumb */}
      <button 
        onClick={handleBack}
        className="btn-back" 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} />
        {language === 'tr' ? 'Geri Dön' : 'Go Back'}
      </button>

      {/* Main Profile Showcase Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '28px', border: '1px solid var(--border)' }}>
        {/* Cover banner */}
        <div style={{ height: '140px', background: `linear-gradient(135deg, ${accentColor} 0%, var(--surface1) 100%)`, opacity: 0.8 }} />

        {/* Profile Info Details Header */}
        <div style={{ padding: '0 32px 32px 32px', position: 'relative' }}>
          {/* Avatar positioning */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-60px', marginBottom: '20px' }}>
            {profile.profilePicture ? (
              <img 
                src={profile.profilePicture} 
                alt={profile.username}
                onClick={() => setLightboxImage(profile.profilePicture!)}
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '50%', 
                  border: '4px solid var(--surface1)', 
                  objectFit: 'cover',
                  background: 'var(--surface2)',
                  cursor: 'zoom-in',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
                }}
              />
            ) : (
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                border: '4px solid var(--surface1)', 
                background: 'var(--surface2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: accentColor,
                fontWeight: 700,
                fontSize: '32px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)'
              }}>
                {profile.username.substring(0, 2).toUpperCase()}
              </div>
            )}

            <span className={`badge-role ${profile.role}`} style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', fontWeight: 700 }}>
              {roleLabel}
            </span>
          </div>

          <h1 style={{ margin: '0 0 4px 0', fontSize: '26px' }}>
            {profile.firstName || profile.lastName 
              ? `${profile.firstName} ${profile.lastName}`.trim() 
              : profile.username}
          </h1>
          <p style={{ color: accentColor, margin: '0 0 16px 0', fontWeight: 600 }}>
            @{profile.username}
          </p>

          {profile.bio && (
            <p style={{ color: 'var(--text)', fontSize: '15px', lineHeight: '1.6', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
              {profile.bio}
            </p>
          )}

          {/* Contact & Location Info Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '14px' }}>
              <Mail size={16} style={{ color: accentColor }} />
              <span style={{ color: 'var(--text)' }}>{profile.email}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '14px' }}>
              <Phone size={16} style={{ color: accentColor }} />
              <span style={{ color: 'var(--text)' }}>{profile.phoneNumber || (language === 'tr' ? 'Belirtilmemiş' : 'Not specified')}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '14px' }}>
              <MapPin size={16} style={{ color: accentColor }} />
              <span style={{ color: 'var(--text)' }}>
                {profile.city 
                  ? `${profile.address ? profile.address + ', ' : ''}${profile.city}` 
                  : (language === 'tr' ? 'Belirtilmemiş' : 'Not specified')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--muted)', fontSize: '14px' }}>
              <Award size={16} style={{ color: accentColor }} />
              <span style={{ color: 'var(--text)' }}>
                {isMfr ? (language === 'tr' ? 'Üretici Profili' : 'Manufacturer Profile') : (language === 'tr' ? 'Satıcı Profili' : 'Seller Profile')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords / Tags Section */}
      {profile.keywords && profile.keywords.length > 0 && (
        <div className="card" style={{ padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} style={{ color: accentColor }} />
            {language === 'tr' ? 'Uzmanlık Alanları / Etiketler' : 'Specialties / Keywords'}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {profile.keywords.map((tag, idx) => (
              <span 
                key={idx} 
                style={{ 
                  background: glowBg, 
                  color: accentColor, 
                  padding: '6px 12px', 
                  borderRadius: '6px', 
                  fontSize: '13px', 
                  fontWeight: 600,
                  border: `1px solid ${accentColor}33`
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Product Showcase Gallery Section */}
      {profile.productImages && profile.productImages.length > 0 && (
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ImageIcon size={18} style={{ color: accentColor }} />
            {isMfr ? (language === 'tr' ? 'Ürün Galeri Vitrini' : 'Product Showcase Gallery') : (language === 'tr' ? 'Örnek Kataloğu' : 'Sample Catalog')}
          </h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
            gap: '16px' 
          }}>
            {profile.productImages.map((imgUrl, idx) => (
              <div 
                key={idx} 
                onClick={() => setLightboxImage(imgUrl)}
                style={{ 
                  position: 'relative', 
                  aspectRatio: '1', 
                  borderRadius: '8px', 
                  overflow: 'hidden', 
                  cursor: 'zoom-in',
                  border: '1px solid var(--border)',
                  background: 'var(--surface2)',
                  transition: 'transform 0.2s ease'
                }}
                className="gallery-item"
              >
                <img 
                  src={imgUrl} 
                  alt={`Showcase ${idx}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
