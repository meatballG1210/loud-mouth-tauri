import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, useErrorHandler } from './error-boundary';
import { ThrowError, mockConsoleError, TestError, waitForErrorBoundary } from '@/test/error-boundary-utils';
import { renderHook, act } from '@testing-library/react';

// Mock window.location.href
const mockLocation = vi.fn();
Object.defineProperty(window, 'location', {
  value: { href: '', assign: mockLocation },
  writable: true,
});

// Mock wouter with a factory function to ensure fresh mocks
const createMockUseLocation = () => {
  const mockSetLocation = vi.fn();
  return {
    useLocation: () => ['/', mockSetLocation],
    getMockSetLocation: () => mockSetLocation
  };
};

let mockWouter = createMockUseLocation();

vi.mock('wouter', () => ({
  useLocation: () => mockWouter.useLocation(),
}));

describe('ErrorBoundary', () => {
  const consoleError = mockConsoleError();

  beforeEach(() => {
    mockLocation.mockClear();
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('displays fallback UI when an error is thrown', async () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError('Something went wrong')} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Redirecting to error page...')).toBeInTheDocument();
    expect(screen.getByText('If you are not redirected automatically, please refresh the page.')).toBeInTheDocument();
  });

  it('redirects to error page with error details', async () => {
    const testError = new TestError('Custom error message');
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={testError} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    // Check that window.location.href was set with error params
    expect(window.location.href).toContain('/error?');
    expect(window.location.href).toContain('code=TestError');
    expect(window.location.href).toContain('message=Custom+error+message');
    expect(window.location.href).toContain('timestamp=');
  });

  it('logs error in development mode', async () => {
    const originalEnv = import.meta.env.DEV;
    import.meta.env.DEV = true;

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError('Dev error')} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(consoleError).toHaveBeenCalled();
    const errorCall = consoleError.mock.calls.find(call => 
      call[0] === 'Error caught by boundary:'
    );
    expect(errorCall).toBeTruthy();

    import.meta.env.DEV = originalEnv;
  });

  it('calls logErrorToService with error details', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError('Service error')} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    const errorReportCall = logSpy.mock.calls.find(call => 
      call[0] === 'Error report:'
    );
    expect(errorReportCall).toBeTruthy();
    
    const errorReport = errorReportCall[1];
    expect(errorReport).toMatchObject({
      message: 'Service error',
      timestamp: expect.any(String),
      userAgent: expect.any(String),
      url: expect.any(String)
    });

    logSpy.mockRestore();
  });

  it('handles errors without a message', async () => {
    const errorWithoutMessage = new Error();
    errorWithoutMessage.name = 'EmptyError';
    errorWithoutMessage.message = '';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={errorWithoutMessage} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(window.location.href).toContain('message=An+unknown+error+occurred');
  });

  it('handles errors without a name', async () => {
    const errorWithoutName = new Error('Error without name');
    errorWithoutName.name = '';

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={errorWithoutName} />
      </ErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(window.location.href).toContain('code=UnknownError');
  });
});

describe('useErrorHandler', () => {
  it('navigates to error page with error details', () => {
    // Reset the mock for this test
    mockWouter = createMockUseLocation();
    
    const { result } = renderHook(() => useErrorHandler());
    const testError = new TestError('Hook error');

    act(() => {
      result.current(testError);
    });

    const mockSetLocation = mockWouter.getMockSetLocation();
    expect(mockSetLocation).toHaveBeenCalledTimes(1);
    const calledUrl = mockSetLocation.mock.calls[0][0];
    expect(calledUrl).toContain('/error?');
    expect(calledUrl).toContain('code=TestError');
    expect(calledUrl).toContain('message=Hook+error');
  });

  it('logs error to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useErrorHandler());
    const testError = new TestError('Console error');
    const errorInfo = { componentStack: 'test stack' };

    act(() => {
      result.current(testError, errorInfo);
    });

    expect(consoleSpy).toHaveBeenCalledWith('Error handled:', testError, errorInfo);
    
    consoleSpy.mockRestore();
  });
});