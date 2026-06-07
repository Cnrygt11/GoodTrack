import React from 'react';
import useConnections from '../../hooks/useConnections';
import Modal from '../ui/Modal';
import { X, UserPlus, Check, Clock, CheckCircle2, XCircle, Trash2, Loader2, MapPin, Sparkles, Plus, Image as ImageIcon } from 'lucide-react';
import { ConnectionRequest } from '../../services/api';

const CATEGORIES = ['Deri', 'Gümüş', 'Altın', 'Ahşap', 'Takı', 'Bijuteri', 'Terzi', 'Lazer Kesim'];

export default function ConnectionsModal() {
  const {
    user,
    isConnectionsModalOpen,
    setIsConnectionsModalOpen,
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
    handleRemoveConnection,

    // B2B search hooks
    activeTab,
    setActiveTab,
    searchCity,
    setSearchCity,
    searchKeyword,
    setSearchKeyword,
    searchResults,
    searchLoading,
    handleSearchSubmit,
    handleSendConnectionFromSearch
  } = useConnections();

  if (!user) return null;

  const isSeller = user.role === 'seller';
  const accentColor = isSeller ? 'var(--accent-seller)' : 'var(--accent-mfr)';
  const glowBg = isSeller ? 'var(--accent-seller-glow)' : 'var(--accent-mfr-glow)';

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
      style={{ width: '480px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, letterSpacing: '0.5px' }}>
          {isSeller ? t('btnMyManufacturers').toUpperCase() : t('btnMySellers').toUpperCase()}
        </h3>
        <button 
          onClick={() => setIsConnectionsModalOpen(false)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Segmented Sub-tabs for Sellers */}
      {isSeller && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              background: activeTab === 'manage' ? 'var(--surface3)' : 'transparent',
              border: 'none',
              color: activeTab === 'manage' ? accentColor : 'var(--muted)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              borderBottom: activeTab === 'manage' ? `2px solid ${accentColor}` : 'none'
            }}
          >
            {t('myConnectionsTab')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '6px',
              background: activeTab === 'search' ? 'var(--surface3)' : 'transparent',
              border: 'none',
              color: activeTab === 'search' ? accentColor : 'var(--muted)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
              borderBottom: activeTab === 'search' ? `2px solid ${accentColor}` : 'none'
            }}
          >
            {t('findMfrTab')}
          </button>
        </div>
      )}

      {/* Tab Contents */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {activeTab === 'manage' ? (
          <>
            {/* Add Request Form */}
            <form onSubmit={handleAddSubmit} style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>
                {isSeller 
                  ? (language === 'tr' ? 'Kullanıcı Adı ile Üretici Ekle' : 'Add Manufacturer by Username') 
                  : (language === 'tr' ? 'Kullanıcı Adı ile Satıcı Ekle' : 'Add Seller by Username')}
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder={isSeller 
                    ? (language === 'tr' ? 'Üretici kullanıcı adını yazın' : 'Enter manufacturer username') 
                    : (language === 'tr' ? 'Satıcı kullanıcı adını yazın' : 'Enter seller username')}
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 16px', background: accentColor, color: '#0b0f19' }}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  {t('addBtn')}
                </button>
              </div>
            </form>

            {/* Gelen İstekler */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                {t('incomingRequests')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {incomingRequests.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: '6px' }}>
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
                          disabled={actionLoading}
                        >
                          <Check size={12} />
                          {t('acceptBtn')}
                        </button>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '4px 10px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
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
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>
                {t('sentRequests')}
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sentRequests.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: '6px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {connections.length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '10px', background: 'var(--surface2)', borderRadius: '6px' }}>
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
                        disabled={actionLoading}
                      >
                        <Trash2 size={12} />
                        {t('disconnectBtn')}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          /* B2B SEARCH DIRECTORY VIEW (Sellers Only) */
          <>
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* City Search */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                  <input 
                    type="text" 
                    placeholder={t('cityPlaceholder')}
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    style={{ 
                      width: '100%', 
                      background: 'var(--surface2)', 
                      border: '1px solid var(--border)', 
                      color: 'var(--text)', 
                      borderRadius: '7px', 
                      padding: '8px 12px 8px 30px', 
                      outline: 'none', 
                      fontSize: '13px' 
                    }} 
                  />
                </div>

                {/* Category Dropdown */}
                <div style={{ flex: 1 }}>
                  <select
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    style={{ 
                      width: '100%', 
                      background: 'var(--surface2)', 
                      border: '1px solid var(--border)', 
                      color: searchKeyword ? 'var(--text)' : 'var(--muted)', 
                      borderRadius: '7px', 
                      padding: '8px 12px', 
                      outline: 'none', 
                      fontSize: '13px',
                      height: '37px'
                    }}
                  >
                    <option value="">{t('categoryFilterLabel')}</option>
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  width: '100%', 
                  background: accentColor, 
                  color: '#0b0f19',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '6px', 
                  padding: '8px 16px' 
                }}
                disabled={searchLoading}
              >
                {searchLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                {t('searchBtn')}
              </button>
            </form>

            {/* Search Results List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {searchLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', gap: '10px' }}>
                  <Loader2 className="animate-spin" size={24} style={{ color: accentColor }} />
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {language === 'tr' ? 'Üreticiler aranıyor...' : 'Searching manufacturers...'}
                  </span>
                </div>
              ) : searchResults.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px', background: 'var(--surface2)', borderRadius: '6px' }}>
                  {t('searchNoResults')}
                </div>
              ) : (
                searchResults.map(result => {
                  const isConnected = connections.some(c => c.username === result.username);
                  const isPending = sentRequests.some(r => r.receiverUsername === result.username && r.status === 'pending');
                  const incoming = incomingRequests.find(r => r.senderUsername === result.username);

                  return (
                    <div 
                      key={result.username} 
                      className="card" 
                      style={{ 
                        padding: '16px', 
                        background: 'var(--surface2)', 
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* Result Header */}
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* Avatar */}
                        <div style={{ 
                          width: '44px', 
                          height: '44px', 
                          borderRadius: '50%', 
                          background: 'var(--surface3)', 
                          border: `1px solid var(--border)`, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {result.profilePicture ? (
                            <img src={result.profilePicture} alt={result.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontWeight: 600, color: 'var(--accent-mfr)', fontSize: '14px' }}>
                              {(result.firstName?.charAt(0) || '').toUpperCase()}{(result.lastName?.charAt(0) || '').toUpperCase()}
                            </span>
                          )}
                        </div>

                        {/* Name / Location */}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '14px' }}>{result.firstName} {result.lastName}</strong>
                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>@{result.username}</span>
                          </div>
                          {result.city && (
                            <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '3px' }}>
                              <MapPin size={11} style={{ color: 'var(--danger)' }} />
                              {result.city}
                            </span>
                          )}
                        </div>

                        {/* Connect Buttons */}
                        <div>
                          {isConnected ? (
                            <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} />
                              {language === 'tr' ? 'Bağlantı Aktif' : 'Connected'}
                            </span>
                          ) : isPending ? (
                            <span style={{ fontSize: '12px', color: 'var(--accent-seller)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={14} />
                              {language === 'tr' ? 'Beklemede' : 'Pending'}
                            </span>
                          ) : incoming ? (
                            <button
                              type="button"
                              onClick={() => handleAccept(incoming.id)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--success)', color: '#111' }}
                              disabled={actionLoading}
                            >
                              {t('acceptBtn')}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSendConnectionFromSearch(result.username)}
                              className="btn-primary"
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '12px', 
                                background: 'var(--accent-mfr)', 
                                color: '#0b0f19',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              disabled={actionLoading}
                            >
                              <Plus size={12} />
                              {t('connectBtn')}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bio */}
                      {result.bio && (
                        <p style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: '1.5', background: 'var(--surface)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          {result.bio}
                        </p>
                      )}

                      {/* Keywords Badges */}
                      {result.keywords && result.keywords.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {result.keywords.map(kw => (
                            <span 
                              key={kw} 
                              style={{ 
                                fontSize: '10px', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                background: 'var(--surface3)', 
                                color: 'var(--muted)',
                                border: '1px solid var(--border)',
                                fontWeight: 600
                              }}
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Showcase Product Images Slider */}
                      {result.productImages && result.productImages.length > 0 && (
                        <div>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                            <ImageIcon size={11} />
                            {language === 'tr' ? 'Ürün Galerisi' : 'Product Showcase'}
                          </span>
                          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {result.productImages.map((img, idx) => (
                              <a 
                                key={idx} 
                                href={img} 
                                target="_blank" 
                                rel="noreferrer"
                                style={{ 
                                  width: '56px', 
                                  height: '56px', 
                                  borderRadius: '4px', 
                                  overflow: 'hidden', 
                                  border: '1px solid var(--border)', 
                                  flexShrink: 0, 
                                  display: 'block' 
                                }}
                              >
                                <img src={img} alt={`Product ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      <div className="modal-actions" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '16px' }}>
        <button className="btn-secondary" onClick={() => setIsConnectionsModalOpen(false)}>
          {language === 'tr' ? 'Kapat' : 'Close'}
        </button>
      </div>
    </Modal>
  );
}
