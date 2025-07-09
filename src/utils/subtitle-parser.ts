export interface SubtitleLine {
  id: string;
  start: number;
  end: number;
  text: string;
  language: "english" | "chinese";
}

/**
 * Parse WebVTT format subtitle content into SubtitleLine array
 * @param vttContent - Raw WebVTT content string
 * @param language - Language of the subtitles
 * @returns Array of parsed subtitle lines
 */
export function parseWebVTT(vttContent: string, language: "english" | "chinese"): SubtitleLine[] {
  const lines = vttContent.split('\n');
  const subtitles: SubtitleLine[] = [];
  let currentCue: Partial<SubtitleLine> = {};
  let cueId = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip WEBVTT header and empty lines
    if (line === 'WEBVTT' || line === '' || line.startsWith('NOTE')) {
      continue;
    }
    
    // Check if this is a timestamp line
    if (line.includes('-->')) {
      const [startTime, endTime] = line.split('-->').map(t => t.trim());
      
      currentCue = {
        id: String(cueId++),
        start: parseVTTTime(startTime),
        end: parseVTTTime(endTime),
        language,
        text: ''
      };
    } else if (currentCue.start !== undefined) {
      // This is subtitle text
      if (currentCue.text) {
        currentCue.text += ' ' + line;
      } else {
        currentCue.text = line;
      }
      
      // Check if next line is empty or a new cue
      if (i + 1 >= lines.length || lines[i + 1].trim() === '' || lines[i + 1].includes('-->')) {
        if (currentCue.text) {
          subtitles.push({
            id: currentCue.id!,
            start: currentCue.start!,
            end: currentCue.end!,
            text: currentCue.text.trim(),
            language: currentCue.language!
          });
        }
        currentCue = {};
      }
    }
  }
  
  return subtitles;
}

/**
 * Parse VTT timestamp to seconds
 * Format: HH:MM:SS.mmm or MM:SS.mmm
 */
function parseVTTTime(timeString: string): number {
  const parts = timeString.split(':');
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  
  if (parts.length === 3) {
    // HH:MM:SS.mmm
    hours = parseInt(parts[0], 10);
    minutes = parseInt(parts[1], 10);
    seconds = parseFloat(parts[2]);
  } else if (parts.length === 2) {
    // MM:SS.mmm
    minutes = parseInt(parts[0], 10);
    seconds = parseFloat(parts[1]);
  } else {
    // Just seconds
    seconds = parseFloat(parts[0]);
  }
  
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to VTT timestamp
 * @param seconds - Time in seconds
 * @returns Formatted timestamp string
 */
export function formatVTTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
}