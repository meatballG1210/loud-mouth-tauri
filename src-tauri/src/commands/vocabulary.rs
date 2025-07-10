use diesel::prelude::*;
use chrono::{DateTime, Duration, Utc};

use crate::{
    database::establish_connection,
    error::{AppError, Result},
    models::vocabulary::{CreateVocabularyRequest, Vocabulary},
};

#[tauri::command]
pub fn create_vocabulary(request: CreateVocabularyRequest) -> Result<Vocabulary> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    let new_vocabulary = request.into_new_vocabulary();

    diesel::insert_into(vocabulary::table)
        .values(&new_vocabulary)
        .execute(&mut conn)?;

    vocabulary::table
        .filter(vocabulary::id.eq(&new_vocabulary.id))
        .first(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_NOT_FOUND", "Failed to retrieve created vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_vocabulary_by_video(video_id: String, user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    vocabulary::table
        .filter(vocabulary::video_id.eq(video_id))
        .filter(vocabulary::user_id.eq(user_id))
        .order(vocabulary::created_at.desc())
        .load(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_all_vocabulary(user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .order(vocabulary::created_at.desc())
        .load(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn update_vocabulary_review(
    vocabulary_id: String,
    review_stage: i32,
    next_review_at: String,
) -> Result<()> {
    use crate::schema::vocabulary;
    use chrono::Utc;

    let mut conn = establish_connection()?;
    let now = Utc::now().to_rfc3339();

    diesel::update(vocabulary::table.filter(vocabulary::id.eq(vocabulary_id)))
        .set((
            vocabulary::review_stage.eq(review_stage),
            vocabulary::next_review_at.eq(next_review_at),
            vocabulary::last_reviewed_at.eq(now),
        ))
        .execute(&mut conn)?;

    Ok(())
}

#[tauri::command]
pub fn delete_vocabulary(vocabulary_id: String) -> Result<()> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    diesel::delete(vocabulary::table.filter(vocabulary::id.eq(vocabulary_id)))
        .execute(&mut conn)?;

    Ok(())
}

#[tauri::command]
pub fn get_vocabulary_due_for_review(user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;
    use chrono::Utc;

    let mut conn = establish_connection()?;
    let now = Utc::now().to_rfc3339();

    vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .filter(vocabulary::next_review_at.le(now))
        .order(vocabulary::next_review_at.asc())
        .load(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch vocabulary due for review").with_details(e.to_string()))
}

// Helper function to get review interval in days based on stage
fn get_review_interval_days(stage: i32) -> i32 {
    match stage {
        0 => 1,   // Day 1
        1 => 3,   // Day 3
        2 => 7,   // Day 7
        3 => 14,  // Day 14
        4 => 30,  // Day 30
        _ => 30,  // Mastered (keep at 30 days)
    }
}

#[tauri::command]
pub fn update_vocabulary_review_with_result(
    vocabulary_id: String,
    is_correct: bool,
) -> Result<Vocabulary> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    
    // First, fetch the current vocabulary item
    let vocab: Vocabulary = vocabulary::table
        .filter(vocabulary::id.eq(&vocabulary_id))
        .first(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_NOT_FOUND", "Vocabulary item not found").with_details(e.to_string()))?;
    
    let now = Utc::now();
    let now_str = now.to_rfc3339();
    
    // Check if the review is late
    let scheduled_review_at = vocab.scheduled_review_at.as_ref()
        .ok_or_else(|| AppError::new("INVALID_DATA", "No scheduled review date"))?;
    
    let scheduled_date = DateTime::parse_from_rfc3339(scheduled_review_at)
        .map_err(|e| AppError::new("INVALID_DATE", "Invalid scheduled review date").with_details(e.to_string()))?
        .with_timezone(&Utc);
    
    let days_late = (now - scheduled_date).num_days();
    let is_late = days_late > 3;
    
    // Calculate new review stage
    let current_stage = vocab.review_stage.unwrap_or(0);
    let new_stage = if !is_correct || is_late {
        0 // Reset to beginning
    } else {
        (current_stage + 1).min(5) // Max stage is 5 (mastered)
    };
    
    // Calculate next review date
    let interval_days = get_review_interval_days(new_stage);
    let next_review_date = now + Duration::days(interval_days as i64);
    let next_review_str = next_review_date.to_rfc3339();
    
    // Update review count and consecutive correct
    let new_review_count = vocab.review_count.unwrap_or(0) + 1;
    let new_consecutive_correct = if is_correct && !is_late {
        vocab.consecutive_correct.unwrap_or(0) + 1
    } else {
        0
    };
    
    // Update the vocabulary item
    diesel::update(vocabulary::table.filter(vocabulary::id.eq(&vocabulary_id)))
        .set((
            vocabulary::review_stage.eq(new_stage),
            vocabulary::next_review_at.eq(&next_review_str),
            vocabulary::scheduled_review_at.eq(&next_review_str),
            vocabulary::last_reviewed_at.eq(&now_str),
            vocabulary::review_count.eq(new_review_count),
            vocabulary::consecutive_correct.eq(new_consecutive_correct),
            vocabulary::was_late.eq(is_late),
        ))
        .execute(&mut conn)?;
    
    // Return the updated vocabulary item
    vocabulary::table
        .filter(vocabulary::id.eq(&vocabulary_id))
        .first(&mut conn)
        .map_err(|e| AppError::new("VOCABULARY_NOT_FOUND", "Failed to retrieve updated vocabulary").with_details(e.to_string()))
}