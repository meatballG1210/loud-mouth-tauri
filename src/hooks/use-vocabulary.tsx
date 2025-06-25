import { useState } from 'react';
import { VocabularyItem, VocabularyStats } from '@/types/video';

// Mock vocabulary data
const mockVocabulary: VocabularyItem[] = [
  {
    id: '1',
    word: 'surrogate',
    translation: '代理人，替代品',
    videoId: '1',
    videoTitle: 'Modern Family S01E01 2009 1080p Blu-ray',
    timestamp: 123.5,
    context: 'We need a surrogate mother for the baby.',
    difficulty: 'medium',
    reviewCount: 3,
    lastReviewed: '2025-06-08',
    nextReview: '2025-06-10',
    isStarred: false
  },
  {
    id: '2',
    word: 'initially',
    translation: '最初，起初',
    videoId: '1',
    videoTitle: 'Modern Family S01E01 2009 1080p Blu-ray',
    timestamp: 89.2,
    context: 'Initially, I thought it was a good idea.',
    difficulty: 'easy',
    reviewCount: 5,
    lastReviewed: '2025-06-07',
    nextReview: '2025-06-09',
    isStarred: true
  },
  {
    id: '3',
    word: 'adorable',
    translation: '可爱的，讨人喜欢的',
    videoId: '1',
    videoTitle: 'Modern Family S01E01 2009 1080p Blu-ray',
    timestamp: 234.8,
    context: 'That baby is absolutely adorable.',
    difficulty: 'easy',
    reviewCount: 8,
    lastReviewed: '2025-06-06',
    nextReview: '2025-06-08',
    isStarred: false
  },
  {
    id: '4',
    word: 'penalty',
    translation: '惩罚，罚款',
    videoId: '1',
    videoTitle: 'Modern Family S01E01 2009 1080p Blu-ray',
    timestamp: 456.1,
    context: 'There will be a penalty for late submission.',
    difficulty: 'medium',
    reviewCount: 2,
    lastReviewed: '2025-06-05',
    nextReview: '2025-06-11',
    isStarred: true
  },
  {
    id: '5',
    word: 'take him out',
    translation: '带他出去；解决掉他',
    videoId: '1',
    videoTitle: 'Modern Family S01E01 2009 1080p Blu-ray',
    timestamp: 678.9,
    context: 'Let\'s take him out for dinner tonight.',
    difficulty: 'hard',
    reviewCount: 1,
    lastReviewed: '2025-06-04',
    nextReview: '2025-06-12',
    isStarred: false
  },
  {
    id: '6',
    word: 'confidence',
    translation: '信心，自信',
    videoId: '2',
    videoTitle: 'The Office S01E01 2005 720p',
    timestamp: 345.2,
    context: 'She spoke with great confidence.',
    difficulty: 'medium',
    reviewCount: 4,
    lastReviewed: '2025-06-07',
    nextReview: '2025-06-10',
    isStarred: true
  },
  {
    id: '7',
    word: 'overwhelmed',
    translation: '不知所措的，被压倒的',
    videoId: '2',
    videoTitle: 'The Office S01E01 2005 720p',
    timestamp: 567.4,
    context: 'I feel overwhelmed by all the work.',
    difficulty: 'hard',
    reviewCount: 2,
    lastReviewed: '2025-06-06',
    nextReview: '2025-06-13',
    isStarred: false
  }
];

const mockStats: VocabularyStats = {
  totalWords: mockVocabulary.length,
  wordsToReview: mockVocabulary.filter(item => new Date(item.nextReview) <= new Date()).length,
  masteredWords: mockVocabulary.filter(item => item.reviewCount >= 5).length,
  newWords: mockVocabulary.filter(item => item.reviewCount <= 1).length
};

export function useVocabulary() {
  const [vocabulary] = useState<VocabularyItem[]>(mockVocabulary);
  const [stats] = useState<VocabularyStats>(mockStats);
  const [isLoading, setIsLoading] = useState(false);

  const getVocabularyByVideoId = (videoId: string): VocabularyItem[] => {
    return vocabulary.filter(item => item.videoId === videoId);
  };

  const deleteVocabularyItem = async (itemId: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Delete vocabulary item:', itemId);
    setIsLoading(false);
  };

  const toggleStar = async (itemId: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('Toggle star for vocabulary item:', itemId);
    setIsLoading(false);
  };

  const refreshVocabulary = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Refresh vocabulary');
    setIsLoading(false);
  };

  return {
    vocabulary,
    stats,
    isLoading,
    getVocabularyByVideoId,
    deleteVocabularyItem,
    toggleStar,
    refreshVocabulary
  };
}