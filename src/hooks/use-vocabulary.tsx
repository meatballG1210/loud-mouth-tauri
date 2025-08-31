import { useState, useEffect, useRef, useCallback } from 'react';
import { VocabularyItem, VocabularyStats } from '@/types/video';
import { vocabularyApi, VocabularyItem as ApiVocabularyItem } from '@/api/vocabulary';
import { useAuth } from '@/components/SupabaseAuthProvider';

// Extract Chinese translation from dictionary response
function extractChineseTranslation(dictionaryResponse: string | null | undefined): string {
  if (!dictionaryResponse) return '无翻译';
  
  // Try different formats in priority order
  
  // 1. Format: **翻译：** or **译文：**
  const translationMatch = dictionaryResponse.match(/\*\*(?:翻译|译文)[：:]\*\*\s*(.+?)(?:\n|$)/);
  if (translationMatch && translationMatch[1]) {
    const translation = translationMatch[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      // Return first part if there are multiple meanings
      return translation.split(/[,，;；]/)[0].trim();
    }
  }
  
  // 2. Format: **Chinese Translation** (on its own line, translation on next line)
  const chineseTransHeader = dictionaryResponse.match(/\*\*Chinese Translation\*\*\s*\n+([^\n]+)/i);
  if (chineseTransHeader && chineseTransHeader[1]) {
    const translation = chineseTransHeader[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 3. Format: ### 🇨🇳 followed by translation
  const emojiFormat = dictionaryResponse.match(/###\s*🇨🇳\s*(.+?)(?:\n|$)/);
  if (emojiFormat && emojiFormat[1]) {
    const translation = emojiFormat[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 4. Format: **中文**: or **中文**：
  const zhongwenMatch = dictionaryResponse.match(/\*\*中文\*\*[：:]\s*(.+?)(?:\n|$)/);
  if (zhongwenMatch && zhongwenMatch[1]) {
    const translation = zhongwenMatch[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 5. Format: **直译**: (literal translation)
  const literalMatch = dictionaryResponse.match(/\*\*直译\*\*[：:]\s*(.+?)(?:\n|$)/);
  if (literalMatch && literalMatch[1]) {
    const translation = literalMatch[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 6. Format: **中文翻译：** 
  const chineseTranslationMatch = dictionaryResponse.match(/\*\*中文翻译[：:]\*\*\s*(.+?)(?:\n|$)/);
  if (chineseTranslationMatch && chineseTranslationMatch[1]) {
    const translation = chineseTranslationMatch[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 7. Format: ### followed by English and then Chinese on next line
  const hashFormat = dictionaryResponse.match(/###[^🇨🇳\n]+\n\*\*([^*]+)\*\*/);
  if (hashFormat && hashFormat[1]) {
    const translation = hashFormat[1].trim();
    if (/[\u4e00-\u9fa5]/.test(translation)) {
      return translation;
    }
  }
  
  // 8. Fallback: look for first standalone Chinese text (not in a labeled section)
  const lines = dictionaryResponse.split('\n');
  for (const line of lines.slice(0, 8)) {
    // Skip empty lines and lines with markdown formatting or labels
    if (!line.trim() || line.includes('**') || line.includes('##') || 
        line.includes('Example') || line.includes('例句') || 
        line.includes('Usage') || line.includes('用法') ||
        line.includes('📝') || line.includes('解析')) {
      continue;
    }
    
    // Look for lines that are primarily Chinese text
    const cleanLine = line.trim();
    if (/^[\u4e00-\u9fa5]/.test(cleanLine) && /[\u4e00-\u9fa5]/.test(cleanLine)) {
      // Return the Chinese part, removing any English if mixed
      const chineseOnly = cleanLine.match(/[\u4e00-\u9fa5]+[^\n]*/);
      if (chineseOnly) {
        return chineseOnly[0].trim();
      }
    }
  }
  
  console.warn('Could not extract Chinese translation from dictionary response:', dictionaryResponse.substring(0, 200));
  return '无翻译';
}

// Convert backend vocabulary item to frontend format
function convertToFrontendVocabulary(item: any, videoTitle?: string, videoUploadDate?: string): VocabularyItem {
  const reviewStage = item.review_stage || 0;
  
  return {
    id: item.id || '',
    word: item.word,
    translation: extractChineseTranslation(item.dictionary_response),
    videoId: item.video_id,
    videoTitle: videoTitle || 'Unknown video',
    videoUploadDate: videoUploadDate,
    timestamp: item.timestamp / 1000, // Convert from milliseconds to seconds
    context: item.target_en,
    difficulty: reviewStage <= 2 ? 'easy' : reviewStage <= 4 ? 'medium' : 'hard',
    reviewCount: reviewStage,
    lastReviewed: item.last_reviewed_at || item.created_at || new Date().toISOString().split('T')[0],
    nextReview: item.next_review_at ? item.next_review_at.split('T')[0] : new Date().toISOString().split('T')[0],
    isStarred: false, // Backend doesn't track this yet
    dictionaryResponse: item.dictionary_response,
    // Add the actual review and correct counts for accuracy calculation
    review_count: item.review_count || 0,
    correct_count: item.correct_count || 0
  };
}

export function useVocabulary(videos?: any[]) {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState<VocabularyStats>({
    totalWords: 0,
    wordsToReview: 0,
    masteredWords: 0,
    overdueWords: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [videoTitleMap, setVideoTitleMap] = useState<Map<string, string>>(new Map());
  const [videoUploadDateMap, setVideoUploadDateMap] = useState<Map<string, string>>(new Map());
  
  // Refs for debouncing and cancellation
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update video title and upload date maps when videos change
  useEffect(() => {
    if (videos && videos.length > 0) {
      const titleMap = new Map<string, string>();
      const uploadDateMap = new Map<string, string>();
      videos.forEach(video => {
        titleMap.set(video.id, video.title);
        uploadDateMap.set(video.id, video.uploadDate);
      });
      setVideoTitleMap(titleMap);
      setVideoUploadDateMap(uploadDateMap);
      
      // Update existing vocabulary items with correct video titles and upload dates
      setVocabulary(prev => prev.map(item => ({
        ...item,
        videoTitle: titleMap.get(item.videoId) || item.videoTitle,
        videoUploadDate: uploadDateMap.get(item.videoId) || item.videoUploadDate
      })));
    }
  }, [videos]);

  // Cleanup function to cancel pending requests
  const cleanupPendingRequests = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Fetch vocabulary data on mount and when user changes
  // Only fetch if we have videos loaded (or no videos parameter was passed)
  useEffect(() => {
    // If videos parameter is passed but empty/not loaded yet, don't fetch
    if (videos !== undefined && (!videos || videos.length === 0)) {
      setIsLoading(false);
      return;
    }
    
    // Debounce the fetch to avoid rapid successive calls
    cleanupPendingRequests();
    
    fetchTimeoutRef.current = setTimeout(() => {
      fetchVocabulary();
    }, 200); // 200ms debounce delay
    
    // Cleanup on unmount or when dependencies change
    return () => {
      cleanupPendingRequests();
    };
  }, [user?.id, videos, videoTitleMap, videoUploadDateMap]);

  const fetchVocabulary = async () => {
    if (!user?.id) {
      setVocabulary([]);
      setStats({
        totalWords: 0,
        wordsToReview: 0,
        masteredWords: 0,
        overdueWords: 0
      });
      setIsLoading(false);
      return;
    }
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      setIsLoading(true);
      const userId = user.id;
      
      const backendVocabulary = await vocabularyApi.getAll(userId);
      const convertedVocabulary = backendVocabulary.map(item => 
        convertToFrontendVocabulary(
          item, 
          videoTitleMap.get(item.video_id),
          videoUploadDateMap.get(item.video_id)
        )
      );
      
      setVocabulary(convertedVocabulary);
      
      // Calculate stats using backend data
      const now = new Date();
      const wordsToReview = backendVocabulary.filter(item => 
        new Date(item.next_review_at) <= now
      ).length;
      const masteredWords = backendVocabulary.filter(item => 
        (item.review_stage || 0) >= 5
      ).length;
      // Count overdue words - words that are currently past their scheduled review time
      const overdueWords = backendVocabulary.filter(item => 
        new Date(item.next_review_at) < now && 
        (item.review_stage || 0) < 6  // Not yet mastered
      ).length;
      
      setStats({
        totalWords: convertedVocabulary.length,
        wordsToReview,
        masteredWords,
        overdueWords
      });
    } catch (error: any) {
      // Don't log or update state if the request was aborted
      if (error?.name === 'AbortError' || error?.message?.includes('abort')) {
        return;
      }
      
      console.error('Error fetching vocabulary:', error);
      // Set empty state on error
      setVocabulary([]);
      setStats({
        totalWords: 0,
        wordsToReview: 0,
        masteredWords: 0,
        overdueWords: 0
      });
    } finally {
      // Only set loading to false if this request wasn't aborted
      if (abortControllerRef.current === abortController) {
        setIsLoading(false);
      }
    }
  };

  const getVocabularyByVideoId = (videoId: string): VocabularyItem[] => {
    return vocabulary.filter(item => item.videoId === videoId);
  };

  const deleteVocabularyItem = async (itemId: string) => {
    try {
      setIsLoading(true);
      await vocabularyApi.delete(itemId);
      // Update local state
      setVocabulary(prev => prev.filter(item => item.id !== itemId));
      // Update stats
      setStats(prev => ({ ...prev, totalWords: prev.totalWords - 1 }));
    } catch (error) {
      console.error('Error deleting vocabulary item:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStar = async (itemId: string) => {
    try {
      setIsLoading(true);
      // For now, just update local state since backend doesn't track stars
      setVocabulary(prev => prev.map(item => 
        item.id === itemId ? { ...item, isStarred: !item.isStarred } : item
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshVocabulary = async () => {
    await fetchVocabulary();
  };

  const updateReviewWithResult = async (vocabularyId: string, isCorrect: boolean): Promise<ApiVocabularyItem | null> => {
    try {
      setIsLoading(true);
      const updatedItem = await vocabularyApi.updateReviewWithResult(vocabularyId, isCorrect);
      // Refresh vocabulary to get updated stats
      await fetchVocabulary();
      return updatedItem;
    } catch (error) {
      console.error('Error updating review:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getDueForReview = async (): Promise<ApiVocabularyItem[]> => {
    if (!user?.id) return [];
    
    try {
      return await vocabularyApi.getDueForReview(user.id);
    } catch (error) {
      console.error('Error getting due reviews:', error);
      return [];
    }
  };

  return {
    vocabulary,
    stats,
    isLoading,
    getVocabularyByVideoId,
    deleteVocabularyItem,
    toggleStar,
    refreshVocabulary,
    updateReviewWithResult,
    getDueForReview
  };
}