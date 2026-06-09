import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { api, Product } from '../../services/api';
import { TranslationKey } from '../../services/translations';
import {
  ArrowLeft, Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban,
  Calendar, Factory, Tag, Ruler, Send, Archive, Info, Loader2, User
} from 'lucide-react';

type StatusConfig = {
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  label: string;
};

function getStatusConfig(status: string, t: (key: TranslationKey) => string): StatusConfig {
  switch (status) {
    case 'awaiting':
      return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: <Clock size={12} />, label: t('statusPendingApproval') };
    case 'corrected':
      return { color: '#00bcd4', bg: 'rgba(0,188,212,0.1)', border: 'rgba(0,188,212,0.3)', icon: <Clock size={12} />, label: t('statusCorrected') };
    case 'broken':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: <AlertTriangle size={12} />, label: t('statusBroken') };
    case 'production':
      return { color: 'var(--accent-seller)', bg: 'var(--accent-seller-glow)', border: 'rgba(245,166,35,0.3)', icon: <Clock size={12} />, label: t('statusInProduction') };
    case 'completed':
      return { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', icon: <CheckCircle2 size={12} />, label: t('statusCompleted') };
    case 'delivered':
      return { color: '#8bc34a', bg: 'rgba(139,195,74,0.1)', border: 'rgba(139,195,74,0.3)', icon: <CheckCircle2 size={12} />, label: t('statusDelivered') };
    case 'defective':
      return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: <XCircle size={12} />, label: t('statusDefective') };
    case 'missing':
      return { color: '#ff5722', bg: 'rgba(255,87,34,0.1)', border: 'rgba(255,87,34,0.3)', icon: <AlertTriangle size={12} />, label: t('statusMissing') };
    case 'to_ship':
      return { color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.3)', icon: <Send size={12} />, label: t('statusToShip') };
    case 'shipped':
      return { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: <Archive size={12} />, label: t('statusShipped') };
    case 'cancelled':
      return { color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)', icon: <Ban size={12} />, label: t('statusCancelled') };
    default:
      return { color: 'var(--muted)', bg: 'transparent', border: 'var(--border)', icon: <Package size={12} />, label: status };
  }
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await api.getProductById(id);
        setProduct(data);
      } catch (err: unknown) {
        console.error(err);
        setError(language === 'tr' ? 'Sipariş detayları yüklenemedi.' : 'Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id, language]);

  const handleBack = () => {
    // Navigate back in history if possible, else default to roles dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(user?.role === 'mfr' ? '/mfr/orders' : '/seller/orders');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <Loader2 size={36} className="animate-spin" style={{ color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
        <span style={{ color: 'var(--muted)', fontSize: '14px' }}>{language === 'tr' ? 'Yükleniyor...' : 'Loading...'}</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px', textAlign: 'center' }} className="card">
        <AlertTriangle size={48} style={{ color: 'var(--danger)', marginBottom: '16px' }} />
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>{language === 'tr' ? 'Bir Hata Oluştu' : 'An Error Occurred'}</h3>
        <p style={{ color: 'var(--muted)', margin: '0 0 24px 0' }}>{error || (language === 'tr' ? 'Sipariş bulunamadı.' : 'Order not found.')}</p>
        <button className="btn-secondary" onClick={handleBack} style={{ margin: '0 auto' }}>
          <ArrowLeft size={14} style={{ marginRight: '6px' }} />
          {language === 'tr' ? 'Geri Dön' : 'Go Back'}
        </button>
      </div>
    );
  }

  const status = product.status || (product.isDefective ? 'defective' : (product.completed ? 'completed' : (product.isPendingApproval ? 'awaiting' : 'production')));
  const sc = getStatusConfig(status, t);

  // Mfr timeline logs filtering: only show up to and including 'to_ship' status
  const allLogs = product.logs || [];
  const toShipIndex = allLogs.findIndex(log => log.status === 'to_ship');
  const visibleLogs = (user?.role === 'mfr' && toShipIndex !== -1) ? allLogs.slice(0, toShipIndex + 1) : allLogs;

  const dateStr = product.createdAt ? new Date(product.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = product.createdAt ? new Date(product.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button onClick={handleBack} className="btn-back" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ArrowLeft size={16} />
          {language === 'tr' ? 'Kontrol Paneline Dön' : 'Back to Dashboard'}
        </button>
        <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
          {language === 'tr' ? 'Sipariş ID:' : 'Order ID:'} <strong style={{ color: 'var(--text)' }}>{product.id}</strong>
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        alignItems: 'start'
      }}>
        
        {/* Left Column: Product Info Card */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: '32px',
              letterSpacing: '2px', color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)',
              margin: 0, lineHeight: 1
            }}>
              {product.code}
            </h2>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: sc.bg, border: `1px solid ${sc.border}`,
              color: sc.color, borderRadius: '20px',
              padding: '4px 12px', fontSize: '12px', fontWeight: 700,
              letterSpacing: '0.3px', whiteSpace: 'nowrap'
            }}>
              {sc.icon} {sc.label}
            </span>
          </div>

          {/* Large Image Preview */}
          <div style={{
            width: '100%', height: '240px', borderRadius: '12px',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {product.image ? (
              <img src={product.image} alt="ürün" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Package size={64} style={{ color: 'var(--muted)', opacity: 0.3 }} />
            )}
          </div>

          {/* Details Specifications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: '0 0 4px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--text)' }}>
              {language === 'tr' ? 'Sipariş Özellikleri' : 'Order Specifications'}
            </h4>
            
            {product.text && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={13} style={{ color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
                  {t('textLabel')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{product.text}</span>
              </div>
            )}

            {product.length && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Ruler size={13} style={{ color: user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)' }} />
                  {t('lengthLabel')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{product.length} {language === 'tr' ? 'inç' : 'in'}</span>
              </div>
            )}

            {product.sellerName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} style={{ color: 'var(--accent-seller)' }} />
                  {t('sellerLabel')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{product.sellerName}</span>
              </div>
            )}

            {product.mfrName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Factory size={13} style={{ color: 'var(--accent-mfr)' }} />
                  {t('mfrLabel')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{product.mfrName}</span>
              </div>
            )}

            {Object.entries(product.extras || {}).map(([key, item]) => {
              if (!item.value) return null;
              return (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <span style={{ color: 'var(--muted)' }}>{item.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{item.value}</span>
                </div>
              );
            })}

            <div style={{ height: '8px' }} />

            <h4 style={{ margin: '0 0 4px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px', color: 'var(--text)' }}>
              {language === 'tr' ? 'Sipariş Zamanları' : 'Order Chronology'}
            </h4>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
              <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={13} />
                {t('sentDateLabel')}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>{dateStr} {timeStr}</span>
            </div>

            {product.completedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={13} />
                  {t('completedDateLabel')}
                </span>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{new Date(product.completedAt).toLocaleDateString('tr-TR')}</span>
              </div>
            )}
          </div>

          {/* Defect note block if exists */}
          {product.defectNote && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginTop: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 700, fontSize: '13.5px', marginBottom: '6px' }}>
                <Info size={14} />
                {language === 'tr' ? 'Sorun Bildirimi:' : 'Reported Problem:'}
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text)' }}>{product.defectNote}</p>
              {product.defectImage && (
                <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden' }}>
                  <img src={product.defectImage} alt="sorun" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Time-Travel Event Log List */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            {t('timelineTitle')}
          </h3>

          <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            paddingLeft: '12px',
            paddingTop: '8px',
            paddingBottom: '8px'
          }}>
            {/* Timeline Vertical line */}
            <div style={{
              position: 'absolute', top: '16px', bottom: '16px', left: '23px',
              width: '2px', background: 'var(--border)', zIndex: 1
            }} />

            {visibleLogs.map((log, index) => {
              const dateStr = new Date(log.timestamp).toLocaleString('tr-TR');
              const isActive = index === visibleLogs.length - 1;
              const accentThemeColor = user?.role === 'seller' ? 'var(--accent-seller)' : 'var(--accent-mfr)';

              return (
                <div key={index} style={{ display: 'flex', gap: '16px', position: 'relative', zIndex: 2 }}>
                  {/* Circle Indicator */}
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: isActive ? accentThemeColor : 'var(--border)',
                    border: isActive ? '4px solid var(--surface2)' : '4px solid var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? `0 0 10px ${accentThemeColor}` : 'none',
                    flexShrink: 0
                  }} />

                  {/* Log description */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? 'var(--text)' : 'var(--muted)',
                        fontSize: '13.5px'
                      }}>
                        {log.message}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{dateStr}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      <span><strong>Kim:</strong> {log.userName}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleLogs.length === 0 && (
              <p style={{ margin: 0, padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>
                {language === 'tr' ? 'Hareket günlüğü bulunamadı.' : 'No timeline logs found.'}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
