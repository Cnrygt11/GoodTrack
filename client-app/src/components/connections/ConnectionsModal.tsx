import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { useSettings } from '../../context/SettingsContext';
import { api, ConnectionRequest } from '../../services/api';
import Modal from '../ui/Modal';
import { X, UserPlus, Check, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function ConnectionsModal() {
  const {
    user,
    isConnectionsModalOpen,
    setIsConnectionsModalOpen
  } = useAuth();

  const {
    connections,
    incomingRequests,
    sentRequests,
    refreshConnections,
    loadIncomingRequests,
    loadSentRequests,
    loadProducts
  } = useData();

  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [addUsername, setAddUsername] = useState('');

  // Fetch data automatically when the modal is opened
  useEffect(() => {
    if (isConnectionsModalOpen && user) {
      refreshConnections();
      loadIncomingRequests();
      loadSentRequests();
    }
  }, [isConnectionsModalOpen, user, refreshConnections, loadIncomingRequests, loadSentRequests]);

  if (!user) return null;


  const isSeller = user.role === 'seller';

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = addUsername.trim();
    if (!username) {
      alert(language === 'tr' ? 'Lütfen eklenecek kullanıcı adını yazın!' : 'Please write the username to add!');
      return;
    }

    try {
      const data = await api.sendConnectionRequest(username);
      showToast(data.message || t('connReqSuccess'));
      setAddUsername('');
      await loadIncomingRequests();
      await loadSentRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      const data = await api.acceptRequest(requestId);
      showToast(data.message || t('connReqAccepted'));
      await refreshConnections();
      await loadIncomingRequests();
      await loadSentRequests();
      await loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!confirm(language === 'tr' ? 'Bu bağlantı isteğini reddetmek istediğinize emin misiniz?' : 'Are you sure you want to reject this connection request?')) return;
    try {
      const data = await api.rejectRequest(requestId);
      showToast(data.message || t('connReqRejected'));
      await loadIncomingRequests();
      await loadSentRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSent = async (requestId: string) => {
    try {
      const data = await api.deleteSentRequest(requestId);
      showToast(data.message || t('connReqDeleted'));
      await loadSentRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveConnection = async (targetId: string) => {
    if (!confirm(language === 'tr' ? 'Bu bağlantıyı kaldırmak istediğinize emin misiniz? (Mevcut siparişler korunacaktır)' : 'Are you sure you want to disconnect? (Current orders will be kept)')) return;
    try {
      const data = await api.removeConnection(targetId);
      showToast(data.message || t('connRemoved'));
      await refreshConnections();
      await loadProducts();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status: ConnectionRequest['status']) => {
    let text = language === 'tr' ? 'Beklemede' : 'Pending';
    let icon = <Clock size={12} />;
    let style = { color: 'var(--accent-seller)', border: '1px solid var(--accent-seller)' };

    if (status === 'accepted') {
      text = language === 'tr' ? 'Kabul Edildi' : 'Accepted';
      icon = <CheckCircle2 size={12} />;
      style = { color: 'var(--success)', border: '1px solid var(--success)' };
    } else if (status === 'rejected') {
      text = language === 'tr' ? 'Reddedildi' : 'Rejected';
      icon = <XCircle size={12} />;
      style = { color: 'var(--danger)', border: '1px solid var(--danger)' };
    }

    return (
      <span 
        style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          padding: '2px 8px', 
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

  return (
    <Modal 
      isOpen={isConnectionsModalOpen} 
      onClose={() => setIsConnectionsModalOpen(false)}
      style={{ width: '420px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>{isSeller ? t('btnMyManufacturers').toUpperCase() : t('btnMySellers').toUpperCase()}</h3>
        <button 
          onClick={() => setIsConnectionsModalOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Add Request Form */}
      <form onSubmit={handleAddSubmit} style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
          {isSeller ? (language === 'tr' ? 'Kullanıcı Adı ile Üretici Ekle' : 'Add Manufacturer by Username') : (language === 'tr' ? 'Kullanıcı Adı ile Satıcı Ekle' : 'Add Seller by Username')}
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder={isSeller ? (language === 'tr' ? 'Üretici kullanıcı adını yazın' : 'Enter manufacturer username') : (language === 'tr' ? 'Satıcı kullanıcı adını yazın' : 'Enter seller username')}
            value={addUsername}
            onChange={(e) => setAddUsername(e.target.value)}
            style={{ 
              flex: 1, 
              background: 'var(--surface2)', 
              border: '1px solid var(--border)', 
              color: 'var(--text)', 
              borderRadius: '7px', 
              padding: '8px 12px', 
              outline: 'none', 
              fontSize: '14px' 
            }} 
          />
          <button 
            type="submit" 
            className="btn-primary" 
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 16px' }}
          >
            <UserPlus size={16} />
            {t('addBtn')}
          </button>
        </div>
      </form>

      {/* Gelen İstekler */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
          {t('incomingRequests')}
        </label>
        <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {incomingRequests.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
              {t('noIncoming')}
            </div>
          ) : (
            incomingRequests.map(r => (
              <div 
                key={r.id}
                className="connection-row" 
                style={{ borderColor: isSeller ? 'var(--accent-mfr)' : 'var(--accent-seller)' }}
              >
                <span className="conn-name">@{r.senderUsername}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-primary" 
                    style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--success)', color: '#111', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                    onClick={() => handleAccept(r.id)}
                  >
                    <Check size={12} />
                    {t('acceptBtn')}
                  </button>
                  <button 
                    className="btn-secondary" 
                    style={{ padding: '4px 10px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
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
      <div style={{ marginBottom: '20px' }}>
        <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
          {t('sentRequests')}
        </label>
        <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sentRequests.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
              {t('noSentRequests')}
            </div>
          ) : (
            sentRequests.map(r => (
              <div key={r.id} className="connection-row">
                <span className="conn-name">@{r.receiverUsername}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getStatusBadge(r.status)}
                  {r.status !== 'pending' && (
                    <button 
                      className="conn-remove" 
                      style={{ display: 'flex', alignItems: 'center', padding: '4px', marginLeft: '8px' }}
                      onClick={() => handleDeleteSent(r.id)}
                      title={language === 'tr' ? 'Temizle' : 'Clear'}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Mevcut Bağlantılar */}
      <div>
        <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
          {t('activeConnections')}
        </label>
        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {connections.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
              {t('noActiveConnections')}
            </div>
          ) : (
            connections.map(c => (
              <div key={c.id} className="connection-row">
                <span className="conn-name">{c.username}</span>
                <button 
                  className="conn-remove" 
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '12px' }}
                  onClick={() => handleRemoveConnection(c.id)}
                >
                  <Trash2 size={12} />
                  {t('disconnectBtn')}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="modal-actions">
        <button className="btn-secondary" onClick={() => setIsConnectionsModalOpen(false)}>{language === 'tr' ? 'Kapat' : 'Close'}</button>
      </div>
    </Modal>
  );
}

