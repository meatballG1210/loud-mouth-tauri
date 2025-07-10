use diesel::prelude::*;

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