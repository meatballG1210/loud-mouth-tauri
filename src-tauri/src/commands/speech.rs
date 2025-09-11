use crate::error::AppError;
use crate::app_error;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use std::collections::HashMap;
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

/// Check if audio contains actual speech (not just silence)
fn check_audio_has_content(samples: &[f32]) -> bool {
    if samples.is_empty() {
        return false;
    }
    
    // Calculate RMS (Root Mean Square) to detect silence
    let sum: f32 = samples.iter().map(|&x| x * x).sum();
    let rms = (sum / samples.len() as f32).sqrt();
    
    // Also check max amplitude
    let max_amplitude = samples.iter().map(|&x| x.abs()).fold(0.0f32, f32::max);
    
    // Consider audio as having content if RMS > 0.001 or max > 0.01
    let has_content = rms > 0.001 || max_amplitude > 0.01;
    
    eprintln!("Audio analysis: RMS={:.6}, Max={:.6}, Has content={}", rms, max_amplitude, has_content);
    
    has_content
}

/// Check if text contains repetitive patterns
fn is_repetitive(text: &str) -> bool {
    let words: Vec<&str> = text.split_whitespace().collect();
    if words.len() < 4 {
        return false;
    }
    
    // Check for repeated words
    let mut word_counts = HashMap::new();
    for word in &words {
        let word_lower = word.to_lowercase();
        *word_counts.entry(word_lower).or_insert(0) += 1;
    }
    
    // If any word appears more than 40% of the time, it's repetitive
    for count in word_counts.values() {
        if *count as f32 / words.len() as f32 > 0.4 {
            return true;
        }
    }
    
    // Check for repeated bigrams (two-word patterns)
    if words.len() >= 4 {
        for i in 0..words.len().saturating_sub(3) {
            let bigram = format!("{} {}", words[i].to_lowercase(), words[i+1].to_lowercase());
            let next_bigram = format!("{} {}", words[i+2].to_lowercase(), words[i+3].to_lowercase());
            if bigram == next_bigram {
                return true;
            }
        }
    }
    
    false
}

/// Clean hallucinated endings from transcribed text
fn clean_hallucinated_endings(text: &str) -> String {
    let mut cleaned = text.to_string();
    
    // List of common hallucinated endings with their variations
    let hallucinated_endings = vec![
        // Most common Whisper hallucinations at the end
        vec!["thank you.", "thank you!", "thank you"],
        vec!["thanks.", "thanks!", "thanks"],
        vec!["you're welcome.", "you're welcome!", "you're welcome"],
        vec!["bye.", "bye!", "bye bye.", "bye bye!", "bye bye", "bye"],
        vec!["goodbye.", "goodbye!", "goodbye"],
        vec!["see you.", "see you!", "see you later.", "see you later!", "see you later"],
    ];
    
    // Check each group of variations
    for variations in &hallucinated_endings {
        for ending in variations {
            let text_lower = cleaned.to_lowercase();
            
            if text_lower.trim().ends_with(ending) {
                // Check if there's meaningful content before this ending
                if let Some(idx) = text_lower.rfind(ending) {
                    let before = &cleaned[..idx].trim();
                    
                    // Only remove if:
                    // 1. There's content before it
                    // 2. The content before forms a complete thought
                    // 3. The ending seems tacked on (e.g., after punctuation)
                    if !before.is_empty() && before.split_whitespace().count() >= 3 {
                        // Check if the sentence was already complete
                        if before.ends_with('.') || before.ends_with('!') || before.ends_with('?') {
                            // Remove the hallucinated ending
                            cleaned = before.to_string();
                            eprintln!("Removed likely hallucinated ending: '{}'", ending);
                            break;
                        }
                        // Also remove if it's a substantial sentence without the ending
                        else if before.split_whitespace().count() >= 5 {
                            // Add proper punctuation if needed
                            cleaned = if before.chars().last().map_or(false, |c| c.is_alphanumeric()) {
                                format!("{}.", before)
                            } else {
                                before.to_string()
                            };
                            eprintln!("Removed likely hallucinated ending: '{}'", ending);
                            break;
                        }
                    }
                }
            }
        }
    }
    
    cleaned
}

/// Calculate text entropy to detect gibberish or abnormal text
fn calculate_text_entropy(text: &str) -> f32 {
    if text.is_empty() {
        return 0.0;
    }
    
    let mut char_counts = HashMap::new();
    for ch in text.chars() {
        if ch.is_alphabetic() {  // Only count alphabetic characters
            *char_counts.entry(ch.to_lowercase().to_string()).or_insert(0) += 1;
        }
    }
    
    let total_chars = char_counts.values().sum::<i32>() as f32;
    if total_chars == 0.0 {
        return 0.0;
    }
    
    let mut entropy = 0.0;
    for count in char_counts.values() {
        let p = *count as f32 / total_chars;
        if p > 0.0 {
            entropy -= p * p.log2();
        }
    }
    
    entropy
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
    
    // Check if audio has actual content (not just silence)
    if !check_audio_has_content(&audio_samples) {
        return Err(app_error!(
            "SILENT_AUDIO",
            "Audio appears to be silent or too quiet",
            "Please speak louder and ensure your microphone is working"
        ));
    }
    
    // Initialize Whisper context
    let ctx = WhisperContext::new_with_params(
        model_path.to_str().unwrap(),
        WhisperContextParameters::default()
    ).map_err(|e| app_error!("MODEL_LOAD_ERROR", "Failed to load Whisper model", e.to_string()))?;
    
    // Set up parameters for transcription - use BeamSearch for better accuracy
    let mut params = FullParams::new(SamplingStrategy::BeamSearch { 
        beam_size: 5,
        patience: 1.0 
    });
    
    // Configure parameters for better accuracy and to avoid hallucinations
    params.set_n_threads(4);
    params.set_translate(false);
    params.set_language(Some("en"));
    params.set_print_special(false);
    params.set_print_progress(false);
    params.set_print_realtime(false);
    params.set_print_timestamps(false);
    params.set_suppress_blank(true);
    params.set_suppress_non_speech_tokens(true);
    params.set_no_context(true); // Don't use previous context which can cause repetition
    params.set_single_segment(false); // Allow multiple segments
    params.set_temperature(0.0); // Use deterministic decoding to reduce hallucinations
    
    // Additional parameters to reduce hallucinations
    params.set_entropy_thold(2.4); // Reject low-entropy (repetitive) segments
    params.set_logprob_thold(-1.0); // Reject low-probability tokens
    params.set_no_speech_thold(0.6); // Higher threshold for detecting non-speech
    params.set_initial_prompt(""); // No initial prompt to avoid bias
    
    // Create a state for transcription
    let mut state = ctx.create_state()
        .map_err(|e| app_error!("STATE_ERROR", "Failed to create whisper state", e.to_string()))?;
    
    // Run the transcription
    state.full(params, &audio_samples)
        .map_err(|e| app_error!("TRANSCRIPTION_ERROR", "Failed to transcribe audio", e.to_string()))?;
    
    // Get the transcribed text with segment-level validation
    let num_segments = state.full_n_segments()
        .map_err(|_| app_error!("TRANSCRIPTION_ERROR", "Failed to get number of segments"))?;
    
    let mut text = String::new();
    let mut valid_segments = 0;
    
    for i in 0..num_segments {
        let segment = state.full_get_segment_text(i)
            .map_err(|_| app_error!("TRANSCRIPTION_ERROR", "Failed to get segment text"))?;
        
        eprintln!("Segment {}: text='{}'", i, segment.trim());
        
        // Check for repetitive patterns within segment
        if is_repetitive(&segment) {
            eprintln!("  Skipping segment {} due to repetitive content", i);
            continue;
        }
        
        // Skip very short segments that might be artifacts
        let trimmed = segment.trim();
        if trimmed.len() < 3 || trimmed.split_whitespace().count() < 2 {
            eprintln!("  Skipping segment {} due to being too short", i);
            continue;
        }
        
        // Skip segments that are just punctuation or single repeated words
        if trimmed.chars().all(|c| !c.is_alphabetic()) {
            eprintln!("  Skipping segment {} - no alphabetic characters", i);
            continue;
        }
        
        text.push_str(&segment);
        text.push(' ');
        valid_segments += 1;
    }
    
    // Check if we got any valid segments
    if valid_segments == 0 {
        return Err(app_error!(
            "NO_VALID_SEGMENTS",
            "No valid speech segments detected",
            "Please speak more clearly and ensure your microphone is working properly"
        ));
    }
    
    // Trim and clean up the text
    let mut text = text.trim().to_string();
    
    // Clean potential hallucinated endings BEFORE other checks
    text = clean_hallucinated_endings(&text);
    eprintln!("Text after cleaning endings: '{}'", text);
    
    // Check if we have meaningful text after cleaning
    if text.is_empty() {
        return Err(app_error!(
            "EMPTY_TRANSCRIPTION",
            "No speech was transcribed",
            "No recognizable speech was detected. Please speak clearly into the microphone."
        ));
    }
    
    if text.len() < 5 || text.split_whitespace().count() < 2 {
        eprintln!("Text too short after cleaning: '{}'", text);
        return Err(app_error!(
            "INSUFFICIENT_SPEECH",
            "Transcription too short",
            "Please speak a complete sentence or phrase."
        ));
    }
    
    // Check for common Whisper hallucinations (simplified after cleaning)
    let text_lower = text.to_lowercase();
    
    // Exact match hallucinations (these are ALWAYS hallucinations when they appear alone)
    // Note: We've already cleaned ending "thank you" etc, so only check for full phrases
    let exact_hallucinations = vec![
        // Full video phrases that shouldn't appear in normal speech
        "thanks for watching", "thank you for watching", 
        "please subscribe", "like and subscribe",
        "don't forget to subscribe", "hit the bell", "hit that bell",
        "welcome back everybody", "hey guys", "what's up guys",
        "like comment and subscribe", "smash that like button",
        
        // Music/Audio artifacts
        "[music]", "[applause]", "[laughter]", "[inaudible]",
        "[silence]", "[background music]", "[noise]",
        "audio jungle", "audiojungle",
        
        // Pure repetitions (only when that's ALL the text)
        "you you you", "you you you you",
        "the the the", "the the the the",
        "and and and", "and and and and",
        
        // Punctuation only
        ".", "..", "...", "....",
    ];
    
    // Check if the entire transcription is just a known hallucination
    let is_exact_hallucination = exact_hallucinations.iter().any(|phrase| {
        text_lower.trim() == *phrase
    });
    
    // Check for purely repetitive text (all words are the same)
    let is_pure_repetition = {
        let words: Vec<&str> = text.split_whitespace().collect();
        if words.len() >= 3 {
            let first_word = words[0].to_lowercase();
            words.iter().all(|w| w.to_lowercase() == first_word)
        } else {
            false
        }
    };
    
    let is_hallucination = is_exact_hallucination || is_pure_repetition;
    
    if is_hallucination {
        eprintln!("Detected hallucination: '{}'", text);
        eprintln!("  Exact match: {}, Pure repetition: {}", 
                  is_exact_hallucination, is_pure_repetition);
        return Err(app_error!(
            "HALLUCINATION_DETECTED",
            "Speech recognition produced unreliable result",
            format!("Detected phrase '{}' which appears to be a hallucination. Please try again.", text)
        ));
    } else {
        eprintln!("Text passed hallucination check: '{}'", text);
    }
    
    // Check text entropy to detect gibberish or abnormal text
    let entropy = calculate_text_entropy(&text);
    eprintln!("Text entropy: {:.2}", entropy);
    
    // Only check entropy for longer text, and be more lenient
    // Normal English text has entropy around 3.0-4.5
    if text.len() > 30 && (entropy < 1.0 || entropy > 5.5) {
        eprintln!("Abnormal text entropy detected: {}", text);
        return Err(app_error!(
            "LOW_QUALITY_TRANSCRIPTION",
            "Transcription quality is too low",
            "Please try speaking more clearly with complete sentences"
        ));
    }
    
    // Calculate speech rate to detect anomalies
    let audio_duration = audio_samples.len() as f32 / 16000.0; // 16kHz sample rate
    let word_count = text.split_whitespace().count();
    let words_per_second = word_count as f32 / audio_duration;
    
    eprintln!("Speech rate: {:.2} words/second (duration: {:.2}s, words: {})", 
              words_per_second, audio_duration, word_count);
    
    // Normal speech is typically 2-3 words per second
    // Allow wider range for different speaking speeds but flag only extreme cases
    // Some people speak slowly (1 word/sec) or quickly (5 words/sec)
    if audio_duration > 2.0 && (words_per_second < 0.3 || words_per_second > 8.0) {
        eprintln!("Abnormal speech rate detected: {:.2} words/sec", words_per_second);
        return Err(app_error!(
            "ABNORMAL_SPEECH_RATE",
            "Detected abnormal speech rate",
            format!("Speech rate of {:.1} words/second seems unusual. Please speak at a normal pace.", words_per_second)
        ));
    }
    
    // Also check if the text is suspiciously repetitive using our helper function
    if is_repetitive(&text) {
        eprintln!("Detected repetitive text: {}", text);
        return Err(app_error!(
            "REPETITIVE_TEXT",
            "Speech recognition produced repetitive result",
            "The transcription appears to be repetitive. Please try again."
        ));
    }
    
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