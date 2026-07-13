import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import useCredits from '../hooks/useCredits';
import { ROUTES } from '../constants/routes';
import { User, ChevronDown, Users, Coins, UserCircle, Archive } from 'lucide-react';

interface AccountMenuProps {
  /** Whether there are unseen incoming connection requests (shows a dot indicator). */
  hasNewRequests: boolean;
}

/**
 * Navbar account dropdown. The trigger shows the current username; opening it
 * reveals shortcuts to the profile, the connections page and — for sellers —
 * the credits/plan summary.
 */
export default function AccountMenu({ hasNewRequests }: AccountMenuProps) {
  const { user } = useAuth();
  const { t } = useSettings();
  const navigate = useNavigate();
  const { balance, plan, isLoading: creditsLoading } = useCredits();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const handlePointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const profileRoute = user.role === 'mfr' ? ROUTES.mfrProfile : ROUTES.sellerProfile;
  const connectionsRoute = isSeller ? ROUTES.sellerConnections : ROUTES.mfrConnections;
  const connectionsLabel = isSeller ? t('btnMyManufacturers') : t('btnMySellers');
  const archiveRoute = isSeller ? ROUTES.sellerArchive : ROUTES.mfrArchive;

  const go = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        className={`account-menu-trigger ${open ? 'account-menu-trigger--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="account-menu-avatar">
          <User size={14} />
        </span>
        <span className="account-menu-username">{user.username}</span>
        <ChevronDown size={14} className="account-menu-chevron" />
        {hasNewRequests && !open && <span className="unseen-dot-nav" />}
      </button>

      {open && (
        <div className="account-menu-dropdown" role="menu">
          <button type="button" className="account-menu-item" onClick={() => go(profileRoute)}>
            <UserCircle size={16} />
            <span>{t('btnMyAccount')}</span>
          </button>

          <button type="button" className="account-menu-item" onClick={() => go(connectionsRoute)}>
            <Users size={16} />
            <span>{connectionsLabel}</span>
            {hasNewRequests && <span className="account-menu-badge-dot" />}
          </button>

          <button type="button" className="account-menu-item" onClick={() => go(archiveRoute)}>
            <Archive size={16} />
            <span>{t('menuArchive')}</span>
          </button>

          {isSeller && (
            <button
              type="button"
              className="account-menu-item account-menu-item--credits"
              onClick={() => go(ROUTES.sellerCredits)}
            >
              <Coins size={16} />
              <span>{t('menuCredits')}</span>
              <span className="account-menu-credits-value">
                {creditsLoading ? '…' : `${plan} · ${balance} ${t('navCredits')}`}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
