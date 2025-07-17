import React from 'react';
import { vi } from 'vitest';

// Component that throws an error when triggered
export const ThrowError: React.FC<{ 
  shouldThrow?: boolean; 
  error?: Error;
  children?: React.ReactNode;
}> = ({ shouldThrow = false, error = new Error('Test error'), children }) => {
  if (shouldThrow) {
    throw error;
  }
  return <>{children || <div>No error</div>}</>;
};

// Component that throws an error on button click
export const ThrowErrorButton: React.FC<{ 
  error?: Error;
  buttonText?: string;
}> = ({ error = new Error('Test error'), buttonText = 'Throw Error' }) => {
  const [shouldThrow, setShouldThrow] = React.useState(false);

  if (shouldThrow) {
    throw error;
  }

  return (
    <button onClick={() => setShouldThrow(true)}>
      {buttonText}
    </button>
  );
};

// Mock console.error to suppress error boundary logs in tests
export const mockConsoleError = () => {
  const originalError = console.error;
  const mockError = vi.fn();
  
  beforeEach(() => {
    console.error = mockError;
  });

  afterEach(() => {
    console.error = originalError;
  });

  return mockError;
};

// Custom error classes for testing
export class TestError extends Error {
  constructor(message = 'Test error') {
    super(message);
    this.name = 'TestError';
  }
}

export class VideoFileError extends Error {
  constructor(message = 'Video file not found') {
    super(message);
    this.name = 'VideoFileError';
  }
}

export class CodecError extends Error {
  constructor(message = 'Unsupported codec') {
    super(message);
    this.name = 'CodecError';
  }
}

export class DatabaseError extends Error {
  constructor(message = 'Database connection failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class SyncError extends Error {
  constructor(message = 'Sync failed') {
    super(message);
    this.name = 'SyncError';
  }
}

// Utility to wait for error boundary to update
export const waitForErrorBoundary = () => {
  return new Promise(resolve => setTimeout(resolve, 0));
};