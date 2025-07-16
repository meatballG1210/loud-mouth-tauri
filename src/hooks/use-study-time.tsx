import { useState, useEffect, useCallback, useRef } from 'react';

interface StudySession {
  startTime: string;
  endTime?: string;
  duration: number; // seconds
}

interface DailyStudyTime {
  date: string;
  sessions: StudySession[];
  totalMinutes: number;
  wordCount?: number; // Can be linked to vocabulary added that day
}

interface StudyTimeStats {
  totalHours: number;
  weeklyHours: number;
  todayMinutes: number;
  dailyData: DailyStudyTime[];
}

const STORAGE_KEY = 'loudmouth_study_sessions';
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes of inactivity ends session

export function useStudyTime() {
  const [stats, setStats] = useState<StudyTimeStats>({
    totalHours: 0,
    weeklyHours: 0,
    todayMinutes: 0,
    dailyData: []
  });
  const [isTracking, setIsTracking] = useState(false);
  const currentSessionRef = useRef<StudySession | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load sessions from localStorage
  const loadSessions = useCallback((): DailyStudyTime[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load study sessions:', error);
      return [];
    }
  }, []);

  // Save sessions to localStorage
  const saveSessions = useCallback((sessions: DailyStudyTime[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save study sessions:', error);
    }
  }, []);

  // Calculate stats from sessions
  const calculateStats = useCallback((dailyData: DailyStudyTime[]): StudyTimeStats => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);

    let totalMinutes = 0;
    let weeklyMinutes = 0;
    let todayMinutes = 0;

    dailyData.forEach(day => {
      const dayTotal = day.sessions.reduce((sum, session) => sum + session.duration, 0) / 60;
      totalMinutes += dayTotal;

      const dayDate = new Date(day.date);
      if (dayDate >= weekStart) {
        weeklyMinutes += dayTotal;
      }

      if (day.date === today) {
        todayMinutes = dayTotal;
      }
    });

    return {
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      weeklyHours: Math.round(weeklyMinutes / 60 * 10) / 10,
      todayMinutes: Math.round(todayMinutes),
      dailyData
    };
  }, []);

  // Start a new session
  const startSession = useCallback(() => {
    const now = new Date();
    currentSessionRef.current = {
      startTime: now.toISOString(),
      duration: 0
    };
    lastActivityRef.current = Date.now();
    setIsTracking(true);
  }, []);

  // End current session
  const endSession = useCallback(() => {
    if (!currentSessionRef.current) return;

    const now = new Date();
    const session = currentSessionRef.current;
    session.endTime = now.toISOString();
    session.duration = Math.floor((now.getTime() - new Date(session.startTime).getTime()) / 1000);

    // Only save sessions longer than 10 seconds
    if (session.duration > 10) {
      const today = now.toISOString().split('T')[0];
      const dailyData = loadSessions();
      
      let todayData = dailyData.find(d => d.date === today);
      if (!todayData) {
        todayData = {
          date: today,
          sessions: [],
          totalMinutes: 0
        };
        dailyData.push(todayData);
      }

      todayData.sessions.push(session);
      todayData.totalMinutes = todayData.sessions.reduce((sum, s) => sum + s.duration, 0) / 60;

      // Keep only last 90 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      const filteredData = dailyData.filter(d => new Date(d.date) > cutoffDate);

      saveSessions(filteredData);
      setStats(calculateStats(filteredData));
    }

    currentSessionRef.current = null;
    setIsTracking(false);
  }, [loadSessions, saveSessions, calculateStats]);

  // Handle activity timeout
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (isTracking) {
      timeoutRef.current = setTimeout(() => {
        endSession();
      }, SESSION_TIMEOUT);
    }
  }, [isTracking, endSession]);

  // Handle window focus
  const handleFocus = useCallback(() => {
    if (!isTracking) {
      startSession();
    }
    lastActivityRef.current = Date.now();
    resetTimeout();
  }, [isTracking, startSession, resetTimeout]);

  // Handle window blur
  const handleBlur = useCallback(() => {
    endSession();
  }, [endSession]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!isTracking && document.hasFocus()) {
      startSession();
    }
    resetTimeout();
  }, [isTracking, startSession, resetTimeout]);

  // Set up event listeners
  useEffect(() => {
    // Initial load
    const dailyData = loadSessions();
    setStats(calculateStats(dailyData));

    // Start tracking if window has focus
    if (document.hasFocus()) {
      startSession();
    }

    // Event listeners
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // End session on unmount
      endSession();
    };
  }, []);

  // Update stats periodically while tracking
  useEffect(() => {
    if (!isTracking) return;

    const interval = setInterval(() => {
      const dailyData = loadSessions();
      const updatedStats = calculateStats(dailyData);
      
      // Add current session time
      if (currentSessionRef.current) {
        const currentDuration = (Date.now() - new Date(currentSessionRef.current.startTime).getTime()) / 1000 / 60;
        updatedStats.todayMinutes += currentDuration;
        updatedStats.weeklyHours = Math.round((updatedStats.weeklyHours * 60 + currentDuration) / 60 * 10) / 10;
      }
      
      setStats(updatedStats);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [isTracking, loadSessions, calculateStats]);

  // Get daily study data for the current week
  const getWeeklyStudyData = useCallback(() => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const weekData = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - now.getDay() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = stats.dailyData.find(d => d.date === dateStr);
      weekData.push({
        day: weekDays[i],
        date: dateStr,
        minutes: Math.round(dayData?.totalMinutes || 0),
        words: dayData?.wordCount || 0
      });
    }

    return weekData;
  }, [stats.dailyData]);

  // Link vocabulary count for a specific day
  const updateDayWordCount = useCallback((date: string, wordCount: number) => {
    const dailyData = loadSessions();
    const dayData = dailyData.find(d => d.date === date);
    
    if (dayData) {
      dayData.wordCount = wordCount;
      saveSessions(dailyData);
      setStats(calculateStats(dailyData));
    }
  }, [loadSessions, saveSessions, calculateStats]);

  return {
    stats,
    isTracking,
    getWeeklyStudyData,
    updateDayWordCount
  };
}