import { useLocation } from "wouter";
import { AlertTriangle, Home, RefreshCw, Copy } from "lucide-react";
import { WindowTitleBar } from "@/components/layout/window-titlebar";
import { useState } from "react";
import { useLanguage } from '@/lib/i18n';

interface ErrorInfo {
  code: string;
  message: string;
  timestamp: string;
  userAgent: string;
  stack?: string;
}

export default function ErrorPage() {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  // Extract error information from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const errorInfo: ErrorInfo = {
    code: urlParams.get('code') || "ERR_UNKNOWN",
    message: urlParams.get('message') || "An unexpected error occurred while processing your request",
    timestamp: urlParams.get('timestamp') || new Date().toISOString(),
    userAgent: navigator.userAgent,
    stack: urlParams.get('stack') || undefined
  };

  const handleTryAgain = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    setLocation('/');
  };

  const handleCopyErrorInfo = async () => {
    const errorText = `
Error Code: ${errorInfo.code}
Message: ${errorInfo.message}
Timestamp: ${errorInfo.timestamp}
User Agent: ${errorInfo.userAgent}
${errorInfo.stack ? `\nStack Trace:\n${errorInfo.stack}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy error info:', err);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--macos-grouped-bg-primary)' }}>
      <WindowTitleBar title={`${t('error')} - ${t('homeTitle')}`} />
      
      <div className="flex items-center justify-center p-8" style={{ height: 'calc(100vh - 52px)' }}>
        <div className="max-w-lg w-full">
          {/* Error Icon and Message */}
          <div className="text-center mb-8">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--macos-fill-quaternary)' }}
            >
              <AlertTriangle 
                className="w-10 h-10" 
                style={{ color: 'var(--macos-system-red)' }}
              />
            </div>
            <h1 className="macos-title-2 mb-3">{t('somethingWentWrong')}</h1>
            <p className="macos-body" style={{ color: 'var(--macos-label-secondary)' }}>
              {t('pleaseRefresh')}
            </p>
          </div>

          {/* Error Details Card */}
          <div 
            className="rounded-xl p-6 mb-6"
            style={{ 
              background: 'var(--macos-grouped-bg-secondary)',
              border: '1px solid var(--macos-separator)'
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="macos-headline">Error Details</h3>
              <button
                onClick={handleCopyErrorInfo}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-macos"
                style={{ 
                  background: copied ? 'var(--macos-system-green)' : 'var(--macos-fill-tertiary)',
                  color: copied ? 'white' : 'var(--macos-label-primary)'
                }}
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="macos-caption-1">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                  Error Code:
                </span>
                <p className="macos-callout font-mono">{errorInfo.code}</p>
              </div>
              
              <div>
                <span className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                  Message:
                </span>
                <p className="macos-subhead">{errorInfo.message}</p>
              </div>
              
              <div>
                <span className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                  Timestamp:
                </span>
                <p className="macos-footnote font-mono">{errorInfo.timestamp}</p>
              </div>

              {errorInfo.stack && (
                <div>
                  <span className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                    Stack Trace:
                  </span>
                  <div 
                    className="mt-2 p-3 rounded-lg font-mono text-xs overflow-x-auto"
                    style={{ 
                      background: 'var(--macos-fill-quaternary)',
                      color: 'var(--macos-label-secondary)'
                    }}
                  >
                    <pre className="whitespace-pre-wrap">{errorInfo.stack}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleTryAgain}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-macos macos-callout"
              style={{ 
                background: 'var(--macos-system-blue)',
                color: 'white'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--macos-system-blue), black 10%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--macos-system-blue)';
              }}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            
            <button
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-macos macos-callout"
              style={{ 
                background: 'var(--macos-fill-primary)',
                color: 'var(--macos-label-primary)',
                border: '1px solid var(--macos-separator)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--macos-fill-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--macos-fill-primary)';
              }}
            >
              <Home className="w-4 h-4" />
              <span>Go to Home</span>
            </button>
          </div>

          {/* Support Information */}
          <div className="mt-8 text-center">
            <p className="macos-footnote" style={{ color: 'var(--macos-label-tertiary)' }}>
              Need help? Contact support at{' '}
              <a 
                href="mailto:support@loudmouth.app" 
                className="transition-macos"
                style={{ color: 'var(--macos-system-blue)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'color-mix(in srgb, var(--macos-system-blue), black 20%)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--macos-system-blue)';
                }}
              >
                support@loudmouth.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}