import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoErrorBoundary, SubtitleErrorBoundary } from './video-error-boundary';
import { 
  ThrowError, 
  ThrowErrorButton, 
  mockConsoleError, 
  VideoFileError, 
  CodecError,
  TestError,
  waitForErrorBoundary 
} from '@/test/error-boundary-utils';

// Mock window.location.href
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
});

describe('VideoErrorBoundary', () => {
  const consoleError = mockConsoleError();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    mockOnRetry.mockClear();
    window.location.href = '';
  });

  it('renders children when there is no error', () => {
    render(
      <VideoErrorBoundary>
        <video data-testid="video">Test video</video>
      </VideoErrorBoundary>
    );

    expect(screen.getByTestId('video')).toBeInTheDocument();
  });

  it('displays file error UI for file-related errors', async () => {
    const fileError = new Error('File not found');
    
    render(
      <VideoErrorBoundary videoId="test-123">
        <ThrowError shouldThrow={true} error={fileError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Video File Error')).toBeInTheDocument();
    expect(screen.getByText('The video file could not be loaded. It may have been moved or deleted.')).toBeInTheDocument();
    expect(screen.getByText('Video ID: test-123')).toBeInTheDocument();
  });

  it('displays codec error UI for format-related errors', async () => {
    const codecError = new Error('Unsupported codec H.265');
    
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={codecError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Unsupported Video Format')).toBeInTheDocument();
    expect(screen.getByText('This video format is not supported. Please try converting it to MP4.')).toBeInTheDocument();
  });

  it('displays generic error UI for other errors', async () => {
    const genericError = new Error('Playback failed');
    
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={genericError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Video Playback Error')).toBeInTheDocument();
    expect(screen.getByText('Playback failed')).toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    render(
      <VideoErrorBoundary onRetry={mockOnRetry}>
        <ThrowErrorButton buttonText="Play Video" />
      </VideoErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Play Video'));
    await waitForErrorBoundary();

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Should reset and call onRetry
    expect(screen.getByText('Play Video')).toBeInTheDocument();
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('navigates to videos page when Back to Videos is clicked', async () => {
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={new TestError()} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Videos' }));

    expect(window.location.href).toBe('/videos');
  });

  it('logs video player errors with context', async () => {
    const videoError = new VideoFileError('Stream failed');
    
    render(
      <VideoErrorBoundary videoId="video-456">
        <ThrowError shouldThrow={true} error={videoError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(consoleError).toHaveBeenCalledWith(
      'Video player error:',
      expect.objectContaining({
        error: 'Stream failed',
        videoId: 'video-456',
        timestamp: expect.any(String)
      })
    );
  });

  it('handles errors without message', async () => {
    const emptyError = new Error();
    
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={emptyError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('An error occurred while playing the video.')).toBeInTheDocument();
  });

  it('detects file errors from various error messages', async () => {
    const loadError = new Error('Failed to load resource');
    
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={loadError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Video File Error')).toBeInTheDocument();
  });

  it('detects codec errors from various error messages', async () => {
    const formatError = new Error('Video format not supported');
    
    render(
      <VideoErrorBoundary>
        <ThrowError shouldThrow={true} error={formatError} />
      </VideoErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Unsupported Video Format')).toBeInTheDocument();
  });
});

describe('SubtitleErrorBoundary', () => {
  const consoleError = mockConsoleError();

  it('renders children when there is no error', () => {
    render(
      <SubtitleErrorBoundary>
        <div>Subtitle content</div>
      </SubtitleErrorBoundary>
    );

    expect(screen.getByText('Subtitle content')).toBeInTheDocument();
  });

  it('displays subtitle error UI when an error is thrown', async () => {
    render(
      <SubtitleErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('Failed to parse subtitles')} />
      </SubtitleErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Subtitle Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to parse subtitles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload Subtitles' })).toBeInTheDocument();
  });

  it('handles subtitle reload', async () => {
    render(
      <SubtitleErrorBoundary>
        <ThrowErrorButton buttonText="Load Subtitles" />
      </SubtitleErrorBoundary>
    );

    // Trigger error
    fireEvent.click(screen.getByText('Load Subtitles'));
    await waitForErrorBoundary();

    // Click reload
    fireEvent.click(screen.getByRole('button', { name: 'Reload Subtitles' }));

    // Should reset
    expect(screen.getByText('Load Subtitles')).toBeInTheDocument();
  });

  it('displays default message for errors without message', async () => {
    render(
      <SubtitleErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error()} />
      </SubtitleErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(screen.getByText('Failed to load or parse subtitles')).toBeInTheDocument();
  });

  it('logs subtitle errors', async () => {
    const subtitleError = new Error('VTT parse error');
    
    render(
      <SubtitleErrorBoundary>
        <ThrowError shouldThrow={true} error={subtitleError} />
      </SubtitleErrorBoundary>
    );

    await waitForErrorBoundary();

    expect(consoleError).toHaveBeenCalledWith(
      'Error in Subtitles:',
      expect.objectContaining({ message: 'VTT parse error' }),
      expect.any(Object)
    );
  });
});