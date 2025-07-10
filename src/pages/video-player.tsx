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
} from "lucide-react";
import { useVideos } from "@/hooks/use-videos";
import { Video } from "@/types/video";
import { parseWebVTT } from "@/utils/subtitle-parser";
import ReactMarkdown from "react-markdown";
import { vocabularyApi } from "@/api/vocabulary";

import { SubtitleLine } from "@/utils/subtitle-parser";

export default function VideoPlayer() {
  const [, params] = useRoute("/video/:videoId");
  const [, setLocation] = useLocation();
  const { videos, isLoading } = useVideos();
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
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const fetchWordInfo = async (words: string[]) => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      console.error("OpenAI API key not configured");
      return null;
    }

    const text = words.join(" ");
    const prompt = `Please act as a professional English teacher and explain "${text}", follow this structured format exactly:

**Chinese Translation**

Provide the most natural and context-appropriate Chinese translation that accurately conveys the original meaning.

**Usage Explanation**

Please write in Chinese.
Explain fixed expressions, sentence patterns, or phrase usage (e.g., "have sb do sth", "quite the…").

If the phrase is slang or idiomatic, also include:
- Explain its literal meaning and how it evolved into its figurative meaning
- Describe the origin or metaphor (e.g., from sports, war, pop culture, historical references, etc.)
- If relevant, add its timeline or usage trend (e.g., 1990s school slang, AAVE, etc.)

**Example Sentence**

Write a natural and authentic English sentence using the phrase, followed by a fluent and accurate Chinese translation.`;

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
            temperature: 0.7,
            max_tokens: 500,
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

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    // Clear existing timer
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }

    // Close popup if it's already open
    setShowLookupPopup(false);

    // Toggle word selection and calculate new word list
    const cleanWord = word.replace(/[.,!?;:]$/, ""); // Remove punctuation
    let newSelectedWords: string[] = [];

    setSelectedWords((prev) => {
      const isSelected = prev.includes(cleanWord);
      if (isSelected) {
        newSelectedWords = prev.filter((w) => w !== cleanWord);
      } else {
        newSelectedWords = [...prev, cleanWord];
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
      const subtitles = activeLanguage === "english" ? englishSubtitles : chineseSubtitles;
      const currentIndex = subtitles.findIndex(
        (sub) => sub.start === currentSub.start && sub.end === currentSub.end
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
          (sub) => Math.abs(sub.start - currentSub.start) < 1
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

      // Calculate next review date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextReviewAt = tomorrow.toISOString();

      // Create vocabulary item
      await vocabularyApi.create({
        user_id: "demo-user", // TODO: Get from auth context
        video_id: currentVideo.id,
        word: selectedWords.join(" "),
        timestamp: Math.floor(currentTime * 1000), // Convert to milliseconds
        before_2_en: before2En || undefined,
        before_2_zh: before2Zh || undefined,
        before_2_timestamp: before2Timestamp ? Math.floor(before2Timestamp * 1000) : undefined, // Convert to milliseconds
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
          >
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
            {currentSubtitle && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-3xl px-6 z-20">
                <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-white text-lg leading-relaxed">
                    {currentSubtitle.text.split(" ").map((word, index) => (
                      <span
                        key={index}
                        className={`hover:bg-yellow-400 hover:text-black px-1 rounded cursor-pointer transition-colors ${
                          selectedWords.includes(word.replace(/[.,!?;:]$/, ""))
                            ? "bg-yellow-400 text-black"
                            : ""
                        }`}
                        onClick={(e) => handleWordClick(word, e)}
                      >
                        {word}{" "}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
                <span className="text-gray-400">/ {formatTime(duration)}</span>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700 transition-colors">
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

                <button className="text-gray-500 hover:text-gray-700 transition-colors">
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
                    className="text-xs bg-gray-100 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0.25}>0.25x</option>
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1.0}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={1.75}>1.75x</option>
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
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 max-w-md"
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
              {selectedWords.join(" ")}
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
            <div className="prose prose-sm max-w-none">
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
