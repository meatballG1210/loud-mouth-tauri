use diesel::prelude::*;
use chrono::{DateTime, Duration, Utc};

use crate::{
    database::establish_connection,
    error::{AppError, Result},
    models::vocabulary::{CreateVocabularyRequest, Vocabulary},
};
use serde::Serialize;

#[derive(Serialize)]
pub struct AccuracyStats {
    pub total_reviews: i32,
    pub total_correct: i32,
    pub accuracy_percentage: f64,
    pub words_reviewed: i32,
}

#[tauri::command]
pub fn create_vocabulary(request: CreateVocabularyRequest) -> Result<Vocabulary> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    let new_vocabulary = request.into_new_vocabulary();

    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        diesel::insert_into(vocabulary::table)
            .values(&new_vocabulary)
            .execute(conn)?;

        vocabulary::table
            .filter(vocabulary::id.eq(&new_vocabulary.id))
            .first(conn)
    })
    .map_err(|e| AppError::new("VOCABULARY_CREATE_ERROR", "Failed to create vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_vocabulary_by_video(video_id: String, user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    vocabulary::table
        .filter(vocabulary::video_id.eq(video_id))
        .filter(vocabulary::user_id.eq(user_id))
        .order(vocabulary::created_at.desc())
        .load(&mut *conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_all_vocabulary(user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .order(vocabulary::created_at.desc())
        .load(&mut *conn)
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
        .execute(&mut *conn)?;

    Ok(())
}

#[tauri::command]
pub fn delete_vocabulary(vocabulary_id: String) -> Result<()> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    diesel::delete(vocabulary::table.filter(vocabulary::id.eq(vocabulary_id)))
        .execute(&mut *conn)?;

    Ok(())
}

#[tauri::command]
pub fn get_vocabulary_due_for_review(user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;
    use chrono::{Utc, Timelike};

    let mut conn = establish_connection()?;
    // Get today's date at midnight UTC
    let today_midnight = Utc::now()
        .with_hour(0).unwrap()
        .with_minute(0).unwrap()
        .with_second(0).unwrap()
        .with_nanosecond(0).unwrap();
    // Add one day to get tomorrow at midnight
    let tomorrow_midnight = today_midnight + Duration::days(1);
    
    vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .filter(vocabulary::next_review_at.lt(tomorrow_midnight.to_rfc3339()))
        .order(vocabulary::next_review_at.asc())
        .load(&mut *conn)
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
    
    conn.transaction::<_, diesel::result::Error, _>(|conn| {
        // First, fetch the current vocabulary item
        let vocab: Vocabulary = vocabulary::table
            .filter(vocabulary::id.eq(&vocabulary_id))
            .first(conn)?;
        
        let now = Utc::now();
        let now_str = now.to_rfc3339();
        
        // Check if the review is late
        let scheduled_review_at = vocab.scheduled_review_at.as_ref()
            .ok_or_else(|| diesel::result::Error::NotFound)?;
        
        let scheduled_date = DateTime::parse_from_rfc3339(scheduled_review_at)
            .map_err(|_| diesel::result::Error::NotFound)?
            .with_timezone(&Utc);
        
        let days_late = (now - scheduled_date).num_days();
        let is_late = days_late > 3;
        
        // Calculate new review stage
        let current_stage = vocab.review_stage.unwrap_or(0);
        let new_stage = if is_late {
            0 // Reset to beginning if late
        } else if !is_correct {
            current_stage // Keep current stage if incorrect but not late
        } else {
            (current_stage + 1).min(5) // Advance stage if correct and not late
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
        
        // Update correct count
        let new_correct_count = if is_correct {
            vocab.correct_count.unwrap_or(0) + 1
        } else {
            vocab.correct_count.unwrap_or(0)
        };
        
        // Determine if this item should be marked as ever_overdue
        // Once marked as overdue, it stays overdue forever
        let should_mark_overdue = is_late || vocab.ever_overdue;
        
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
                vocabulary::ever_overdue.eq(should_mark_overdue),
                vocabulary::correct_count.eq(new_correct_count),
            ))
            .execute(conn)?;
        
        // Return the updated vocabulary item
        vocabulary::table
            .filter(vocabulary::id.eq(&vocabulary_id))
            .first(conn)
    })
    .map_err(|e| AppError::new("VOCABULARY_UPDATE_ERROR", "Failed to update vocabulary review").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_overdue_vocabulary(user_id: String) -> Result<Vec<Vocabulary>> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .filter(vocabulary::ever_overdue.eq(true))
        .order(vocabulary::last_reviewed_at.desc())
        .load(&mut *conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch overdue vocabulary").with_details(e.to_string()))
}

#[tauri::command]
pub fn get_vocabulary_accuracy_stats(user_id: String) -> Result<AccuracyStats> {
    use crate::schema::vocabulary;

    let mut conn = establish_connection()?;
    
    // Get all vocabulary items with review data
    let vocabulary_items: Vec<Vocabulary> = vocabulary::table
        .filter(vocabulary::user_id.eq(user_id))
        .filter(vocabulary::review_count.gt(0))
        .load(&mut *conn)
        .map_err(|e| AppError::new("VOCABULARY_FETCH_ERROR", "Failed to fetch vocabulary for accuracy stats").with_details(e.to_string()))?;
    
    // Calculate totals
    let mut total_reviews = 0;
    let mut total_correct = 0;
    let words_reviewed = vocabulary_items.len() as i32;
    
    for item in vocabulary_items {
        let reviews = item.review_count.unwrap_or(0);
        let correct = item.correct_count.unwrap_or(0);
        
        total_reviews += reviews;
        total_correct += correct;
    }
    
    // Calculate accuracy percentage as integer
    let accuracy_percentage = if total_reviews > 0 {
        ((total_correct as f64 / total_reviews as f64) * 100.0).round()
    } else {
        100.0 // No reviews yet, show 100%
    };
    
    Ok(AccuracyStats {
        total_reviews,
        total_correct,
        accuracy_percentage,
        words_reviewed,
    })
}