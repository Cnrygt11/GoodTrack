import React from 'react';
import { TranslationKey } from '../../services/translations';

interface VerificationPendingProps {
  t: (key: TranslationKey) => string;
  verificationUsername: string;
  setVerificationPending: (v: boolean) => void;
}

export default function VerificationPending({
  t,
  verificationUsername,
  setVerificationPending,
}: VerificationPendingProps) {
  return (
    <div className="auth-verification-pending">
      <div className="verification-pending-icon">
        ✉️
      </div>
      <h3>
        {t('verificationEmailSent')}
      </h3>
      <p>
        {t('verificationEmailInstruction').replace('{username}', verificationUsername)}
      </p>
      <button 
        type="button" 
        className="btn-primary auth-width-full" 
        onClick={() => {
          setVerificationPending(false);
        }}
      >
        {t('backToLogin')}
      </button>
    </div>
  );
}
