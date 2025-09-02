import { invoke } from "@tauri-apps/api/core";

export interface TranscriptionResult {
  text: string;
  language?: string;
}

export const speechApi = {
  /**
   * Check if a Whisper model is available
   */
  async checkWhisperModel(modelName?: string): Promise<boolean> {
    return await invoke<boolean>("check_whisper_model", { 
      modelName: modelName || "ggml-small.bin" 
    });
  },

  /**
   * Download a Whisper model
   */
  async downloadWhisperModel(modelName?: string): Promise<void> {
    return await invoke<void>("download_whisper_model", { 
      modelName: modelName || "ggml-small.bin" 
    });
  },

  /**
   * Get available Whisper models
   */
  async getAvailableWhisperModels(): Promise<string[]> {
    return await invoke<string[]>("get_available_whisper_models");
  },

  /**
   * Transcribe audio data using Whisper
   */
  async transcribeAudio(
    audioBase64: string,
    modelName?: string
  ): Promise<TranscriptionResult> {
    return await invoke<TranscriptionResult>("transcribe_audio", {
      audioBase64,
      modelName: modelName || "ggml-small.bin",
    });
  },
};

/**
 * Convert audio blob to base64 string
 */
export async function audioToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
      const base64 = base64String.split(",")[1];
      if (!base64) {
        reject(new Error('Failed to extract base64 data from blob'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Analyze audio to check if it contains actual speech
 */
export async function analyzeAudioLevel(audioBlob: Blob): Promise<{ hasAudio: boolean; avgLevel: number; maxLevel: number }> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get the audio data from the first channel
    const channelData = audioBuffer.getChannelData(0);
    
    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0;
    let max = 0;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.abs(channelData[i]);
      sum += sample * sample;
      if (sample > max) max = sample;
    }
    
    const rms = Math.sqrt(sum / channelData.length);
    const avgLevel = rms;
    const maxLevel = max;
    
    // Consider audio as having content if RMS > 0.001 (about -60 dB)
    // or if max level > 0.01 (about -40 dB)
    const hasAudio = avgLevel > 0.001 || maxLevel > 0.01;
    
    console.log('Audio analysis:', { hasAudio, avgLevel, maxLevel, duration: audioBuffer.duration });
    
    return { hasAudio, avgLevel, maxLevel };
  } catch (error) {
    console.error('Error analyzing audio:', error);
    // If we can't analyze, assume it has audio to avoid blocking
    return { hasAudio: true, avgLevel: 0, maxLevel: 0 };
  }
}

/**
 * Convert MediaRecorder webm audio to WAV format
 * This is necessary because Whisper requires WAV format
 */
export async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await webmBlob.arrayBuffer();
    
    let audioBuffer: AudioBuffer;
    try {
      // Try to decode the audio data
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    } catch (decodeError) {
      console.error("Failed to decode audio data:", decodeError);
      // If decoding fails, try creating a new blob with explicit type
      const newBlob = new Blob([arrayBuffer], { type: 'audio/webm' });
      const newArrayBuffer = await newBlob.arrayBuffer();
      try {
        audioBuffer = await audioContext.decodeAudioData(newArrayBuffer);
      } catch (secondError) {
        console.error("Second decode attempt failed:", secondError);
        throw new Error(`Audio decoding failed: ${secondError}`);
      }
    }
    
    // Convert to mono and resample to 16kHz
    const sampleRate = 16000;
    const numberOfChannels = 1;
    
    // Add 250ms of silence at the beginning to prevent word clipping
    const silenceDuration = 0.25; // 250ms
    const silenceSamples = Math.floor(silenceDuration * sampleRate);
    const totalLength = Math.floor(audioBuffer.duration * sampleRate) + silenceSamples;
    
    const offlineContext = new OfflineAudioContext(
      numberOfChannels,
      totalLength,
      sampleRate
    );
    
    // Create a buffer with silence at the beginning
    const silenceBuffer = offlineContext.createBuffer(
      numberOfChannels,
      silenceSamples,
      sampleRate
    );
    
    // Play silence first
    const silenceSource = offlineContext.createBufferSource();
    silenceSource.buffer = silenceBuffer;
    silenceSource.connect(offlineContext.destination);
    silenceSource.start(0);
    
    // Then play the actual audio after the silence
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(silenceDuration); // Start after silence duration
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert AudioBuffer to WAV
    const wavData = audioBufferToWav(renderedBuffer);
    return new Blob([wavData], { type: "audio/wav" });
  } catch (error) {
    console.error("Error in convertWebmToWav:", error);
    throw error;
  }
}

/**
 * Convert AudioBuffer to WAV format
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  // fmt sub-chunk
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // subchunk size
  setUint16(1); // PCM
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // byte rate
  setUint16(buffer.numberOfChannels * 2); // block align
  setUint16(16); // bits per sample

  // data sub-chunk
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4); // subchunk size

  // Get channel data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  // Interleave channels and convert to 16-bit PCM
  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(pos, int16, true);
      pos += 2;
    }
    offset++;
  }

  return arrayBuffer;
}

/**
 * Simple fallback method to create a basic WAV file
 * This creates a silent WAV file as a last resort fallback
 */
export function createSilentWav(durationSeconds: number = 1): Blob {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const fileSize = 44 + dataSize;
  
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);
  
  // WAV file header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, fileSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // audio format (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Fill with silence (zeros already in buffer)
  
  return new Blob([buffer], { type: 'audio/wav' });
}