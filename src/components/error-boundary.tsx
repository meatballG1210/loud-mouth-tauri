import React from 'react';
import { useLocation } from 'wouter';
import { translations } from '@/lib/i18n';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error caught by boundary:', error, errorInfo);
    }

    // In a real app, you would send this to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: React.ErrorInfo) {
    // Mock error reporting - in a real app this would send to Sentry, LogRocket, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.log('Error report:', errorReport);
  }

  componentDidUpdate() {
    if (this.state.hasError) {
      // Navigate to error page with error details
      const errorParams = new URLSearchParams({
        code: this.state.error?.name || 'UnknownError',
        message: this.state.error?.message || 'An unknown error occurred',
        timestamp: new Date().toISOString()
      });
      
      window.location.href = `/error?${errorParams.toString()}`;
    }
  }

  render() {
    if (this.state.hasError) {
      // Get current language from localStorage
      const savedLanguage = localStorage.getItem('ui-language') || 'en';
      const lang = (savedLanguage === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
      const t = translations[lang];

      // Show a minimal fallback UI while redirecting
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--macos-grouped-bg-primary)' }}>
          <div className="text-center">
            <div className="macos-title-3 mb-2">{t.redirectingToErrorPage}</div>
            <div className="macos-footnote" style={{ color: 'var(--macos-label-secondary)' }}>
              {t.notRedirectedAutomatically}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const [, setLocation] = useLocation();

  return (error: Error, errorInfo?: any) => {
    console.error('Error handled:', error, errorInfo);
    
    const errorParams = new URLSearchParams({
      code: error.name || 'UnknownError',
      message: error.message || 'An unknown error occurred',
      timestamp: new Date().toISOString()
    });
    
    setLocation(`/error?${errorParams.toString()}`);
  };
}