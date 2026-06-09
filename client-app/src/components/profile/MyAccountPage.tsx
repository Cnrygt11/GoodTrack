import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useProfile from '../../hooks/useProfile';
import { ShieldCheck, User, Mail, Phone, Key, ArrowLeft, Loader2, Eye, EyeOff, Camera, Trash2, Plus, Image as ImageIcon, MapPin, Building2, CheckCircle2 } from 'lucide-react';

const CATEGORIES = ['Deri', 'Gümüş', 'Altın', 'Ahşap', 'Takı', 'Bijuteri', 'Terzi', 'Lazer Kesim'];

export default function MyAccountPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading,
    error,
    flowStep,
    setFlowStep,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmNewPassword,
    setConfirmNewPassword,
    showOld,
    setShowOld,
    showNew,
    setShowNew,
    showConfirm,
    setShowConfirm,
    actionLoading,
    language,
    t,

    profilePicture,
    firstName,
    setFirstName,
    lastName,
    setLastName,
    email,
    setEmail,
    phoneNumber,
    setPhoneNumber,
    address,
    setAddress,
    city,
    setCity,
    bio,
    setBio,
    productImages,
    keywords,
    isVisibleToSellers,
    setIsVisibleToSellers,
    handleProfilePictureChange,
    handleRemoveProfilePicture,
    handleAddProductImage,
    handleRemoveProductImage,
    handleReplaceProductImage,
    handleToggleKeyword,
    handleSaveProfile,
    handleVerifyPassword,
    handleChangePassword,
    handleCancelFlow
  } = useProfile();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (loading) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '16px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
          {language === 'tr' ? 'Hesap bilgileri yükleniyor...' : 'Loading account details...'}
        </span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '12px' }}>Hata / Error</h3>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{error || 'Profil verileri alınamadı.'}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          {language === 'tr' ? 'Yeniden Dene' : 'Try Again'}
        </button>
      </div>
    );
  }

  const isMfr = profile.role === 'mfr';
  const roleLabel = isMfr ? t('mfr') : t('seller');
  const accentColor = profile.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = profile.role === 'seller' ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

  return (
    <div style={{ maxWidth: '650px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '40px' }}>
      
      {/* Back to dashboard breadcrumb */}
      <button 
        onClick={() => navigate(profile.role === 'mfr' ? '/mfr/orders' : '/seller/orders')}
        className="btn-back" 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} />
        {language === 'tr' ? 'Kontrol Paneline Dön' : 'Back to Dashboard'}
      </button>

      {flowStep === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
            {/* Profile Picture Avatar */}
            <div style={{ position: 'relative', width: '72px', height: '72px' }}>
              <div 
                onClick={() => avatarInputRef.current?.click()}
                style={{ 
                  width: '72px', 
                  height: '72px', 
                  borderRadius: '50%', 
                  background: 'var(--surface2)', 
                  border: `2px solid ${accentColor}`,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                title={t('changePictureBtn')}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '24px', fontWeight: 600, color: accentColor }}>
                    {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
                  </span>
                )}
                
                {/* Overlay camera icon on hover */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <Camera size={18} style={{ color: '#fff' }} />
                </div>
              </div>
              
              <input 
                type="file" 
                ref={avatarInputRef}
                onChange={handleProfilePictureChange}
                accept="image/*"
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '22px', letterSpacing: '1px' }}>{t('profileTitle')}</h2>
                <span className={`badge-role ${profile.role}`} style={{ display: 'inline-block' }}>
                  {roleLabel}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => avatarInputRef.current?.click()} 
                  className="btn-secondary" 
                  style={{ padding: '2px 8px', fontSize: '11px', borderColor: 'var(--border)' }}
                >
                  {t('changePictureBtn')}
                </button>
                {profilePicture && (
                  <button 
                    type="button" 
                    onClick={handleRemoveProfilePicture} 
                    className="btn-secondary" 
                    style={{ padding: '2px 8px', fontSize: '11px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                  >
                    {t('removePictureBtn')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            
            {/* Username display (non-editable) */}
            <div className="form-group">
              <label style={{ color: 'var(--muted)' }}>{t('username')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  value={`@${profile.username}`} 
                  disabled 
                  style={{ 
                    width: '100%', 
                    background: 'var(--surface2)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--muted)',
                    cursor: 'not-allowed'
                  }} 
                />
              </div>
            </div>

            {/* Name Fields (row) */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{language === 'tr' ? 'Ad' : 'First Name'}</label>
                <input 
                  type="text" 
                  required 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{language === 'tr' ? 'Soyad' : 'Last Name'}</label>
                <input 
                  type="text" 
                  required 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="form-row-responsive">
              <div className="form-group" style={{ flex: 1 }}>
                <label>E-posta</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>{t('phone')}</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+90 555 555 5555"
                    style={{ width: '100%', paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>

            {/* MANUFACTURER SPECIFIC B2B FIELDS */}
            {isMfr && (
              <>
                <div style={{ borderTop: '1px solid var(--border)', marginTop: '10px', paddingTop: '20px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', letterSpacing: '0.5px', color: accentColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} />
                    {language === 'tr' ? 'Üretici Firma Bilgileri' : 'Manufacturer Business Info'}
                  </h3>
                </div>

                {/* City & Address */}
                <div className="form-row-responsive">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>{t('cityLabel')}</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                      <input 
                        type="text" 
                        placeholder={t('cityPlaceholder')}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        style={{ width: '100%', paddingLeft: '36px' }}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 2 }}>
                    <label>{t('addressLabel')}</label>
                    <input 
                      type="text" 
                      placeholder={t('addressLabel')}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {/* Biography (Bio) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
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
                    style={{ 
                      width: '100%', 
                      background: 'var(--surface)', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      padding: '10px 12px', 
                      color: 'var(--text)', 
                      outline: 'none', 
                      resize: 'vertical',
                      fontSize: '14px'
                    }}
                  />
                </div>

                {/* Keywords/Categories selection (Max 3) */}
                <div className="form-group">
                  <label style={{ marginBottom: '8px', display: 'block' }}>{t('keywordsLabel')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {CATEGORIES.map((cat) => {
                      const isSelected = keywords.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleToggleKeyword(cat)}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: isSelected ? accentColor : 'var(--surface2)',
                            color: isSelected ? '#0b0f19' : 'var(--muted)',
                            border: isSelected ? `1px solid ${accentColor}` : '1px solid var(--border)',
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product Showcase Images (3 to 10) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label>{t('productImagesLabel')}</label>
                    <span style={{ fontSize: '11px', color: (productImages.length < 3 || productImages.length > 10) ? 'var(--danger)' : 'var(--success)' }}>
                      {productImages.length} / 10
                    </span>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
                    gap: '12px', 
                    background: 'var(--surface2)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '8px', 
                    padding: '12px' 
                  }}>
                    {productImages.map((img, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          position: 'relative', 
                          aspectRatio: '1', 
                          borderRadius: '6px', 
                          border: '1px solid var(--border)', 
                          overflow: 'hidden',
                          background: 'var(--surface3)'
                        }}
                      >
                        <img src={img} alt={`Showcase ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        
                        {/* Hover Overlay Actions */}
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                          <button
                            type="button"
                            onClick={() => replaceInputRefs.current[index]?.click()}
                            style={{ background: 'var(--surface)', border: 'none', color: 'var(--text)', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
                            title={language === 'tr' ? 'Değiştir' : 'Replace'}
                          >
                            <Camera size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveProductImage(index)}
                            style={{ background: 'var(--surface)', border: 'none', color: 'var(--danger)', padding: '4px', borderRadius: '4px', cursor: 'pointer' }}
                            title={language === 'tr' ? 'Sil' : 'Delete'}
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
                        style={{
                          aspectRatio: '1',
                          borderRadius: '6px',
                          border: '2px dashed var(--border)',
                          background: 'transparent',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = accentColor;
                          e.currentTarget.style.color = accentColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--muted)';
                        }}
                      >
                        <Plus size={20} />
                        <span style={{ fontSize: '10px' }}>{language === 'tr' ? 'Görsel Ekle' : 'Add Image'}</span>
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
                    <div style={{ marginTop: '8px', color: 'var(--danger)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <ImageIcon size={14} />
                      {language === 'tr' 
                        ? 'Uyarı: Üretici arama dizininde çıkmak için en az 3 tanıtım görseli yüklemelisiniz.' 
                        : 'Warning: You must upload at least 3 presentation images to appear in the search directory.'}
                    </div>
                  )}
                </div>

                {/* Visibility Toggle */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  padding: '14px 16px', 
                  background: 'var(--surface2)', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border)',
                  marginTop: '10px'
                }}>
                  <div>
                    <strong style={{ fontSize: '14px', display: 'block' }}>{t('visibilityLabel')}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {language === 'tr' 
                        ? 'Bu ayar açık olduğunda satıcılar şehir ve kategoriler ile sizi arayıp bulabilir.'
                        : 'When enabled, sellers can search and find your shop by city and categories.'}
                    </span>
                  </div>
                  <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                    <input 
                      type="checkbox" 
                      checked={isVisibleToSellers}
                      onChange={(e) => setIsVisibleToSellers(e.target.checked)}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span className="slider round" style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isVisibleToSellers ? accentColor : 'var(--border)',
                      transition: '0.3s',
                      borderRadius: '24px'
                    }}>
                      <span style={{
                        position: 'absolute',
                        content: '""',
                        height: '16px', width: '16px',
                        left: isVisibleToSellers ? '24px' : '4px',
                        bottom: '4px',
                        backgroundColor: '#0b0f19',
                        transition: '0.3s',
                        borderRadius: '50%'
                      }} />
                    </span>
                  </label>
                </div>
              </>
            )}

          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button 
              type="button"
              className="btn-secondary" 
              onClick={() => setFlowStep('verify-password')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderColor: accentColor,
                color: accentColor,
                background: 'transparent'
              }}
            >
              <Key size={14} />
              {t('changePasswordBtn')}
            </button>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ 
                background: accentColor, 
                color: '#0b0f19',
                boxShadow: `0 4px 12px ${glowBg}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              {t('saveProfileBtn')}
            </button>
          </div>
        </form>
      )}

      {flowStep === 'verify-password' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: glowBg, 
              color: accentColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${accentColor}`
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '0.5px' }}>{t('passwordChangeTitle')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {language === 'tr' ? 'Aşama 1 / 2: Mevcut Şifre Doğrulama' : 'Step 1 / 2: Verify Current Password'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterOldPassword')}
          </p>

          <form onSubmit={handleVerifyPassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="form-group">
              <label>{t('oldPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showOld ? 'text' : 'password'} 
                  required 
                  placeholder={t('oldPassword')} 
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={actionLoading}>
                {t('cancelBtn')}
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  background: accentColor, 
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="animate-spin" size={14} />}
                {t('verifyOldPasswordBtn')}
              </button>
            </div>
          </form>
        </div>
      )}

      {flowStep === 'new-password' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '10px', 
              background: glowBg, 
              color: accentColor, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: `1px solid ${accentColor}`
            }}>
              <Key size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '0.5px' }}>{t('passwordChangeTitle')}</h2>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {language === 'tr' ? 'Aşama 2 / 2: Yeni Şifre Tanımlama' : 'Step 2 / 2: Define New Password'}
              </span>
            </div>
          </div>

          <p style={{ fontSize: '13.5px', color: 'var(--muted)', lineHeight: '1.6', margin: 0 }}>
            {t('enterNewPassword')}
          </p>

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>{t('newPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showNew ? 'text' : 'password'} 
                  required 
                  placeholder={t('newPassword')} 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t('confirmNewPassword')}</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showConfirm ? 'text' : 'password'} 
                  required 
                  placeholder={t('confirmNewPassword')} 
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn-secondary" onClick={handleCancelFlow} disabled={actionLoading}>
                {t('btnBackToProfile')}
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  background: accentColor, 
                  color: '#0b0f19',
                  boxShadow: `0 4px 12px ${glowBg}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="animate-spin" size={14} />}
                {language === 'tr' ? 'Şifreyi Güncelle' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
