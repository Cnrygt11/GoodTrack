import { Mail, Phone } from 'lucide-react';
import { TranslationKey } from '../../services/translations';

interface GeneralProfileFieldsProps {
  t: (key: TranslationKey) => string;
  username: string;
  firstName: string;
  setFirstName: (v: string) => void;
  lastName: string;
  setLastName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
}

export default function GeneralProfileFields({
  t,
  username,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  email,
  setEmail,
  phoneNumber,
  setPhoneNumber,
}: GeneralProfileFieldsProps) {
  return (
    <div className="profile-fields-stack">
      {/* Username display (non-editable) */}
      <div className="form-group">
        <label style={{ color: 'var(--muted)' }}>{t('username')}</label>
        <div className="form-group-with-icon">
          <input 
            type="text" 
            value={`@${username}`} 
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
    </div>
  );
}
