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

interface ReviewItem {
  id: string;
  word: string;
  translation: string;
  context: string;
  targetSentence: string;
  videoId: string;
  videoTitle: string;
  timestamp: number;
}

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

  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [_currentTime, setCurrentTime] = useState(0);
  const [_duration, setDuration] = useState(0);

  // Mock review items
  const mockReviewItems: ReviewItem[] = [
    {
      id: "1",
      word: "surrogate",
      translation: "代理的，替代的",
      context: "Medical discussion about pregnancy options",
      targetSentence: "At first, I was hesitant about the idea.",
      videoId: "video-1",
      videoTitle: "Modern Family S01E01",
      timestamp: 125.5,
    },
    {
      id: "2",
      word: "hesitant",
      translation: "犹豫的，踌躇的",
      context: "Character expressing uncertainty",
      targetSentence: "The doctor suggested this option.",
      videoId: "video-1",
      videoTitle: "Modern Family S01E01",
      timestamp: 142.3,
    },
    {
      id: "3",
      word: "option",
      translation: "选择，选项",
      context: "Discussion about choices",
      targetSentence: "We need someone to act as a surrogate mother.",
      videoId: "video-1",
      videoTitle: "Modern Family S01E01",
      timestamp: 156.8,
    },
  ];

  const currentReview = mockReviewItems[currentReviewIndex];
  const progress = ((currentReviewIndex + 1) / mockReviewItems.length) * 100;

  // Mock subtitle data for context
  const mockSubtitles: SubtitleLine[] = [
    {
      id: "1",
      start: 87.2,
      end: 89.8,
      text: "At first, I was hesitant about the idea.",
      language: "english",
      position: "minus2",
    },
    {
      id: "2",
      start: 89.8,
      end: 92.5,
      text: "Initially, I thought it was quite strange.",
      language: "english",
      position: "minus1",
    },
    {
      id: "3",
      start: 92.5,
      end: 95.1,
      text: "起初，我觉得这很奇怪。",
      language: "chinese",
      position: "current",
    },
  ];

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

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      setIsCorrect(false);
      return;
    }

    const correctAnswer = currentReview.targetSentence.toLowerCase();
    const userAnswerLower = userAnswer.toLowerCase().trim();

    // Simple similarity check (in real app, use more sophisticated comparison)
    const isAnswerCorrect =
      userAnswerLower.includes(correctAnswer.slice(0, 10)) ||
      correctAnswer.includes(userAnswerLower.slice(0, 10));

    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      setTimeout(() => {
        if (currentReviewIndex < mockReviewItems.length - 1) {
          setCurrentReviewIndex((prev) => prev + 1);
          setUserAnswer("");
          setIsCorrect(null);
          setShowAnswer(false);
        } else {
          // Review completed
          alert("Review session completed!");
          setReviewStarted(false);
          setCurrentReviewIndex(0);
          setUserAnswer("");
          setIsCorrect(null);
          setShowAnswer(false);
        }
      }, 2000);
    }
  };

  const handleVoiceInput = () => {
    setIsListening(true);
    // Mock voice input
    setTimeout(() => {
      setUserAnswer("At first, I was hesitant about the idea.");
      setIsListening(false);
    }, 2000);
  };

  const handleSkip = () => {
    if (currentReviewIndex < mockReviewItems.length - 1) {
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
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleCopyAnswer = () => {
    setUserAnswer(currentReview.targetSentence);
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

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
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
  }, []);

  if (!reviewStarted && !currentReview) {
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
                <p className="text-sm text-gray-500 mt-1">
                  {t("reviewDescription")}
                </p>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {t("noVideosYet")}
                </h2>
                <p className="text-gray-600 mb-6">{t("uploadFirstVideo")}</p>
                <button
                  onClick={() => handleNavigate("vocabulary")}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm font-medium">{t("back")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For active session, keep the original layout without sidebar
  if (isActiveSession && reviewStarted) {
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
                    {`${currentReviewIndex + 1} of ${mockReviewItems.length}`}
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

              {/* Subtitles */}
              <div className="p-4 space-y-2 bg-gray-50 border-t border-gray-200">
                {mockSubtitles.map((subtitle) => (
                  <div
                    key={subtitle.id}
                    className={`text-center p-3 rounded-lg macos-body transition-all duration-200 ${
                      subtitle.position === "current"
                        ? "bg-blue-50 text-blue-900 shadow-md border-2 border-blue-300 font-medium"
                        : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100 shadow-sm"
                    }`}
                  >
                    {subtitle.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side - Review Interface */}
            <div className="w-1/3 bg-white flex flex-col border-l border-gray-200">
              <div className="p-6 space-y-4 flex-1">
                {/* Word Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 macos-title">
                      {currentReview?.word}
                    </h3>
                  </div>
                  <p className="text-gray-600 macos-body">
                    {currentReview?.translation}
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-700 macos-body italic">
                      "{currentReview?.context}"
                    </p>
                  </div>
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
                      <button
                        onClick={handleVoiceInput}
                        disabled={isListening}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-300"
                      >
                        <Mic className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {isListening ? t("listening") : t("voiceInput")}
                        </span>
                      </button>
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
                        "{currentReview?.targetSentence}"
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
                  mockReviewItems.length.toString(),
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
                      {stats.newWords}
                    </div>
                    <div className="text-gray-500">{t("newWords")}</div>
                  </div>
                </div>
              </div>

              <button
                onClick={startReview}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors bg-blue-500 text-white hover:bg-blue-600"
              >
                <span className="text-sm font-medium">{t("startReview")}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
