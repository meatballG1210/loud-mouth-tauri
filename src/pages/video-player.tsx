import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Check,
} from "lucide-react";
import { useVideos } from "@/hooks/use-videos";
import { Video } from "@/types/video";
import { parseWebVTT } from "@/utils/subtitle-parser";
import ReactMarkdown from "react-markdown";
import { vocabularyApi } from "@/api/vocabulary";
import { videoProgressApi } from "@/api/video-progress";
import { VideoErrorBoundary, SubtitleErrorBoundary } from "@/components/video/video-error-boundary";
import { useAuth } from "@/components/SupabaseAuthProvider";

import { SubtitleLine } from "@/utils/subtitle-parser";

type SelectedWord = {
  text: string;      // cleaned word without punctuation
  index: number;     // position in the subtitle
  original: string;  // original word with punctuation
};

export default function VideoPlayer() {
  const [, params] = useRoute("/video/:videoId");
  const [, setLocation] = useLocation();
  const { videos, isLoading } = useVideos();
  const { user } = useAuth();
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [activeLanguage, setActiveLanguage] = useState<
    "english" | "chinese" | "off"
  >("english");
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [selectedWords, setSelectedWords] = useState<SelectedWord[]>([]);
  const [selectionTimer, setSelectionTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [showLookupPopup, setShowLookupPopup] = useState(false);
  const [lookupPosition, setLookupPosition] = useState({ x: 0, y: 0 });
  const [lookupData, setLookupData] = useState<any>(null);
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [, setVideoReady] = useState(false);
  const [englishSubtitles, setEnglishSubtitles] = useState<SubtitleLine[]>([]);
  const [chineseSubtitles, setChineseSubtitles] = useState<SubtitleLine[]>([]);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [lastSavedPosition, setLastSavedPosition] = useState(0);
  const progressSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (params?.videoId && !isLoading) {
      const video = videos.find((v) => v.id === params.videoId);
      if (!video) {
        // Redirect to error page if video not found after loading is complete
        setLocation("/error");
        return;
      }
      setCurrentVideo(video);
      console.log("Current video set:", video);
      console.log("Video subtitles object:", video.subtitles);
    }
  }, [params?.videoId, videos, isLoading, setLocation]);

  // Load subtitles when video changes
  useEffect(() => {
    if (!currentVideo) return;

    const loadSubtitles = async () => {
      console.log("Loading subtitles for video:", currentVideo);
      console.log("Subtitles available:", currentVideo.subtitles);
      setSubtitlesLoading(true);

      // Workaround: Try to load subtitles even if flags are false
      // This helps when subtitle extraction succeeded but flags weren't updated
      const tryLoadSubtitles = async (language: "english" | "chinese") => {
        try {
          const vtt = await invoke<string>("get_video_subtitles", {
            videoId: currentVideo.id,
            language: language,
          });
          return parseWebVTT(vtt, language);
        } catch (error) {
          console.log(`No ${language} subtitles found:`, error);
          return null;
        }
      };

      try {
        // Try to load both subtitle types regardless of flags
        const [englishSubs, chineseSubs] = await Promise.all([
          tryLoadSubtitles("english"),
          tryLoadSubtitles("chinese"),
        ]);

        if (englishSubs) {
          setEnglishSubtitles(englishSubs);
          console.log("Loaded English subtitles:", englishSubs.length, "lines");
        }

        if (chineseSubs) {
          setChineseSubtitles(chineseSubs);
          console.log("Loaded Chinese subtitles:", chineseSubs.length, "lines");
        }

        // Set default language based on what was actually loaded
        if (englishSubs && englishSubs.length > 0) {
          setActiveLanguage("english");
          console.log("Active lang: ", activeLanguage);
        } else if (chineseSubs && chineseSubs.length > 0) {
          setActiveLanguage("chinese");
          console.log("Active lang: ", activeLanguage);
        } else {
          setActiveLanguage("off");
          console.log("Active lang: ", activeLanguage);
        }
      } finally {
        setSubtitlesLoading(false);
      }
    };

    loadSubtitles();
  }, [currentVideo]);

  // Load saved progress when video changes
  useEffect(() => {
    if (!currentVideo) return;

    const loadProgress = async () => {
      try {
        const userId = 1; // TODO: Get from auth context
        const progress = await videoProgressApi.get(userId, currentVideo.id);
        
        if (progress && progress.position > 0 && videoRef.current) {
          // Wait for video to be ready before seeking
          const seekToPosition = () => {
            if (videoRef.current && videoRef.current.readyState >= 3) {
              videoRef.current.currentTime = progress.position;
              setCurrentTime(progress.position);
              setLastSavedPosition(progress.position);
              console.log(`Restored playback position to ${progress.position}s`);
            }
          };

          if (videoRef.current.readyState >= 3) {
            seekToPosition();
          } else {
            videoRef.current.addEventListener('loadeddata', seekToPosition, { once: true });
          }
        }
      } catch (error) {
        console.error("Failed to load video progress:", error);
      }
    };

    loadProgress();
  }, [currentVideo]);

  // Save progress periodically when playing
  useEffect(() => {
    if (!currentVideo || !isPlaying) {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
      return;
    }

    const saveProgress = async () => {
      if (!videoRef.current || Math.abs(currentTime - lastSavedPosition) < 1) {
        return; // Don't save if position hasn't changed significantly
      }

      try {
        const userId = 1; // TODO: Get from auth context
        await videoProgressApi.save({
          user_id: userId,
          video_id: currentVideo.id,
          position: Math.floor(currentTime),
          duration: Math.floor(duration),
        });
        setLastSavedPosition(currentTime);
        console.log(`Saved playback position: ${Math.floor(currentTime)}s`);
      } catch (error) {
        console.error("Failed to save video progress:", error);
      }
    };

    // Save immediately when starting to play
    saveProgress();

    // Then save every 5 seconds
    progressSaveIntervalRef.current = setInterval(saveProgress, 5000);

    return () => {
      if (progressSaveIntervalRef.current) {
        clearInterval(progressSaveIntervalRef.current);
        progressSaveIntervalRef.current = null;
      }
    };
  }, [currentVideo, isPlaying, currentTime, duration, lastSavedPosition]);

  // Save progress when component unmounts or video changes
  useEffect(() => {
    return () => {
      if (currentVideo && videoRef.current && currentTime > 0) {
        const userId = 1; // TODO: Get from auth context
        videoProgressApi.save({
          user_id: userId,
          video_id: currentVideo.id,
          position: Math.floor(currentTime),
          duration: Math.floor(duration),
        }).catch(console.error);
      }
    };
  }, [currentVideo, currentTime, duration]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isPlaying, playbackSpeed, volume, isMuted]);

  // Add keyboard event handler for spacebar and arrow keys
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if the target is an input element to avoid interference
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault(); // Prevent page scroll
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.max(0, videoRef.current.currentTime - 4);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          const newTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 4);
          videoRef.current.currentTime = newTime;
          setCurrentTime(newTime);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const cleanWordForSelection = (word: string): string => {
    // Step 1: Normalize quotes and apostrophes
    let cleaned = word
      .replace(/["""`]/g, '"')     // Normalize quotes
      .replace(/[''`]/g, "'");      // Normalize apostrophes
    
    // Step 2: Remove surrounding punctuation but keep internal apostrophes
    cleaned = cleaned
      .replace(/^[^\w]+/, '')       // Remove leading punctuation
      .replace(/[^\w']+$/, '');     // Remove trailing (keep apostrophes)
    
    // Step 3: Handle special cases
    if (cleaned.endsWith("'s") || cleaned.endsWith("'")) {
      // Keep possessives and contractions intact
      return cleaned;
    }
    
    return cleaned;
  };

  const getCurrentSubtitle = () => {
    if (activeLanguage === "off") return null;
    const subtitles =
      activeLanguage === "english" ? englishSubtitles : chineseSubtitles;
    console.log("Sssssss Subtitles:", subtitles);
    return subtitles.find(
      (sub) => currentTime >= sub.start && currentTime < sub.end,
    );
  };

  const fetchWordInfo = async (words: SelectedWord[]) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      console.error("OpenAI API key not configured");
      return null;
    }

    // Extract just the cleaned text for API, sorted by position
    const wordTexts = words
      .sort((a, b) => a.index - b.index)
      .map(w => w.text);
    const text = wordTexts.join(" ");
    const prompt = `Analyze "${text}" precisely:

**中文**: [直译]

${wordTexts.length > 1 ? `**解析**:
- 词组原型: [提取基础形式，如 "rip one's heart out"]
- 成分分析: [解释关键词含义和词性，如: rip (撕裂/动词), out (副词小品词/表示完全、彻底)]
- 使用场景: [具体使用情境，不要泛泛而谈]` : '**词性**: [词性] | **核心含义**: [最重要的1-2个意思]'}

**例句**  
> [含有该词的句子]  
> *[中文翻译]*

只提供有价值的信息，删除所有重复、冗余的描述。`;

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 200,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching word info:", error);
      return null;
    }
  };

  const handleWordClick = (word: string, index: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    // Clear existing timer
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }

    // Close popup if it's already open
    setShowLookupPopup(false);

    // Toggle word selection and calculate new word list
    const cleanWord = cleanWordForSelection(word);
    let newSelectedWords: SelectedWord[] = [];

    setSelectedWords((prev) => {
      const existingIndex = prev.findIndex(
        w => w.text === cleanWord && w.index === index
      );
      
      if (existingIndex >= 0) {
        // Remove this specific instance
        newSelectedWords = prev.filter((_, i) => i !== existingIndex);
      } else {
        // Add this specific instance
        newSelectedWords = [...prev, { text: cleanWord, index, original: word }];
      }
      return newSelectedWords;
    });

    // Set lookup position
    setLookupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    // Start 2-second timer
    const timer = setTimeout(async () => {
      setIsLoadingLookup(true);
      setShowLookupPopup(true);

      const wordInfo = await fetchWordInfo(newSelectedWords);
      if (wordInfo) {
        setLookupData(wordInfo);
      }
      setIsLoadingLookup(false);
    }, 2000);

    setSelectionTimer(timer);
  };

  const closeLookupPopup = () => {
    setShowLookupPopup(false);
    setSelectedWords([]);
    setLookupData(null);
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      setSelectionTimer(null);
    }
  };

  const handleAddVocabulary = async () => {
    if (!currentVideo || !lookupData || selectedWords.length === 0) return;

    try {
      // Get current subtitle context
      const currentSub = getCurrentSubtitle();
      if (!currentSub) {
        console.error("No current subtitle found");
        return;
      }

      // Find the subtitle index
      const subtitles =
        activeLanguage === "english" ? englishSubtitles : chineseSubtitles;
      const currentIndex = subtitles.findIndex(
        (sub) => sub.start === currentSub.start && sub.end === currentSub.end,
      );

      // Get context subtitles
      let before2En = "";
      let before2Zh = "";
      let before1En = "";
      let before1Zh = "";
      let targetEn = "";
      let targetZh = "";
      let before2Timestamp: number | undefined;

      // Get English context
      if (englishSubtitles.length > 0) {
        if (currentIndex >= 2) {
          before2En = englishSubtitles[currentIndex - 2]?.text || "";
          // Get the timestamp of the before_2 subtitle
          console.log("English Subtitles List: ", englishSubtitles);
          before2Timestamp = englishSubtitles[currentIndex - 2]?.start;
        }
        if (currentIndex >= 1) {
          before1En = englishSubtitles[currentIndex - 1]?.text || "";
        }
        targetEn = englishSubtitles[currentIndex]?.text || currentSub.text;
      }

      // Get Chinese context
      if (chineseSubtitles.length > 0) {
        // Find matching Chinese subtitle by timestamp
        const chineseIndex = chineseSubtitles.findIndex(
          (sub) => Math.abs(sub.start - currentSub.start) < 1,
        );

        if (chineseIndex >= 0) {
          if (chineseIndex >= 2) {
            before2Zh = chineseSubtitles[chineseIndex - 2]?.text || "";
            // If we haven't set before2Timestamp from English subtitles, use Chinese
            if (!before2Timestamp) {
              before2Timestamp = chineseSubtitles[chineseIndex - 2]?.start;
            }
          }
          if (chineseIndex >= 1) {
            before1Zh = chineseSubtitles[chineseIndex - 1]?.text || "";
          }
          targetZh = chineseSubtitles[chineseIndex]?.text || "";
        }
      }

      // Set initial review date to today (same day as creation)
      const today = new Date();
      const nextReviewAt = today.toISOString();
      console.log("VVVVVVVVVVideo current time: ", currentTime);

      // Create vocabulary item
      const wordPhrase = selectedWords
        .sort((a, b) => a.index - b.index)  // Keep word order
        .map(w => w.text)
        .join(" ");
      
      await vocabularyApi.create({
        user_id: user?.id || "", // Use authenticated user ID
        video_id: currentVideo.id,
        word: wordPhrase,
        timestamp: Math.floor(currentSub.start * 1000), // Convert subtitle start time to milliseconds
        before_2_en: before2En || undefined,
        before_2_zh: before2Zh || undefined,
        before_2_timestamp: before2Timestamp
          ? Math.floor(before2Timestamp * 1000)
          : undefined, // Convert to milliseconds
        before_1_en: before1En || undefined,
        before_1_zh: before1Zh || undefined,
        target_en: targetEn,
        target_zh: targetZh,
        dictionary_response: lookupData,
        next_review_at: nextReviewAt,
        is_phrase: selectedWords.length > 1,
      });

      console.log("Vocabulary saved successfully");
      closeLookupPopup();
    } catch (error) {
      console.error("Error saving vocabulary:", error);
      // TODO: Show error toast
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    
    // Save progress when pausing
    if (isPlaying && currentVideo && currentTime > 0) {
      const userId = 1; // TODO: Get from auth context
      videoProgressApi.save({
        user_id: userId,
        video_id: currentVideo.id,
        position: Math.floor(currentTime),
        duration: Math.floor(duration),
      }).then(() => {
        console.log(`Saved playback position on pause: ${Math.floor(currentTime)}s`);
      }).catch(console.error);
    }
  };

  const handleVolumeToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleSkipBackward = () => {
    if (videoRef.current) {
      const newTime = Math.max(0, videoRef.current.currentTime - 4);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSkipForward = () => {
    if (videoRef.current) {
      const newTime = Math.min(duration, videoRef.current.currentTime + 4);
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  if (!currentVideo || isLoading) {
    // Show loading state while videos are loading or video not found yet
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading video...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentSubtitle = getCurrentSubtitle();
  console.log("Current sub: ", currentSubtitle);

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Container */}
          <div
            className="flex-1 relative bg-gray-900"
            style={{ minHeight: "400px" }}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            <VideoErrorBoundary videoId={currentVideo.id} onRetry={() => window.location.reload()}>
              {currentVideo.path ? (
                <video
                  ref={videoRef}
                src={(() => {
                  // Try different approaches based on platform
                  const useStreamProtocol = true; // Toggle this to test different approaches

                  if (useStreamProtocol) {
                    // Use custom stream protocol for video playback
                    // Don't encode slashes - only encode other special characters
                    const encodedPath = currentVideo.path
                      .split("/")
                      .map((segment) => encodeURIComponent(segment))
                      .join("/");
                    const streamUrl = `stream://localhost/${encodedPath}`;
                    console.log("Using stream protocol");
                    console.log("Original path:", currentVideo.path);
                    console.log("Stream URL:", streamUrl);
                    return streamUrl;
                  } else {
                    // Use convertFileSrc
                    const assetUrl = convertFileSrc(currentVideo.path);
                    console.log("Using convertFileSrc");
                    console.log("Original path:", currentVideo.path);
                    console.log("Asset URL:", assetUrl);
                    return assetUrl;
                  }
                })()}
                className="absolute inset-0 w-full h-full"
                style={{
                  backgroundColor: "transparent",
                  objectFit: "contain",
                  zIndex: 10,
                }}
                controls={false}
                autoPlay={false}
                playsInline
                onLoadStart={() => {
                  console.log("Video load started");
                }}
                onLoadedData={() => {
                  console.log("Video data loaded");
                }}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  setDuration(video.duration);
                  console.log(
                    "Video metadata loaded - dimensions:",
                    video.videoWidth,
                    "x",
                    video.videoHeight,
                  );
                  console.log("Video duration:", video.duration);
                  console.log("Video ready state:", video.readyState);
                }}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  setCurrentTime(video.currentTime);
                }}
                onError={(e) => {
                  const video = e.currentTarget as HTMLVideoElement;
                  console.error("Video playback error:", e);
                  console.error("Video element src:", video.src);
                  console.error("Video network state:", video.networkState);
                  console.error("Video error:", video.error);
                }}
                onCanPlay={() => {
                  console.log("Video can play");
                  setVideoReady(true);
                }}
                onCanPlayThrough={() => {
                  console.log("Video can play through");
                }}
                onStalled={() => {
                  console.log("Video stalled");
                }}
                onWaiting={() => {
                  console.log("Video waiting");
                }}
                onEmptied={() => {
                  console.log("Video emptied");
                }}
                />
              ) : (
                <img
                  src={currentVideo.thumbnail}
                  alt={currentVideo.title}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </VideoErrorBoundary>

            {/* Video Overlay Controls */}
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 group">
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handlePlayPause}
                  className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center backdrop-blur-sm hover:bg-opacity-30 transition-all"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6 text-white" />
                  ) : (
                    <Play className="w-6 h-6 text-white ml-1" />
                  )}
                </button>
              </div>

              {/* Top Controls */}
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation("/");
                  }}
                  className="flex items-center space-x-2 p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to Library</span>
                </button>
              </div>
            </div>

            {/* Current Subtitle Overlay */}
            <SubtitleErrorBoundary>
              {currentSubtitle && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-3xl px-6 z-20" onClick={(e) => e.stopPropagation()}>
                  <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-center relative">
                    <div className="text-white text-lg leading-relaxed">
                      {currentSubtitle.text.split(" ").map((word, index) => {
                        const cleanWord = cleanWordForSelection(word);
                        const isSelected = selectedWords.some(
                          w => w.text === cleanWord && w.index === index
                        );
                        
                        return (
                          <span
                            key={`${index}-${word}`}
                            className={`hover:bg-yellow-400 hover:text-black px-1 rounded cursor-pointer transition-colors ${
                              isSelected ? "bg-yellow-400 text-black" : ""
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWordClick(word, index, e);
                            }}
                          >
                            {word}{" "}
                          </span>
                        );
                      })}
                    </div>
                    {/* Subtle checkmark button for confirming selection */}
                    {selectedWords.length > 0 && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (selectionTimer) {
                            clearTimeout(selectionTimer);
                          }
                          
                          // Set lookup position based on subtitle container
                          const subtitleContainer = e.currentTarget.parentElement;
                          if (subtitleContainer) {
                            const rect = subtitleContainer.getBoundingClientRect();
                            setLookupPosition({
                              x: rect.left + rect.width / 2,
                              y: rect.top - 10,
                            });
                          }
                          
                          setIsLoadingLookup(true);
                          setShowLookupPopup(true);
                          const wordInfo = await fetchWordInfo(selectedWords);
                          if (wordInfo) {
                            setLookupData(wordInfo);
                          }
                          setIsLoadingLookup(false);
                        }}
                        className="absolute -right-12 top-1/2 transform -translate-y-1/2 p-2 bg-transparent hover:bg-white hover:bg-opacity-10 rounded-full transition-all duration-200"
                        title="Confirm selection"
                      >
                        <Check className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </SubtitleErrorBoundary>
          </div>

          {/* Video Controls Bar */}
          <div className="bg-white border-t border-gray-200 px-6 py-4">
            {/* Progress Bar */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, var(--blue-500) 0%, var(--blue-500) ${(currentTime / duration) * 100}%, #e5e7eb ${(currentTime / duration) * 100}%, #e5e7eb 100%)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-2 font-medium">
                <span>{formatTime(currentTime)}</span>
                <span className="text-gray-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleSkipBackward}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Skip back 4s"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <button
                  onClick={handleSkipForward}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Skip forward 4s"
                >
                  <RotateCw className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={handleVolumeToggle}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div className="relative w-20">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(isMuted ? 0 : volume) * 100}%, #e5e7eb ${(isMuted ? 0 : volume) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8 font-medium">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Playback Speed Controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Speed:</span>
                  <select
                    value={playbackSpeed}
                    onChange={(e) =>
                      setPlaybackSpeed(parseFloat(e.target.value))
                    }
                    className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    style={{
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: "right 0.25rem center",
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "1.2em 1.2em",
                      paddingRight: "1.75rem",
                    }}
                  >
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2.0}>2.0x</option>
                  </select>
                </div>

                {/* Subtitle Controls */}
                {(englishSubtitles.length > 0 ||
                  chineseSubtitles.length > 0) && (
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveLanguage("off")}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                        activeLanguage === "off"
                          ? "bg-white shadow-sm text-blue-600 font-semibold"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      OFF
                    </button>
                    {englishSubtitles.length > 0 && (
                      <button
                        onClick={() => setActiveLanguage("english")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          activeLanguage === "english"
                            ? "bg-white shadow-sm text-blue-600 font-semibold"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        disabled={subtitlesLoading}
                      >
                        EN
                      </button>
                    )}
                    {chineseSubtitles.length > 0 && (
                      <button
                        onClick={() => setActiveLanguage("chinese")}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          activeLanguage === "chinese"
                            ? "bg-white shadow-sm text-blue-600 font-semibold"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                        disabled={subtitlesLoading}
                      >
                        中文
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Word Lookup Popup */}
      {showLookupPopup && selectedWords.length > 0 && (
        <div
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 max-w-md select-text"
          style={{
            left: `${lookupPosition.x}px`,
            top: `${lookupPosition.y}px`,
            transform: "translate(-50%, -100%)",
            maxHeight: "400px",
            overflowY: "auto",
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-gray-900">
              {selectedWords
                .sort((a, b) => a.index - b.index)
                .map(w => w.text)
                .join(" ")}
            </h3>
            <button
              onClick={closeLookupPopup}
              className="text-gray-400 hover:text-gray-600 ml-2 text-2xl"
            >
              ×
            </button>
          </div>

          {isLoadingLookup ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : lookupData ? (
            <div className="prose prose-sm max-w-none select-text">
              <ReactMarkdown>{lookupData}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic py-4">
              Unable to fetch word information. Please check your OpenAI API
              key.
            </div>
          )}

          <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={closeLookupPopup}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            <button
              onClick={handleAddVocabulary}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isLoadingLookup || !lookupData}
            >
              Add to Vocabulary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
