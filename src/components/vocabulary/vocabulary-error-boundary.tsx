import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, BookOpen, RefreshCw } from 'lucide-react';
import { SectionErrorBoundary } from '@/components/section-error-boundary';

interface VocabularyErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

export function VocabularyErrorBoundary({ children, onRetry }: VocabularyErrorBoundaryProps) {
  const vocabularyErrorFallback = (error: Error, reset: () => void) => {
    const isDatabaseError = error.message.toLowerCase().includes('database') || 
                           error.message.toLowerCase().includes('sqlite');
    const isSyncError = error.message.toLowerCase().includes('sync') || 
                       error.message.toLowerCase().includes('network');

    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
        <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold mb-2">
          {isDatabaseError ? 'Database Error' : 
           isSyncError ? 'Sync Error' : 
           'Vocabulary Error'}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md text-center">
          {isDatabaseError ? 
            'Failed to access vocabulary database. Please try restarting the application.' :
           isSyncError ? 
            'Failed to sync vocabulary. Check your internet connection and try again.' :
            error.message || 'An error occurred while loading vocabulary.'}
        </p>
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => {
              reset();
              onRetry?.();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = '/'}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  };

  return (
    <SectionErrorBoundary 
      sectionName="Vocabulary"
      fallback={vocabularyErrorFallback}
      onError={(error) => {
        console.error('Vocabulary error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </SectionErrorBoundary>
  );
}

export function VocabularyListErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <SectionErrorBoundary 
      sectionName="Vocabulary List"
      fallback={(_error, reset) => (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Failed to load vocabulary list
          </p>
          <Button size="sm" variant="outline" onClick={reset}>
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </SectionErrorBoundary>
  );
}

export function ReviewErrorBoundary({ children }: { children: React.ReactNode }) {
  const reviewErrorFallback = (error: Error, reset: () => void) => {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-red-900 dark:text-red-100">
              Review Session Error
            </h4>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {error.message || 'An error occurred during the review session'}
            </p>
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Restart Review
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/vocabulary'}
              >
                Back to Vocabulary
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionErrorBoundary 
      sectionName="Review Session"
      fallback={reviewErrorFallback}
    >
      {children}
    </SectionErrorBoundary>
  );
}