import { Component, ErrorInfo, ReactNode } from 'react';

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
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0d0f12] text-white p-6">
          <div className="max-w-md w-full bg-[#161a22]/80 backdrop-blur-md border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold mb-3 tracking-tight">Bir Şeyler Ters Gitti</h1>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Uygulama yüklenirken veya çalışırken beklenmeyen bir arayüz hatası oluştu. Lütfen sayfayı yenilemeyi deneyin.
            </p>

            {this.state.error && (
              <div className="bg-black/30 rounded-lg p-3 text-left mb-6 font-mono text-xs text-red-400/90 overflow-auto max-h-32 border border-white/5">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition duration-200 shadow-lg shadow-blue-600/15"
              >
                Sayfayı Yenile
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-medium border border-white/10 transition duration-200"
              >
                Ana Sayfa
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
