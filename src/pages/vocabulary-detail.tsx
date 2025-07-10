import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  Star,
  Trash2,
  Clock,
  BookOpen,
  Target,
  Volume2,
  Info,
  X,
} from "lucide-react";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { VocabularyItem } from "@/types/video";

interface SubtitleLine {
  id: string;
  start: number;
  end: number;
  text: string;
  language: "english" | "chinese";
}

export default function VocabularyDetail() {
  const [match, params] = useRoute("/vocabulary-list/:videoId");
  const [, setLocation] = useLocation();
  const {
    getVocabularyByVideoId,
    deleteVocabularyItem,
    toggleStar,
    isLoading,
  } = useVocabulary();
  const [sortBy, setSortBy] = useState<"word" | "timestamp">("timestamp");
  const [filterBy, setFilterBy] = useState<"all" | "starred" | "due">("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [detailWordId, setDetailWordId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Mock subtitle data
  const mockSubtitles: SubtitleLine[] = [
    {
      id: "1",
      start: 87.2,
      end: 89.8,
      text: "At first, I was hesitant about the idea.",
      language: "english",
    },
    {
      id: "2",
      start: 89.8,
      end: 92.5,
      text: "Initially, I thought it was quite strange.",
      language: "english",
    },
    {
      id: "3",
      start: 92.5,
      end: 95.1,
      text: "起初，我觉得这很奇怪。",
      language: "chinese",
    },
    {
      id: "4",
      start: 121.5,
      end: 124.2,
      text: "We need someone to act as a surrogate mother.",
      language: "english",
    },
    {
      id: "5",
      start: 124.2,
      end: 126.8,
      text: "找一个代理妈妈是必要的。",
      language: "chinese",
    },
    {
      id: "6",
      start: 232.8,
      end: 235.5,
      text: "That baby is absolutely adorable.",
      language: "english",
    },
    {
      id: "7",
      start: 235.5,
      end: 238.1,
      text: "那个婴儿真是太可爱了。",
      language: "chinese",
    },
    {
      id: "8",
      start: 454.1,
      end: 457.3,
      text: "There will be a penalty for late submission.",
      language: "english",
    },
    {
      id: "9",
      start: 457.3,
      end: 460.0,
      text: "迟交将面临惩罚。",
      language: "chinese",
    },
    {
      id: "10",
      start: 676.9,
      end: 679.5,
      text: "Let's take him out for dinner tonight.",
      language: "english",
    },
    {
      id: "11",
      start: 679.5,
      end: 682.1,
      text: "今晚我们带他出去吃饭吧。",
      language: "chinese",
    },
  ];

  if (!match || !params?.videoId) {
    setLocation("/vocabulary-list");
    return null;
  }

  const videoWords = getVocabularyByVideoId(params.videoId);
  const videoTitle = videoWords[0]?.videoTitle || "Unknown Video";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("durationchange", handleDurationChange);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("durationchange", handleDurationChange);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const filteredWords = videoWords
    .filter((word) => {
      if (filterBy === "starred") return word.isStarred;
      if (filterBy === "due") return new Date(word.nextReview) <= new Date();
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "word":
          return a.word.localeCompare(b.word);
        case "timestamp":
          return a.timestamp - b.timestamp;
        default:
          return 0;
      }
    });

  const handleBack = () => {
    setLocation("/vocabulary-list");
  };

  const handleWordClick = (word: VocabularyItem) => {
    setSelectedWordId(word.id);
    if (videoRef.current) {
      videoRef.current.currentTime = word.timestamp;
      if (!isPlaying) {
        videoRef.current.play();
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const getContextSubtitles = () => {
    if (!selectedWordId) return [];

    const selectedWord = videoWords.find((w) => w.id === selectedWordId);
    if (!selectedWord) return [];

    const timestamp = selectedWord.timestamp;
    const contextWindow = 5; // seconds

    return mockSubtitles
      .filter(
        (sub) =>
          sub.start >= timestamp - contextWindow &&
          sub.start <= timestamp + contextWindow,
      )
      .sort((a, b) => a.start - b.start);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDeleteWord = async (wordId: string) => {
    if (
      window.confirm("Are you sure you want to delete this vocabulary item?")
    ) {
      await deleteVocabularyItem(wordId);
    }
  };

  const handleToggleStar = async (wordId: string) => {
    await toggleStar(wordId);
  };

  const isWordDue = (nextReview: string) => {
    return new Date(nextReview) <= new Date();
  };

  const contextSubtitles = getContextSubtitles();

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side - Video Player */}
        <div className="w-2/3 bg-black flex flex-col">
          {/* Video */}
          <div className="flex-1 relative">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src="/placeholder-video.mp4"
              onClick={togglePlayPause}
            />

            {/* Play/Pause Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black bg-opacity-20">
              <button
                onClick={togglePlayPause}
                className="bg-white bg-opacity-80 rounded-full p-4 hover:bg-opacity-100 transition-all"
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-gray-800" />
                ) : (
                  <Play className="w-8 h-8 text-gray-800 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* Video Controls */}
          <div className="bg-gray-900 text-white p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlayPause}
                className="p-2 hover:bg-gray-700 rounded"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              <div className="flex-1">
                <div className="bg-gray-600 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{
                      width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <span className="text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          {/* Context Subtitles */}
          {selectedWordId && contextSubtitles.length > 0 && (
            <div className="bg-gray-800 text-white p-4 max-h-32 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Context Subtitles
              </h4>
              <div className="space-y-1">
                {contextSubtitles.map((subtitle) => (
                  <div key={subtitle.id} className="text-sm">
                    <span className="text-gray-400 text-xs mr-2">
                      {formatTime(subtitle.start)}
                    </span>
                    <span
                      className={
                        subtitle.language === "chinese"
                          ? "text-yellow-300"
                          : "text-white"
                      }
                    >
                      {subtitle.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side - Word List */}
        <div className="w-1/3 bg-white flex flex-col">
          {/* Controls */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleBack}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Vocabulary Words
                  </h2>
                  <p className="text-sm text-gray-500">{videoTitle}</p>
                </div>
              </div>

              <div className="text-sm text-gray-500">
                {filteredWords.length} words
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="all">All Words</option>
                <option value="starred">Starred Only</option>
                <option value="due">Due for Review</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="timestamp">Sort by Timeline</option>
                <option value="word">Sort by Word</option>
              </select>
            </div>
          </div>

          {/* Word List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              {filteredWords.map((word) => (
                <div
                  key={word.id}
                  className={`bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedWordId === word.id
                      ? "border-blue-500 bg-blue-50"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => handleWordClick(word)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {word.word}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(word.id);
                          }}
                          className={`p-1 rounded-full transition-colors ${
                            word.isStarred
                              ? "text-yellow-500 hover:text-yellow-600"
                              : "text-gray-400 hover:text-yellow-500"
                          }`}
                          disabled={isLoading}
                        >
                          <Star
                            className={`w-4 h-4 ${word.isStarred ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>

                      <p className="text-gray-700 mb-3">{word.translation}</p>

                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-800 italic">
                          "{word.context}"
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(word.timestamp)}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Target className="w-3 h-3" />
                            <span>Reviewed {word.reviewCount}x</span>
                          </span>
                        </div>
                        {isWordDue(word.nextReview) && (
                          <span className="text-red-600 font-medium">
                            Due for Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailWordId(word.id);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="View details"
                        disabled={isLoading}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWord(word.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete word"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {filteredWords.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No vocabulary words found
                  </h3>
                  <p className="text-gray-500">
                    {filterBy === "all"
                      ? "No vocabulary has been saved for this video yet."
                      : `No ${filterBy} vocabulary words found. Try changing the filter.`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Word Details Modal */}
      {detailWordId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            {(() => {
              const detailWord = filteredWords.find(
                (w) => w.id === detailWordId,
              );
              if (!detailWord) return null;

              return (
                <>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                      Word Details
                    </h2>
                    <button
                      onClick={() => setDetailWordId(null)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Word and Translation */}
                    <div>
                      <div className="flex items-center space-x-3 mb-3">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {detailWord.word}
                        </h3>
                        <button
                          onClick={() => handleToggleStar(detailWord.id)}
                          className={`p-2 rounded-full transition-colors ${
                            detailWord.isStarred
                              ? "text-yellow-500 hover:text-yellow-600"
                              : "text-gray-400 hover:text-yellow-500"
                          }`}
                          disabled={isLoading}
                        >
                          <Star
                            className={`w-5 h-5 ${detailWord.isStarred ? "fill-current" : ""}`}
                          />
                        </button>
                      </div>
                      <p className="text-lg text-gray-700">
                        {detailWord.translation}
                      </p>
                    </div>

                    {/* Context */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Context
                      </h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-800 italic">
                          "{detailWord.context}"
                        </p>
                      </div>
                    </div>

                    {/* Video Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Video Information
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <BookOpen className="w-4 h-4" />
                          <span>{detailWord.videoTitle}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <span>
                            Timestamp: {formatTime(detailWord.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Learning Progress */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        Learning Progress
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Review Count
                          </span>
                          <span className="font-medium">
                            {detailWord.reviewCount} times
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Last Reviewed
                          </span>
                          <span className="font-medium">
                            {detailWord.lastReviewed}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            Next Review
                          </span>
                          <span
                            className={`font-medium ${isWordDue(detailWord.nextReview) ? "text-red-600" : "text-green-600"}`}
                          >
                            {detailWord.nextReview}
                            {isWordDue(detailWord.nextReview) && " (Due)"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          handleWordClick(detailWord);
                          setDetailWordId(null);
                        }}
                        className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Jump to Video
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteWord(detailWord.id);
                          setDetailWordId(null);
                        }}
                        className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        disabled={isLoading}
                      >
                        Delete Word
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
