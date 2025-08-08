use crate::error::AppError;
use crate::app_error;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use whisper_rs::{WhisperContext, WhisperContextParameters, FullParams, SamplingStrategy};
use hound;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: Option<String>,
}

/// Get the path to store Whisper models
fn get_model_path() -> Result<PathBuf, AppError> {
    let home_dir = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| app_error!("PATH_ERROR", "Failed to get home directory"))?;
    
    let app_dir = PathBuf::from(home_dir).join(".loud-mouth");
    let model_dir = app_dir.join("whisper-models");
    fs::create_dir_all(&model_dir)?;
    
    Ok(model_dir)
}

/// Check if a Whisper model is available
#[tauri::command]
pub async fn check_whisper_model(model_name: Option<String>) -> Result<bool, AppError> {
    let model = model_name.unwrap_or_else(|| "ggml-small.bin".to_string());
    let model_path = get_model_path()?.join(&model);
    
    Ok(model_path.exists() && model_path.is_file())
}

/// Download a Whisper model
#[tauri::command]
pub async fn download_whisper_model(
    model_name: Option<String>,
    window: tauri::Window,
) -> Result<(), AppError> {
    let model = model_name.unwrap_or_else(|| "ggml-small.bin".to_string());
    let model_path = get_model_path()?.join(&model);
    
    if model_path.exists() {
        return Ok(());
    }
    
    // Model URLs from Hugging Face
    let model_url = match model.as_str() {
        "ggml-tiny.bin" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin",
        "ggml-base.bin" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin",
        "ggml-small.bin" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
        "ggml-medium.bin" => "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin",
        _ => return Err(app_error!("MODEL_ERROR", "Unknown model name", model)),
    };
    
    // Emit download progress events
    window.emit("whisper-model-download-start", &model)
        .map_err(|e| app_error!("EVENT_ERROR", "Failed to emit event", e.to_string()))?;
    
    // Download the model file
    let response = reqwest::get(model_url).await
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
    
    // Save the model file
    fs::write(&model_path, &file_content)?;
    
    window.emit("whisper-model-download-complete", &model)
        .map_err(|e| app_error!("EVENT_ERROR", "Failed to emit complete event", e.to_string()))?;
    
    Ok(())
}

/// Convert audio data to format required by Whisper (16kHz mono f32)
fn convert_to_whisper_format(audio_data: &[u8]) -> Result<Vec<f32>, AppError> {
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
    
    // Convert i16 samples to f32 normalized to [-1, 1]
    let float_samples: Vec<f32> = resampled
        .iter()
        .map(|&s| s as f32 / 32768.0)
        .collect();
    
    Ok(float_samples)
}

/// Transcribe audio data using Whisper
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
    let model = model_name.unwrap_or_else(|| "ggml-small.bin".to_string());
    let model_path = get_model_path()?.join(&model);
    
    if !model_path.exists() {
        return Err(app_error!(
            "MODEL_NOT_FOUND",
            "Whisper model not found. Please download it first.",
            format!("Model '{}' is not available", model)
        ));
    }
    
    // Convert audio to Whisper format
    let audio_samples = convert_to_whisper_format(&audio_data)?;
    
    // Initialize Whisper context
    let ctx = WhisperContext::new_with_params(
        model_path.to_str().unwrap(),
        WhisperContextParameters::default()
    ).map_err(|e| app_error!("MODEL_LOAD_ERROR", "Failed to load Whisper model", e.to_string()))?;
    
    // Set up parameters for transcription
    let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    
    // Configure parameters for better accuracy
    params.set_n_threads(4);
    params.set_translate(false);
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    params.set_suppress_non_speech_tokens(true);
    
    // Create a state for transcription
    let mut state = ctx.create_state()
        .map_err(|e| app_error!("STATE_ERROR", "Failed to create whisper state", e.to_string()))?;
    
    // Run the transcription
    state.full(params, &audio_samples)
        .map_err(|e| app_error!("TRANSCRIPTION_ERROR", "Failed to transcribe audio", e.to_string()))?;
    
    // Get the transcribed text
    let num_segments = state.full_n_segments()
        .map_err(|_| app_error!("TRANSCRIPTION_ERROR", "Failed to get number of segments"))?;
    
    let mut text = String::new();
    for i in 0..num_segments {
        let segment = state.full_get_segment_text(i)
            .map_err(|_| app_error!("TRANSCRIPTION_ERROR", "Failed to get segment text"))?;
        text.push_str(&segment);
        text.push(' ');
    }
    
    // Trim and clean up the text
    let text = text.trim().to_string();
    
    Ok(TranscriptionResult {
        text,
        language: Some("en".to_string()),
    })
}

/// Get available Whisper models
#[tauri::command]
pub fn get_available_whisper_models() -> Vec<&'static str> {
    vec![
        "ggml-tiny.bin",    // 39 MB - Fastest, lower accuracy
        "ggml-base.bin",    // 74 MB - Good balance
        "ggml-small.bin",   // 244 MB - Best accuracy for most use cases (default)
        "ggml-medium.bin",  // 769 MB - Even better accuracy, slower
    ]
}