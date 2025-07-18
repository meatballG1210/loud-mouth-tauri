use serde::{Deserialize, Serialize};
use crate::error::{AppError, Result};
use diesel::prelude::*;
use crate::database::establish_connection;
use crate::schema::{videos, subtitles};
use crate::thumbnail;
use std::process::Command;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct SubtitleInfo {
    pub index: i32,
    pub language: Option<String>,
    pub title: Option<String>,
}

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
#[diesel(table_name = subtitles)]
struct NewSubtitle {
    id: String,
    video_id: String,
    language: String,
    file_path: String,
    extracted_date: Option<String>,
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
    
    // Extract and save subtitles
    let mut has_english_subtitles = false;
    let mut has_chinese_subtitles = false;
    let mut subtitle_records = Vec::new();
    
    match extract_subtitle_info(&file_path).await {
        Ok(subtitle_infos) => {
            // Create subtitles directory for this video
            let subtitles_dir = PathBuf::from("subtitles").join(&video_id);
            if let Err(e) = tokio::fs::create_dir_all(&subtitles_dir).await {
                eprintln!("Failed to create subtitles directory: {}", e);
            } else {
                for (idx, subtitle_info) in subtitle_infos.iter().enumerate() {
                    if let Some(language) = detect_subtitle_language(subtitle_info) {
                        let subtitle_filename = format!("{}.{}.vtt", video_id, language);
                        let subtitle_path = subtitles_dir.join(&subtitle_filename);
                        
                        match extract_and_save_subtitle(
                            &file_path,
                            idx as i32,
                            subtitle_path.to_str().unwrap(),
                        ).await {
                            Ok(_) => {
                                println!("Extracted {} subtitle to {}", language, subtitle_path.display());
                                
                                // Prepare subtitle record for database
                                let new_subtitle = NewSubtitle {
                                    id: uuid::Uuid::new_v4().to_string(),
                                    video_id: video_id.clone(),
                                    language: language.clone(),
                                    file_path: subtitle_path.to_str().unwrap().to_string(),
                                    extracted_date: Some(chrono::Utc::now().to_rfc3339()),
                                };
                                subtitle_records.push(new_subtitle);
                                
                                if language == "english" {
                                    has_english_subtitles = true;
                                } else if language == "chinese" {
                                    has_chinese_subtitles = true;
                                }
                            }
                            Err(e) => {
                                eprintln!("Failed to extract subtitle: {}", e);
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            eprintln!("Failed to extract subtitle info: {}", e);
        }
    }
    
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
        has_english_subtitles: Some(has_english_subtitles),
        has_chinese_subtitles: Some(has_chinese_subtitles),
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
        .execute(&mut *connection)
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to save video to database")
            .with_details(e.to_string()))?;
    
    // Insert subtitle records if any were extracted
    if !subtitle_records.is_empty() {
        diesel::insert_into(subtitles::table)
            .values(&subtitle_records)
            .execute(&mut *connection)
            .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to save subtitles to database")
                .with_details(e.to_string()))?;
    }
    
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
        has_english_subtitles: Some(has_english_subtitles),
        has_chinese_subtitles: Some(has_chinese_subtitles),
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
        .load(&mut *connection)
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
        .first(&mut *connection)
        .optional()
        .map_err(|e| AppError::new("DATABASE_ERROR", "Failed to fetch video from database")
            .with_details(e.to_string()))?;
    
    // Delete the video record from database
    diesel::delete(videos.filter(id.eq(&video_id)))
        .execute(&mut *connection)
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
        
        // Delete the subtitles directory for this video
        let subtitles_dir = PathBuf::from("subtitles").join(&video_id);
        if subtitles_dir.exists() {
            if let Err(e) = tokio::fs::remove_dir_all(&subtitles_dir).await {
                // Log the error but don't fail the deletion
                eprintln!("Failed to delete subtitles directory {}: {}", subtitles_dir.display(), e);
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

async fn extract_subtitle_info(video_path: &str) -> Result<Vec<SubtitleInfo>> {
    let output = Command::new("ffprobe")
        .args(&[
            "-v", "error",
            "-select_streams", "s",
            "-show_entries", "stream=index:stream_tags=language,title",
            "-of", "json",
            video_path
        ])
        .output()
        .map_err(|e| AppError::new("FFMPEG_ERROR", "Failed to run ffprobe")
            .with_details(e.to_string()))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::new("FFMPEG_ERROR", "Failed to probe video for subtitles")
            .with_details(error.to_string()));
    }
    
    let output_str = String::from_utf8_lossy(&output.stdout);
    let json: serde_json::Value = serde_json::from_str(&output_str)
        .map_err(|e| AppError::new("PARSE_ERROR", "Failed to parse ffprobe output")
            .with_details(e.to_string()))?;
    
    let mut subtitles = Vec::new();
    
    if let Some(streams) = json["streams"].as_array() {
        for stream in streams {
            if let Some(index) = stream["index"].as_i64() {
                let language = stream["tags"]["language"].as_str().map(|s| s.to_string());
                let title = stream["tags"]["title"].as_str().map(|s| s.to_string());
                
                subtitles.push(SubtitleInfo {
                    index: index as i32,
                    language,
                    title,
                });
            }
        }
    }
    
    Ok(subtitles)
}

async fn extract_and_save_subtitle(
    video_path: &str,
    subtitle_index: i32,
    output_path: &str,
) -> Result<()> {
    let output = Command::new("ffmpeg")
        .args(&[
            "-i", video_path,
            "-map", &format!("0:s:{}", subtitle_index),
            "-c:s", "webvtt",
            "-y",
            output_path
        ])
        .output()
        .map_err(|e| AppError::new("FFMPEG_ERROR", "Failed to run ffmpeg")
            .with_details(e.to_string()))?;
    
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::new("FFMPEG_ERROR", "Failed to extract subtitle")
            .with_details(error.to_string()));
    }
    
    Ok(())
}

fn detect_subtitle_language(subtitle_info: &SubtitleInfo) -> Option<String> {
    if let Some(ref lang) = subtitle_info.language {
        let lang_lower = lang.to_lowercase();
        if lang_lower.contains("eng") || lang_lower == "en" {
            return Some("english".to_string());
        } else if lang_lower.contains("chi") || lang_lower.contains("zho") || 
                  lang_lower == "zh" || lang_lower.contains("chs") || lang_lower.contains("cht") {
            return Some("chinese".to_string());
        }
    }
    
    if let Some(ref title) = subtitle_info.title {
        let title_lower = title.to_lowercase();
        if title_lower.contains("english") || title_lower.contains("eng") {
            return Some("english".to_string());
        } else if title_lower.contains("chinese") || title_lower.contains("中文") || 
                   title_lower.contains("简体") || title_lower.contains("繁体") {
            return Some("chinese".to_string());
        }
    }
    
    None
}

#[tauri::command]
pub async fn get_video_subtitles(video_id: String, language: String) -> Result<String> {
    let subtitle_path = PathBuf::from("subtitles")
        .join(&video_id)
        .join(format!("{}.{}.vtt", video_id, language));
    
    if !subtitle_path.exists() {
        return Err(AppError::new("NOT_FOUND", "Subtitle file not found")
            .with_details(format!("No {} subtitles for video {}", language, video_id)));
    }
    
    let content = tokio::fs::read_to_string(&subtitle_path).await
        .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to read subtitle file")
            .with_details(e.to_string()))?;
    
    Ok(content)
}

