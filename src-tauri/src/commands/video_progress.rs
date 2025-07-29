use crate::database::establish_connection;
use crate::error::{AppError, Result};
use crate::models::video_progress::{NewVideoProgress, UpdateVideoProgress, VideoProgress};
use crate::schema::video_progress;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoProgressPayload {
    pub user_id: i32,
    pub video_id: String,
    pub position: i32,
    pub duration: i32,
}

#[tauri::command]
pub fn save_video_progress(payload: VideoProgressPayload) -> Result<VideoProgress> {
    let mut conn = establish_connection()?;

    // Try to find existing progress record
    let existing = video_progress::table
        .filter(video_progress::user_id.eq(&payload.user_id))
        .filter(video_progress::video_id.eq(&payload.video_id))
        .first::<VideoProgress>(&mut *conn)
        .optional()
        .map_err(|e| AppError::new("VIDEO_PROGRESS_FETCH_ERROR", "Failed to fetch video progress").with_details(e.to_string()))?;

    let now = chrono::Utc::now().to_rfc3339();

    if let Some(progress) = existing {
        // Update existing record
        let update = UpdateVideoProgress {
            position: payload.position,
            duration: payload.duration,
            updated_at: now,
        };

        diesel::update(video_progress::table.find(&progress.id))
            .set(&update)
            .execute(&mut *conn)
            .map_err(|e| AppError::new("VIDEO_PROGRESS_UPDATE_ERROR", "Failed to update video progress").with_details(e.to_string()))?;
        
        // Fetch the updated record
        video_progress::table
            .find(&progress.id)
            .first(&mut *conn)
            .map_err(|e| AppError::new("VIDEO_PROGRESS_FETCH_ERROR", "Failed to fetch updated video progress").with_details(e.to_string()))
    } else {
        // Create new record
        let new_progress = NewVideoProgress {
            id: Uuid::new_v4().to_string(),
            user_id: payload.user_id,
            video_id: payload.video_id,
            position: payload.position,
            duration: payload.duration,
            updated_at: now,
        };

        diesel::insert_into(video_progress::table)
            .values(&new_progress)
            .execute(&mut *conn)
            .map_err(|e| AppError::new("VIDEO_PROGRESS_CREATE_ERROR", "Failed to create video progress").with_details(e.to_string()))?;
        
        // Fetch the inserted record
        video_progress::table
            .find(&new_progress.id)
            .first(&mut *conn)
            .map_err(|e| AppError::new("VIDEO_PROGRESS_FETCH_ERROR", "Failed to fetch created video progress").with_details(e.to_string()))
    }
}

#[tauri::command]
pub fn get_video_progress(user_id: i32, video_id: String) -> Result<Option<VideoProgress>> {
    let mut conn = establish_connection()?;

    video_progress::table
        .filter(video_progress::user_id.eq(user_id))
        .filter(video_progress::video_id.eq(video_id))
        .first::<VideoProgress>(&mut *conn)
        .optional()
        .map_err(|e| AppError::new("VIDEO_PROGRESS_FETCH_ERROR", "Failed to fetch video progress").with_details(e.to_string()))
}

#[tauri::command]
pub fn delete_video_progress(user_id: i32, video_id: String) -> Result<usize> {
    let mut conn = establish_connection()?;

    diesel::delete(
        video_progress::table
            .filter(video_progress::user_id.eq(user_id))
            .filter(video_progress::video_id.eq(video_id)),
    )
    .execute(&mut *conn)
    .map_err(|e| AppError::new("VIDEO_PROGRESS_DELETE_ERROR", "Failed to delete video progress").with_details(e.to_string()))
}