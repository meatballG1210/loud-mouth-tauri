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