use std::path::{Path, PathBuf};
use std::process::Command;
use crate::error::{AppError, Result};
use tokio::fs;

pub async fn generate_thumbnail(
    video_path: &str,
    output_dir: &str,
    video_id: &str,
) -> Result<String> {
    // Create thumbnails directory if it doesn't exist
    let thumbnails_dir = Path::new(output_dir).join("thumbnails");
    if !thumbnails_dir.exists() {
        fs::create_dir_all(&thumbnails_dir).await
            .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to create thumbnails directory")
                .with_details(e.to_string()))?;
    }

    // Generate thumbnail filename
    let thumbnail_filename = format!("{}.jpg", video_id);
    let thumbnail_path = thumbnails_dir.join(&thumbnail_filename);

    // Check if FFmpeg is available
    let ffmpeg_check = Command::new("ffmpeg")
        .arg("-version")
        .output();

    match ffmpeg_check {
        Ok(output) if output.status.success() => {
            // Use FFmpeg to generate thumbnail
            generate_thumbnail_with_ffmpeg(video_path, &thumbnail_path).await?;
        }
        _ => {
            // FFmpeg not available, create a placeholder thumbnail
            generate_placeholder_thumbnail(&thumbnail_path).await?;
        }
    }

    // Convert to absolute path
    let absolute_path = std::fs::canonicalize(&thumbnail_path)
        .map_err(|e| AppError::new("FILESYSTEM_ERROR", "Failed to resolve thumbnail path")
            .with_details(e.to_string()))?;
    
    Ok(absolute_path.to_string_lossy().to_string())
}

pub async fn extract_video_duration(video_path: &str) -> Result<Option<i32>> {
    // Check if FFprobe is available
    let ffprobe_check = Command::new("ffprobe")
        .arg("-version")
        .output();

    match ffprobe_check {
        Ok(output) if output.status.success() => {
            // Use FFprobe to extract duration
            extract_duration_with_ffprobe(video_path).await
        }
        _ => {
            // FFprobe not available, try FFmpeg
            let ffmpeg_check = Command::new("ffmpeg")
                .arg("-version")
                .output();

            match ffmpeg_check {
                Ok(output) if output.status.success() => {
                    extract_duration_with_ffmpeg(video_path).await
                }
                _ => {
                    // Neither available, return None
                    Ok(None)
                }
            }
        }
    }
}

async fn extract_duration_with_ffprobe(video_path: &str) -> Result<Option<i32>> {
    let output = Command::new("ffprobe")
        .arg("-v")
        .arg("quiet")
        .arg("-print_format")
        .arg("json")
        .arg("-show_format")
        .arg(video_path)
        .output()
        .map_err(|e| AppError::new("FFPROBE_ERROR", "Failed to execute FFprobe command")
            .with_details(e.to_string()))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::new("FFPROBE_ERROR", "FFprobe failed to extract duration")
            .with_details(error_msg.to_string()));
    }

    let output_str = String::from_utf8_lossy(&output.stdout);
    
    // Parse JSON output
    match serde_json::from_str::<serde_json::Value>(&output_str) {
        Ok(json) => {
            if let Some(format) = json.get("format") {
                if let Some(duration_str) = format.get("duration").and_then(|d| d.as_str()) {
                    if let Ok(duration_f64) = duration_str.parse::<f64>() {
                        return Ok(Some(duration_f64.round() as i32));
                    }
                }
            }
            Ok(None)
        }
        Err(_) => Ok(None)
    }
}

async fn extract_duration_with_ffmpeg(video_path: &str) -> Result<Option<i32>> {
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .arg("-f")
        .arg("null")
        .arg("-")
        .output()
        .map_err(|e| AppError::new("FFMPEG_ERROR", "Failed to execute FFmpeg command")
            .with_details(e.to_string()))?;

    // FFmpeg outputs info to stderr even on success
    let stderr_output = String::from_utf8_lossy(&output.stderr);
    
    // Look for duration in the output (format: "Duration: HH:MM:SS.ss")
    for line in stderr_output.lines() {
        if let Some(duration_start) = line.find("Duration: ") {
            if let Some(duration_end) = line[duration_start..].find(',') {
                let duration_str = &line[duration_start + 10..duration_start + duration_end];
                if let Ok(duration_seconds) = parse_duration_string(duration_str) {
                    return Ok(Some(duration_seconds));
                }
            }
        }
    }
    
    Ok(None)
}

fn parse_duration_string(duration_str: &str) -> Result<i32> {
    // Parse format: "HH:MM:SS.ss"
    let parts: Vec<&str> = duration_str.split(':').collect();
    if parts.len() != 3 {
        return Err(AppError::new("PARSE_ERROR", "Invalid duration format"));
    }

    let hours: f64 = parts[0].parse()
        .map_err(|_| AppError::new("PARSE_ERROR", "Invalid hours in duration"))?;
    let minutes: f64 = parts[1].parse()
        .map_err(|_| AppError::new("PARSE_ERROR", "Invalid minutes in duration"))?;
    let seconds: f64 = parts[2].parse()
        .map_err(|_| AppError::new("PARSE_ERROR", "Invalid seconds in duration"))?;

    let total_seconds = (hours * 3600.0) + (minutes * 60.0) + seconds;
    Ok(total_seconds.round() as i32)
}

async fn generate_thumbnail_with_ffmpeg(
    video_path: &str,
    thumbnail_path: &Path,
) -> Result<()> {
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .arg("-ss")
        .arg("00:00:15.000") // Extract frame at 15 seconds
        .arg("-vframes")
        .arg("1")
        .arg("-y") // Overwrite output file
        .arg(&thumbnail_path)
        .output()
        .map_err(|e| AppError::new("FFMPEG_ERROR", "Failed to execute FFmpeg command")
            .with_details(e.to_string()))?;

    if !output.status.success() {
        let error_msg = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::new("FFMPEG_ERROR", "FFmpeg failed to generate thumbnail")
            .with_details(error_msg.to_string()));
    }

    Ok(())
}

async fn generate_placeholder_thumbnail(thumbnail_path: &Path) -> Result<()> {
    use image::{ImageBuffer, Rgb, RgbImage};

    // Create a simple placeholder image (200x150 pixels)
    let width = 200;
    let height = 150;
    let mut img: RgbImage = ImageBuffer::new(width, height);

    // Fill with gray background
    for pixel in img.pixels_mut() {
        *pixel = Rgb([128, 128, 128]);
    }

    // Add some simple text pattern (basic grid lines)
    for y in (0..height).step_by(30) {
        for x in 0..width {
            if let Some(pixel) = img.get_pixel_mut_checked(x, y) {
                *pixel = Rgb([100, 100, 100]);
            }
        }
    }

    for x in (0..width).step_by(40) {
        for y in 0..height {
            if let Some(pixel) = img.get_pixel_mut_checked(x, y) {
                *pixel = Rgb([100, 100, 100]);
            }
        }
    }

    // Save the placeholder image
    img.save(thumbnail_path)
        .map_err(|e| AppError::new("IMAGE_ERROR", "Failed to save placeholder thumbnail")
            .with_details(e.to_string()))?;

    Ok(())
}

pub fn get_thumbnail_directory() -> PathBuf {
    // Get the current working directory and create a thumbnails subdirectory
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("thumbnails")
}