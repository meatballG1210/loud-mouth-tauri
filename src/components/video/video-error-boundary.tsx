import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw, FileVideo } from 'lucide-react';
import { SectionErrorBoundary } from '@/components/section-error-boundary';

interface VideoErrorBoundaryProps {
  children: React.ReactNode;
  videoId?: string;
  onRetry?: () => void;
}

export function VideoErrorBoundary({ children, videoId, onRetry }: VideoErrorBoundaryProps) {
  const videoErrorFallback = (error: Error, reset: () => void) => {
    const isFileError = error.message.toLowerCase().includes('file') || 
                       error.message.toLowerCase().includes('load');
    const isCodecError = error.message.toLowerCase().includes('codec') || 
                        error.message.toLowerCase().includes('format');

    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
        <div className="max-w-md text-center">
          <FileVideo className="h-16 w-16 text-red-500 mb-4 mx-auto" />
          <h3 className="text-lg font-semibold mb-2">
            {isFileError ? 'Video File Error' : 
             isCodecError ? 'Unsupported Video Format' : 
             'Video Playback Error'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {isFileError ? 
              'The video file could not be loaded. It may have been moved or deleted.' :
             isCodecError ? 
              'This video format is not supported. Please try converting it to MP4.' :
              error.message || 'An error occurred while playing the video.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button
              variant="default"
              onClick={() => {
                reset();
                onRetry?.();
              }}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Retry
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/videos'}
            >
              Back to Videos
            </Button>
          </div>
          {videoId && (
            <p className="text-xs text-gray-500 mt-4">
              Video ID: {videoId}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <SectionErrorBoundary 
      sectionName="Video Player"
      fallback={videoErrorFallback}
      onError={(error) => {
        console.error('Video player error:', {
          error: error.message,
          videoId,
          timestamp: new Date().toISOString()
        });
      }}
    >
      {children}
    </SectionErrorBoundary>
  );
}

export function SubtitleErrorBoundary({ children }: { children: React.ReactNode }) {
  const subtitleErrorFallback = (error: Error, reset: () => void) => {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4 m-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Subtitle Error
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              {error.message || 'Failed to load or parse subtitles'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="mt-3"
            >
              Reload Subtitles
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SectionErrorBoundary 
      sectionName="Subtitles"
      fallback={subtitleErrorFallback}
    >
      {children}
    </SectionErrorBoundary>
  );
}