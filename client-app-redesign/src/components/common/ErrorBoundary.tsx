import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-icon">
            <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 className="error-boundary-title">Bir Şeyler Yanlış Gitti</h2>
          <p className="error-boundary-text">
            Arayüz render edilirken beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana
            sayfaya dönün.
          </p>
          <div className="error-boundary-actions">
            <button
              className="btn-secondary error-boundary-retry"
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={14} />
              Yeniden Dene
            </button>
            <button className="btn-primary error-boundary-home" onClick={this.handleReset}>
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
