import React, { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Eye,
  Check,
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Video,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useVideos } from "@/hooks/use-videos";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { useLanguage } from "@/lib/i18n";
import { vocabularyApi, VocabularyItem } from "@/api/vocabulary";
import { checkWordMatch, splitSentenceForBlank } from "@/utils/fill-in-blank";
import { ReviewErrorBoundary } from "@/components/vocabulary/vocabulary-error-boundary";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/SupabaseAuthProvider";
import { ReviewCompletionDialog } from "@/components/vocabulary/review-completion-dialog";

interface SubtitleLine {
  id: string;
  start: number;
  end: number;
  text: string;
  language: "english" | "chinese";
  position?: "minus2" | "minus1" | "current";
}

export default function VocabularyReview() {
  const [location, setLocation] = useLocation();
  const [matchSession, paramsSession] = useRoute(
    "/vocabulary-review/:videoId/session",
  );
  const [matchSetup, paramsSetup] = useRoute("/vocabulary-review/:videoId");
  // Filter out "session" as a videoId since it's a route keyword
  const rawVideoId = paramsSession?.videoId || paramsSetup?.videoId;
  const reviewVideoId =
    rawVideoId && rawVideoId !== "session" ? rawVideoId : undefined;
  const { stats: videoStats, refreshVideos, videos: allVideos } = useVideos();
  const { stats, updateReviewWithResult, refreshVocabulary } =
    useVocabulary(allVideos);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("reviews");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if we're in an active review session based on URL
  const isActiveSession =
    location === "/vocabulary-review/session" || matchSession;
  const isGeneralReviewSession =
    location === "/vocabulary-review/session" && !reviewVideoId;

  // Completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);

  // Review state
  const [reviewStarted, setReviewStarted] = useState(isActiveSession);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showNextQuestion, setShowNextQuestion] = useState(false);
  const [shownAnswerItems, setShownAnswerItems] = useState<Set<string>>(
    new Set(),
  );
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [_currentTime, setCurrentTime] = useState(0);
  const [_duration, setDuration] = useState(0);
  const [shouldAutoPause, setShouldAutoPause] = useState(true);

  // Real review items
  const [reviewItems, setReviewItems] = useState<VocabularyItem[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [subtitles, setSubtitles] = useState<SubtitleLine[]>([]);
  const { videos } = useVideos();

  // For general review setup page - count of available reviews
  const [generalReviewCount, setGeneralReviewCount] = useState(0);
  const [isLoadingGeneralCount, setIsLoadingGeneralCount] = useState(true);

  // Video-specific review counts
  const [videoReviewCounts, setVideoReviewCounts] = useState<
    Array<{
      videoId: string;
      videoTitle: string;
      count: number;
    }>
  >([]);
  const [isLoadingVideoCounts, setIsLoadingVideoCounts] = useState(true);
  const [showVideoList, setShowVideoList] = useState(false);
  const [navigationSource, setNavigationSource] = useState<
    "review-video-list" | "vocabulary-detail" | null
  >(null);

  // Check URL query params to see if we came from vocabulary detail
  useEffect(() => {
    if (location.includes("?from=detail")) {
      setNavigationSource("vocabulary-detail");
    }
  }, [location]);

  // Load vocabulary items due for review
  useEffect(() => {
    const loadReviewItems = async () => {
      if (!user?.id) {
        setReviewItems([]);
        setIsLoadingReviews(false);
        return;
      }

      try {
        setIsLoadingReviews(true);
        const userId = user.id;
        const items = reviewVideoId
          ? await vocabularyApi.getDueForReviewByVideo(userId, reviewVideoId)
          : await vocabularyApi.getDueForReview(userId);
        if (items.length > 0) {
          console.log("Sample item:", {
            word: items[0].word,
            next_review_at: items[0].next_review_at,
            video_id: items[0].video_id,
          });
        }

        setReviewItems(items);
      } catch (error) {
        console.error("Error loading review items:", error);
        setReviewItems([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    // Load items for active session, video-specific review, or when explicitly started
    if (reviewStarted || isActiveSession || reviewVideoId) {
      loadReviewItems();
    }
  }, [reviewStarted, isActiveSession, reviewVideoId, user?.id]);

  // Load review count for general review setup page
  useEffect(() => {
    const loadGeneralReviewCount = async () => {
      if (!user?.id || reviewVideoId || isActiveSession) {
        setIsLoadingGeneralCount(false);
        setIsLoadingVideoCounts(false);
        return;
      }

      try {
        setIsLoadingGeneralCount(true);
        setIsLoadingVideoCounts(true);
        const userId = user.id;
        const items = await vocabularyApi.getDueForReview(userId);
        setGeneralReviewCount(items.length);

        // Group items by video for video-specific counts
        const videoGroups = items.reduce(
          (acc, item) => {
            const videoId = item.video_id;
            if (!acc[videoId]) {
              const video = videos.find((v) => v.id === videoId);
              acc[videoId] = {
                videoId,
                videoTitle: video?.title || "Unknown Video",
                count: 0,
              };
            }
            acc[videoId].count++;
            return acc;
          },
          {} as Record<
            string,
            { videoId: string; videoTitle: string; count: number }
          >,
        );

        // Convert to array and sort by count (descending)
        const videoCountsArray = Object.values(videoGroups).sort(
          (a, b) => b.count - a.count,
        );

        setVideoReviewCounts(videoCountsArray);
      } catch (error) {
        console.error("Error loading general review count:", error);
        setGeneralReviewCount(0);
        setVideoReviewCounts([]);
      } finally {
        setIsLoadingGeneralCount(false);
        setIsLoadingVideoCounts(false);
      }
    };

    // Only load for general review page (not video-specific or active session)
    if (!reviewVideoId && !isActiveSession) {
      loadGeneralReviewCount();
    }
  }, [user?.id, reviewVideoId, isActiveSession, videos]);

  const currentReview = reviewItems[currentReviewIndex];
  const progress =
    reviewItems.length > 0
      ? ((currentReviewIndex + 1) / reviewItems.length) * 100
      : 0;

  // Load subtitles for current review item
  useEffect(() => {
    if (currentReview && (reviewStarted || isActiveSession)) {
      const loadSubtitles = () => {
        // Create subtitle lines from vocabulary context
        const subtitleLines: SubtitleLine[] = [];

        if (currentReview.before_2_en) {
          subtitleLines.push({
            id: "1",
            start:
              (currentReview.before_2_timestamp ||
                currentReview.timestamp - 4000) / 1000,
            end:
              (currentReview.before_2_timestamp ||
                currentReview.timestamp - 2000) / 1000,
            text: currentReview.before_2_en,
            language: "english",
            position: "minus2",
          });
          if (currentReview.before_2_zh) {
            subtitleLines.push({
              id: "1-zh",
              start:
                (currentReview.before_2_timestamp ||
                  currentReview.timestamp - 4000) / 1000,
              end:
                (currentReview.before_2_timestamp ||
                  currentReview.timestamp - 2000) / 1000,
              text: currentReview.before_2_zh,
              language: "chinese",
              position: "minus2",
            });
          }
        }

        if (currentReview.before_1_en) {
          subtitleLines.push({
            id: "2",
            start: (currentReview.timestamp - 2000) / 1000,
            end: currentReview.timestamp / 1000,
            text: currentReview.before_1_en,
            language: "english",
            position: "minus1",
          });
          if (currentReview.before_1_zh) {
            subtitleLines.push({
              id: "2-zh",
              start: (currentReview.timestamp - 2000) / 1000,
              end: currentReview.timestamp / 1000,
              text: currentReview.before_1_zh,
              language: "chinese",
              position: "minus1",
            });
          }
        }

        subtitleLines.push({
          id: "3",
          start: currentReview.timestamp / 1000,
          end: (currentReview.timestamp + 2000) / 1000,
          text: currentReview.target_en,
          language: "english",
          position: "current",
        });

        subtitleLines.push({
          id: "3-zh",
          start: currentReview.timestamp / 1000,
          end: (currentReview.timestamp + 2000) / 1000,
          text: currentReview.target_zh,
          language: "chinese",
          position: "current",
        });

        setSubtitles(subtitleLines);
      };

      loadSubtitles();
    }
  }, [currentReview, reviewStarted, isActiveSession]);

  // Navigation functions
  const handleNavigate = (section: string) => {
    console.log("Navigate to:", section);

    if (section === "home") {
      setLocation("/");
    } else if (section === "vocabulary-review" || section === "back") {
      // Reset review state when going back to setup
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowNextQuestion(false);
      setShownAnswerItems(new Set());
      setIsLooping(false);

      if (section === "back" && reviewVideoId) {
        // Check where we came from
        if (navigationSource === "review-video-list") {
          // Coming from review video list - go back to main review page with list expanded
          setShowVideoList(true);
          setNavigationSource(null);
          setLocation("/vocabulary-review");
        } else {
          // Coming from vocabulary detail page - go back there
          setNavigationSource(null);
          setLocation(`/vocabulary-list/${reviewVideoId}`);
        }
      } else {
        setLocation("/vocabulary-review");
      }
    } else if (section === "vocabulary") {
      setLocation("/vocabulary-list");
    } else if (section === "reviews") {
      setActiveSection("reviews");
      setLocation("/vocabulary-review");
    } else if (section === "progress") {
      setLocation("/progress");
    } else if (section === "settings") {
      setLocation("/settings");
    } else if (section === "videos") {
      setLocation("/");
    } else {
      setActiveSection(section);
    }
  };

  const handleUploadVideo = () => {
    console.log("Upload video clicked");
    setLocation("/upload");
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    console.log("View mode changed to:", mode);
  };

  // Review functions
  const startReview = () => {
    setReviewStarted(true);
    setCurrentReviewIndex(0);
    setUserAnswer("");
    setIsCorrect(null);
    setShowAnswer(false);
    setShowNextQuestion(false);
    setShownAnswerItems(new Set());
    setHasSubmittedReview(false);
    setIsLooping(false);
    const reviewPath = reviewVideoId
      ? `/vocabulary-review/${reviewVideoId}/session`
      : "/vocabulary-review/session";
    setLocation(reviewPath);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentReview) {
      setIsCorrect(false);
      return;
    }

    // Check if the user's answer matches the target word
    const isAnswerCorrect = checkWordMatch(
      userAnswer.trim(),
      currentReview.word,
    );

    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      // CORRECT ANSWER - Update DB, show answer, show Next Question button, play video once
      if (!hasSubmittedReview && currentReview.id) {
        await updateReviewWithResult(currentReview.id, true);
        setHasSubmittedReview(true);
        queryClient.invalidateQueries({ queryKey: ["accuracy-stats"] });
      }

      // Show answer and Next Question button
      setShowAnswer(true);
      setShowNextQuestion(true);

      // Play video once (not loop)
      if (videoRef.current && currentReview) {
        const video = videoRef.current;
        const startTime = currentReview.timestamp / 1000;
        const endTime = (currentReview.timestamp + 2000) / 1000;

        setShouldAutoPause(false);
        video.currentTime = startTime;

        video
          .play()
          .then(() => {
            const handleTimeUpdate = () => {
              if (video.currentTime >= endTime) {
                video.pause();
                video.removeEventListener("timeupdate", handleTimeUpdate);
                setShouldAutoPause(true);
                // Don't auto-move to next - user must click "Next Question"
              }
            };

            video.addEventListener("timeupdate", handleTimeUpdate);
          })
          .catch((error) => {
            console.error("Error playing video:", error);
            setShouldAutoPause(true);
          });
      }
    } else {
      // INCORRECT ANSWER - Show answer, show Next Question button, and loop video
      setShowAnswer(true);
      setShowNextQuestion(true);

      // Start looping the video
      if (videoRef.current && currentReview) {
        const video = videoRef.current;
        const startTime = currentReview.timestamp / 1000;
        const endTime = (currentReview.timestamp + 2000) / 1000;

        setIsLooping(true);

        video.currentTime = startTime;
        video.loop = false;

        const handleTimeUpdate = () => {
          if (video.currentTime >= endTime) {
            video.currentTime = startTime;
          }
        };

        video.addEventListener("timeupdate", handleTimeUpdate);
        video.play().catch((error) => {
          console.error("Error playing video for incorrect answer:", error);
        });

        // Store the handler to remove it later
        (video as any).__loopHandler = handleTimeUpdate;
      }
    }
  };

  const handleForgot = () => {
    setShowAnswer(true);
    setShowNextQuestion(true);
    // Don't set isCorrect - we don't want to show "Incorrect" feedback for Forgot
  };

  const playCurrentSentence = async () => {
    if (videoRef.current && currentReview) {
      const video = videoRef.current;
      const startTime = currentReview.timestamp / 1000;
      const endTime = (currentReview.timestamp + 2000) / 1000;

      // Stop any existing loop
      if ((video as any).__loopHandler) {
        video.removeEventListener("timeupdate", (video as any).__loopHandler);
        delete (video as any).__loopHandler;
      }
      setIsLooping(false);

      // Disable auto-pause to prevent interference
      setShouldAutoPause(false);

      // Pause video first to ensure clean state
      video.pause();

      // Small delay to ensure UI state updates and avoid focus issues
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Seek to the start of the sentence
      video.currentTime = startTime;

      // Setup handler to pause at end of sentence
      const handleTimeUpdate = () => {
        if (video.currentTime >= endTime) {
          video.pause();
          setIsPlaying(false);
          video.removeEventListener("timeupdate", handleTimeUpdate);
          // Re-enable auto-pause
          setShouldAutoPause(true);
        }
      };

      video.addEventListener("timeupdate", handleTimeUpdate);

      // Start playing
      try {
        await video.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Error playing current sentence:", error);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        // Re-enable auto-pause even on error
        setShouldAutoPause(true);
      }
    }
  };

  const handleNextQuestion = () => {
    // Stop video looping (if any)
    if (videoRef.current) {
      const video = videoRef.current;
      if ((video as any).__loopHandler) {
        video.removeEventListener("timeupdate", (video as any).__loopHandler);
        delete (video as any).__loopHandler;
      }
      video.pause();
    }
    setIsLooping(false);

    // Only add to queue if answer was incorrect or forgot (not correct)
    // isCorrect === false means incorrect answer
    // isCorrect === null means forgot (we didn't set isCorrect)
    // isCorrect === true means correct answer - don't re-queue
    if (currentReview && isCorrect !== true) {
      setReviewItems((prev) => [...prev, currentReview]);
      setShownAnswerItems((prev) => new Set(prev).add(currentReview.id!));
    }

    // Move to next question
    if (currentReviewIndex < reviewItems.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowNextQuestion(false);
      setHasSubmittedReview(false);
    } else {
      // Review completed
      setShowCompletionDialog(true);
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowNextQuestion(false);
      setShownAnswerItems(new Set());
      setHasSubmittedReview(false);
      // Refresh vocabulary to update pending review counts
      refreshVocabulary();
      // If we have a video ID, go back to vocabulary detail page
      if (reviewVideoId) {
        setLocation(`/vocabulary-list/${reviewVideoId}`);
      } else {
        setLocation("/vocabulary-review");
      }
    }
  };

  // Video functions
  const togglePlayPause = () => {
    if (videoRef.current && currentReview) {
      const video = videoRef.current;

      if (isPlaying) {
        video.pause();
      } else {
        // Calculate the correct start time for the current review
        const startTime = currentReview.before_2_timestamp
          ? currentReview.before_2_timestamp / 1000
          : (currentReview.timestamp - 4000) / 1000;

        // If video is not at the correct position, seek to it first
        const currentTime = video.currentTime;
        const timeDiff = Math.abs(currentTime - startTime);

        // If we're more than 0.5 seconds away from the start time, seek to it
        if (timeDiff > 0.5) {
          video.currentTime = startTime;
        }

        video.play();
      }
    }
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);

      // Auto pause at target timestamp (only if shouldAutoPause is true)
      if (
        shouldAutoPause &&
        currentReview &&
        video.currentTime >= currentReview.timestamp / 1000
      ) {
        video.pause();
      }
    };
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [currentReview, shouldAutoPause]);

  // Auto-play video when review item changes
  useEffect(() => {
    if (
      currentReview &&
      videoRef.current &&
      (reviewStarted || isActiveSession)
    ) {
      const video = videoRef.current;
      const videoPath = videos.find(
        (v) => v.id === currentReview.video_id,
      )?.path;

      if (!videoPath) return;

      // Calculate the start time (before_2 timestamp or 4 seconds before target)
      const startTime = currentReview.before_2_timestamp
        ? currentReview.before_2_timestamp / 1000
        : (currentReview.timestamp - 4000) / 1000;

      // Wait for video to be ready before playing
      const attemptPlay = () => {
        if (video.readyState >= 3) {
          // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
          video.currentTime = startTime;
          video.play().catch((error) => {
            console.error("Error auto-playing video:", error);
          });
        } else {
          // If not ready, wait a bit and try again
          setTimeout(attemptPlay, 100);
        }
      };

      // If video is already loaded, play immediately
      if (video.readyState >= 3) {
        attemptPlay();
      } else {
        // Otherwise, wait for it to be ready
        const handleCanPlay = () => {
          video.currentTime = startTime;
          video.play().catch((error) => {
            console.error("Error auto-playing video:", error);
          });
        };

        video.addEventListener("canplay", handleCanPlay, { once: true });

        // Cleanup
        return () => {
          video.removeEventListener("canplay", handleCanPlay);
        };
      }
    }
  }, [currentReview, reviewStarted, isActiveSession, videos]);

  // For active session, keep the original layout without sidebar
  if (isActiveSession) {
    // Show loading state
    if (isLoadingReviews) {
      return (
        <ReviewErrorBoundary>
          <div className="h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">{t("loadingReviews")}</p>
            </div>
          </div>
        </ReviewErrorBoundary>
      );
    }

    // No reviews available
    if (reviewItems.length === 0) {
      return (
        <ReviewErrorBoundary>
          <div className="h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <Volume2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {t("noReviewsDue")}
              </h2>
              <p className="text-gray-600 mb-6">
                {reviewVideoId && videos.find((v) => v.id === reviewVideoId)
                  ? `No words due for review from "${videos.find((v) => v.id === reviewVideoId)?.title}"`
                  : t("allCaughtUp")}
              </p>
              <button
                onClick={() => handleNavigate("back")}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-medium">{t("back")}</span>
              </button>
            </div>
          </div>
        </ReviewErrorBoundary>
      );
    }

    return (
      <ReviewErrorBoundary>
        <div className="h-screen bg-white flex flex-col macos-body">
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div
              className="bg-white border-b px-6 py-4"
              style={{ borderColor: "var(--macos-border)" }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleNavigate("back")}
                    className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("back")}</span>
                  </button>
                  <div>
                    <h1 className="text-xl macos-title text-gray-900">
                      {t("vocabularyReview")}
                    </h1>
                    <p className="text-sm text-gray-500 macos-body">
                      {`${currentReviewIndex + 1} of ${reviewItems.length}`}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center space-x-4">
                  <div className="w-32 macos-progress">
                    <div
                      className="macos-progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 font-medium macos-body">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Review Interface */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left Side - Video Player */}
              <div className="w-2/3 bg-black flex flex-col">
                {/* Video - Full height */}
                <div className="flex-1 relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    src={(() => {
                      const video =
                        currentReview &&
                        videos.find((v) => v.id === currentReview.video_id);
                      if (!video?.path) return "";

                      // Use same format as video-player.tsx
                      const encodedPath = video.path
                        .split("/")
                        .map((segment) => encodeURIComponent(segment))
                        .join("/");
                      return `stream://localhost/${encodedPath}`;
                    })()}
                    onClick={togglePlayPause}
                  />

                  {/* Play/Pause Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
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
              </div>

              {/* Right Side - Review Interface */}
              <div className="w-1/3 bg-white flex flex-col border-l border-gray-200 overflow-y-auto">
                <div className="p-6 space-y-4">
                  {/* Subtitles Section */}
                  <div className="space-y-2">
                    {subtitles
                      .filter((s) => s.language === "english")
                      .map((subtitle) => (
                        <div
                          key={subtitle.id}
                          className={`text-center p-3 rounded-lg macos-body transition-all duration-200 ${
                            subtitle.position === "current"
                              ? "bg-blue-50 text-blue-900 shadow-md border-2 border-blue-300 font-medium"
                              : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 shadow-sm"
                          }`}
                        >
                          {subtitle.position === "current" ? (
                            <div className="space-y-3">
                              {/* Inline Fill-in-the-Blank */}
                              <div className="text-lg leading-relaxed">
                                {currentReview &&
                                  (() => {
                                    const { before, after, wordLength } =
                                      splitSentenceForBlank(
                                        currentReview.target_en,
                                        currentReview.word,
                                      );
                                    return (
                                      <span className="inline-flex flex-wrap items-center justify-center gap-1">
                                        <span>{before}</span>
                                        <input
                                          ref={inlineInputRef}
                                          spellCheck={false}
                                          type="text"
                                          value={userAnswer}
                                          onChange={(e) =>
                                            setUserAnswer(e.target.value)
                                          }
                                          onKeyDown={(e) => {
                                            if (
                                              e.key === "Enter" &&
                                              userAnswer.trim()
                                            ) {
                                              handleSubmitAnswer();
                                            }
                                          }}
                                          className="inline-block px-2 py-1 border-b-2 border-blue-500 bg-transparent text-blue-900 font-bold focus:outline-none focus:border-blue-700 text-center"
                                          style={{
                                            minWidth: `${Math.max(wordLength * 12, 60)}px`,
                                            width: `${Math.max(userAnswer.length * 12, wordLength * 12, 60)}px`,
                                          }}
                                          autoFocus
                                        />
                                        <span>{after}</span>
                                      </span>
                                    );
                                  })()}
                              </div>
                              {/* Chinese Translation */}
                              <div className="text-sm text-blue-700 italic">
                                {subtitles.find((s) => s.id === "3-zh")?.text}
                              </div>
                            </div>
                          ) : (
                            subtitle.text
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Feedback */}
                  {isCorrect !== null && (
                    <div
                      className={`p-4 rounded-lg border ${
                        isCorrect
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {isCorrect ? (
                          <Check className="w-5 h-5 text-green-600" />
                        ) : (
                          <X className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium macos-body">
                          {isCorrect ? t("correct") : t("incorrect")}
                        </span>
                      </div>
                      {isCorrect && currentReview?.word && (
                        <p className="mt-2 text-lg text-green-700 font-bold macos-body">
                          {currentReview.word}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 macos-title">
                      Actions
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Forgot Button - Only show if answer not yet shown */}
                      {!showAnswer && (
                        <button
                          onClick={handleForgot}
                          className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-yellow-500 text-white hover:bg-yellow-600 col-span-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm font-medium">Forgot</span>
                        </button>
                      )}

                      {/* Submit Button - Only show if answer not yet shown */}
                      {!showAnswer && (
                        <button
                          onClick={handleSubmitAnswer}
                          disabled={!userAnswer.trim()}
                          className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed col-span-1"
                        >
                          <span className="text-sm font-medium">
                            {t("submitAnswer")}
                          </span>
                        </button>
                      )}

                      {/* Next Question Button - Show after Forgot or Incorrect answer */}
                      {showNextQuestion && (
                        <button
                          onClick={handleNextQuestion}
                          className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-green-500 text-white hover:bg-green-600 col-span-2"
                        >
                          <span className="text-sm font-medium">
                            Next Question
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Show Answer */}
                  {showAnswer && (
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 macos-title">
                        Correct Word
                      </h4>
                      <div className="bg-white rounded-md p-4 border-2 border-blue-300 min-h-[60px]">
                        <p className="text-2xl font-bold text-blue-900 text-center macos-body">
                          {currentReview?.word}
                        </p>
                      </div>
                      <button
                        onClick={playCurrentSentence}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <Volume2 className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Play Current Sentence
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ReviewErrorBoundary>
    );
  }

  // For non-session setup page, add sidebar layout
  // Video-specific review setup - REDIRECT to session directly
  if (reviewVideoId && !isActiveSession) {
    // Automatically redirect to the session page
    React.useEffect(() => {
      setLocation(`/vocabulary-review/${reviewVideoId}/session`);
    }, [reviewVideoId]);

    // Show loading while redirecting
    return (
      <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            <ReviewErrorBoundary>
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">{t("loadingReviews")}</p>
                </div>
              </div>
            </ReviewErrorBoundary>
          </div>
        </div>
      </div>
    );
  }

  // General review page with sidebar
  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          stats={videoStats}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onUploadVideo={handleUploadVideo}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={refreshVideos}
          isLoading={false}
        />

        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <ReviewErrorBoundary>
            {/* Content Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("vocabularyReview")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t("readyToStart")}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="max-w-4xl mx-auto">
                  {/* Header Section */}
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Volume2 className="w-8 h-8 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      {t("readyToStart")}?
                    </h2>
                    <p className="text-gray-600 mb-8">
                      {isLoadingGeneralCount
                        ? "Loading review items..."
                        : generalReviewCount > 0
                          ? `You have ${generalReviewCount} words to review`
                          : "No words are currently due for review"}
                    </p>

                    {/* Statistics */}
                    {!isLoadingGeneralCount && generalReviewCount > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-8">
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {t("reviewStatistics")}
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {generalReviewCount}
                            </div>
                            <div className="text-gray-500">
                              {t("wordsToReview")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {stats.masteredWords}
                            </div>
                            <div className="text-gray-500">
                              {t("masteredWords")}
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {stats.overdueWords}
                            </div>
                            <div className="text-gray-500">
                              {t("overdueWords")}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {!isLoadingGeneralCount && generalReviewCount > 0 && (
                    <>
                      <div className="flex gap-4 mb-4">
                        {/* Review All Button */}
                        <button
                          onClick={startReview}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 font-medium"
                        >
                          <BookOpen className="w-5 h-5" />
                          <span>Review All Words</span>
                        </button>

                        {/* Review by Videos Button */}
                        <button
                          onClick={() => setShowVideoList(!showVideoList)}
                          disabled={videoReviewCounts.length === 0}
                          className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg transition-colors border-2 border-blue-500 text-blue-600 hover:bg-blue-50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Video className="w-5 h-5" />
                          <span>Review by Videos</span>
                          {videoReviewCounts.length > 0 &&
                            (showVideoList ? (
                              <ChevronUp className="w-4 h-4 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 ml-1" />
                            ))}
                        </button>
                      </div>

                      {/* Expandable Video List */}
                      {showVideoList && videoReviewCounts.length > 0 && (
                        <div className="border border-gray-200 rounded-lg bg-gray-50 p-4 transition-all duration-200">
                          <div className="max-h-96 overflow-y-auto pr-2">
                            <div className="space-y-2">
                              {videoReviewCounts.map((videoData) => (
                                <div
                                  key={videoData.videoId}
                                  className="bg-white rounded-lg p-3 hover:bg-gray-50 transition-colors flex items-center justify-between"
                                >
                                  <h4 className="font-medium text-gray-900 truncate flex-1">
                                    {videoData.videoTitle}
                                  </h4>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => {
                                        // Track that we came from the review video list
                                        setNavigationSource(
                                          "review-video-list",
                                        );
                                        // Go directly to review session for this video
                                        setLocation(
                                          `/vocabulary-review/${videoData.videoId}/session`,
                                        );
                                      }}
                                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                                    >
                                      Review
                                    </button>
                                    <span className="ml-2 px-2 py-2 bg-red-500 text-white rounded-full text-sm font-bold min-w-[32px] text-center">
                                      {videoData.count}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Empty state when no reviews */}
                  {!isLoadingGeneralCount && generalReviewCount === 0 && (
                    <div className="text-center">
                      <button
                        onClick={() => setLocation("/vocabulary-list")}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Go to Vocabulary List
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ReviewErrorBoundary>
        </div>
      </div>

      {/* Review Completion Dialog */}
      <ReviewCompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
      />
    </div>
  );
}
