export interface Video {
  id: string;
  title: string;
  duration: string;
  uploadDate: string;
  fileSize: string;
  thumbnail: string;
  subtitles: {
    english: boolean;
    chinese: boolean;
  };
  path?: string; // Path to the video file
}

export interface VideoLibraryStats {
  totalVideos: number;
  totalVocabulary: number;
  dueReviews: number;
}

export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
  context: string;
  difficulty: 'easy' | 'medium' | 'hard';
  reviewCount: number;
  lastReviewed: string;
  nextReview: string;
  isStarred: boolean;
  dictionaryResponse?: string;
}

export interface VocabularyStats {
  totalWords: number;
  wordsToReview: number;
  masteredWords: number;
  overdueWords: number;
}
