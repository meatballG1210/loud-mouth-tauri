import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  Trash2,
  Clock,
  BookOpen,
  Target,
  Volume2,
  Info,
  X,
  RotateCw,
  GraduationCap,
} from "lucide-react";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { VocabularyItem } from "@/types/video";
import { useVideos } from "@/hooks/use-videos";
import { VocabularyErrorBoundary } from "@/components/vocabulary/vocabulary-error-boundary";
import { VideoErrorBoundary } from "@/components/video/video-error-boundary";
import { invoke } from "@tauri-apps/api/core";
import { parseWebVTT, SubtitleLine } from "@/utils/subtitle-parser";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReactMarkdown from "react-markdown";

export default function VocabularyDetail() {
  const [match, params] = useRoute("/vocabulary-list/:videoId");
  const [, setLocation] = useLocation();
  const { videos } = useVideos();
  const {
    vocabulary,
    getVocabularyByVideoId,
    deleteVocabularyItem,
    isLoading,
  } = useVocabulary(videos);
  const [sortBy, setSortBy] = useState<"word" | "timestamp">("timestamp");
  const [filterBy, setFilterBy] = useState<"all" | "due">("all");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [detailWordId, setDetailWordId] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [loopingWordId, setLoopingWordId] = useState<string | null>(null);
  const [loopSubtitle, setLoopSubtitle] = useState<SubtitleLine | null>(null);
  const [englishSubtitles, setEnglishSubtitles] = useState<SubtitleLine[]>([]);
  const [chineseSubtitles, setChineseSubtitles] = useState<SubtitleLine[]>([]);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [dueWordsCount, setDueWordsCount] = useState(0);
  const [deleteWordId, setDeleteWordId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!match || !params?.videoId) {
    setLocation("/vocabulary-list");
    return null;
  }

  // Use useMemo to ensure videoWords updates when vocabulary changes
  const videoWords = useMemo(() => {
    return vocabulary.filter(item => item.videoId === params.videoId);
  }, [vocabulary, params.videoId]);

  const videoTitle = videoWords[0]?.videoTitle || "Unknown Video";
  const currentVideo = videos.find((v) => v.id === params.videoId);

  // Load subtitles when video changes
  useEffect(() => {
    if (!currentVideo) return;

    const loadSubtitles = async () => {
      setSubtitlesLoading(true);

      const tryLoadSubtitles = async (language: "english" | "chinese") => {
        try {
          const vtt = await invoke<string>("get_video_subtitles", {
            videoId: currentVideo.id,
            language,
          });
          return parseWebVTT(vtt, language);
        } catch (error) {
          return [];
        }
      };

      try {
        const [englishSubs, chineseSubs] = await Promise.all([
          tryLoadSubtitles("english"),
          tryLoadSubtitles("chinese"),
        ]);

        if (englishSubs.length > 0) {
          setEnglishSubtitles(englishSubs);
        }

        if (chineseSubs.length > 0) {
          setChineseSubtitles(chineseSubs);
        }
      } catch (error) {
        console.error("Error loading subtitles:", error);
      } finally {
        setSubtitlesLoading(false);
      }
    };

    loadSubtitles();
  }, [currentVideo]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Check if we're looping and reached the end of the subtitle
      if (loopSubtitle && video.currentTime >= loopSubtitle.end) {
        video.currentTime = loopSubtitle.start;
      }
    };
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      // Exit loop mode when video is paused
      if (loopingWordId) {
        setLoopingWordId(null);
        setLoopSubtitle(null);
      }
    };

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
  }, [loopSubtitle, loopingWordId]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Check if spacebar is pressed and we're in loop mode
      if (e.code === "Space" && loopingWordId) {
        e.preventDefault(); // Prevent default space behavior
        exitLoop();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [loopingWordId]);

  const filteredWords = videoWords
    .filter((word) => {
      if (filterBy === "due") {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
        );
        const reviewDate = new Date(word.nextReview + "T23:59:59");
        return reviewDate <= today;
      }
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

  // Calculate due words count
  useEffect(() => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    ); // End of today

    const dueCount = videoWords.filter((word) => {
      // nextReview is in YYYY-MM-DD format, parse it properly
      const reviewDate = new Date(word.nextReview + "T23:59:59"); // End of review day
      return reviewDate <= today;
    }).length;

    setDueWordsCount(dueCount);
  }, [videoWords]);

  const findContainingSubtitle = (timestamp: number): SubtitleLine | null => {
    // Timestamp is already in seconds (converted in useVocabulary hook)
    const timestampInSeconds = timestamp;

    // Combine all subtitles for searching
    const allSubtitles = [...englishSubtitles, ...chineseSubtitles];

    // First check if timestamp matches the start of any subtitle (prefer this for boundary cases)
    const startMatch = allSubtitles.find(
      (sub) => Math.abs(timestampInSeconds - sub.start) < 0.01, // Within 10ms tolerance
    );

    if (startMatch) return startMatch;

    // Then try to find subtitle that contains the timestamp
    const exactMatch = allSubtitles.find(
      (sub) => timestampInSeconds > sub.start && timestampInSeconds < sub.end,
    );

    if (exactMatch) return exactMatch;

    // If no exact match, find the nearest subtitle
    let nearestSub: SubtitleLine | null = null;
    let minDistance = Infinity;

    for (const sub of allSubtitles) {
      const distanceToStart = Math.abs(timestampInSeconds - sub.start);
      const distanceToEnd = Math.abs(timestampInSeconds - sub.end);
      const minDist = Math.min(distanceToStart, distanceToEnd);

      if (minDist < minDistance) {
        minDistance = minDist;
        nearestSub = sub;
      }
    }

    // Only return nearest if within 10 seconds
    return minDistance <= 10 ? nearestSub : null;
  };

  const startLoop = async (word: VocabularyItem) => {
    const subtitle = findContainingSubtitle(word.timestamp);

    if (subtitle && videoRef.current && videoReady) {
      setLoopingWordId(word.id);
      setLoopSubtitle(subtitle);

      // Small delay to ensure UI state updates and avoid focus issues
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (videoRef.current) {
        // Seek to the start of the subtitle
        videoRef.current.currentTime = subtitle.start;

        // Start playing
        try {
          await videoRef.current.play();
          setIsPlaying(true);
        } catch (error) {
          console.error("Failed to play video:", error);
          setLoopingWordId(null);
          setLoopSubtitle(null);
        }
      }
    } else {
    }
  };

  const exitLoop = () => {
    setLoopingWordId(null);
    setLoopSubtitle(null);
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleBack = () => {
    setLocation("/vocabulary-list");
  };

  const handleWordClick = async (word: VocabularyItem) => {
    setSelectedWordId(word.id);
    // Start looping the sentence instead of just playing from timestamp
    if (loopingWordId === word.id) {
      exitLoop();
    } else {
      await startLoop(word);
    }
  };

  const jumpToTimestamp = async (word: VocabularyItem) => {
    setSelectedWordId(word.id);
    if (videoRef.current && videoReady) {
      // Pause the video first to ensure smooth seeking
      videoRef.current.pause();

      // Set the current time (timestamp is already in seconds)
      videoRef.current.currentTime = word.timestamp;

      // Wait a moment for the seek to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Play the video
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Failed to play video:", error);
      }
    }
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (loopingWordId) {
        // If we're in loop mode, exit it
        exitLoop();
      } else if (isPlaying) {
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

    // Timestamp is already in seconds (converted in useVocabulary hook)
    const timestampInSeconds = selectedWord.timestamp;
    const contextWindow = 5; // seconds

    // Combine all subtitles for context
    const allSubtitles = [...englishSubtitles, ...chineseSubtitles];

    return allSubtitles
      .filter(
        (sub) =>
          sub.start >= timestampInSeconds - contextWindow &&
          sub.start <= timestampInSeconds + contextWindow,
      )
      .sort((a, b) => a.start - b.start);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleDeleteWord = (wordId: string) => {
    setDeleteWordId(wordId);
  };

  const confirmDelete = async () => {
    if (deleteWordId) {
      try {
        await deleteVocabularyItem(deleteWordId);
        setDeleteWordId(null);
      } catch (error) {
        console.error("Failed to delete word:", error);
        setDeleteWordId(null);
      }
    }
  };

  const cancelDelete = () => {
    setDeleteWordId(null);
  };


  const isWordDue = (nextReview: string) => {
    const now = new Date();
    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
    const reviewDate = new Date(nextReview + "T23:59:59");
    return reviewDate <= today;
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
            <VideoErrorBoundary videoId={params?.videoId}>
              {currentVideo?.path ? (
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  src={(() => {
                    // Use stream protocol for video playback
                    const encodedPath = currentVideo.path
                      .split("/")
                      .map((segment) => encodeURIComponent(segment))
                      .join("/");
                    const streamUrl = `stream://localhost/${encodedPath}`;
                    return streamUrl;
                  })()}
                  onClick={togglePlayPause}
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    setDuration(video.duration);
                    setVideoReady(true);
                  }}
                  onError={(e) => {
                    console.error("Video playback error:", e);
                    setVideoReady(false);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <p>No video available</p>
                </div>
              )}
            </VideoErrorBoundary>
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
        </div>

        {/* Right Side - Word List */}
        <div className="w-1/3 bg-white flex flex-col">
          <VocabularyErrorBoundary>
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

                <div className="flex items-center space-x-4">
                  {dueWordsCount > 0 && (
                    <button
                      onClick={() =>
                        setLocation(`/vocabulary-review/${params.videoId}/session?from=detail`)
                      }
                      className="flex flex-col items-center space-y-1 transition-colors"
                      title={`Review ${dueWordsCount} words due`}
                    >
                      <div className="relative p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 transition-colors">
                        <GraduationCap className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                          {dueWordsCount}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">Review</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Word List */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-4">
                {filteredWords.map((word) => (
                  <div
                    key={word.id}
                    className={`bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selectedWordId === word.id
                        ? "border-blue-500 bg-blue-50"
                        : "hover:border-gray-300"
                    }`}
                    onClick={() => handleWordClick(word)}
                  >
                    {/* Card Header */}
                    <div className="p-4 pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {word.word}
                          </h3>
                          <p className="text-gray-700">{word.translation}</p>
                        </div>
                      </div>
                    </div>

                    {/* Context Sentence - Full Width Background */}
                    <div className="bg-gray-50 px-4 py-3">
                      <p className="text-sm text-gray-800 italic">
                        "{word.context}"
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatTime(word.timestamp)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Target className="w-3 h-3" />
                          <span>Reviewed {word.reviewCount}x</span>
                        </span>
                        {isWordDue(word.nextReview) && (
                          <span className="text-red-600 font-medium">
                            Due for Review
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            e.preventDefault();

                            if (loopingWordId === word.id) {
                              exitLoop();
                            } else {
                              await startLoop(word);
                            }
                          }}
                          className={`p-2 transition-all rounded-lg font-medium ${
                            loopingWordId === word.id
                              ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                              : "bg-blue-50 text-blue-500 hover:bg-blue-100 hover:text-blue-600"
                          }`}
                          title={
                            loopingWordId === word.id
                              ? "Stop loop"
                              : "Loop sentence"
                          }
                          disabled={isLoading}
                          type="button"
                        >
                          {loopingWordId === word.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <RotateCw className="w-5 h-5" />
                          )}
                        </button>
                        <Popover
                          open={detailWordId === word.id}
                          onOpenChange={(open) =>
                            setDetailWordId(open ? word.id : null)
                          }
                        >
                          <PopoverTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 transition-all rounded-lg font-medium"
                              title="View details"
                              disabled={isLoading}
                            >
                              <Info className="w-5 h-5" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-96 max-h-[80vh] overflow-y-auto"
                            align="end"
                          >
                            <div className="relative">
                              <button
                                onClick={() => setDetailWordId(null)}
                                className="absolute top-0 right-0 p-1 hover:bg-gray-100 rounded transition-colors"
                              >
                                <X className="w-4 h-4 text-gray-500" />
                              </button>
                              {word.dictionaryResponse ? (
                                <div className="prose prose-sm max-w-none pr-8">
                                  <ReactMarkdown>
                                    {word.dictionaryResponse}
                                  </ReactMarkdown>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <p className="text-sm text-gray-500 text-center italic">
                                    No dictionary definition available
                                  </p>
                                </div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDeleteWord(word.id);
                          }}
                          className="p-2 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 transition-all rounded-lg font-medium"
                          title="Delete word"
                          disabled={isLoading}
                          type="button"
                        >
                          <Trash2 className="w-5 h-5" />
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
          </VocabularyErrorBoundary>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteWordId} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vocabulary Word</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this vocabulary item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
