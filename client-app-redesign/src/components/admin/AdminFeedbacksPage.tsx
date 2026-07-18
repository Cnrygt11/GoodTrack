import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Terminal,
  User,
  Clock,
  Bug,
  Lightbulb,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
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
    setExpandedFeedbacks((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // Filter feedbacks
  const filteredFeedbacks = useMemo(() => {
    if (filter === 'all') return feedbacks;
    return feedbacks.filter((f) => {
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
      <div className="profile-loading-container profile-loading-container--full">
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  return (
    <div className="admin-feedbacks-container">
      {/* Page Header and Filtering Tabs */}
      <div className="admin-feedbacks-header">
        <h2 className="admin-feedbacks-heading">{t('tabFeedbacks')}</h2>

        <div className="admin-feedbacks-filters">
          <button
            type="button"
            className={`btn-secondary admin-feedbacks-filter admin-feedbacks-filter--all ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tümü
          </button>
          <button
            type="button"
            className={`btn-secondary admin-feedbacks-filter admin-feedbacks-filter--bug ${filter === 'bug' ? 'active' : ''}`}
            onClick={() => setFilter('bug')}
          >
            {t('feedbackTypeBug')}
          </button>
          <button
            type="button"
            className={`btn-secondary admin-feedbacks-filter admin-feedbacks-filter--suggestion ${filter === 'suggestion' ? 'active' : ''}`}
            onClick={() => setFilter('suggestion')}
          >
            {t('feedbackTypeSuggestion')}
          </button>
          <button
            type="button"
            className={`btn-secondary admin-feedbacks-filter admin-feedbacks-filter--other ${filter === 'other' ? 'active' : ''}`}
            onClick={() => setFilter('other')}
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
        <div className="feedback-error-alert admin-feedbacks-error">
          <span>{error}</span>
          <button
            type="button"
            className="btn-secondary admin-feedbacks-retry"
            onClick={fetchFeedbacks}
          >
            <RefreshCw size={12} />
            <span>Yeniden Dene</span>
          </button>
        </div>
      )}

      {/* Feedbacks Listing */}
      <div className="admin-feedbacks-list">
        {filteredFeedbacks.length === 0 ? (
          <div className="admin-feedbacks-empty">{t('noFeedbacksFound')}</div>
        ) : (
          filteredFeedbacks.map((f) => {
            const { cleanSubject, icon, badgeClass } = getFeedbackDetails(f);
            const isExpanded = !!expandedFeedbacks[f.id];

            return (
              <div className="admin-feedback-card" key={f.id}>
                {/* Meta details header */}
                <div className="admin-feedback-meta">
                  <div className="admin-feedback-user">
                    <User size={14} />
                    <span className="admin-feedback-username">{f.username}</span>
                    <span className="admin-feedback-user-role">
                      (
                      {f.role === 'admin'
                        ? t('roleAdminLabel')
                        : f.role === 'mfr'
                          ? t('roleMfrLabel')
                          : t('roleSellerLabel')}
                      )
                    </span>
                  </div>

                  <div className="admin-feedback-date">
                    <Clock size={14} />
                    <span>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '-'}</span>
                  </div>
                </div>

                {/* Title / Subject */}
                <div className="admin-feedback-title-row">
                  <span className={badgeClass}>
                    {icon}
                    <span>
                      {f.title.startsWith('[BUG]')
                        ? 'Hata'
                        : f.title.startsWith('[SUGGESTION]')
                          ? 'Öneri'
                          : 'Diğer'}
                    </span>
                  </span>
                  <span className="admin-feedback-title">{cleanSubject}</span>
                </div>

                {/* Message Body */}
                <div className="admin-feedback-message">{f.message}</div>

                {/* Browser Metadata section */}
                {f.browserInfo && (
                  <div className="admin-feedback-sys">
                    <button
                      type="button"
                      className="admin-feedback-sys-toggle"
                      onClick={() => toggleExpand(f.id)}
                    >
                      <Terminal size={12} />
                      <span>{t('feedbackBrowserInfo')}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {isExpanded && <pre className="admin-feedback-sys-info">{f.browserInfo}</pre>}
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
