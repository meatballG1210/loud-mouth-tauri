use serde::{Deserialize, Serialize};
use crate::error::{AppError, Result};

#[derive(Debug, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub id: String,
    pub user_id: i32,
    pub title: String,
    pub filename: String,
    pub original_name: String,
    pub path: String,
    pub size: i64,
    pub mtime: String,
    pub duration: Option<i32>,
    pub thumbnail_path: Option<String>,
    pub has_english_subtitles: Option<bool>,
    pub has_chinese_subtitles: Option<bool>,
    pub fast_hash: Option<String>,
    pub full_hash: Option<String>,
    pub upload_date: Option<String>,
}

#[tauri::command]
pub async fn upload_video(
    file_path: String,
    title: String,
    user_id: i32,
) -> Result<VideoMetadata> {
    // Validate input parameters
    if file_path.is_empty() {
        return Err(AppError::new("INVALID_INPUT", "File path cannot be empty"));
    }
    
    if title.is_empty() {
        return Err(AppError::new("INVALID_INPUT", "Title cannot be empty"));
    }
    
    if user_id <= 0 {
        return Err(AppError::new("INVALID_INPUT", "User ID must be positive"));
    }

    // Check if file exists
    let file_path_buf = std::path::Path::new(&file_path);
    if !file_path_buf.exists() {
        return Err(AppError::new("FILE_NOT_FOUND", "The specified file does not exist")
            .with_details(format!("Path: {}", file_path)));
    }

    if !file_path_buf.is_file() {
        return Err(AppError::new("INVALID_FILE", "The specified path is not a file")
            .with_details(format!("Path: {}", file_path)));
    }

    // Extract file metadata
    let metadata = std::fs::metadata(&file_path)
        .map_err(|e| AppError::new("FILE_ACCESS_ERROR", "Failed to read file metadata")
            .with_details(e.to_string()))?;

    let file_size = metadata.len() as i64;
    let mtime = metadata.modified()
        .map_err(|e| AppError::new("FILE_ACCESS_ERROR", "Failed to read file modification time")
            .with_details(e.to_string()))?
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| AppError::new("FILE_ACCESS_ERROR", "Invalid file modification time")
            .with_details(e.to_string()))?;

    // Generate unique video ID
    let video_id = uuid::Uuid::new_v4().to_string();
    
    // Extract original filename
    let original_name = file_path_buf
        .file_name()
        .and_then(|os_str| os_str.to_str())
        .ok_or_else(|| AppError::new("INVALID_FILE", "Could not extract filename from path"))?
        .to_string();

    // For now, create a basic VideoMetadata response
    // TODO: This will be expanded in later steps to include file processing
    let video_metadata = VideoMetadata {
        id: video_id,
        user_id,
        title,
        filename: original_name.clone(),
        original_name,
        path: file_path,
        size: file_size,
        mtime: mtime.as_secs().to_string(),
        duration: None,
        thumbnail_path: None,
        has_english_subtitles: Some(false),
        has_chinese_subtitles: Some(false),
        fast_hash: None,
        full_hash: None,
        upload_date: None,
    };

    Ok(video_metadata)
}