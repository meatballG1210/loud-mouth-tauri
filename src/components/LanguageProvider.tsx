import { useState, useEffect, ReactNode, useCallback } from 'react';
import { LanguageContext, translations, Language, getNestedTranslation } from '@/lib/i18n';

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>('en');
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    try {
      const savedLanguage = localStorage.getItem('ui-language');
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'zh')) {
        setLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language preference:', error);
    }
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    console.log('Language changing to:', lang);
    setLanguage(lang);
    localStorage.setItem('ui-language', lang);
    // Force complete re-render by updating render key
    setRenderKey(prev => prev + 1);
    // Also dispatch event for any components that might need it
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
  }, []);

  const t = useCallback((key: string): string => {
    const translation = getNestedTranslation(translations[language], key);
    if (!translation) {
      console.warn(`Translation missing for key: ${key} in language: ${language}`);
      return key;
    }
    return translation;
  }, [language]);

  const contextValue = {
    language,
    setLanguage: handleSetLanguage,
    t
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      <div key={`app-${language}-${renderKey}`} style={{ minHeight: '100vh' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}