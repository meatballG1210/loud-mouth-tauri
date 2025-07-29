pub mod commands;
pub mod database;
pub mod error;
pub mod models;
pub mod schema;
pub mod thumbnail;

#[cfg(test)]
mod error_tests;

use error::AppError;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_user_count() -> Result<i64, AppError> {
    database::get_user_count()
}

#[tauri::command]
fn add_test_user(email: String) -> Result<(), AppError> {
    database::add_user(&email)
}

#[tauri::command]
fn test_error_not_found() -> Result<String, AppError> {
    Err(app_error!("NOT_FOUND", "User not found"))
}

#[tauri::command]
fn test_error_with_details() -> Result<String, AppError> {
    Err(app_error!("VALIDATION_ERROR", "Invalid input provided", "Email must be a valid format"))
}

#[tauri::command]
fn test_database_error() -> Result<i64, AppError> {
    use crate::schema::users::dsl::*;
    use diesel::prelude::*;
    
    let mut conn = database::establish_connection()?;
    users.filter(id.eq(999999))
        .select((id, email))
        .first::<(i32, String)>(&mut conn)
        .map(|_| 0i64)
        .map_err(|e| e.into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize the database connection pool
    if let Err(e) = database::init_pool() {
        eprintln!("Failed to initialize database pool: {}", e);
        return;
    }
    
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_user_count, 
            add_test_user,
            test_error_not_found,
            test_error_with_details,
            test_database_error,
            commands::upload_video,
            commands::get_videos,
            commands::delete_video,
            commands::resolve_thumbnail_path,
            commands::get_thumbnail_data,
            commands::get_video_subtitles,
            commands::create_vocabulary,
            commands::get_vocabulary_by_video,
            commands::get_all_vocabulary,
            commands::update_vocabulary_review,
            commands::update_vocabulary_review_with_result,
            commands::delete_vocabulary,
            commands::get_vocabulary_due_for_review,
            commands::get_overdue_vocabulary,
            commands::transcribe_audio,
            commands::check_whisper_model,
            commands::download_whisper_model,
            commands::get_available_whisper_models,
            commands::save_video_progress,
            commands::get_video_progress,
            commands::delete_video_progress
        ])
        .register_uri_scheme_protocol("stream", |_app, request| {
            // Get the path from the URL
            let uri_path = request.uri().path();
            println!("Stream protocol received path: {}", uri_path);
            
            // Decode the URL-encoded path
            let decoded_path = percent_encoding::percent_decode_str(uri_path).decode_utf8_lossy();
            // Remove only the first slash if it exists (keeping absolute paths intact)
            let decoded_path = if decoded_path.starts_with("//") {
                &decoded_path[1..]
            } else {
                &decoded_path
            };
            println!("Decoded path: {}", decoded_path);
            
            // Create PathBuf from the decoded path
            let file_path = std::path::PathBuf::from(&*decoded_path);
            println!("Checking file path: {:?}", file_path);
            
            if !file_path.exists() {
                println!("File not found at path: {:?}", file_path);
                return tauri::http::Response::builder()
                    .status(404)
                    .header("Content-Type", "text/plain")
                    .body(format!("File not found: {:?}", file_path).as_bytes().to_vec())
                    .unwrap();
            }
            
            // Get file metadata
            let metadata = match std::fs::metadata(&file_path) {
                Ok(m) => m,
                Err(e) => {
                    println!("Failed to get file metadata: {}", e);
                    return tauri::http::Response::builder()
                        .status(500)
                        .header("Content-Type", "text/plain")
                        .body(format!("Failed to get file metadata: {}", e).as_bytes().to_vec())
                        .unwrap();
                }
            };
            
            let file_size = metadata.len();
            
            // Determine content type based on file extension
            let content_type = match file_path.extension().and_then(|s| s.to_str()) {
                Some("mp4") => "video/mp4",
                Some("webm") => "video/webm",
                Some("ogg") => "video/ogg",
                Some("mkv") => "video/x-matroska",
                _ => "application/octet-stream",
            };
            
            // Check for range header
            let range_header = request.headers().get("range")
                .and_then(|h| h.to_str().ok());
            
            if let Some(range) = range_header {
                println!("Range request: {}", range);
                
                // Parse range header (e.g., "bytes=0-1023")
                if let Some(range_spec) = range.strip_prefix("bytes=") {
                    let parts: Vec<&str> = range_spec.split('-').collect();
                    if parts.len() == 2 {
                        let start: u64 = parts[0].parse().unwrap_or(0);
                        let end: u64 = if parts[1].is_empty() {
                            file_size - 1
                        } else {
                            parts[1].parse().unwrap_or(file_size - 1).min(file_size - 1)
                        };
                        
                        let length = end - start + 1;
                        
                        // Read the requested range
                        use std::io::{Read, Seek, SeekFrom};
                        let mut file = match std::fs::File::open(&file_path) {
                            Ok(f) => f,
                            Err(e) => {
                                return tauri::http::Response::builder()
                                    .status(500)
                                    .body(format!("Failed to open file: {}", e).as_bytes().to_vec())
                                    .unwrap();
                            }
                        };
                        
                        if let Err(e) = file.seek(SeekFrom::Start(start)) {
                            return tauri::http::Response::builder()
                                .status(500)
                                .body(format!("Failed to seek: {}", e).as_bytes().to_vec())
                                .unwrap();
                        }
                        
                        let mut buffer = vec![0; length as usize];
                        if let Err(e) = file.read_exact(&mut buffer) {
                            return tauri::http::Response::builder()
                                .status(500)
                                .body(format!("Failed to read range: {}", e).as_bytes().to_vec())
                                .unwrap();
                        }
                        
                        println!("Serving range {}-{}/{}", start, end, file_size);
                        
                        return tauri::http::Response::builder()
                            .status(206) // Partial Content
                            .header("Content-Type", content_type)
                            .header("Accept-Ranges", "bytes")
                            .header("Content-Length", length.to_string())
                            .header("Content-Range", format!("bytes {}-{}/{}", start, end, file_size))
                            .body(buffer)
                            .unwrap();
                    }
                }
            }
            
            // No range request - serve entire file
            println!("Serving entire file with content type: {}", content_type);
            
            match std::fs::read(&file_path) {
                Ok(contents) => {
                    tauri::http::Response::builder()
                        .status(200)
                        .header("Content-Type", content_type)
                        .header("Accept-Ranges", "bytes")
                        .header("Content-Length", contents.len().to_string())
                        .body(contents)
                        .unwrap()
                }
                Err(e) => {
                    println!("Failed to read file: {}", e);
                    tauri::http::Response::builder()
                        .status(500)
                        .header("Content-Type", "text/plain")
                        .body(format!("Failed to read file: {}", e).as_bytes().to_vec())
                        .unwrap()
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
