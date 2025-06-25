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
}

export interface VocabularyStats {
  totalWords: number;
  wordsToReview: number;
  masteredWords: number;
  newWords: number;
}
