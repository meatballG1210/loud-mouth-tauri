import { ReactNode, useEffect } from 'react';
import { useStudyTime } from '@/hooks/use-study-time';

interface StudyTimeProviderProps {
  children: ReactNode;
}

export function StudyTimeProvider({ children }: StudyTimeProviderProps) {
  const { isTracking } = useStudyTime();

  useEffect(() => {
    console.log('[StudyTimeProvider] Global study time tracking initialized. Tracking status:', isTracking);
  }, [isTracking]);

  return <>{children}</>;
}