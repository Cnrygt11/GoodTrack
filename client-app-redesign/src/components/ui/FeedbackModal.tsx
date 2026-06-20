import { MessageSquarePlus, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import useFeedback, { FeedbackCategory } from '../../hooks/useFeedback';
import { useSettings } from '../../context/SettingsContext';

export default function FeedbackModal() {
  const { t } = useSettings();
  const {
    isOpen,
    category,
    subject,
    message,
    loading,
    success,
    error,
    setCategory,
    setSubject,
    setMessage,
    openModal,
    closeModal,
    submitFeedback
  } = useFeedback();

  if (!isOpen) {
    return (
      <button
        type="button"
        className="feedback-fab"
        onClick={openModal}
        title={t('feedbackBtnTooltip')}
        aria-label={t('feedbackBtnTooltip')}
      >
        <MessageSquarePlus size={20} />
        <span className="feedback-fab-text">{t('feedbackBtnTooltip')}</span>
      </button>
    );
  }

  return (
    <div className="feedback-backdrop" onClick={closeModal}>
      <div className="feedback-modal" onClick={(e) => e.stopPropagation()}>
        <div className="feedback-modal-header">
          <h3>{t('feedbackTitle')}</h3>
          <button 
            type="button" 
            className="feedback-close" 
            onClick={closeModal} 
            disabled={loading}
            aria-label={t('feedbackCloseBtn')}
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="feedback-success-state">
            <CheckCircle2 size={48} className="feedback-success-icon" />
            <p>{t('feedbackSuccess')}</p>
            <button type="button" className="btn-primary" onClick={closeModal}>
              {t('feedbackCloseBtn')}
            </button>
          </div>
        ) : (
          <form onSubmit={submitFeedback} className="feedback-form">
            {error && (
              <div className="feedback-error-alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="feedback-category">{t('feedbackType')}</label>
              <select
                id="feedback-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                disabled={loading}
                className="form-control"
              >
                <option value="bug">{t('feedbackTypeBug')}</option>
                <option value="suggestion">{t('feedbackTypeSuggestion')}</option>
                <option value="other">{t('feedbackTypeOther')}</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="feedback-subject">{t('feedbackSubject')}</label>
              <input
                id="feedback-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('feedbackPlaceholderSubject')}
                disabled={loading}
                className="form-control"
                required
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label htmlFor="feedback-message">{t('feedbackMessage')}</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedbackPlaceholderMessage')}
                disabled={loading}
                className="form-control"
                rows={4}
                required
                maxLength={1000}
              />
            </div>

            <div className="feedback-modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModal}
                disabled={loading}
              >
                {t('feedbackCloseBtn')}
              </button>
              <button
                type="submit"
                className="btn-primary btn-submit"
                disabled={loading || !subject.trim() || !message.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>{t('feedbackSending')}</span>
                  </>
                ) : (
                  <span>{t('feedbackSendBtn')}</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
