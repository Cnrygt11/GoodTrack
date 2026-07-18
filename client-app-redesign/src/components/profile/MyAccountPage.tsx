import { useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import useProfile from '../../hooks/useProfile';
import usePasswordChange from '../../hooks/usePasswordChange';
import { Loader2, Key, CheckCircle2, User, Store } from 'lucide-react';
import ProfileAvatarSection from './ProfileAvatarSection';
import GeneralProfileFields from './GeneralProfileFields';
import MfrBusinessFields from './MfrBusinessFields';
import ProductShowcaseGallery from './ProductShowcaseGallery';
import PasswordChangeForm from './PasswordChangeForm';
import EtsyIntegration from './EtsyIntegration';
import DeactivateAccountSection from './DeactivateAccountSection';

export default function MyAccountPage() {
  const {
    profile,
    loading,
    error,
    actionLoading: profileLoading,
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
  } = useProfile();

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'profile';

  const passwordFlow = usePasswordChange();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Ref kaydı prop üzerinden yapılır: çocuk bileşenin prop olarak aldığı ref nesnesini
  // doğrudan mutasyona uğratması React Compiler tarafından yasaklanır.
  const registerReplaceInput = useCallback((index: number, el: HTMLInputElement | null) => {
    replaceInputRefs.current[index] = el;
  }, []);

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
      {!isMfr && (
        <div className="profile-tabs">
          <button
            type="button"
            className={`btn-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: 'profile' })}
          >
            <User size={14} />
            Profil Bilgileri
          </button>
          <button
            type="button"
            className={`btn-tab ${activeTab === 'integrations' ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: 'integrations' })}
          >
            <Store size={14} />
            Etsy Entegrasyonu
          </button>
        </div>
      )}

      {passwordFlow.flowStep === 'profile' ? (
        activeTab === 'profile' ? (
          <>
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
                    registerReplaceInput={registerReplaceInput}
                    handleAddProductImage={handleAddProductImage}
                    handleRemoveProductImage={handleRemoveProductImage}
                    handleReplaceProductImage={handleReplaceProductImage}
                  />

                  {/* Visibility Toggle */}
                  <div className="profile-visibility-row">
                    <div>
                      <strong className="profile-visibility-label">{t('visibilityLabel')}</strong>
                      <span className="profile-visibility-sublabel">
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
                  {profileLoading ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {t('saveProfileBtn')}
                </button>
              </div>
            </form>
            <DeactivateAccountSection />
          </>
        ) : (
          <div className="card profile-integrations-card">
            <EtsyIntegration />
          </div>
        )
      ) : (
        <PasswordChangeForm passwordFlow={passwordFlow} accentColor={accentColor} glowBg={glowBg} />
      )}
    </div>
  );
}
