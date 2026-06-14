import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useProfile from '../../hooks/useProfile';
import usePasswordChange from '../../hooks/usePasswordChange';
import { ROUTES } from '../../constants/routes';
import { ShieldCheck, User, Mail, Phone, Key, ArrowLeft, Loader2, Eye, EyeOff, Camera, Trash2, Plus, Image as ImageIcon, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import { MANUFACTURER_CATEGORIES } from '../../utils/constants';
import PasswordChangeForm from './PasswordChangeForm';

export default function MyAccountPage() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    loading,
    error,
    actionLoading: profileLoading,
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
    handleSaveProfile
  } = useProfile();

  const {
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
    actionLoading: passwordLoading,
    handleVerifyPassword,
    handleChangePassword,
    handleCancelFlow
  } = usePasswordChange();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (loading) {
    return (
      <div className="card profile-loading-container">
        <Loader2 className="animate-spin" size={32} />
        <span>
          {t('loadingAccountDetails')}
        </span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="card profile-error-container">
        <h3>Hata / Error</h3>
        <p>{error || 'Profil verileri alınamadı.'}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          {t('btnTryAgain')}
        </button>
      </div>
    );
  }

  const isMfr = profile.role === 'mfr';
  const roleLabel = isMfr ? t('mfr') : t('seller');
  const accentColor = profile.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = profile.role === 'seller' ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

  return (
    <div className="profile-page">
      
      {/* Back to dashboard breadcrumb */}
      <button 
        onClick={() => navigate(profile.role === 'mfr' ? ROUTES.mfrOrders : ROUTES.sellerOrders)}
        className="btn-back" 
      >
        <ArrowLeft size={14} />
        {t('backToDashboard')}
      </button>

      {flowStep === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card profile-form">
          
          <div className="profile-avatar-section">
            {/* Profile Picture Avatar */}
            <div className="profile-avatar-wrapper">
              <div 
                onClick={() => avatarInputRef.current?.click()}
                className="profile-avatar"
                title={t('changePictureBtn')}
              >
                {profilePicture ? (
                  <img src={profilePicture} alt="Avatar" />
                ) : (
                  <span className="profile-avatar-initials">
                    {firstName.charAt(0).toUpperCase()}{lastName.charAt(0).toUpperCase()}
                  </span>
                )}
                
                {/* Overlay camera icon on hover */}
                <div className="profile-avatar-overlay">
                  <Camera size={18} />
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

            <div className="profile-avatar-info">
              <div className="title-row">
                <h2>{t('profileTitle')}</h2>
                <span className={`badge-role ${profile.role}`}>
                  {roleLabel}
                </span>
              </div>
              <div className="button-row">
                <button 
                  type="button" 
                  onClick={() => avatarInputRef.current?.click()} 
                  className="btn-secondary btn-profile-pic-action"
                >
                  {t('changePictureBtn')}
                </button>
                {profilePicture && (
                  <button 
                    type="button" 
                    onClick={handleRemoveProfilePicture} 
                    className="btn-secondary btn-profile-pic-action delete"
                  >
                    {t('removePictureBtn')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="profile-fields-stack">
            
            {/* Username display (non-editable) */}
            <div className="form-group">
              <label style={{ color: 'var(--muted)' }}>{t('username')}</label>
              <div className="form-group-with-icon">
                <input 
                  type="text" 
                  value={`@${profile.username}`} 
                  disabled 
                />
              </div>
            </div>

            {/* Name Fields (row) */}
            <div className="profile-names-row">
              <div className="form-group">
                <label>{t('firstName')}</label>
                <input 
                  type="text" 
                  required 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('lastName')}</label>
                <input 
                  type="text" 
                  required 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Email & Phone */}
            <div className="form-row-responsive">
              <div className="form-group">
                <label>E-posta</label>
                <div className="form-group-with-icon">
                  <Mail size={14} />
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t('phone')}</label>
                <div className="form-group-with-icon">
                  <Phone size={14} />
                  <input 
                    type="text" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+90 555 555 5555"
                  />
                </div>
              </div>
            </div>

            {/* MANUFACTURER SPECIFIC B2B FIELDS */}
            {isMfr && (
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

                {/* Product Showcase Images (3 to 10) */}
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

                {/* Visibility Toggle */}
                <div className="profile-visibility-row">
                  <div>
                    <strong style={{ fontSize: '14px', display: 'block' }}>{t('visibilityLabel')}</strong>
                    <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      {t('mfrVisibilitySubLabel')}
                    </span>
                  </div>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={isVisibleToSellers}
                      onChange={(e) => setIsVisibleToSellers(e.target.checked)}
                    />
                    <span className="slider round" />
                  </label>
                </div>
              </>
            )}

          </div>

          <div className="profile-actions-footer">
            <button 
              type="button"
              className="btn-secondary btn-change-password" 
              onClick={() => setFlowStep('verify-password')}
            >
              <Key size={14} />
              {t('changePasswordBtn')}
            </button>

            <button 
              type="submit" 
              className="btn-primary btn-flex-inline btn-save-profile" 
              disabled={profileLoading}
            >
              {profileLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              {t('saveProfileBtn')}
            </button>
          </div>
        </form>
      )}

      {flowStep !== 'profile' && (
        <PasswordChangeForm
          flowStep={flowStep}
          language={language}
          t={t}
          accentColor={accentColor}
          glowBg={glowBg}
          oldPassword={oldPassword}
          setOldPassword={setOldPassword}
          showOld={showOld}
          setShowOld={setShowOld}
          newPassword={newPassword}
          setNewPassword={setNewPassword}
          showNew={showNew}
          setShowNew={setShowNew}
          confirmNewPassword={confirmNewPassword}
          setConfirmNewPassword={setConfirmNewPassword}
          showConfirm={showConfirm}
          setShowConfirm={setShowConfirm}
          passwordLoading={passwordLoading}
          onVerifyPassword={handleVerifyPassword}
          onChangePassword={handleChangePassword}
          onCancelFlow={handleCancelFlow}
        />
      )}

    </div>
  );
}
