use serde::{Deserialize, Serialize};
use crate::error::{AppError, Result};
use diesel::prelude::*;
use crate::database::establish_connection;
use crate::schema::videos;
use crate::thumbnail;

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

#[derive(Insertable)]
#[diesel(table_name = videos)]
struct NewVideo {
    id: String,
    user_id: i32,
    title: String,
    filename: String,
    original_name: String,
    path: String,
    size: i32,
    mtime: String,
    duration: Option<i32>,
    thumbnail_path: Option<String>,
    has_english_subtitles: Option<bool>,
    has_chinese_subtitles: Option<bool>,
    fast_hash: Option<String>,
    full_hash: Option<String>,
    upload_date: Option<String>,
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

    // Get current timestamp for upload_date
    let upload_date = chrono::Utc::now().to_rfc3339();
    
    // Generate thumbnail
    let thumbnail_path = match thumbnail::generate_thumbnail(
        &file_path,
        ".", // Use current directory as base
        &video_id,
    ).await {
        Ok(path) => Some(path),
        Err(e) => {
            // Log error but don't fail the upload
            eprintln!("Failed to generate thumbnail: {}", e);
            None
        }
    };

    // Extract video duration
    let duration = match thumbnail::extract_video_duration(&file_path).await {
        Ok(Some(dur)) => Some(dur),
        Ok(None) => {
            eprintln!("Could not extract duration from video");
            None
        }
        Err(e) => {
            eprintln!("Failed to extract duration: {}", e);
            None
        }
    };
    
    // Create new video record
    let new_video = NewVideo {
        id: video_id.clone(),
        user_id,
        title: title.clone(),
        filename: original_name.clone(),
        original_name: original_name.clone(),
        path: file_path.clone(),
        size: file_size as i32,
        mtime: mtime.as_secs().to_string(),
        duration,
        thumbnail_path: thumbnail_path.clone(),
        has_english_subtitles: Some(false),
        has_chinese_subtitles: Some(false),
        fast_hash: None,
        full_hash: None,
        upload_date: Some(upload_date.clone()),
    };
    
    // Save to database
    let mut connection = establish_connection()
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to connect to database")
            .with_details(e.to_string()))?;
    
    diesel::insert_into(videos::table)
        .values(&new_video)
        .execute(&mut connection)
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to save video to database")
            .with_details(e.to_string()))?;
    
    // Return the metadata
    let video_metadata = VideoMetadata {
        id: video_id,
        user_id,
        title,
        filename: original_name.clone(),
        original_name,
        path: file_path,
        size: file_size,
        mtime: mtime.as_secs().to_string(),
        duration,
        thumbnail_path,
        has_english_subtitles: Some(false),
        has_chinese_subtitles: Some(false),
        fast_hash: None,
        full_hash: None,
        upload_date: Some(upload_date),
    };

    Ok(video_metadata)
}

#[derive(Debug, Serialize, Deserialize, Queryable)]
pub struct StoredVideo {
    pub id: String,
    pub user_id: i32,
    pub title: String,
    pub filename: String,
    pub original_name: String,
    pub path: String,
    pub size: i32,
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
pub async fn get_videos(user_id: i32) -> Result<Vec<VideoMetadata>> {
    use crate::schema::videos::dsl::videos;
    
    let mut connection = establish_connection()
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to connect to database")
            .with_details(e.to_string()))?;
    
    let stored_videos: Vec<StoredVideo> = videos
        .filter(crate::schema::videos::user_id.eq(user_id))
        .load(&mut connection)
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to fetch videos from database")
            .with_details(e.to_string()))?;
    
    let video_metadatas: Vec<VideoMetadata> = stored_videos
        .into_iter()
        .map(|v| VideoMetadata {
            id: v.id,
            user_id: v.user_id,
            title: v.title,
            filename: v.filename,
            original_name: v.original_name,
            path: v.path,
            size: v.size as i64,
            mtime: v.mtime,
            duration: v.duration,
            thumbnail_path: v.thumbnail_path,
            has_english_subtitles: v.has_english_subtitles,
            has_chinese_subtitles: v.has_chinese_subtitles,
            fast_hash: v.fast_hash,
            full_hash: v.full_hash,
            upload_date: v.upload_date,
        })
        .collect();
    
    Ok(video_metadatas)
}

#[tauri::command]
pub async fn delete_video(video_id: String) -> Result<()> {
    use crate::schema::videos::dsl::{videos, id};
    
    let mut connection = establish_connection()
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to connect to database")
            .with_details(e.to_string()))?;
    
    // First, get the video record to find the thumbnail path
    let video_record: Option<StoredVideo> = videos
        .filter(id.eq(&video_id))
        .first(&mut connection)
        .optional()
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to fetch video from database")
            .with_details(e.to_string()))?;
    
    // Delete the video record from database
    diesel::delete(videos.filter(id.eq(&video_id)))
        .execute(&mut connection)
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to delete video from database")
            .with_details(e.to_string()))?;
    
    // Delete the thumbnail file if it exists
    if let Some(video) = video_record {
        if let Some(thumbnail_path) = video.thumbnail_path {
            if let Err(e) = tokio::fs::remove_file(&thumbnail_path).await {
                // Log the error but don't fail the deletion
                eprintln!("Failed to delete thumbnail file {}: {}", thumbnail_path, e);
            }
        }
    }
    
    Ok(())
}

#[tauri::command]
pub fn resolve_thumbnail_path(thumbnail_path: String) -> Result<String> {
    if thumbnail_path.starts_with("./") || thumbnail_path.starts_with("../") {
        // Convert relative path to absolute path
        let absolute_path = std::fs::canonicalize(&thumbnail_path)
            .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to resolve thumbnail path")
                .with_details(e.to_string()))?;
        Ok(absolute_path.to_string_lossy().to_string())
    } else {
        // Already absolute path
        Ok(thumbnail_path)
    }
}

#[tauri::command]
pub async fn get_thumbnail_data(thumbnail_path: String) -> Result<Vec<u8>> {
    let path = if thumbnail_path.starts_with("./") || thumbnail_path.starts_with("../") {
        std::fs::canonicalize(&thumbnail_path)
            .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to resolve thumbnail path")
                .with_details(e.to_string()))?
    } else {
        std::path::PathBuf::from(&thumbnail_path)
    };

    let data = tokio::fs::read(&path).await
        .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to read thumbnail file")
            .with_details(e.to_string()))?;
    
    Ok(data)
}