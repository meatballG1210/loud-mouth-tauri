import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { useLocation } from 'wouter';

interface SectionErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface SectionErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  sectionName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class SectionErrorBoundary extends React.Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { sectionName, onError } = this.props;
    
    console.error(`Error in ${sectionName || 'section'}:`, error, errorInfo);
    
    if (onError) {
      onError(error, errorInfo);
    }
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary);
      }

      return <DefaultSectionError 
        error={this.state.error} 
        sectionName={this.props.sectionName}
        onReset={this.resetErrorBoundary} 
      />;
    }

    return this.props.children;
  }
}

interface DefaultSectionErrorProps {
  error: Error;
  sectionName?: string;
  onReset: () => void;
}

function DefaultSectionError({ error, sectionName, onReset }: DefaultSectionErrorProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="p-8 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <div className="flex items-start gap-4">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
            {sectionName ? `Error in ${sectionName}` : 'Something went wrong'}
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation('/')}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function withSectionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  sectionName?: string,
  fallback?: (error: Error, reset: () => void) => React.ReactNode
) {
  return (props: P) => (
    <SectionErrorBoundary sectionName={sectionName} fallback={fallback}>
      <Component {...props} />
    </SectionErrorBoundary>
  );
}