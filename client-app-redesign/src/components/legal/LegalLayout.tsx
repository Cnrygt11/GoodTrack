import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}

/**
 * Yasal sayfalar (Gizlilik Politikası, Kullanım Koşulları) için ortak, herkese açık layout.
 * Tema uyumlu; başlık, son güncelleme tarihi ve içeriği tek bir okunur sütunda sunar.
 */
export default function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const { t } = useSettings();

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="auth-wordmark">
          <span className="auth-wordmark-mark" aria-hidden="true">
            G
          </span>
          Good<span className="auth-wordmark-accent">Track</span>
        </Link>
        <Link to="/" className="legal-back">
          <ArrowLeft size={16} />
          {t('legalBackHome')}
        </Link>
      </header>

      <main className="legal-container">
        <h1 className="legal-title">{title}</h1>
        <p className="legal-updated">
          {t('legalLastUpdated')}: {lastUpdated}
        </p>
        <p className="legal-draft-note">{t('legalDraftNote')}</p>
        <div className="legal-content">{children}</div>
      </main>
    </div>
  );
}
