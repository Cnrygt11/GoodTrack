import React from 'react';
import { useNavigate } from 'react-router-dom';
import useConnections from '../../hooks/useConnections';
import { ArrowLeft, UserPlus, Check, Clock, CheckCircle2, XCircle, Trash2, Loader2, User, X } from 'lucide-react';
import { ConnectionRequest } from '../../services/api';

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const {
    user,
    connections,
    incomingRequests,
    sentRequests,
    language,
    t,
    addUsername,
    setAddUsername,
    actionLoading,
    handleAddSubmit,
    handleAccept,
    handleReject,
    handleDeleteSent,
    handleRemoveConnection
  } = useConnections();

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const accentColor = isSeller ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = isSeller ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

  const getStatusBadge = (status: ConnectionRequest['status']) => {
    let text = t('statusPending');
    let icon = <Clock size={12} />;
    let style = { color: 'var(--accent-seller)', border: '1px solid var(--accent-seller)', background: 'var(--accent-seller-glow)' };

    if (status === 'accepted') {
      text = t('statusAccepted');
      icon = <CheckCircle2 size={12} />;
      style = { color: 'var(--success)', border: '1px solid var(--success)', background: 'rgba(34,197,94,0.1)' };
    } else if (status === 'rejected') {
      text = t('statusRejected');
      icon = <XCircle size={12} />;
      style = { color: 'var(--danger)', border: '1px solid var(--danger)', background: 'rgba(239,68,68,0.1)' };
    }

    return (
      <span 
        style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          padding: '4px 8px', 
          borderRadius: '4px', 
          textTransform: 'uppercase', 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          ...style 
        }}
      >
        {icon}
        {text}
      </span>
    );
  };

  const handleConnectionClick = (username: string) => {
    navigate(isSeller ? `/seller/profile/${username}` : `/mfr/profile/${username}`);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out', paddingBottom: '40px' }}>
      {/* Back to dashboard breadcrumb */}
      <button 
        onClick={() => navigate(isSeller ? '/seller/orders' : '/mfr/orders')}
        className="btn-back" 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
      >
        <ArrowLeft size={14} />
        {t('backToDashboard')}
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h2 style={{ margin: 0 }}>
          {isSeller ? t('btnMyManufacturers') : t('btnMySellers')}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '28px' }}>
        {/* Left Column: Requests and Add Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Add Connection */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>
              {isSeller 
                ? t('addNewManufacturer') 
                : t('addNewSeller')}
            </h3>
            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {isSeller 
                  ? t('connectManufacturerPrompt') 
                  : t('connectSellerPrompt')}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder={t('usernamePlaceholder')}
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  style={{ 
                    flex: 1, 
                    background: 'var(--surface2)', 
                    border: '1px solid var(--border)', 
                    color: 'var(--text)', 
                    borderRadius: '7px', 
                    padding: '10px 14px', 
                    outline: 'none', 
                    fontSize: '14px' 
                  }} 
                />
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: accentColor, color: '#0b0f19' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  {t('addBtn')}
                </button>
              </div>
            </form>
          </div>

          {/* Gelen İstekler */}
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{t('incomingRequests')}</span>
              {incomingRequests.length > 0 && (
                <span style={{ fontSize: '12px', background: 'var(--danger)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {incomingRequests.length}
                </span>
              )}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {incomingRequests.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  {t('noIncoming')}
                </div>
              ) : (
                incomingRequests.map(r => (
                  <div 
                    key={r.id}
                    className="connection-row" 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      background: 'var(--surface2)' 
                    }}
                  >
                    <button 
                      type="button"
                      className="btn-link"
                      onClick={() => handleConnectionClick(r.senderUsername)}
                      style={{ fontWeight: 600, color: accentColor }}
                    >
                      @{r.senderUsername}
                    </button>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--success)', color: '#111', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleAccept(r.id)}
                        disabled={actionLoading}
                      >
                        <Check size={12} />
                        {t('acceptBtn')}
                      </button>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => handleReject(r.id)}
                        disabled={actionLoading}
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
          <div className="card" style={{ padding: '24px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '16px' }}>
              {t('sentRequests')}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sentRequests.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                  {t('noSentRequests')}
                </div>
              ) : (
                sentRequests.map(r => (
                  <div 
                    key={r.id} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '12px 16px', 
                      border: '1px solid var(--border)', 
                      borderRadius: '8px', 
                      background: 'var(--surface2)' 
                    }}
                  >
                    <button 
                      type="button"
                      className="btn-link"
                      onClick={() => handleConnectionClick(r.receiverUsername)}
                      style={{ fontWeight: 600, color: 'var(--text)' }}
                    >
                      @{r.receiverUsername}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusBadge(r.status)}
                      <button 
                        className="conn-remove" 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px', 
                          background: 'var(--surface1)',
                          color: r.status === 'pending' ? 'var(--danger)' : 'inherit',
                          borderColor: r.status === 'pending' ? 'var(--danger)' : 'var(--border)'
                        }}
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
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize: '18px' }}>
            {t('activeConnections')} ({connections.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {connections.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '14px', textAlign: 'center', padding: '40px 0' }}>
                {t('noActiveConnections')}
              </div>
            ) : (
              connections.map(c => (
                <div 
                  key={c.id} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '16px 20px', 
                    border: '1px solid var(--border)', 
                    borderRadius: '10px', 
                    background: 'var(--surface2)' 
                  }}
                >
                  <button 
                    type="button"
                    onClick={() => handleConnectionClick(c.username)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px', 
                      cursor: 'pointer',
                      border: 'none',
                      background: 'none',
                      textAlign: 'left',
                      width: '100%',
                      padding: 0,
                      font: 'inherit',
                      color: 'inherit'
                    }}
                  >
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      background: glowBg, 
                      border: `1.5px solid ${accentColor}`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      color: accentColor,
                      fontWeight: 600,
                      fontSize: '14px'
                    }}>
                      {c.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text)' }}>
                        @{c.username}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        {c.role === 'mfr' ? t('mfr') : t('seller')}
                      </span>
                    </div>
                  </button>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '13px', borderColor: accentColor, color: accentColor }}
                      onClick={() => handleConnectionClick(c.username)}
                    >
                      {t('viewProfile')}
                    </button>
                    <button 
                      className="btn-secondary" 
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '13px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                      onClick={() => handleRemoveConnection(c.id)}
                      disabled={actionLoading}
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
