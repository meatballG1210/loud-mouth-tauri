import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  VocabularyErrorBoundary, 
  VocabularyListErrorBoundary, 
  ReviewErrorBoundary 
} from './vocabulary-error-boundary';
import { 
  ThrowError, 
  ThrowErrorButton, 
  mockConsoleError, 
  DatabaseError,
  SyncError,
  TestError,
  waitForErrorBoundary 
} from '@/test/error-boundary-utils';

// Mock window.location.href
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

describe('VocabularyErrorBoundary', () => {
  const consoleError = mockConsoleError();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    mockOnRetry.mockClear();
    window.location.href = '';
  });

  it('renders children when there is no error', () => {
    render(
      <VocabularyErrorBoundary>
        <div>Vocabulary content</div>
      </VocabularyErrorBoundary>
    );

    expect(screen.getByText('Vocabulary content')).toBeInTheDocument();
  });

  it('displays database error UI for database-related errors', async () => {
    const dbError = new DatabaseError('SQLite connection failed');
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={dbError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Database Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to access vocabulary database. Please try restarting the application.')).toBeInTheDocument();
  });

  it('displays sync error UI for sync-related errors', async () => {
    const syncError = new SyncError('Network timeout');
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={syncError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Sync Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to sync vocabulary. Check your internet connection and try again.')).toBeInTheDocument();
  });

  it('displays generic error UI for other errors', async () => {
    const genericError = new Error('Vocabulary loading failed');
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={genericError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Vocabulary Error')).toBeInTheDocument();
    expect(screen.getByText('Vocabulary loading failed')).toBeInTheDocument();
  });

  it('handles retry functionality with onRetry callback', async () => {
    render(
      <VocabularyErrorBoundary onRetry={mockOnRetry}>
        <ThrowErrorButton buttonText="Load Vocabulary" />
      </VocabularyErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Load Vocabulary'));
    await waitForErrorBoundary();

    // Click try again
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Should reset and call onRetry
    expect(screen.getByText('Load Vocabulary')).toBeInTheDocument();
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('navigates to dashboard when Go to Dashboard is clicked', async () => {
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError()} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));

    expect(window.location.href).toBe('/');
  });

  it('logs vocabulary errors with context', async () => {
    const vocabError = new Error('Failed to fetch vocabulary');
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={vocabError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(consoleError).toHaveBeenCalledWith(
      'Vocabulary error:',
      expect.objectContaining({
        error: 'Failed to fetch vocabulary',
        timestamp: expect.any(String)
      })
    );
  });

  it('handles errors without message', async () => {
    const emptyError = new Error();
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={emptyError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('An error occurred while loading vocabulary.')).toBeInTheDocument();
  });

  it('detects database errors from various error messages', async () => {
    const sqliteError = new Error('SQLITE_ERROR: no such table');
    
    render(
      <VocabularyErrorBoundary>
        <ThrowError shouldThrow={true} error={sqliteError} />
      </VocabularyErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Database Error')).toBeInTheDocument();
  });
});

describe('VocabularyListErrorBoundary', () => {
  const consoleError = mockConsoleError();

  it('renders children when there is no error', () => {
    render(
      <VocabularyListErrorBoundary>
        <div>List content</div>
      </VocabularyListErrorBoundary>
    );

    expect(screen.getByText('List content')).toBeInTheDocument();
  });

  it('displays minimal error UI when an error is thrown', async () => {
    render(
      <VocabularyListErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('List error')} />
      </VocabularyListErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Failed to load vocabulary list')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    render(
      <VocabularyListErrorBoundary>
        <ThrowErrorButton buttonText="Show List" />
      </VocabularyListErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Show List'));
    await waitForErrorBoundary();

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    // Should reset
    expect(screen.getByText('Show List')).toBeInTheDocument();
  });
});

describe('ReviewErrorBoundary', () => {
  const consoleError = mockConsoleError();

  beforeEach(() => {
    window.location.href = '';
  });

  it('renders children when there is no error', () => {
    render(
      <ReviewErrorBoundary>
        <div>Review content</div>
      </ReviewErrorBoundary>
    );

    expect(screen.getByText('Review content')).toBeInTheDocument();
  });

  it('displays review session error UI when an error is thrown', async () => {
    render(
      <ReviewErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('Review failed')} />
      </ReviewErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Review Session Error')).toBeInTheDocument();
    expect(screen.getByText('Review failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Restart Review' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Vocabulary' })).toBeInTheDocument();
  });

  it('handles restart review functionality', async () => {
    render(
      <ReviewErrorBoundary>
        <ThrowErrorButton buttonText="Start Review" />
      </ReviewErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Start Review'));
    await waitForErrorBoundary();

    // Click restart
    fireEvent.click(screen.getByRole('button', { name: 'Restart Review' }));

    // Should reset
    expect(screen.getByText('Start Review')).toBeInTheDocument();
  });

  it('navigates to vocabulary page when Back to Vocabulary is clicked', async () => {
    render(
      <ReviewErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError()} />
      </ReviewErrorBoundary>
    );

    await waitForErrorBoundary();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Vocabulary' }));

    expect(window.location.href).toBe('/vocabulary');
  });

  it('displays default message for errors without message', async () => {
    render(
      <ReviewErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error()} />
      </ReviewErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('An error occurred during the review session')).toBeInTheDocument();
  });

  it('applies error-specific styling', async () => {
    render(
      <ReviewErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('Style test')} />
      </ReviewErrorBoundary>
    );

    await waitForErrorBoundary();

    // Find the error container with specific classes
    const errorContainer = screen.getByText('Review Session Error').closest('.bg-red-50');
    expect(errorContainer).toBeTruthy();
    expect(errorContainer).toHaveClass('bg-red-50');
    
    const restartButton = screen.getByRole('button', { name: 'Restart Review' });
    expect(restartButton).toHaveClass('border-red-300');
    expect(restartButton).toHaveClass('text-red-700');
  });
});