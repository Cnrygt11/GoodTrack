import React, { Component, ErrorInfo, ReactNode } from 'react';
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
    error: null
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
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: 'var(--bg)',
          color: 'var(--text)',
          padding: '20px',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            padding: '20px',
            borderRadius: '50%',
            marginBottom: '20px'
          }}>
            <AlertTriangle size={48} style={{ color: 'var(--danger)' }} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '10px' }}>Bir Şeyler Yanlış Gitti</h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '400px', lineHeight: 1.6, marginBottom: '24px' }}>
            Arayüz render edilirken beklenmeyen bir hata oluştu. Lütfen sayfayı yenileyin veya ana sayfaya dönün.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => window.location.reload()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            >
              <RefreshCw size={14} />
              Yeniden Dene
            </button>
            <button 
              className="btn-primary" 
              onClick={this.handleReset}
              style={{ fontSize: '13px' }}
            >
              Ana Sayfaya Dön
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
