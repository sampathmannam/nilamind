import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Bug, AlertCircle } from 'lucide-react';
import { secureLocal } from '../services/secureLocal';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    this.logError(error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  private async logError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      const entry = {
        timestamp: Date.now(),
        boundary: this.props.name ?? 'unknown',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      };
      const existing = secureLocal.getItem('nilamind_error_log');
      const log = existing ? JSON.parse(existing) : [];
      log.push(entry);
      // Keep last 50 errors
      if (log.length > 50) log.shift();
      secureLocal.setItem('nilamind_error_log', JSON.stringify(log));
    } catch {
      // fail silently - don't crash the error boundary
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex items-center justify-center p-6" role="alert">
          <div className="w-full max-w-md bg-fill/50 border border-line-strong rounded-xl p-6 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <AlertCircle className="w-7 h-7 text-red-400" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-ink mb-2">Something went wrong</h2>
            <pre className="text-left bg-card/50 rounded-lg p-3 text-xs text-ink-2 overflow-auto max-h-40 mb-4">
              {this.state.error?.message}
            </pre>
            <button
              onClick={this.handleRetry}
              className="w-full bg-accent hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition-colors mb-2 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-slate-600 hover:bg-fill text-ink-2 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Bug className="w-4 h-4" aria-hidden="true" />
              Full Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;