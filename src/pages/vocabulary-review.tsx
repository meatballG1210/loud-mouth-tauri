import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Mic,
  RotateCcw,
  Eye,
  Copy,
  Check,
  X,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useVideos } from "@/hooks/use-videos";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { useLanguage } from "@/lib/i18n";
import { vocabularyApi, VocabularyItem } from "@/api/vocabulary";
import { speechApi, audioToBase64, convertWebmToWav } from "@/api/speech";
import { listen } from "@tauri-apps/api/event";
import { areStringsSimilar } from "@/utils/string-similarity";

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
  const { stats: videoStats, refreshVideos } = useVideos();
  const { stats } = useVocabulary();
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("reviews");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Check if we're in an active review session based on URL
  const isActiveSession = location === "/vocabulary-review/session";

  // Review state
  const [reviewStarted, setReviewStarted] = useState(isActiveSession);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Speech recognition state
  const [modelDownloadProgress, setModelDownloadProgress] = useState<
    number | null
  >(null);
  const [isModelDownloading, setIsModelDownloading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

  // Load vocabulary items due for review
  useEffect(() => {
    const loadReviewItems = async () => {
      try {
        setIsLoadingReviews(true);
        // TODO: Get actual user ID from auth context
        const userId = "demo-user";
        const items = await vocabularyApi.getDueForReview(userId);
        setReviewItems(items);
      } catch (error) {
        console.error("Error loading review items:", error);
        setReviewItems([]);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    if (reviewStarted || isActiveSession) {
      loadReviewItems();
    }
  }, [reviewStarted, isActiveSession]);

  const currentReview = reviewItems[currentReviewIndex];
  const progress =
    reviewItems.length > 0
      ? ((currentReviewIndex + 1) / reviewItems.length) * 100
      : 0;

  // Load subtitles for current review item
  useEffect(() => {
    if (currentReview && reviewStarted) {
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
  }, [currentReview, reviewStarted]);

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
      setLocation("/vocabulary-review");
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
    setLocation("/vocabulary-review/session");
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentReview) {
      setIsCorrect(false);
      return;
    }

    // Use Levenshtein distance similarity with 0.85 threshold
    // The function will normalize strings (remove spaces/punctuation) before comparison
    const isAnswerCorrect = areStringsSimilar(
      userAnswer.trim(),
      currentReview.target_en,
      0.85,
      true, // normalize strings
    );

    setIsCorrect(isAnswerCorrect);

    // Only update review in database if answer wasn't shown
    // If answer was shown, we still allow progression but don't update the review stage
    if (!showAnswer) {
      try {
        if (currentReview.id) {
          await vocabularyApi.updateReviewWithResult(
            currentReview.id,
            isAnswerCorrect,
          );
        }
      } catch (error) {
        console.error("Error updating review:", error);
      }
    }

    // Play video and move to next only if correct (regardless of whether answer was shown)
    if (isAnswerCorrect) {
      console.log("Answer is correct, attempting to play video");
      // Play the current sentence automatically
      if (videoRef.current && currentReview) {
        const video = videoRef.current;
        const startTime = currentReview.timestamp / 1000;
        const endTime = (currentReview.timestamp + 2000) / 1000; // Play for 2 seconds

        console.log("Playing video from", startTime, "to", endTime);

        // Disable auto-pause temporarily
        setShouldAutoPause(false);

        video.currentTime = startTime;
        video
          .play()
          .then(() => {
            console.log("Video started playing successfully");
            // Set up a one-time event listener to stop at the end time
            const handleTimeUpdate = () => {
              if (video.currentTime >= endTime) {
                console.log("Reached end time, pausing and moving to next");
                video.pause();
                video.removeEventListener("timeupdate", handleTimeUpdate);

                // Re-enable auto-pause
                setShouldAutoPause(true);

                // Move to next question after a short delay
                setTimeout(() => {
                  if (currentReviewIndex < reviewItems.length - 1) {
                    console.log("Moving to next review item");
                    setCurrentReviewIndex((prev) => prev + 1);
                    setUserAnswer("");
                    setIsCorrect(null);
                    setShowAnswer(false);
                  } else {
                    // Review completed
                    console.log("Review session completed");
                    alert("Review session completed!");
                    setReviewStarted(false);
                    setCurrentReviewIndex(0);
                    setUserAnswer("");
                    setIsCorrect(null);
                    setShowAnswer(false);
                    setLocation("/vocabulary-review");
                  }
                }, 500);
              }
            };

            video.addEventListener("timeupdate", handleTimeUpdate);
          })
          .catch((error) => {
            console.error("Error playing video after correct answer:", error);
            // Re-enable auto-pause on error
            setShouldAutoPause(true);
          });
      } else {
        console.log("Video ref or current review not available", {
          videoRef: videoRef.current,
          currentReview,
        });
      }
    }
  };

  const handleVoiceInput = async () => {
    try {
      // Check if model is available
      const modelName = "vosk-model-en-us-0.22-lgraph";
      const hasModel = await speechApi.checkWhisperModel(modelName);

      if (!hasModel) {
        // Download model if not available
        const shouldDownload = confirm(
          t("voskModelNotFound") ||
            "Speech recognition model not found. Would you like to download it? (This is a one-time download of ~128MB for better accuracy)",
        );

        if (!shouldDownload) {
          return;
        }

        setIsModelDownloading(true);

        // Set up event listeners for download progress
        const unlistenStart = await listen(
          "whisper-model-download-start",
          (event) => {
            console.log("Model download started:", event.payload);
          },
        );

        const unlistenProgress = await listen<number>(
          "whisper-model-download-progress",
          (event) => {
            setModelDownloadProgress(event.payload);
          },
        );

        const unlistenComplete = await listen(
          "whisper-model-download-complete",
          (event) => {
            console.log("Model download completed:", event.payload);
            setIsModelDownloading(false);
            setModelDownloadProgress(null);
          },
        );

        try {
          await speechApi.downloadWhisperModel(modelName);
        } catch (error) {
          console.error("Failed to download model:", error);
          alert(
            t("modelDownloadFailed") ||
              "Failed to download speech recognition model. Please try again later.",
          );
          return;
        } finally {
          // Clean up listeners
          unlistenStart();
          unlistenProgress();
          unlistenComplete();
          setIsModelDownloading(false);
          setModelDownloadProgress(null);
        }
      }

      // Request microphone permission with optimized settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Match Vosk's expected sample rate
          channelCount: 1, // Mono audio for better recognition
        },
      });

      // Create MediaRecorder with higher quality
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        try {
          // Create blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/webm",
          });

          // Convert to WAV format
          const wavBlob = await convertWebmToWav(audioBlob);

          // Convert to base64
          const base64Audio = await audioToBase64(wavBlob);

          // Send to Tauri for transcription
          const result = await speechApi.transcribeAudio(
            base64Audio,
            modelName,
          );

          // Update the answer field
          setUserAnswer(result.text);
        } catch (error) {
          console.error("Transcription error:", error);
          alert(
            t("transcriptionFailed") ||
              "Failed to transcribe audio. Please try again.",
          );
        } finally {
          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop());
          setIsListening(false);
        }
      };

      // Start recording
      setIsListening(true);
      mediaRecorder.start();

      // Stop recording after 10 seconds max
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (error) {
      console.error("Voice input error:", error);
      setIsListening(false);

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        alert(
          t("microphonePermissionDenied") ||
            "Microphone permission was denied. Please allow access to use voice input.",
        );
      } else {
        alert(
          t("voiceInputError") ||
            "Failed to start voice input. Please check your microphone and try again.",
        );
      }
    }
  };

  // Add a function to stop recording
  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSkip = () => {
    if (currentReviewIndex < reviewItems.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
    } else {
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setLocation("/vocabulary-review");
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    // Don't mark as incorrect immediately - let user still try
    // Don't update database here - we'll handle it in submit
  };

  const handleCopyAnswer = () => {
    if (currentReview) {
      setUserAnswer(currentReview.target_en);
    }
  };

  // Video functions
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
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
    if (currentReview && videoRef.current && reviewStarted) {
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
  }, [currentReview, reviewStarted, videos]);

  // For active session, keep the original layout without sidebar
  if (isActiveSession && reviewStarted) {
    // Show loading state
    if (isLoadingReviews) {
      return (
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">{t("loadingReviews")}</p>
          </div>
        </div>
      );
    }

    // No reviews available
    if (reviewItems.length === 0) {
      return (
        <div className="h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <Volume2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("noReviewsDue")}
            </h2>
            <p className="text-gray-600 mb-6">{t("allCaughtUp")}</p>
            <button
              onClick={() => handleNavigate("vocabulary-review")}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-medium">{t("back")}</span>
            </button>
          </div>
        </div>
      );
    }

    return (
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
                  onClick={() => handleNavigate("vocabulary-review")}
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
              {/* Video */}
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

              {/* Subtitles */}
              <div className="p-4 space-y-2 bg-gray-50 border-t border-gray-200">
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
                      {subtitle.position === "current"
                        ? subtitles.find((s) => s.id === "3-zh")?.text ||
                          subtitle.text
                        : subtitle.text}
                    </div>
                  ))}
              </div>
            </div>

            {/* Right Side - Review Interface */}
            <div className="w-1/3 bg-white flex flex-col border-l border-gray-200">
              <div className="p-6 space-y-4 flex-1">
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
                    <p className="mt-1 text-sm macos-body">
                      {isCorrect ? t("wellDone") : t("tryAgain")}
                    </p>
                  </div>
                )}

                {/* Input Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 macos-title">
                    {t("listenAndType")}
                  </h4>
                  <div className="space-y-3">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder={t("typeEnglishSentence")}
                      className="w-full macos-input resize-none macos-body"
                      rows={3}
                    />

                    <div className="flex space-x-2">
                      {!isListening ? (
                        <button
                          onClick={handleVoiceInput}
                          disabled={isModelDownloading}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                        >
                          <Mic className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {isModelDownloading
                              ? `${t("downloading") || "Downloading"} ${modelDownloadProgress ? `${Math.round(modelDownloadProgress)}%` : "..."}`
                              : t("voiceInput")}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={stopVoiceRecording}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-red-500 text-white hover:bg-red-600 animate-pulse"
                        >
                          <div className="w-4 h-4 bg-white rounded-full" />
                          <span className="text-sm font-medium">
                            {t("stopRecording") || "Stop Recording"}
                          </span>
                        </button>
                      )}
                      <button
                        onClick={handleSkip}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-gray-500 text-white hover:bg-gray-600"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("skip")}</span>
                      </button>
                      <button
                        onClick={handleShowAnswer}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-yellow-500 text-white hover:bg-yellow-600"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {t("showAnswer")}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Show Answer */}
                {showAnswer && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 macos-title">
                      {t("correctAnswerFull")}
                    </h4>
                    <div className="bg-white rounded-md p-3 border border-gray-200 min-h-[60px]">
                      <p className="text-gray-800 italic macos-body leading-relaxed break-words">
                        "{currentReview?.target_en}"
                      </p>
                    </div>
                    <div className="space-y-3">
                      <button
                        onClick={handleCopyAnswer}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <Copy className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {t("copyAnswerToInput")}
                        </span>
                      </button>
                      <div className="text-xs text-gray-500 macos-body">
                        {t("practiceTyping")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!userAnswer.trim()}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  <span className="text-sm font-medium">
                    {t("submitAnswer")}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For non-session setup page, add sidebar layout
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
          {/* Content Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("vocabularyReview")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">{t("readyToStart")}</p>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-lg mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Volume2 className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t("readyToStart")}?
              </h2>
              <p className="text-gray-600 mb-8">
                {t("reviewDescription").replace(
                  "{count}",
                  stats.wordsToReview.toString(),
                )}
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <h3 className="font-semibold text-gray-900 mb-2">
                  {t("reviewStatistics")}
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.wordsToReview}
                    </div>
                    <div className="text-gray-500">{t("wordsToReview")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.masteredWords}
                    </div>
                    <div className="text-gray-500">{t("masteredWords")}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {stats.overdueWords}
                    </div>
                    <div className="text-gray-500">{t("overdueWords")}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={startReview}
                disabled={stats.wordsToReview === 0}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium">
                  {stats.wordsToReview > 0
                    ? t("startReview")
                    : t("noReviewsDue")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
