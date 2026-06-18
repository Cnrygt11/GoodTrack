import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useConnections from '../../hooks/useConnections';
import { ArrowLeft, UserPlus, Check, Clock, CheckCircle2, XCircle, Trash2, Loader2, X } from 'lucide-react';
import { ConnectionRequest } from '../../services/api';

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
    handleRemoveConnection
  } = useConnections();

  const isSeller = user?.role === 'seller';

  // Filter out accepted sent requests since they are already active connections
  const filteredSentRequests = useMemo(() => {
    return sentRequests.filter(r => r.status !== 'accepted');
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
      <span className={`connection-status-badge connection-status-badge--${statusClass}`}>
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
      <div className="card connections-error-container" style={{ textAlign: 'center', padding: '40px' }}>
        <XCircle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3>{t('anErrorOccurred')}</h3>
        <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>{error}</p>
        <button className="btn-secondary" onClick={() => window.location.reload()}>
          {t('btnTryAgain')}
        </button>
      </div>
    );
  }

  return (
    <div className="connections-container">
      {/* Back to dashboard breadcrumb */}
      <button 
        onClick={() => navigate(isSeller ? '/seller/orders' : '/mfr/orders')}
        className="btn-back connections-back-btn"
      >
        <ArrowLeft size={14} />
        {t('backToDashboard')}
      </button>

      <div className="connections-header">
        <h2 className="connections-title">
          {isSeller ? t('btnMyManufacturers') : t('btnMySellers')}
        </h2>
      </div>

      <div className="connections-grid">
        {/* Left Column: Requests and Add Form */}
        <div className="connections-left-col">
          {/* Add Connection */}
          <div className="connections-card">
            <h3 className="connections-card-title">
              {isSeller 
                ? t('addNewManufacturer') 
                : t('addNewSeller')}
            </h3>
            <form onSubmit={handleAddSubmit} className="connections-form">
              <label className="connections-form-label">
                {isSeller 
                  ? t('connectManufacturerPrompt') 
                  : t('connectSellerPrompt')}
              </label>
              <div className="connections-input-row">
                <input 
                  type="text" 
                  placeholder={t('usernamePlaceholder')}
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="connections-input"
                />
                <button 
                  type="submit" 
                  className="btn-primary btn-connection-add"
                >
                  <UserPlus size={16} />
                  {t('addBtn')}
                </button>
              </div>
            </form>
          </div>

          {/* Gelen İstekler */}
          <div className="connections-card">
            <h3 className="connections-card-title connections-card-title--flex">
              <span>{t('incomingRequests')}</span>
              {incomingRequests.length > 0 && (
                <span className="connections-badge-danger">
                  {incomingRequests.length}
                </span>
              )}
            </h3>
            <div className="connections-list">
              {incomingRequests.length === 0 ? (
                <div className="connections-empty-text">
                  {t('noIncoming')}
                </div>
              ) : (
                incomingRequests.map(r => (
                  <div 
                    key={r.id}
                    className="connection-row"
                  >
                    <button 
                      type="button"
                      className="btn-link"
                      onClick={() => handleConnectionClick(r.senderUsername)}
                    >
                      @{r.senderUsername}
                    </button>
                    <div className="connections-actions-wrapper">
                      <button 
                        className="btn-primary btn-connection-accept"
                        onClick={() => handleAccept(r.id)}
                      >
                        <Check size={12} />
                        {t('acceptBtn')}
                      </button>
                      <button 
                        className="btn-secondary btn-connection-reject"
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
          <div className="connections-card">
            <h3 className="connections-card-title">
              {t('sentRequests')}
            </h3>
            <div className="connections-list">
              {filteredSentRequests.length === 0 ? (
                <div className="connections-empty-text">
                  {t('noSentRequests')}
                </div>
              ) : (
                filteredSentRequests.map(r => (
                  <div 
                    key={r.id} 
                    className="connection-row"
                  >
                    <button 
                      type="button"
                      className="btn-link connection-row-username"
                      onClick={() => handleConnectionClick(r.receiverUsername)}
                    >
                      @{r.receiverUsername}
                    </button>
                    <div className="connections-flex-center-gap-8">
                      {getStatusBadge(r.status)}
                      <button 
                        className={`btn-connection-cancel${r.status === 'pending' ? ' danger-style' : ''}`}
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
        <div className="connections-card">
          <h3 className="connections-card-title connections-card-title--large">
            {t('activeConnections')} ({connections.length})
          </h3>
          <div className="connections-list">
            {connectionsLoading ? (
              <div className="connections-loading-wrapper">
                <Loader2 className="animate-spin connections-loader" size={24} />
              </div>
            ) : connections.length === 0 ? (
              <div className="connections-empty-text connections-empty-text--large">
                {t('noActiveConnections')}
              </div>
            ) : (
              connections.map(c => (
                <div 
                  key={c.id} 
                  className="connection-row active-connection-row"
                >
                  <button 
                    type="button"
                    onClick={() => handleConnectionClick(c.username)}
                    className="connection-profile-btn"
                  >
                    <div className="connection-avatar">
                      {c.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="connection-info">
                      <span className="connection-username">
                        @{c.username}
                      </span>
                      <span className="connection-role-label">
                        {c.role === 'mfr' ? t('mfr') : t('seller')}
                      </span>
                    </div>
                  </button>
                  
                  <div className="connections-actions-wrapper">
                    <button 
                      className="btn-secondary btn-connection-profile"
                      onClick={() => handleConnectionClick(c.username)}
                    >
                      {t('viewProfile')}
                    </button>
                    <button 
                      className="btn-secondary btn-connection-disconnect"
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
