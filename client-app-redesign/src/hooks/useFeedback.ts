import { useState, useCallback, useRef } from 'react';
import { api } from '../services/apiClient';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { extractErrorMessage } from '../utils/errorUtils';

export type FeedbackCategory = 'bug' | 'suggestion' | 'other';

export default function useFeedback() {
  const { showToast } = useToast();
  const { language, t } = useSettings();

  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);

  const resetForm = useCallback(() => {
    setCategory('bug');
    setSubject('');
    setMessage('');
    setSuccess(false);
    setError(null);
    setLoading(false);
    isSubmittingRef.current = false;
  }, []);

  const openModal = useCallback(() => {
    resetForm();
    setIsOpen(true);
  }, [resetForm]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const getBrowserInfo = (): string => {
    if (typeof window === 'undefined') return '';
    return [
      `URL: ${window.location.href}`,
      `UserAgent: ${navigator.userAgent}`,
      `Screen: ${window.screen.width}x${window.screen.height}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Language: ${navigator.language}`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
  };

  const submitFeedback = useCallback(
    async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      if (isSubmittingRef.current || loading) {
        return;
      }

      if (!subject.trim() || !message.trim()) {
        const errMsg =
          language === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill in all fields.';
        setError(errMsg);
        return;
      }

      try {
        isSubmittingRef.current = true;
        setLoading(true);
        setError(null);

        // Prepend category prefix in Turkish / English depending on the category state
        let categoryPrefix = '[BUG]';
        if (category === 'suggestion') {
          categoryPrefix = '[SUGGESTION]';
        } else if (category === 'other') {
          categoryPrefix = '[OTHER]';
        }

        const formattedTitle = `${categoryPrefix} ${subject.trim()}`;
        const browserInfo = getBrowserInfo();

        const response = await api.submitFeedback({
          title: formattedTitle,
          message: message.trim(),
          browserInfo,
        });

        setSuccess(true);
        showToast(response.message || t('feedbackSuccess'));
      } catch (err: unknown) {
        const errMsg = extractErrorMessage(err);
        setError(errMsg);
        showToast(errMsg);
      } finally {
        isSubmittingRef.current = false;
        setLoading(false);
      }
    },
    [category, subject, message, language, showToast, t, loading],
  );

  return {
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
    submitFeedback,
    resetForm,
  };
}
