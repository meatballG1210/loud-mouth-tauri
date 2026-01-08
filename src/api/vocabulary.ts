import { invoke } from "@tauri-apps/api/core";

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 100; // ms

// Helper function to sleep for a given duration
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to check if error is a database lock error
const isDatabaseLockError = (error: any): boolean => {
  const errorStr = error?.toString() || '';
  const errorDetails = error?.details || error?.message || '';
  return errorStr.includes('database is locked') || 
         errorStr.includes('SQLITE_BUSY') ||
         errorDetails.includes('database is locked') ||
         errorDetails.includes('SQLITE_BUSY');
};

// Wrapper function to add retry logic with exponential backoff
async function invokeWithRetry<T>(
  command: string,
  args: Record<string, any>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= retries; i++) {
    try {
      return await invoke<T>(command, args);
    } catch (error) {
      lastError = error;
      
      // Only retry on database lock errors
      if (!isDatabaseLockError(error) || i === retries) {
        throw error;
      }
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const delay = INITIAL_DELAY * Math.pow(2, i);
      console.log(`Database locked, retrying in ${delay}ms... (attempt ${i + 1}/${retries + 1})`);
      await sleep(delay);
    }
  }
  
  throw lastError;
}

export interface VocabularyItem {
  id?: string;
  user_id: string;
  video_id: string;
  word: string;
  timestamp: number;
  before_2_en?: string;
  before_2_zh?: string;
  before_2_timestamp?: number;
  before_1_en?: string;
  before_1_zh?: string;
  target_en: string;
  target_zh: string;
  dictionary_response?: string;
  review_stage?: number;
  next_review_at: string;
  last_reviewed_at?: string;
  is_phrase?: boolean;
  created_at?: string;
  scheduled_review_at?: string;
  review_count?: number;
  consecutive_correct?: number;
  was_late?: boolean;
  ever_overdue?: boolean;
  correct_count?: number;
  word_start_index?: number;
  word_end_index?: number;
}

export interface CreateVocabularyRequest {
  user_id: string;
  video_id: string;
  word: string;
  timestamp: number;
  before_2_en?: string;
  before_2_zh?: string;
  before_2_timestamp?: number;
  before_1_en?: string;
  before_1_zh?: string;
  target_en: string;
  target_zh: string;
  dictionary_response?: string;
  next_review_at: string;
  is_phrase?: boolean;
  word_start_index?: number;
}

export interface AccuracyStats {
  total_reviews: number;
  total_correct: number;
  accuracy_percentage: number;
  words_reviewed: number;
}

export const vocabularyApi = {
  async create(vocabulary: CreateVocabularyRequest): Promise<VocabularyItem> {
    return await invokeWithRetry<VocabularyItem>("create_vocabulary", { request: vocabulary });
  },

  async getByVideo(videoId: string, userId: string): Promise<VocabularyItem[]> {
    return await invokeWithRetry<VocabularyItem[]>("get_vocabulary_by_video", { videoId, userId });
  },

  async getAll(userId: string): Promise<VocabularyItem[]> {
    return await invokeWithRetry<VocabularyItem[]>("get_all_vocabulary", { userId });
  },

  async updateReview(vocabularyId: string, reviewStage: number, nextReviewAt: string): Promise<void> {
    return await invokeWithRetry<void>("update_vocabulary_review", { vocabularyId, reviewStage, nextReviewAt });
  },

  async delete(vocabularyId: string): Promise<void> {
    return await invokeWithRetry<void>("delete_vocabulary", { vocabularyId });
  },

  async getDueForReview(userId: string): Promise<VocabularyItem[]> {
    return await invokeWithRetry<VocabularyItem[]>("get_vocabulary_due_for_review", { userId });
  },

  async getDueForReviewByVideo(userId: string, videoId: string): Promise<VocabularyItem[]> {
    return await invokeWithRetry<VocabularyItem[]>("get_vocabulary_due_for_review_by_video", { userId, videoId });
  },

  async updateReviewWithResult(vocabularyId: string, isCorrect: boolean): Promise<VocabularyItem> {
    return await invokeWithRetry<VocabularyItem>("update_vocabulary_review_with_result", { vocabularyId, isCorrect });
  },

  async getOverdue(userId: string): Promise<VocabularyItem[]> {
    return await invokeWithRetry<VocabularyItem[]>("get_overdue_vocabulary", { userId });
  },

  async getAccuracyStats(userId: string): Promise<AccuracyStats> {
    return await invokeWithRetry<AccuracyStats>("get_vocabulary_accuracy_stats", { userId });
  }
};