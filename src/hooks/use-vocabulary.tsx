import { useState, useEffect } from 'react';
import { VocabularyItem, VocabularyStats } from '@/types/video';
import { vocabularyApi, VocabularyItem as ApiVocabularyItem } from '@/api/vocabulary';
import { useVideos } from './use-videos';
import { getStageLabel } from '@/utils/review-scheduler';

// Extract Chinese translation from dictionary response
function extractChineseTranslation(dictionaryResponse: string | null | undefined): string {
  if (!dictionaryResponse) return '无翻译';
  
  // Look for the Chinese translation after "**Chinese Translation**"
  const translationMatch = dictionaryResponse.match(/\*\*Chinese Translation\*\*\s*\n\s*(.+?)(?:\n|$)/);
  if (translationMatch && translationMatch[1]) {
    return translationMatch[1].trim();
  }
  
  // Fallback: look for any Chinese characters in the first few lines
  const lines = dictionaryResponse.split('\n');
  for (const line of lines.slice(0, 5)) {
    const chineseMatch = line.match(/[\u4e00-\u9fa5]+/);
    if (chineseMatch) {
      return chineseMatch[0];
    }
  }
  
  return '无翻译';
}

// Convert backend vocabulary item to frontend format
function convertToFrontendVocabulary(item: any, videos: any[]): VocabularyItem {
  const video = videos.find(v => v.id === item.video_id);
  const reviewStage = item.review_stage || 0;
  
  return {
    id: item.id || '',
    word: item.word,
    translation: extractChineseTranslation(item.dictionary_response),
    videoId: item.video_id,
    videoTitle: video?.title || 'Unknown Video',
    timestamp: item.timestamp / 1000, // Convert from milliseconds to seconds
    context: item.target_en,
    difficulty: reviewStage <= 2 ? 'easy' : reviewStage <= 4 ? 'medium' : 'hard',
    reviewCount: reviewStage,
    lastReviewed: item.last_reviewed_at || item.created_at || new Date().toISOString().split('T')[0],
    nextReview: item.next_review_at ? item.next_review_at.split('T')[0] : new Date().toISOString().split('T')[0],
    isStarred: false, // Backend doesn't track this yet
    dictionaryResponse: item.dictionary_response
  };
}

export function useVocabulary() {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [stats, setStats] = useState<VocabularyStats>({
    totalWords: 0,
    wordsToReview: 0,
    masteredWords: 0,
    overdueWords: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { videos } = useVideos();

  // Fetch vocabulary data on mount and when videos change
  useEffect(() => {
    fetchVocabulary();
  }, [videos]);

  const fetchVocabulary = async () => {
    try {
      setIsLoading(true);
      // TODO: Get actual user ID from auth context
      const userId = 'demo-user';
      
      const backendVocabulary = await vocabularyApi.getAll(userId);
      const convertedVocabulary = backendVocabulary.map(item => 
        convertToFrontendVocabulary(item, videos)
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
    } catch (error) {
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
      setIsLoading(false);
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

  const getDueForReview = async (userId: string): Promise<ApiVocabularyItem[]> => {
    try {
      return await vocabularyApi.getDueForReview(userId);
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