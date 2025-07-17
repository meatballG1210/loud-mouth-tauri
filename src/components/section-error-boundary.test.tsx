import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SectionErrorBoundary, withSectionErrorBoundary } from './section-error-boundary';
import { ThrowError, ThrowErrorButton, mockConsoleError, TestError, waitForErrorBoundary } from '@/test/error-boundary-utils';

// Mock wouter
const mockSetLocation = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', mockSetLocation],
}));

describe('SectionErrorBoundary', () => {
  const consoleError = mockConsoleError();

  beforeEach(() => {
    mockSetLocation.mockClear();
  });

  it('renders children when there is no error', () => {
    render(
      <SectionErrorBoundary>
        <div>Test content</div>
      </SectionErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('displays default error UI when an error is thrown', async () => {
    render(
      <SectionErrorBoundary sectionName="Test Section">
        <ThrowError shouldThrow={true} error={new TestError('Section error')} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Error in Test Section')).toBeInTheDocument();
    expect(screen.getByText('Section error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /go home/i })).toBeInTheDocument();
  });

  it('displays generic error message when sectionName is not provided', async () => {
    render(
      <SectionErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError('Generic error')} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('displays custom fallback when provided', async () => {
    const customFallback = (error: Error, reset: () => void) => (
      <div>
        <h1>Custom Error</h1>
        <p>{error.message}</p>
        <button onClick={reset}>Custom Reset</button>
      </div>
    );

    render(
      <SectionErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} error={new TestError('Custom error message')} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Custom Error')).toBeInTheDocument();
    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Reset' })).toBeInTheDocument();
  });

  it('resets error boundary when Try Again is clicked', async () => {
    render(
      <SectionErrorBoundary>
        <ThrowErrorButton />
      </SectionErrorBoundary>
    );

    // Initially, no error
    expect(screen.getByRole('button', { name: 'Throw Error' })).toBeInTheDocument();

    // Click to throw error
    fireEvent.click(screen.getByRole('button', { name: 'Throw Error' }));
    await waitForErrorBoundary();

    // Error UI should be displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();

    // Click Try Again
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    // Should reset to original state
    expect(screen.getByRole('button', { name: 'Throw Error' })).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('navigates to home when Go Home is clicked', async () => {
    render(
      <SectionErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError()} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    fireEvent.click(screen.getByRole('button', { name: /go home/i }));

    expect(mockSetLocation).toHaveBeenCalledWith('/');
  });

  it('calls onError callback when provided', async () => {
    const onError = vi.fn();
    
    render(
      <SectionErrorBoundary sectionName="Callback Test" onError={onError}>
        <ThrowError shouldThrow={true} error={new TestError('Callback error')} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Callback error',
        name: 'TestError'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('logs error with section name', async () => {
    render(
      <SectionErrorBoundary sectionName="Logging Test">
        <ThrowError shouldThrow={true} error={new TestError('Log error')} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(consoleError).toHaveBeenCalledWith(
      'Error in Logging Test:',
      expect.objectContaining({ message: 'Log error' }),
      expect.any(Object)
    );
  });

  it('handles errors without message gracefully', async () => {
    const errorWithoutMessage = new Error();
    
    render(
      <SectionErrorBoundary>
        <ThrowError shouldThrow={true} error={errorWithoutMessage} />
      </SectionErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument();
  });
});

describe('withSectionErrorBoundary HOC', () => {
  mockConsoleError();

  it('wraps component with SectionErrorBoundary', async () => {
    const TestComponent = () => <div>Test Component</div>;
    const WrappedComponent = withSectionErrorBoundary(TestComponent, 'HOC Test');

    render(<WrappedComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  it('passes props to wrapped component', () => {
    interface TestProps {
      message: string;
      count: number;
    }
    
    const TestComponent = ({ message, count }: TestProps) => (
      <div>
        {message} - {count}
      </div>
    );
    
    const WrappedComponent = withSectionErrorBoundary(TestComponent);

    render(<WrappedComponent message="Hello" count={42} />);

    expect(screen.getByText('Hello - 42')).toBeInTheDocument();
  });

  it('uses provided section name and fallback', async () => {
    const ErrorComponent = () => {
      throw new TestError('HOC error');
    };
    
    const customFallback = (error: Error) => (
      <div>HOC Fallback: {error.message}</div>
    );
    
    const WrappedComponent = withSectionErrorBoundary(
      ErrorComponent,
      'HOC Section',
      customFallback
    );

    render(<WrappedComponent />);
    await waitForErrorBoundary();

    expect(screen.getByText('HOC Fallback: HOC error')).toBeInTheDocument();
  });
});