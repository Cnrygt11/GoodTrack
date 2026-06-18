import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useProfile from '../../hooks/useProfile';
import usePasswordChange from '../../hooks/usePasswordChange';
import { ROUTES } from '../../constants/routes';
import { ArrowLeft, Loader2, Key, CheckCircle2 } from 'lucide-react';
import ProfileAvatarSection from './ProfileAvatarSection';
import GeneralProfileFields from './GeneralProfileFields';
import MfrBusinessFields from './MfrBusinessFields';
import ProductShowcaseGallery from './ProductShowcaseGallery';
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

  const passwordFlow = usePasswordChange();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  if (loading) {
    return (
      <div className="card profile-loading-container">
        <Loader2 className="animate-spin" size={32} />
        <span>{t('loadingAccountDetails')}</span>
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

      {passwordFlow.flowStep === 'profile' ? (
        <form onSubmit={handleSaveProfile} className="card profile-form">
          <ProfileAvatarSection
            t={t}
            profilePicture={profilePicture}
            firstName={firstName}
            lastName={lastName}
            role={profile.role}
            roleLabel={roleLabel}
            avatarInputRef={avatarInputRef}
            handleProfilePictureChange={handleProfilePictureChange}
            handleRemoveProfilePicture={handleRemoveProfilePicture}
          />

          <GeneralProfileFields
            t={t}
            username={profile.username}
            firstName={firstName}
            setFirstName={setFirstName}
            lastName={lastName}
            setLastName={setLastName}
            email={email}
            setEmail={setEmail}
            phoneNumber={phoneNumber}
            setPhoneNumber={setPhoneNumber}
          />

          {isMfr && (
            <>
              <MfrBusinessFields
                t={t}
                city={city}
                setCity={setCity}
                address={address}
                setAddress={setAddress}
                bio={bio}
                setBio={setBio}
                keywords={keywords}
                handleToggleKeyword={handleToggleKeyword}
              />

              <ProductShowcaseGallery
                t={t}
                productImages={productImages}
                galleryInputRef={galleryInputRef}
                replaceInputRefs={replaceInputRefs}
                handleAddProductImage={handleAddProductImage}
                handleRemoveProductImage={handleRemoveProductImage}
                handleReplaceProductImage={handleReplaceProductImage}
              />

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

          <div className="profile-actions-footer">
            <button 
              type="button"
              className="btn-secondary btn-change-password" 
              onClick={() => passwordFlow.setFlowStep('verify-password')}
            >
              <Key size={14} />
              {t('changePasswordBtn')}
            </button>

            <button 
              type="submit" 
              className="btn-primary btn-save-profile" 
              disabled={profileLoading}
            >
              {profileLoading ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
              {t('saveProfileBtn')}
            </button>
          </div>
        </form>
      ) : (
        <PasswordChangeForm
          passwordFlow={passwordFlow}
          accentColor={accentColor}
          glowBg={glowBg}
        />
      )}
    </div>
  );
}
