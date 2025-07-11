use crate::error::AppError;
use crate::app_error;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use vosk::{Model, Recognizer};
use hound;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: Option<String>,
}

/// Get the path to store Vosk models
fn get_model_path() -> Result<PathBuf, AppError> {
    // In Tauri v2, we use the home directory or a temporary directory
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| app_error!("PATH_ERROR", "Failed to get home directory"))?;
    
    let app_dir = PathBuf::from(home_dir).join(".loud-mouth");
    let model_dir = app_dir.join("models");
    fs::create_dir_all(&model_dir)?;
    
    Ok(model_dir)
}

/// Check if a Vosk model is available
#[tauri::command]
pub async fn check_whisper_model(model_name: Option<String>) -> Result<bool, AppError> {
    let model = model_name.unwrap_or_else(|| "vosk-model-en-us-0.22-lgraph".to_string());
    let model_path = get_model_path()?.join(&model);
    
    Ok(model_path.exists() && model_path.is_dir())
}

/// Download a Vosk model
#[tauri::command]
pub async fn download_whisper_model(
    model_name: Option<String>,
    window: tauri::Window,
) -> Result<(), AppError> {
    let model = model_name.unwrap_or_else(|| "vosk-model-en-us-0.22-lgraph".to_string());
    let model_path = get_model_path()?.join(&model);
    
    if model_path.exists() {
        return Ok(());
    }
    
    // Model URLs from the official Vosk models page
    let model_url = format!(
        "https://alphacephei.com/vosk/models/{}.zip",
        model
    );
    
    // Emit download progress events
    window.emit("whisper-model-download-start", &model)
        .map_err(|e| app_error!("EVENT_ERROR", "Failed to emit event", e.to_string()))?;
    
    // Download the model file
    let response = reqwest::get(&model_url).await
        .map_err(|e| app_error!("DOWNLOAD_ERROR", "Failed to download model", e.to_string()))?;
    let total_size = response.content_length().unwrap_or(0);
    
    let mut downloaded = 0;
    let mut stream = response.bytes_stream();
    let mut file_content = Vec::new();
    
    use futures_util::StreamExt;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk
            .map_err(|e| app_error!("DOWNLOAD_ERROR", "Failed to download chunk", e.to_string()))?;
        file_content.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;
        
        // Emit progress
        let progress = if total_size > 0 {
            (downloaded as f64 / total_size as f64) * 100.0
        } else {
            0.0
        };
        
        window.emit("whisper-model-download-progress", progress)
            .map_err(|e| app_error!("EVENT_ERROR", "Failed to emit progress", e.to_string()))?;
    }
    
    // Extract the zip file
    let temp_zip = model_path.with_extension("zip");
    fs::write(&temp_zip, &file_content)?;
    
    // Extract zip
    let file = fs::File::open(&temp_zip)?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| app_error!("ZIP_ERROR", "Failed to open zip archive", e.to_string()))?;
    
    // Extract to parent directory
    let extract_path = model_path.parent().unwrap();
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| app_error!("ZIP_ERROR", "Failed to read zip entry", e.to_string()))?;
        let outpath = match file.enclosed_name() {
            Some(path) => extract_path.join(path),
            None => continue,
        };
        
        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath)?;
        } else {
            if let Some(p) = outpath.parent() {
                if !p.exists() {
                    fs::create_dir_all(&p)?;
                }
            }
            let mut outfile = fs::File::create(&outpath)?;
            std::io::copy(&mut file, &mut outfile)?;
        }
    }
    
    // Remove temporary zip file
    fs::remove_file(&temp_zip)?;
    
    window.emit("whisper-model-download-complete", &model)
        .map_err(|e| app_error!("EVENT_ERROR", "Failed to emit complete event", e.to_string()))?;
    
    Ok(())
}

/// Preprocess audio samples to improve recognition accuracy
fn preprocess_audio(samples: &mut Vec<i16>) -> Result<(), AppError> {
    // 1. Normalize audio levels to prevent clipping and improve consistency
    let max_amplitude = samples.iter().map(|&s| s.abs()).max().unwrap_or(1) as f32;
    if max_amplitude > 0.0 {
        // Scale to 95% of maximum to leave headroom
        let scale_factor = 32767.0 / max_amplitude * 0.95;
        for sample in samples.iter_mut() {
            *sample = (*sample as f32 * scale_factor) as i16;
        }
    }
    
    // 2. Apply high-pass filter to remove low-frequency noise (cutoff ~100Hz at 16kHz)
    let alpha = 0.98f32;
    let mut prev_sample = 0i16;
    let mut prev_filtered = 0f32;
    
    for sample in samples.iter_mut() {
        let filtered = alpha * (prev_filtered + (*sample - prev_sample) as f32);
        prev_sample = *sample;
        prev_filtered = filtered;
        *sample = filtered.clamp(-32768.0, 32767.0) as i16;
    }
    
    Ok(())
}

/// Convert audio data to format required by Vosk (16kHz mono)
fn convert_to_vosk_format(audio_data: &[u8]) -> Result<Vec<i16>, AppError> {
    let cursor = std::io::Cursor::new(audio_data);
    let reader = hound::WavReader::new(cursor)
        .map_err(|e| app_error!("AUDIO_ERROR", "Failed to read WAV data", e.to_string()))?;
    
    let spec = reader.spec();
    let samples: Vec<i16> = reader
        .into_samples::<i16>()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| app_error!("AUDIO_ERROR", "Failed to read audio samples", e.to_string()))?;
    
    // Convert to mono if stereo
    let mono_samples: Vec<i16> = if spec.channels == 2 {
        samples
            .chunks(2)
            .map(|chunk| ((chunk[0] as i32 + chunk[1] as i32) / 2) as i16)
            .collect()
    } else {
        samples
    };
    
    // Resample to 16kHz if necessary
    let resampled: Vec<i16> = if spec.sample_rate != 16000 {
        // Simple linear interpolation resampling
        let ratio = 16000.0 / spec.sample_rate as f32;
        let new_len = (mono_samples.len() as f32 * ratio) as usize;
        let mut resampled = Vec::with_capacity(new_len);
        
        for i in 0..new_len {
            let src_idx = i as f32 / ratio;
            let idx = src_idx as usize;
            let frac = src_idx - idx as f32;
            
            if idx + 1 < mono_samples.len() {
                let val = mono_samples[idx] as f32 * (1.0 - frac) + mono_samples[idx + 1] as f32 * frac;
                resampled.push(val as i16);
            } else if idx < mono_samples.len() {
                resampled.push(mono_samples[idx]);
            }
        }
        
        resampled
    } else {
        mono_samples
    };
    
    Ok(resampled)
}

/// Transcribe audio data using Vosk
#[tauri::command]
pub async fn transcribe_audio(
    audio_base64: String,
    model_name: Option<String>,
) -> Result<TranscriptionResult, AppError> {
    // Decode base64 audio data
    let audio_data = general_purpose::STANDARD
        .decode(&audio_base64)
        .map_err(|e| app_error!("DECODE_ERROR", "Failed to decode audio data", e.to_string()))?;
    
    // Get model path
    let model = model_name.unwrap_or_else(|| "vosk-model-en-us-0.22-lgraph".to_string());
    let model_path = get_model_path()?.join(&model);
    
    if !model_path.exists() {
        return Err(app_error!(
            "MODEL_NOT_FOUND",
            "Vosk model not found. Please download it first.",
            format!("Model '{}' is not available", model)
        ));
    }
    
    // Convert audio to Vosk format
    let mut audio_samples = convert_to_vosk_format(&audio_data)?;
    
    // Preprocess audio for better recognition
    preprocess_audio(&mut audio_samples)?;
    
    // Initialize Vosk model and recognizer
    let model = Model::new(model_path.to_str().unwrap())
        .ok_or_else(|| app_error!("MODEL_LOAD_ERROR", "Failed to load Vosk model"))?;
    
    let mut recognizer = Recognizer::new(&model, 16000.0)
        .ok_or_else(|| app_error!("RECOGNIZER_ERROR", "Failed to create recognizer"))?;
    
    // Enable word-level timing and partial results for better accuracy
    recognizer.set_words(true);
    recognizer.set_partial_words(true);
    
    // Process audio in chunks
    let chunk_size = 8000; // 0.5 seconds of audio at 16kHz
    for chunk in audio_samples.chunks(chunk_size) {
        let _ = recognizer.accept_waveform(chunk);
    }
    
    // Get the final result
    let result = recognizer.final_result();
    
    // Get the text from the result
    let text = result.single().map(|r| r.text).unwrap_or_default().to_string();
    
    Ok(TranscriptionResult {
        text,
        language: Some("en".to_string()),
    })
}

/// Get available Vosk models
#[tauri::command]
pub fn get_available_whisper_models() -> Vec<&'static str> {
    vec![
        "vosk-model-en-us-0.22-lgraph",    // 128 MB - Better accuracy (default)
        "vosk-model-small-en-us-0.15",     // 40 MB - Basic accuracy, fast
        "vosk-model-en-us-0.22",           // 1.8 GB - Best accuracy
        "vosk-model-small-en-gb-0.15",     // 41 MB - British English
    ]
}