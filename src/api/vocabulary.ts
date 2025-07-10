import { invoke } from "@tauri-apps/api/core";

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
}

export const vocabularyApi = {
  async create(vocabulary: CreateVocabularyRequest): Promise<VocabularyItem> {
    return await invoke<VocabularyItem>("create_vocabulary", { request: vocabulary });
  },

  async getByVideo(videoId: string, userId: string): Promise<VocabularyItem[]> {
    return await invoke<VocabularyItem[]>("get_vocabulary_by_video", { videoId, userId });
  },

  async getAll(userId: string): Promise<VocabularyItem[]> {
    return await invoke<VocabularyItem[]>("get_all_vocabulary", { userId });
  },

  async updateReview(vocabularyId: string, reviewStage: number, nextReviewAt: string): Promise<void> {
    return await invoke<void>("update_vocabulary_review", { vocabularyId, reviewStage, nextReviewAt });
  },

  async delete(vocabularyId: string): Promise<void> {
    return await invoke<void>("delete_vocabulary", { vocabularyId });
  },

  async getDueForReview(userId: string): Promise<VocabularyItem[]> {
    return await invoke<VocabularyItem[]>("get_vocabulary_due_for_review", { userId });
  },

  async updateReviewWithResult(vocabularyId: string, isCorrect: boolean): Promise<VocabularyItem> {
    return await invoke<VocabularyItem>("update_vocabulary_review_with_result", { vocabularyId, isCorrect });
  }
};