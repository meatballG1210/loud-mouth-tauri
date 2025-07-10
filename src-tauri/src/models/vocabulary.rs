use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Queryable, Selectable, Serialize, Deserialize, Debug)]
#[diesel(table_name = crate::schema::vocabulary)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Vocabulary {
    pub id: Option<String>,
    pub user_id: String,
    pub video_id: String,
    pub word: String,
    pub timestamp: i32,
    pub before_2_en: Option<String>,
    pub before_2_zh: Option<String>,
    pub before_1_en: Option<String>,
    pub before_1_zh: Option<String>,
    pub target_en: String,
    pub target_zh: String,
    pub dictionary_response: Option<String>,
    pub review_stage: Option<i32>,
    pub next_review_at: String,
    pub last_reviewed_at: Option<String>,
    pub is_phrase: Option<bool>,
    pub created_at: Option<String>,
    pub before_2_timestamp: Option<i32>,
    pub scheduled_review_at: Option<String>,
    pub review_count: Option<i32>,
    pub consecutive_correct: Option<i32>,
    pub was_late: Option<bool>,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = crate::schema::vocabulary)]
pub struct NewVocabulary {
    pub id: String,
    pub user_id: String,
    pub video_id: String,
    pub word: String,
    pub timestamp: i32,
    pub before_2_en: Option<String>,
    pub before_2_zh: Option<String>,
    pub before_2_timestamp: Option<i32>,
    pub before_1_en: Option<String>,
    pub before_1_zh: Option<String>,
    pub target_en: String,
    pub target_zh: String,
    pub dictionary_response: Option<String>,
    pub review_stage: i32,
    pub next_review_at: String,
    pub last_reviewed_at: Option<String>,
    pub is_phrase: bool,
    pub scheduled_review_at: Option<String>,
    pub review_count: i32,
    pub consecutive_correct: i32,
    pub was_late: bool,
}

#[derive(Deserialize)]
pub struct CreateVocabularyRequest {
    pub user_id: String,
    pub video_id: String,
    pub word: String,
    pub timestamp: i32,
    pub before_2_en: Option<String>,
    pub before_2_zh: Option<String>,
    pub before_2_timestamp: Option<i32>,
    pub before_1_en: Option<String>,
    pub before_1_zh: Option<String>,
    pub target_en: String,
    pub target_zh: String,
    pub dictionary_response: Option<String>,
    pub next_review_at: String,
    pub is_phrase: Option<bool>,
}

impl CreateVocabularyRequest {
    pub fn into_new_vocabulary(self) -> NewVocabulary {
        let next_review_at = self.next_review_at.clone();
        NewVocabulary {
            id: Uuid::new_v4().to_string(),
            user_id: self.user_id,
            video_id: self.video_id,
            word: self.word,
            timestamp: self.timestamp,
            before_2_en: self.before_2_en,
            before_2_zh: self.before_2_zh,
            before_2_timestamp: self.before_2_timestamp,
            before_1_en: self.before_1_en,
            before_1_zh: self.before_1_zh,
            target_en: self.target_en,
            target_zh: self.target_zh,
            dictionary_response: self.dictionary_response,
            review_stage: 0,
            next_review_at: next_review_at.clone(),
            last_reviewed_at: None,
            is_phrase: self.is_phrase.unwrap_or(false),
            scheduled_review_at: Some(next_review_at),
            review_count: 0,
            consecutive_correct: 0,
            was_late: false,
        }
    }
}