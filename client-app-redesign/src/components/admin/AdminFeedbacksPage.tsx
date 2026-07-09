import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Terminal, User, Clock, Bug, Lightbulb, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { api, Feedback } from '../../services/apiClient';
import { useSettings } from '../../context/SettingsContext';
import { extractErrorMessage } from '../../utils/errorUtils';

export default function AdminFeedbacksPage() {
  const { t } = useSettings();

  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'bug' | 'suggestion' | 'other'>('all');
  const [expandedFeedbacks, setExpandedFeedbacks] = useState<Record<string, boolean>>({});

  const fetchFeedbacks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getAdminFeedbacks();
      setFeedbacks(data);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedFeedbacks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  }, []);

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    if (filter === 'all') return feedbacks;
    return feedbacks.filter(f => {
      const titleLower = f.title.toLowerCase();
      if (filter === 'bug') return titleLower.includes('[bug]');
      if (filter === 'suggestion') return titleLower.includes('[suggestion]');
      if (filter === 'other') return titleLower.includes('[other]');
      return true;
    });
  }, [feedbacks, filter]);

  // Helper to extract clean subject and category icon
  const getFeedbackDetails = (f: Feedback) => {
    let cleanSubject = f.title;
    let icon = <MessageSquare size={16} />;
    let badgeClass = 'admin-role-badge mfr'; // default other style

    if (f.title.startsWith('[BUG]')) {
      cleanSubject = f.title.replace('[BUG]', '').trim();
      icon = <Bug size={16} />;
      badgeClass = 'admin-role-badge seller'; // red/orange style
    } else if (f.title.startsWith('[SUGGESTION]')) {
      cleanSubject = f.title.replace('[SUGGESTION]', '').trim();
      icon = <Lightbulb size={16} />;
      badgeClass = 'admin-role-badge admin'; // purple/green style
    } else if (f.title.startsWith('[OTHER]')) {
      cleanSubject = f.title.replace('[OTHER]', '').trim();
      icon = <MessageSquare size={16} />;
      badgeClass = 'admin-role-badge mfr'; // cyan style
    }

    return { cleanSubject, icon, badgeClass };
  };

  if (loading) {
    return (
      <div className="profile-loading-container" style={{ minHeight: '60vh' }}>
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  return (
    <div className="admin-feedbacks-container" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Page Header and Filtering Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          {t('tabFeedbacks')}
        </h2>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className={`btn-secondary ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
            style={filter === 'all' ? { background: 'var(--accent-admin-gradient)', color: '#fff', borderColor: 'transparent' } : {}}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`btn-secondary ${filter === 'bug' ? 'active' : ''}`}
            onClick={() => setFilter('bug')}
            style={filter === 'bug' ? { background: 'var(--accent-seller-gradient)', color: '#fff', borderColor: 'transparent' } : {}}
          >
            {t('feedbackTypeBug')}
          </button>
          <button
            type="button"
            className={`btn-secondary ${filter === 'suggestion' ? 'active' : ''}`}
            onClick={() => setFilter('suggestion')}
            style={filter === 'suggestion' ? { background: 'var(--accent-admin-gradient)', color: '#fff', borderColor: 'transparent' } : {}}
          >
            {t('feedbackTypeSuggestion')}
          </button>
          <button
            type="button"
            className={`btn-secondary ${filter === 'other' ? 'active' : ''}`}
            onClick={() => setFilter('other')}
            style={filter === 'other' ? { background: 'rgba(0, 242, 254, 0.2)', color: '#a5f3fc', borderColor: 'rgba(0, 242, 254, 0.3)' } : {}}
          >
            {t('feedbackTypeOther')}
          </button>
          <button
            type="button"
            className="btn-secondary btn-icon"
            onClick={fetchFeedbacks}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="feedback-error-alert" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" className="btn-secondary" onClick={fetchFeedbacks} style={{ padding: '4px 8px', fontSize: '0.8rem', marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={12} />
            <span>Yeniden Dene</span>
          </button>
        </div>
      )}

      {/* Feedbacks Listing */}
      <div className="admin-feedbacks-list">
        {filteredFeedbacks.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
            {t('noFeedbacksFound')}
          </div>
        ) : (
          filteredFeedbacks.map(f => {
            const { cleanSubject, icon, badgeClass } = getFeedbackDetails(f);
            const isExpanded = !!expandedFeedbacks[f.id];

            return (
              <div className="admin-feedback-card" key={f.id}>
                {/* Meta details header */}
                <div className="admin-feedback-meta">
                  <div className="admin-feedback-user">
                    <User size={14} />
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{f.username}</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                      ({f.role === 'admin' ? t('roleAdminLabel') : (f.role === 'mfr' ? t('roleMfrLabel') : t('roleSellerLabel'))})
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '-'}</span>
                  </div>
                </div>

                {/* Title / Subject */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className={badgeClass} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {icon}
                    <span>
                      {f.title.startsWith('[BUG]') ? 'Hata' : (f.title.startsWith('[SUGGESTION]') ? 'Öneri' : 'Diğer')}
                    </span>
                  </span>
                  <span className="admin-feedback-title">{cleanSubject}</span>
                </div>

                {/* Message Body */}
                <div className="admin-feedback-message">
                  {f.message}
                </div>

                {/* Browser Metadata section */}
                {f.browserInfo && (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      type="button"
                      className="admin-feedback-sys-toggle"
                      onClick={() => toggleExpand(f.id)}
                    >
                      <Terminal size={12} />
                      <span>{t('feedbackBrowserInfo')}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {isExpanded && (
                      <pre className="admin-feedback-sys-info">
                        {f.browserInfo}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

