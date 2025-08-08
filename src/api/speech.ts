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
      // Remove the data:audio/webm;base64, prefix
      const base64 = base64String.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert MediaRecorder webm audio to WAV format
 * This is necessary because Whisper requires WAV format
 */
export async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  const audioContext = new AudioContext();
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Convert to mono and resample to 16kHz
  const sampleRate = 16000;
  const numberOfChannels = 1;
  const length = Math.floor(audioBuffer.duration * sampleRate);
  
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    length,
    sampleRate
  );
  
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start();
  
  const renderedBuffer = await offlineContext.startRendering();
  
  // Convert AudioBuffer to WAV
  const wavData = audioBufferToWav(renderedBuffer);
  return new Blob([wavData], { type: "audio/wav" });
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