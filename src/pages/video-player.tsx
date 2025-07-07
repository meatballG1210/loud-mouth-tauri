import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { convertFileSrc } from '@tauri-apps/api/core';
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

interface SubtitleLine {
  id: string;
  start: number;
  end: number;
  text: string;
  language: "english" | "chinese";
}

// Mock subtitle data
const mockSubtitles: SubtitleLine[] = [
  {
    id: "1",
    start: 0,
    end: 3,
    text: "Gloria, they're 6 and 8.",
    language: "english",
  },
  {
    id: "2",
    start: 3,
    end: 6,
    text: "Let's take it down a notch.",
    language: "english",
  },
  {
    id: "3",
    start: 6,
    end: 9,
    text: "We're very different.",
    language: "english",
  },
  {
    id: "4",
    start: 9,
    end: 12,
    text: "Jay's from the city.",
    language: "english",
  },
  {
    id: "5",
    start: 12,
    end: 15,
    text: "He has a big business.",
    language: "english",
  },
  {
    id: "6",
    start: 15,
    end: 18,
    text: "I come from a small village.",
    language: "english",
  },
  {
    id: "7",
    start: 18,
    end: 21,
    text: "Very poor but very, very beautiful.",
    language: "english",
  },
  {
    id: "8",
    start: 21,
    end: 25,
    text: "It's the number one village in all Colombia for all the-",
    language: "english",
  },
  {
    id: "9",
    start: 25,
    end: 27,
    text: "What's the word?",
    language: "english",
  },
  { id: "10", start: 27, end: 29, text: "Murders.", language: "english" },
  {
    id: "11",
    start: 29,
    end: 32,
    text: "Yes. The murders.",
    language: "english",
  },
  {
    id: "12",
    start: 32,
    end: 35,
    text: "Manny, stop him!",
    language: "english",
  },
];

const mockChineseSubtitles: SubtitleLine[] = [
  {
    id: "1",
    start: 0,
    end: 3,
    text: "格洛丽亚，他们只有6岁和8岁。",
    language: "chinese",
  },
  { id: "2", start: 3, end: 6, text: "让我们冷静一点。", language: "chinese" },
  { id: "3", start: 6, end: 9, text: "我们很不一样。", language: "chinese" },
  { id: "4", start: 9, end: 12, text: "杰伊来自城市。", language: "chinese" },
  {
    id: "5",
    start: 12,
    end: 15,
    text: "他有一个大企业。",
    language: "chinese",
  },
  {
    id: "6",
    start: 15,
    end: 18,
    text: "我来自一个小村庄。",
    language: "chinese",
  },
  {
    id: "7",
    start: 18,
    end: 21,
    text: "很穷但非常非常美丽。",
    language: "chinese",
  },
  {
    id: "8",
    start: 21,
    end: 25,
    text: "这是哥伦比亚所有村庄中排名第一的-",
    language: "chinese",
  },
  { id: "9", start: 25, end: 27, text: "什么词？", language: "chinese" },
  { id: "10", start: 27, end: 29, text: "谋杀案。", language: "chinese" },
  { id: "11", start: 29, end: 32, text: "是的。谋杀案。", language: "chinese" },
  { id: "12", start: 32, end: 35, text: "曼尼，阻止他！", language: "chinese" },
];

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
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (params?.videoId && !isLoading) {
      const video = videos.find((v) => v.id === params.videoId);
      if (!video) {
        // Redirect to error page if video not found after loading is complete
        setLocation("/error");
        return;
      }
      setCurrentVideo(video);
    }
  }, [params?.videoId, videos, isLoading, setLocation]);

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
      activeLanguage === "english" ? mockSubtitles : mockChineseSubtitles;
    return subtitles.find(
      (sub) => currentTime >= sub.start && currentTime < sub.end,
    );
  };

  const handleWordClick = (word: string, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    // Clear existing timer
    if (selectionTimer) {
      clearTimeout(selectionTimer);
    }

    // Close popup if it's already open
    setShowLookupPopup(false);

    // Toggle word selection
    const cleanWord = word.replace(/[.,!?;:]$/, ""); // Remove punctuation
    setSelectedWords((prev) => {
      const isSelected = prev.includes(cleanWord);
      if (isSelected) {
        return prev.filter((w) => w !== cleanWord);
      } else {
        return [...prev, cleanWord];
      }
    });

    // Set lookup position
    setLookupPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });

    // Start 2-second timer
    const timer = setTimeout(() => {
      setShowLookupPopup(true);
    }, 2000);

    setSelectionTimer(timer);
  };

  const closeLookupPopup = () => {
    setShowLookupPopup(false);
    setSelectedWords([]);
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      setSelectionTimer(null);
    }
  };

  const mockLookupData = {
    word: selectedWords.join(" "),
    pronunciation: selectedWords.length === 1 ? "/ˈɡlɔːriə/" : "",
    partOfSpeech: selectedWords.length === 1 ? "noun" : "phrase",
    definition:
      selectedWords.length === 1
        ? "A feeling of magnificence, splendor, and great beauty"
        : "A common greeting or expression",
    examples: [
      "The glory of the sunset was breathtaking.",
      "She basked in the glory of her achievement.",
    ],
    translation: selectedWords.length === 1 ? "荣耀，光辉" : "问候语",
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

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        {/* Main Video Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Container */}
          <div className="flex-1 relative flex items-center justify-center bg-black">
            {currentVideo.path ? (
              <video
                ref={videoRef}
                src={convertFileSrc(currentVideo.path)}
                className="max-w-full max-h-full object-contain"
                controls={false}
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget;
                  setDuration(video.duration);
                }}
                onTimeUpdate={(e) => {
                  const video = e.currentTarget;
                  setCurrentTime(video.currentTime);
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
              <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setLocation("/")}
                  className="flex items-center space-x-2 p-2 bg-black bg-opacity-50 rounded-lg text-white hover:bg-opacity-70 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">Back to Library</span>
                </button>
              </div>
            </div>

            {/* Current Subtitle Overlay */}
            {currentSubtitle && (
              <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 max-w-3xl px-6">
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
                  <button
                    onClick={() => setActiveLanguage("english")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeLanguage === "english"
                        ? "bg-white shadow-sm text-blue-600 font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    onClick={() => setActiveLanguage("chinese")}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      activeLanguage === "chinese"
                        ? "bg-white shadow-sm text-blue-600 font-semibold"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    中文
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Word Lookup Popup */}
      {showLookupPopup && selectedWords.length > 0 && (
        <div
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 max-w-sm"
          style={{
            left: `${lookupPosition.x}px`,
            top: `${lookupPosition.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-bold text-lg text-gray-900">
              {mockLookupData.word}
            </h3>
            <button
              onClick={closeLookupPopup}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ×
            </button>
          </div>

          {mockLookupData.pronunciation && (
            <div className="text-sm text-gray-600 mb-2">
              {mockLookupData.pronunciation}
            </div>
          )}

          <div className="text-sm text-blue-600 mb-2 capitalize">
            {mockLookupData.partOfSpeech}
          </div>

          <div className="text-sm text-gray-800 mb-3">
            {mockLookupData.definition}
          </div>

          <div className="text-sm text-gray-600 mb-3">
            <strong>中文:</strong> {mockLookupData.translation}
          </div>

          <div className="text-xs text-gray-500">
            <strong>Examples:</strong>
            <ul className="mt-1 space-y-1">
              {mockLookupData.examples.map((example, index) => (
                <li key={index}>• {example}</li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between mt-4 pt-3 border-t border-gray-100">
            <button
              onClick={closeLookupPopup}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
            <button
              onClick={() => {
                console.log("Added to vocabulary:", selectedWords.join(" "));
                closeLookupPopup();
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Add to Vocabulary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
