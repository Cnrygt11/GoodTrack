import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

/**
 * Sağ alt bildirim: uygulamanın cam panel dilinde (surface + blur + vurgu çubuğu).
 * Durum ikonla ve sol vurgu çubuğuyla anlatılır; alttaki ilerleme çizgisi otomatik
 * kapanma süresini gösterir. Süreler ToastContext ile senkron tutulur.
 */
export default function Toast() {
  const { toast } = useToast();
  const duration = toast.isError ? 4000 : 2500;

  return (
    <div
      className={`toast ${toast.show ? 'show' : ''} ${toast.isError ? 'error' : ''}`}
      id="toast"
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">
        {toast.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      </span>
      <span className="toast-message">{toast.message}</span>
      {toast.show && (
        <span
          className="toast-progress"
          key={toast.seq}
          style={{ animationDuration: `${duration}ms` }}
        />
      )}
    </div>
  );
}
