import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { api, Product } from '../../services/api';
import { getStatusConfig } from '../../utils/statusConfig';
import BrokenDetailsModal from '../seller/BrokenDetailsModal';
import { ORDER_STATUS } from '../../utils/constants';
import {
  ArrowLeft, Package, Clock, CheckCircle2, AlertTriangle, XCircle, Ban,
  Calendar, Factory, Tag, Ruler, Send, Archive, Info, Loader2, User
} from 'lucide-react';


export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language, t } = useSettings();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBrokenModalOpen, setIsBrokenModalOpen] = useState(false);

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
        setError(t('failedToLoadOrderDetails'));
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
      <div className="order-detail-loading-wrapper">
        <Loader2 size={36} className="animate-spin order-detail-loader" />
        <span className="order-detail-loading-text">{t('loadingText')}</span>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="card order-detail-error-card">
        <AlertTriangle size={48} className="order-detail-error-icon" />
        <h3 className="order-detail-error-title">{t('anErrorOccurred')}</h3>
        <p className="order-detail-error-msg">{error || t('orderNotFound')}</p>
        <button className="btn-secondary order-detail-error-back-btn" onClick={handleBack}>
          <ArrowLeft size={14} className="margin-right-6" />
          {t('goBack')}
        </button>
      </div>
    );
  }

  const status = product.status || (product.isDefective ? ORDER_STATUS.DEFECTIVE : (product.completed ? ORDER_STATUS.COMPLETED : (product.isPendingApproval ? ORDER_STATUS.AWAITING : ORDER_STATUS.PRODUCTION)));
  const sc = getStatusConfig(status, t, { iconSize: 12, role: user?.role === 'mfr' ? 'mfr' : 'seller', isReproduction: product.isReproduction });

  // Mfr timeline logs filtering: only show up to and including 'to_ship' status
  const allLogs = product.logs || [];
  const toShipIndex = allLogs.findIndex(log => log.status === ORDER_STATUS.TO_SHIP);
  const visibleLogs = (user?.role === 'mfr' && toShipIndex !== -1) ? allLogs.slice(0, toShipIndex + 1) : allLogs;

  const dateStr = product.createdAt ? new Date(product.createdAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const timeStr = product.createdAt ? new Date(product.createdAt).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="order-detail-container">
      
      {/* Header breadcrumb */}
      <div className="order-detail-breadcrumb">
        <button onClick={handleBack} className="btn-back">
          <ArrowLeft size={16} />
          {t('backToDashboard')}
        </button>
        <span className="order-detail-id-text">
          {t('orderIdLabel')} <strong className="order-detail-id-val">{product.id}</strong>
        </span>
      </div>

      <div className="order-detail-grid">
        
        {/* Left Column: Product Info Card */}
        <div className="card order-detail-left-col">
          <div className="order-detail-header-row">
            <h2 className="order-detail-code-title">
              {product.code}
            </h2>
            <span 
              className="order-detail-status-badge"
              style={{
                background: sc.bg, border: `1px solid ${sc.border}`,
                color: sc.color
              }}
            >
              {sc.icon} {sc.label}
            </span>
            {product.cancelRequested && (
              <span className="order-detail-cancel-pending-badge">
                {t('cancelRequestPending')}
              </span>
            )}
            {status === 'broken' && product.defectNote && user?.role === 'seller' && (
              <button
                type="button"
                onClick={() => setIsBrokenModalOpen(true)}
                className="icon-btn order-detail-broken-exp-btn"
                title={t('brokenOrderExplanation')}
              >
                <AlertTriangle size={12} />
              </button>
            )}
          </div>

          {/* Large Image Preview */}
          <div className="order-detail-image-preview">
            {product.image ? (
              <img src={product.image} alt="ürün" />
            ) : (
              <Package size={64} className="order-detail-image-fallback" />
            )}
          </div>

          {/* Details Specifications */}
          <div className="order-detail-specs-stack">
            <h4>
              {t('orderSpecifications')}
            </h4>
            
            {product.text && (
              <div className="order-detail-spec-row">
                <span className="order-detail-spec-label">
                  <Tag size={13} />
                  {t('textLabel')}
                </span>
                <span className="order-detail-spec-val">{product.text}</span>
              </div>
            )}

            {product.length && (
              <div className="order-detail-spec-row">
                <span className="order-detail-spec-label">
                  <Ruler size={13} />
                  {t('lengthLabel')}
                </span>
                <span className="order-detail-spec-val">{product.length} {t('inchSuffix')}</span>
              </div>
            )}

            {product.sellerName && (
              <div className="order-detail-spec-row">
                <span className="order-detail-spec-label">
                  <User size={13} className="seller-color" />
                  {t('sellerLabel')}
                </span>
                <span className="order-detail-spec-val">{product.sellerName}</span>
              </div>
            )}

            {product.mfrName && (
              <div className="order-detail-spec-row">
                <span className="order-detail-spec-label">
                  <Factory size={13} className="mfr-color" />
                  {t('mfrLabel')}
                </span>
                <span className="order-detail-spec-val">{product.mfrName}</span>
              </div>
            )}

            {Object.entries(product.extras || {}).map(([key, item]) => {
              if (!item.value) return null;
              return (
                <div key={key} className="order-detail-spec-row">
                  <span style={{ color: 'var(--muted)' }}>{item.name}</span>
                  <span className="order-detail-spec-val">{item.value}</span>
                </div>
              );
            })}

            <div style={{ height: '8px' }} />

            <h4>
              {t('orderChronology')}
            </h4>

            <div className="order-detail-spec-row">
              <span className="order-detail-spec-label">
                <Calendar size={13} />
                {t('sentDateLabel')}
              </span>
              <span className="order-detail-spec-val">{dateStr} {timeStr}</span>
            </div>

            {product.completedAt && (
              <div className="order-detail-spec-row">
                <span className="order-detail-completed-label">
                  <CheckCircle2 size={13} />
                  {t('completedDateLabel')}
                </span>
                <span className="order-detail-spec-val">{new Date(product.completedAt).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US')}</span>
              </div>
            )}
          </div>

          {/* Defect note block if exists */}
          {product.defectNote && (
            <div className="order-detail-defect-box">
              <div className="order-detail-defect-header">
                <Info size={14} />
                {t('reportedProblemLabel')}
              </div>
              <p className="order-detail-defect-text">{product.defectNote}</p>
              {product.defectImage && (
                <div className="order-detail-defect-image">
                  <img src={product.defectImage} alt="sorun" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Time-Travel Event Log List */}
        <div className="card order-detail-right-col">
          <h3>
            {t('timelineTitle')}
          </h3>

          <div className="order-detail-timeline-container">
            {/* Timeline Vertical line */}
            <div className="order-detail-timeline-line" />

            {visibleLogs.map((log, index) => {
              const dateStr = new Date(log.timestamp).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US');
              const isActive = index === visibleLogs.length - 1;

              return (
                <div key={index} className="order-detail-timeline-row">
                  {/* Circle Indicator */}
                  <div className={`order-detail-circle-indicator${isActive ? ' is-active' : ''}`} />

                  {/* Log description */}
                  <div className="order-detail-log-details">
                    <div className="order-detail-log-header">
                      <span className={`order-detail-log-msg${isActive ? ' is-active' : ''}`}>
                        {log.message}
                      </span>
                      <span className="order-detail-log-time">{dateStr}</span>
                    </div>
                    <div className="order-detail-log-user">
                      <span><strong>{t('byLabel')}</strong> {log.userName}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {visibleLogs.length === 0 && (
              <p className="order-detail-timeline-empty">
                {t('noTimelineLogs')}
              </p>
            )}
          </div>
        </div>

      </div>

      <BrokenDetailsModal
        isOpen={isBrokenModalOpen}
        onClose={() => setIsBrokenModalOpen(false)}
        product={product}
      />
    </div>
  );
}
