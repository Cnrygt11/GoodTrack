import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { CreditCard, Calendar, Lock, User, Loader2, AlertCircle, ShieldCheck, Sparkles, X } from 'lucide-react';
import Modal from './Modal';

interface MockPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: number;
  onSuccess: () => Promise<void>;
}

export default function MockPaymentModal({
  isOpen,
  onClose,
  planName,
  planPrice,
  onSuccess
}: MockPaymentModalProps) {
  const { t } = useSettings();
  
  // Form states
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [focusedField, setFocusedField] = useState<'front' | 'back'>('front');
  
  // Validation and process states
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [paymentFinished, setPaymentFinished] = useState(false);

  // Status simulation timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!isOpen) return null;

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
      setCardNumber(formatted);
      setError(null);
    }
  };

  // Format Expiry Date (MM/YY)
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      if (value.length > 2) {
        value = `${value.slice(0, 2)}/${value.slice(2)}`;
      }
      setExpiry(value);
      setError(null);
    }
  };

  // Format CVV (3 digits)
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 3) {
      setCvc(value);
      setError(null);
    }
  };

  // Format Cardholder Name (Uppercase letters and spaces only)
  const handleCardHolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    if (/^[A-ZÇĞİÖŞÜ\s]*$/.test(value)) {
      setCardHolder(value);
      setError(null);
    }
  };

  // Pre-fill fields with simulation data
  const handleFillTestCard = () => {
    setCardHolder('BETA TESTER');
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/30');
    setCvc('123');
    setFocusedField('front');
    setError(null);
  };

  // Handle mock payment submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing || paymentFinished) return;

    // Validate inputs
    if (!cardHolder.trim() || !cardNumber.trim() || !expiry.trim() || !cvc.trim()) {
      setError(t('paymentErrorEmpty'));
      return;
    }

    const cleanCard = cardNumber.replace(/\s/g, '');
    if (cleanCard.length !== 16) {
      setError(t('paymentErrorInvalidCard'));
      return;
    }

    if (expiry.length !== 5 || !expiry.includes('/')) {
      setError(t('paymentErrorInvalidExpiry'));
      return;
    }

    const [month, year] = expiry.split('/');
    const m = parseInt(month, 10);
    if (isNaN(m) || m < 1 || m > 12) {
      setError(t('paymentErrorInvalidExpiry'));
      return;
    }

    if (cvc.length !== 3) {
      setError(t('paymentErrorInvalidCvv'));
      return;
    }

    // Start Simulation steps
    setError(null);
    setIsProcessing(true);
    setProcessStep(0);

    const runSimulation = () => {
      // Step 1: Connecting to gateway
      setProcessStep(1);
      
      timerRef.current = setTimeout(() => {
        // Step 2: Verifying 3D Secure
        setProcessStep(2);
        
        timerRef.current = setTimeout(() => {
          // Step 3: Activating subscription
          setProcessStep(3);
          
          timerRef.current = setTimeout(async () => {
            try {
              // Call API
              await onSuccess();
              setPaymentFinished(true);
              
              timerRef.current = setTimeout(() => {
                onClose();
                // Reset state
                setIsProcessing(false);
                setPaymentFinished(false);
                setCardHolder('');
                setCardNumber('');
                setExpiry('');
                setCvc('');
              }, 1500);

            } catch (err: any) {
              setIsProcessing(false);
              setError(err.message || 'Ödeme işlemi başarısız oldu.');
            }
          }, 1000);
        }, 1200);
      }, 1000);
    };

    runSimulation();
  };

  const getStepText = () => {
    switch (processStep) {
      case 1: return t('paymentStatusConnecting');
      case 2: return t('paymentStatusVerifying');
      case 3: return t('paymentStatusFinalizing');
      default: return t('paymentProcessing');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => !isProcessing && onClose()}>
      <div className="payment-simulation-modal">
        {/* Close Button */}
        {!isProcessing && (
          <button className="payment-modal-close-btn" onClick={onClose} aria-label={t('closeModal')}>
            <X size={20} />
          </button>
        )}

        {/* Modal Header */}
        <div className="payment-modal-header">
          <div className="payment-modal-title-row">
            <Sparkles className="sparkle-glow-icon" size={20} />
            <h3 className="payment-modal-title">{t('paymentSimulationTitle')}</h3>
          </div>
          <span className="payment-modal-subtitle">{t('paymentSimulationSubtitle')}</span>
        </div>

        {/* Beta Mode Alert Banner */}
        <div className="payment-modal-alert">
          <AlertCircle size={18} className="alert-banner-icon" />
          <p className="alert-banner-text">{t('paymentSimulationAlert')}</p>
        </div>

        {/* Selected Plan Banner */}
        <div className="selected-plan-badge">
          <div className="selected-plan-info">
            <span className="plan-badge-label">Seçilen Plan / Selected Plan</span>
            <span className="plan-badge-name">{planName}</span>
          </div>
          <div className="selected-plan-price">
            ${planPrice} <span className="price-term">/mo</span>
          </div>
        </div>

        {/* Virtual Credit Card Display */}
        <div className={`virtual-card-container ${focusedField === 'back' ? 'flipped' : ''}`}>
          <div className="virtual-card">
            {/* Card Front */}
            <div className="virtual-card-front">
              <div className="card-glass-glow" />
              <div className="card-top-row">
                <div className="card-chip">
                  <div className="chip-line" />
                  <div className="chip-line" />
                  <div className="chip-line" />
                  <div className="chip-line" />
                </div>
                <div className="card-logo">GoodTrack Pay</div>
              </div>
              <div className="card-middle-row">
                <span className="card-number-display">
                  {cardNumber || '•••• •••• •••• ••••'}
                </span>
              </div>
              <div className="card-bottom-row">
                <div className="card-holder-info">
                  <span className="card-bottom-label">CARDHOLDER</span>
                  <span className="card-bottom-value">{cardHolder || 'BETA TESTER'}</span>
                </div>
                <div className="card-expiry-info">
                  <span className="card-bottom-label">EXPIRES</span>
                  <span className="card-bottom-value">{expiry || 'MM/YY'}</span>
                </div>
              </div>
            </div>

            {/* Card Back */}
            <div className="virtual-card-back">
              <div className="card-glass-glow" />
              <div className="card-black-strip" />
              <div className="card-cvc-strip">
                <div className="signature-lines" />
                <div className="cvc-bubble-display">{cvc || '•••'}</div>
              </div>
              <div className="card-back-text">
                This is a simulated credit card for GoodTrack closed beta. Authorized signatures only. Not valid in real-world environments.
              </div>
            </div>
          </div>
        </div>

        {/* Checkout Form */}
        {!isProcessing && !paymentFinished ? (
          <form className="payment-checkout-form" onSubmit={handleSubmit}>
            {error && (
              <div className="payment-form-error">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="payment-form-field">
              <label htmlFor="cardholder-name" className="payment-form-label">
                <User size={14} /> {t('cardHolderName')}
              </label>
              <input
                id="cardholder-name"
                type="text"
                className="payment-form-input"
                placeholder="JOHN DOE"
                value={cardHolder}
                onChange={handleCardHolderChange}
                onFocus={() => setFocusedField('front')}
                required
              />
            </div>

            <div className="payment-form-field">
              <label htmlFor="card-number" className="payment-form-label">
                <CreditCard size={14} /> {t('cardNumber')}
              </label>
              <input
                id="card-number"
                type="text"
                className="payment-form-input"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={handleCardNumberChange}
                onFocus={() => setFocusedField('front')}
                required
              />
            </div>

            <div className="payment-form-row">
              <div className="payment-form-field half">
                <label htmlFor="card-expiry" className="payment-form-label">
                  <Calendar size={14} /> {t('expiryDate')}
                </label>
                <input
                  id="card-expiry"
                  type="text"
                  className="payment-form-input"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  onFocus={() => setFocusedField('front')}
                  required
                />
              </div>

              <div className="payment-form-field half">
                <label htmlFor="card-cvc" className="payment-form-label">
                  <Lock size={14} /> {t('cvv')}
                </label>
                <input
                  id="card-cvc"
                  type="text"
                  className="payment-form-input"
                  placeholder="123"
                  value={cvc}
                  onChange={handleCvcChange}
                  onFocus={() => setFocusedField('back')}
                  onBlur={() => setFocusedField('front')}
                  required
                />
              </div>
            </div>

            {/* Quick Helper and Pay Buttons */}
            <div className="payment-form-actions">
              <button
                type="button"
                className="btn-fill-test-card"
                onClick={handleFillTestCard}
              >
                <Sparkles size={14} />
                {t('fillWithTestCard')}
              </button>

              <button type="submit" className="btn-pay-submit">
                <ShieldCheck size={16} />
                {t('payButton')}
              </button>
            </div>
          </form>
        ) : (
          /* Processing / Successful Animation Panel */
          <div className="payment-processing-panel">
            {paymentFinished ? (
              <div className="payment-success-animation animate-in">
                <div className="success-checkmark-circle">
                  <ShieldCheck size={48} className="checkmark-success-icon" />
                </div>
                <h4 className="payment-success-title">{t('paymentStatusSuccess')}</h4>
                <p className="payment-success-subtitle">{t('upgradeSuccess')}</p>
              </div>
            ) : (
              <div className="payment-spinner-loader">
                <Loader2 size={40} className="spinning-loader-icon" />
                <div className="processing-text-sequence">
                  <p className="processing-status-title">{getStepText()}</p>
                  <div className="progress-dots-wave">
                    <span className="dot" />
                    <span className="dot" />
                    <span className="dot" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
