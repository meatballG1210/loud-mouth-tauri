import { useLocation } from "wouter";
import { Home, ArrowLeft, Search, FileQuestion } from "lucide-react";
import { WindowTitleBar } from "@/components/layout/window-titlebar";
import { useLanguage } from '@/lib/i18n';

export default function NotFound() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const handleGoHome = () => {
    setLocation('/');
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleSearchVideos = () => {
    setLocation('/');
  };

  const handleBrowseVocabulary = () => {
    setLocation('/vocabulary-list');
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--macos-grouped-bg-primary)' }}>
      <WindowTitleBar title={`${t('pageNotFound')} - ${t('homeTitle')}`} />
      
      <div className="flex items-center justify-center p-8" style={{ height: 'calc(100vh - 52px)' }}>
        <div className="max-w-lg w-full text-center">
          {/* 404 Icon and Message */}
          <div className="mb-8">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ background: 'var(--macos-fill-quaternary)' }}
            >
              <FileQuestion 
                className="w-12 h-12" 
                style={{ color: 'var(--macos-label-tertiary)' }}
              />
            </div>
            <h1 className="macos-title-1 mb-4">{t('pageNotFound')}</h1>
            <p className="macos-body mb-2" style={{ color: 'var(--macos-label-secondary)' }}>
              {t('somethingWentWrong')}
            </p>
            <p className="macos-subhead" style={{ color: 'var(--macos-label-tertiary)' }}>
              {t('pleaseRefresh')}
            </p>
          </div>

          {/* Suggested Actions */}
          <div 
            className="rounded-xl p-6 mb-8"
            style={{ 
              background: 'var(--macos-grouped-bg-secondary)',
              border: '1px solid var(--macos-separator)'
            }}
          >
            <h3 className="macos-headline mb-4">{t('whatWouldYouLikeToDo')}</h3>
            
            <div className="space-y-3">
              <button
                onClick={handleGoBack}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-macos macos-callout text-left"
                style={{ 
                  background: 'var(--macos-fill-tertiary)',
                  color: 'var(--macos-label-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-tertiary)';
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                <div>
                  <div className="macos-callout">{t('back')}</div>
                  <div className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                    {t('returnToPreviousPage')}
                  </div>
                </div>
              </button>

              <button
                onClick={handleSearchVideos}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-macos macos-callout text-left"
                style={{ 
                  background: 'var(--macos-fill-tertiary)',
                  color: 'var(--macos-label-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-tertiary)';
                }}
              >
                <Search className="w-4 h-4" />
                <div>
                  <div className="macos-callout">{t('videos')}</div>
                  <div className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                    {t('exploreVideoLibrary')}
                  </div>
                </div>
              </button>

              <button
                onClick={handleBrowseVocabulary}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-macos macos-callout text-left"
                style={{ 
                  background: 'var(--macos-fill-tertiary)',
                  color: 'var(--macos-label-primary)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--macos-fill-tertiary)';
                }}
              >
                <FileQuestion className="w-4 h-4" />
                <div>
                  <div className="macos-callout">{t('vocabulary')}</div>
                  <div className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
                    {t('checkLearnedWords')}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Primary Action */}
          <button
            onClick={handleGoHome}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl transition-macos macos-callout"
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
            <Home className="w-5 h-5" />
            <span>{t('returnToHome')}</span>
          </button>

          {/* URL Information */}
          <div className="mt-8 p-4 rounded-lg" style={{ background: 'var(--macos-fill-quaternary)' }}>
            <p className="macos-caption-1" style={{ color: 'var(--macos-label-secondary)' }}>
              Requested URL:
            </p>
            <p className="macos-footnote font-mono break-all" style={{ color: 'var(--macos-label-tertiary)' }}>
              {window.location.pathname}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
