import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useConnections from '../../hooks/useConnections';
import {
  ArrowLeft,
  UserPlus,
  Check,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { ConnectionRequest } from '../../services/apiClient';
import styles from './ConnectionsPage.module.css';

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const {
    user,
    connections,
    incomingRequests,
    sentRequests,
    t,
    addUsername,
    setAddUsername,
    connectionsLoading,
    error,
    handleAddSubmit,
    handleAccept,
    handleReject,
    handleDeleteSent,
    handleRemoveConnection,
  } = useConnections();

  const isSeller = user?.role === 'seller';

  // Filter out accepted sent requests since they are already active connections
  const filteredSentRequests = useMemo(() => {
    return sentRequests.filter((r) => r.status !== 'accepted');
  }, [sentRequests]);

  const getStatusBadge = (status: ConnectionRequest['status']) => {
    let text = t('statusPending');
    let icon = <Clock size={12} />;
    let statusClass = 'pending';

    if (status === 'accepted') {
      text = t('statusAccepted');
      icon = <CheckCircle2 size={12} />;
      statusClass = 'accepted';
    } else if (status === 'rejected') {
      text = t('statusRejected');
      icon = <XCircle size={12} />;
      statusClass = 'rejected';
    }

    return (
      <span
        className={`${styles['connection-status-badge']} ${styles[`connection-status-badge--${statusClass}`]}`}
      >
        {icon}
        {text}
      </span>
    );
  };

  const handleConnectionClick = (username: string) => {
    navigate(isSeller ? `/seller/profile/${username}` : `/mfr/profile/${username}`);
  };

  if (!user) return null;

  if (error) {
    return (
      <div className={`card ${styles['connections-error-container']}`}>
        <XCircle size={48} className={styles['connections-error-icon']} />
        <h3>{t('anErrorOccurred')}</h3>
        <p className={styles['connections-error-text']}>{error}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          {t('btnTryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles['connections-container']}>
      {/* Back to dashboard breadcrumb */}
      <button
        onClick={() => navigate(isSeller ? '/seller/orders' : '/mfr/orders')}
        className={`btn-back ${styles['connections-back-btn']}`}
      >
        <ArrowLeft size={14} />
        {t('backToDashboard')}
      </button>

      <div className={styles['connections-header']}>
        <h2 className={styles['connections-title']}>
          {isSeller ? t('btnMyManufacturers') : t('btnMySellers')}
        </h2>
      </div>

      <div className={styles['connections-grid']}>
        {/* Left Column: Requests and Add Form */}
        <div className={styles['connections-left-col']}>
          {/* Add Connection */}
          <div className={styles['connections-card']}>
            <h3 className={styles['connections-card-title']}>
              {isSeller ? t('addNewManufacturer') : t('addNewSeller')}
            </h3>
            <form onSubmit={handleAddSubmit} className={styles['connections-form']}>
              <label className={styles['connections-form-label']}>
                {isSeller ? t('connectManufacturerPrompt') : t('connectSellerPrompt')}
              </label>
              <div className={styles['connections-input-row']}>
                <input
                  type="text"
                  placeholder={t('usernamePlaceholder')}
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className={styles['connections-input']}
                />
                <button type="submit" className={`btn-primary ${styles['btn-connection-add']}`}>
                  <UserPlus size={16} />
                  {t('addBtn')}
                </button>
              </div>
            </form>
          </div>

          {/* Gelen İstekler */}
          <div className={styles['connections-card']}>
            <h3
              className={`${styles['connections-card-title']} ${styles['connections-card-title--flex']}`}
            >
              <span>{t('incomingRequests')}</span>
              {incomingRequests.length > 0 && (
                <span className={styles['connections-badge-danger']}>
                  {incomingRequests.length}
                </span>
              )}
            </h3>
            <div className={styles['connections-list']}>
              {incomingRequests.length === 0 ? (
                <div className={styles['connections-empty-text']}>{t('noIncoming')}</div>
              ) : (
                incomingRequests.map((r) => (
                  <div key={r.id} className={styles['connection-row']}>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => handleConnectionClick(r.senderUsername)}
                    >
                      @{r.senderUsername}
                    </button>
                    <div className={styles['connections-actions-wrapper']}>
                      <button
                        className={`btn-primary ${styles['btn-connection-accept']}`}
                        onClick={() => handleAccept(r.id)}
                      >
                        <Check size={12} />
                        {t('acceptBtn')}
                      </button>
                      <button
                        className={`btn-secondary ${styles['btn-connection-reject']}`}
                        onClick={() => handleReject(r.id)}
                      >
                        <X size={12} />
                        {t('rejectBtn')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Gönderilen İstekler */}
          <div className={styles['connections-card']}>
            <h3 className={styles['connections-card-title']}>{t('sentRequests')}</h3>
            <div className={styles['connections-list']}>
              {filteredSentRequests.length === 0 ? (
                <div className={styles['connections-empty-text']}>{t('noSentRequests')}</div>
              ) : (
                filteredSentRequests.map((r) => (
                  <div key={r.id} className={styles['connection-row']}>
                    <button
                      type="button"
                      className="btn-link connection-row-username"
                      onClick={() => handleConnectionClick(r.receiverUsername)}
                    >
                      @{r.receiverUsername}
                    </button>
                    <div className={styles['connections-flex-center-gap-8']}>
                      {getStatusBadge(r.status)}
                      <button
                        className={`${styles['btn-connection-cancel']}${r.status === 'pending' ? ' danger-style' : ''}`}
                        onClick={() => handleDeleteSent(r.id)}
                        title={r.status === 'pending' ? t('cancelBtn') : t('clearBtn')}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Connections */}
        <div className={styles['connections-card']}>
          <h3
            className={`${styles['connections-card-title']} ${styles['connections-card-title--large']}`}
          >
            {t('activeConnections')} ({connections.length})
          </h3>
          <div className={styles['connections-list']}>
            {connectionsLoading ? (
              <div className={styles['connections-loading-wrapper']}>
                <Loader2 className={`animate-spin ${styles['connections-loader']}`} size={24} />
              </div>
            ) : connections.length === 0 ? (
              <div
                className={`${styles['connections-empty-text']} ${styles['connections-empty-text--large']}`}
              >
                {t('noActiveConnections')}
              </div>
            ) : (
              connections.map((c) => (
                <div
                  key={c.id}
                  className={`${styles['connection-row']} ${styles['active-connection-row']}`}
                >
                  <button
                    type="button"
                    onClick={() => handleConnectionClick(c.username)}
                    className={styles['connection-profile-btn']}
                  >
                    <div className={styles['connection-avatar']}>
                      {c.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className={styles['connection-info']}>
                      <span className={styles['connection-username']}>@{c.username}</span>
                      <span className={styles['connection-role-label']}>
                        {c.role === 'mfr' ? t('mfr') : t('seller')}
                      </span>
                    </div>
                  </button>

                  <div className={styles['connections-actions-wrapper']}>
                    <button
                      className={`btn-secondary ${styles['btn-connection-profile']}`}
                      onClick={() => handleConnectionClick(c.username)}
                    >
                      {t('viewProfile')}
                    </button>
                    <button
                      className={`btn-secondary ${styles['btn-connection-disconnect']}`}
                      onClick={() => handleRemoveConnection(c.id)}
                    >
                      <Trash2 size={13} />
                      {t('disconnectBtn')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
