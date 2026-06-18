import { Camera } from 'lucide-react';
import { TranslationKey } from '../../services/translations';

interface ProfileAvatarSectionProps {
  t: (key: TranslationKey) => string;
  profilePicture: string;
  firstName: string;
  lastName: string;
  role: string;
  roleLabel: string;
  avatarInputRef: React.RefObject<HTMLInputElement | null>;
  handleProfilePictureChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleRemoveProfilePicture: () => void;
}

export default function ProfileAvatarSection({
  t,
  profilePicture,
  firstName,
  lastName,
  role,
  roleLabel,
  avatarInputRef,
  handleProfilePictureChange,
  handleRemoveProfilePicture,
}: ProfileAvatarSectionProps) {
  return (
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
          <span className={`badge-role ${role}`}>
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
  );
}
