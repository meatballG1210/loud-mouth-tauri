import React, { useState, useRef, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
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
import { speechApi, audioToBase64, convertWebmToWav, analyzeAudioLevel } from "@/api/speech";
import { listen } from "@tauri-apps/api/event";
import { checkAnswerSimilarity } from "@/utils/string-similarity";
import { ReviewErrorBoundary } from "@/components/vocabulary/vocabulary-error-boundary";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/SupabaseAuthProvider";
import { ReviewCompletionDialog } from "@/components/vocabulary/review-completion-dialog";
import { SpeechRecognitionErrorDialog, SpeechErrorType } from "@/components/vocabulary/speech-recognition-error-dialog";

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
  const [matchSession, paramsSession] = useRoute("/vocabulary-review/:videoId/session");
  const [matchSetup, paramsSetup] = useRoute("/vocabulary-review/:videoId");
  // Filter out "session" as a videoId since it's a route keyword
  const rawVideoId = paramsSession?.videoId || paramsSetup?.videoId;
  const reviewVideoId = (rawVideoId && rawVideoId !== "session") ? rawVideoId : undefined;
  const { stats: videoStats, refreshVideos, videos: allVideos } = useVideos();
  const { stats, updateReviewWithResult, refreshVocabulary } = useVocabulary(allVideos);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState("reviews");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check if we're in an active review session based on URL
  const isActiveSession = location === "/vocabulary-review/session" || matchSession;
  const isGeneralReviewSession = location === "/vocabulary-review/session" && !reviewVideoId;
  
  // Completion dialog state
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
  // Speech error dialog state
  const [showSpeechErrorDialog, setShowSpeechErrorDialog] = useState(false);
  const [speechErrorType, setSpeechErrorType] = useState<SpeechErrorType>("general");
  const [speechErrorMessage, setSpeechErrorMessage] = useState<string | undefined>();

  // Review state
  const [reviewStarted, setReviewStarted] = useState(isActiveSession);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [showMarkAsKnown, setShowMarkAsKnown] = useState(false);
  const [shownAnswerItems, setShownAnswerItems] = useState<Set<string>>(
    new Set(),
  );
  const [hasSubmittedReview, setHasSubmittedReview] = useState(false);

  // Speech recognition state
  const [modelDownloadProgress, setModelDownloadProgress] = useState<
    number | null
  >(null);
  const [isModelDownloading, setIsModelDownloading] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
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
  
  // For general review setup page - count of available reviews
  const [generalReviewCount, setGeneralReviewCount] = useState(0);
  const [isLoadingGeneralCount, setIsLoadingGeneralCount] = useState(true);
  
  // Video-specific review counts
  const [videoReviewCounts, setVideoReviewCounts] = useState<Array<{
    videoId: string;
    videoTitle: string;
    count: number;
  }>>([]);
  const [isLoadingVideoCounts, setIsLoadingVideoCounts] = useState(true);
  const [showVideoList, setShowVideoList] = useState(false);
  const [navigationSource, setNavigationSource] = useState<"review-video-list" | "vocabulary-detail" | null>(null);
  
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
          console.log('Sample item:', {
            word: items[0].word,
            next_review_at: items[0].next_review_at,
            video_id: items[0].video_id
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
        const videoGroups = items.reduce((acc, item) => {
          const videoId = item.video_id;
          if (!acc[videoId]) {
            const video = videos.find(v => v.id === videoId);
            acc[videoId] = {
              videoId,
              videoTitle: video?.title || 'Unknown Video',
              count: 0
            };
          }
          acc[videoId].count++;
          return acc;
        }, {} as Record<string, { videoId: string; videoTitle: string; count: number }>);
        
        // Convert to array and sort by count (descending)
        const videoCountsArray = Object.values(videoGroups)
          .sort((a, b) => b.count - a.count);
        
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

  // Cleanup effect - stop any recording when component unmounts
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsListening(false);
      setIsProcessingAudio(false);
      setCountdown(null);
    };
  }, []);

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

    // Clean up any ongoing audio recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    setIsProcessingAudio(false);
    setCountdown(null);

    if (section === "home") {
      setLocation("/");
    } else if (section === "vocabulary-review" || section === "back") {
      // Reset review state when going back to setup
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowMarkAsKnown(false);
      setShownAnswerItems(new Set());
      
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
    setShowMarkAsKnown(false);
    setShownAnswerItems(new Set());
    setHasSubmittedReview(false);
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

    // Use enhanced similarity check with multiple strategies
    // This handles filler words, contractions, dialog markers, and more
    const isAnswerCorrect = checkAnswerSimilarity(
      userAnswer.trim(),
      currentReview.target_en,
      0.85 // threshold
    );

    setIsCorrect(isAnswerCorrect);

    // Show "Mark as Known" button only when answer is incorrect
    if (!isAnswerCorrect) {
      setShowMarkAsKnown(true);
    }

    // Track the review if this is the first submission and not after showing answer
    if (!hasSubmittedReview && !showAnswer && currentReview.id) {
      await updateReviewWithResult(currentReview.id, isAnswerCorrect);
      setHasSubmittedReview(true);
      // Invalidate accuracy stats to force refresh
      queryClient.invalidateQueries({ queryKey: ["accuracy-stats"] });
    }

    // If answer was shown, handle differently
    if (showAnswer && currentReview.id) {
      // Add to end of queue for re-review
      setReviewItems((prev) => [...prev, currentReview]);
      setShownAnswerItems((prev) => new Set(prev).add(currentReview.id!));

      // Handle based on correctness
      if (isAnswerCorrect) {
        // CORRECT: Play video then move to next
        console.log("Answer is correct after show answer, playing video");
        if (videoRef.current && currentReview) {
          const video = videoRef.current;
          const startTime = currentReview.timestamp / 1000;
          const endTime = (currentReview.timestamp + 2000) / 1000;

          // Disable auto-pause temporarily
          setShouldAutoPause(false);

          video.currentTime = startTime;
          video
            .play()
            .then(() => {
              console.log(
                "Video started playing successfully (after show answer)",
              );
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
                      setShowMarkAsKnown(false);
                    } else {
                      // Review completed
                      console.log("Review session completed");
                      setShowCompletionDialog(true);
                      setReviewStarted(false);
                      setCurrentReviewIndex(0);
                      setUserAnswer("");
                      setIsCorrect(null);
                      setShowAnswer(false);
                      setShowMarkAsKnown(false);
                      setShownAnswerItems(new Set());
                      // Refresh vocabulary to update pending review counts
                      refreshVocabulary();
                      // If we have a video ID, go back to vocabulary detail page
                      if (reviewVideoId) {
                        setLocation(`/vocabulary-list/${reviewVideoId}`);
                      } else {
                        setLocation("/vocabulary-review");
                      }
                    }
                  }, 500);
                }
              };

              video.addEventListener("timeupdate", handleTimeUpdate);
            })
            .catch((error) => {
              console.error("Error playing video after show answer:", error);
              // Re-enable auto-pause on error
              setShouldAutoPause(true);

              // Still move to next even if video fails
              setTimeout(() => {
                if (currentReviewIndex < reviewItems.length - 1) {
                  setCurrentReviewIndex((prev) => prev + 1);
                  setUserAnswer("");
                  setIsCorrect(null);
                  setShowAnswer(false);
                  setShowMarkAsKnown(false);
                } else {
                  setShowCompletionDialog(true);
                  setReviewStarted(false);
                  setCurrentReviewIndex(0);
                  setUserAnswer("");
                  setIsCorrect(null);
                  setShowAnswer(false);
                  setShowMarkAsKnown(false);
                  setShownAnswerItems(new Set());
                  // Refresh vocabulary to update pending review counts
                  refreshVocabulary();
                  // If we have a video ID, go back to vocabulary detail page
                  if (reviewVideoId) {
                    setLocation(`/vocabulary-list/${reviewVideoId}`);
                  } else {
                    setLocation("/vocabulary-review");
                  }
                }
              }, 500);
            });
        }
      }
      // INCORRECT: Stay on current word - don't move to next
      // User can retry or click "Mark as Known"

      return; // Exit early - no DB update in either case
    }

    // Normal flow: update database only if answer wasn't shown
    // This is now handled earlier in the function with hasSubmittedReview check

    // Play video and move to next only if correct and answer wasn't shown
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
                    setShowMarkAsKnown(false);
                    setHasSubmittedReview(false);
                  } else {
                    // Review completed
                    console.log("Review session completed");
                    setShowCompletionDialog(true);
                    setReviewStarted(false);
                    setCurrentReviewIndex(0);
                    setUserAnswer("");
                    setIsCorrect(null);
                    setShowAnswer(false);
                    setShowMarkAsKnown(false);
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
      // Start recording immediately but show 3-second countdown
      setCountdown(3);
      
      // Start recording right away to capture early speech
      startRecording();

      // Countdown timer (visual only - recording already started)
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            // Recording is already in progress
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Voice input error:", error);
      setCountdown(null);
    }
  };

  const startRecording = async () => {
    try {
      console.log('Starting recording - checking microphone access...');

      // Check if model is available
      const modelName = "ggml-small.bin";
      const hasModel = await speechApi.checkWhisperModel(modelName);

      if (!hasModel) {
        // Download model if not available
        const shouldDownload = window.confirm(
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
          setSpeechErrorType("general");
          setSpeechErrorMessage(t("modelDownloadFailed") || "Failed to download speech recognition model. Please try again later.");
          setShowSpeechErrorDialog(true);
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

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('MediaDevices API not available');
        setSpeechErrorType("microphone-error");
        setSpeechErrorMessage("Your browser doesn't support microphone access. Please use a modern browser like Chrome, Edge, or Safari.");
        setShowSpeechErrorDialog(true);
        return;
      }

      // Request microphone permission with optimized settings
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // Match Vosk's expected sample rate
          channelCount: 1, // Mono audio for better recognition
        },
      });

      console.log('Microphone access granted:', stream.getAudioTracks());

      // Create MediaRecorder with compatible settings
      let mediaRecorder: MediaRecorder;
      
      // Try different mime types for better compatibility
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (selectedMimeType) {
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          audioBitsPerSecond: 128000,
        });
        console.log('Using audio format:', selectedMimeType);
      } else {
        // Fallback to default if no supported type found
        mediaRecorder = new MediaRecorder(stream);
        console.log('Using default audio format');
      }

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessingAudio(true);
        try {
          // Create blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, {
            type: selectedMimeType || "audio/webm",
          });

          console.log('Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length
          });

          // Check if we have actual audio data
          if (audioBlob.size === 0 || audioChunksRef.current.length === 0) {
            throw new Error('No audio data recorded');
          }

          // Analyze audio level to check if it contains speech
          const audioAnalysis = await analyzeAudioLevel(audioBlob);
          
          if (!audioAnalysis.hasAudio) {
            console.warn('Audio appears to be silent or too quiet:', audioAnalysis);
            throw new Error('No speech detected. Please speak louder and try again.');
          }

          // Convert to WAV format
          let wavBlob: Blob;
          try {
            wavBlob = await convertWebmToWav(audioBlob);
            console.log('WAV conversion successful:', {
              size: wavBlob.size,
              type: wavBlob.type
            });
          } catch (conversionError) {
            console.error('WAV conversion failed:', conversionError);
            // Try using the original blob as fallback
            wavBlob = audioBlob;
            console.log('Using original audio blob as fallback');
          }

          // Convert to base64
          const base64Audio = await audioToBase64(wavBlob);

          // Send to Tauri for transcription
          const result = await speechApi.transcribeAudio(
            base64Audio,
            modelName,
          );

          // Check for common Whisper hallucinations
          const commonHallucinations = [
            'thank you',
            'thanks',
            'thank you.',
            'thanks.',
            'you\'re welcome',
            'thanks for watching',
            'thank you for watching',
            'please subscribe',
            'like and subscribe',
            'see you next time',
            'bye bye',
            'music',
            '[music]',
            '♪',
          ];
          
          const resultLower = result.text.toLowerCase().trim();
          const isHallucination = commonHallucinations.some(phrase => 
            resultLower === phrase.toLowerCase() || 
            resultLower.includes(phrase.toLowerCase())
          );
          
          if (isHallucination) {
            console.warn('Detected Whisper hallucination:', result.text);
            throw new Error('HALLUCINATION: Speech recognition failed. Please try speaking more clearly.');
          }

          // Update the answer field
          setUserAnswer(result.text);
        } catch (error: any) {
          console.error("Transcription error:", error);
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          
          // Show error dialog with specific error type
          if (errorMessage.includes('No audio data')) {
            setSpeechErrorType("no-audio");
          } else if (errorMessage.includes('No speech detected') || errorMessage.includes('SILENT_AUDIO')) {
            setSpeechErrorType("no-speech");
          } else if (errorMessage.includes('Speech recognition failed') || errorMessage.includes('HALLUCINATION')) {
            setSpeechErrorType("recognition-failed");
          } else if (errorMessage.includes('REPETITIVE_TEXT')) {
            setSpeechErrorType("repetitive-text");
          } else if (errorMessage.includes('decoding') || errorMessage.includes('Decoding')) {
            setSpeechErrorType("audio-format");
          } else {
            setSpeechErrorType("general");
            setSpeechErrorMessage(errorMessage);
          }
          setShowSpeechErrorDialog(true);
        } finally {
          // Stop all tracks
          stream.getTracks().forEach((track) => track.stop());
          setIsListening(false);
          setIsProcessingAudio(false);
        }
      };

      // Start recording with a small buffer to capture initial audio
      setIsListening(true);
      
      // Add a small delay to ensure MediaRecorder is fully ready
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Start recording with timeslice to capture data more frequently
      mediaRecorder.start(100); // Capture data every 100ms

      // Stop recording after 10 seconds max
      setTimeout(() => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      }, 10000);
    } catch (error: any) {
      console.error("Voice input error:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        type: typeof error,
        constructor: error?.constructor?.name
      });

      setIsListening(false);
      setCountdown(null);

      // Detailed error handling based on error type
      if (error instanceof DOMException) {
        switch (error.name) {
          case "NotAllowedError":
            console.log('Microphone permission denied by user');
            setSpeechErrorType("permission-denied");
            break;
          case "NotFoundError":
            console.log('No microphone device found');
            setSpeechErrorType("microphone-not-found");
            break;
          case "NotReadableError":
            console.log('Microphone is in use by another application');
            setSpeechErrorType("microphone-in-use");
            break;
          case "OverconstrainedError":
            console.log('Microphone constraints could not be satisfied');
            setSpeechErrorType("microphone-error");
            setSpeechErrorMessage("Your microphone doesn't support the required audio settings. Please try a different microphone.");
            break;
          case "AbortError":
            console.log('Microphone access was aborted');
            setSpeechErrorType("microphone-error");
            setSpeechErrorMessage("Microphone access was interrupted. Please try again.");
            break;
          case "SecurityError":
            console.log('Microphone access blocked by security policy');
            setSpeechErrorType("permission-denied");
            setSpeechErrorMessage("Microphone access is blocked by your browser's security settings. Please check your browser permissions.");
            break;
          default:
            console.log('Unknown DOMException:', error.name);
            setSpeechErrorType("microphone-error");
            setSpeechErrorMessage(`Microphone error: ${error.message}`);
        }
      } else {
        console.log('Non-DOMException error');
        setSpeechErrorType("general");
        setSpeechErrorMessage(error?.message || "Failed to start voice input. Please check your microphone and try again.");
      }
      setShowSpeechErrorDialog(true);
    }
  };

  // Add a function to stop recording
  const stopVoiceRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      setIsListening(false); // Immediately update UI
      mediaRecorderRef.current.stop();
    }
    setCountdown(null); // Clear countdown if active
  };

  const handleSkip = () => {
    // Clean up any ongoing audio recording
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
    setIsProcessingAudio(false);
    setCountdown(null);

    if (currentReviewIndex < reviewItems.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowMarkAsKnown(false);
      setHasSubmittedReview(false);
    } else {
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowMarkAsKnown(false);
      setShownAnswerItems(new Set());
      // If we have a video ID, go back to vocabulary detail page
      if (reviewVideoId) {
        setLocation(`/vocabulary-list/${reviewVideoId}`);
      } else {
        setLocation("/vocabulary-review");
      }
    }
  };

  const handleMarkAsKnown = async () => {
    if (!currentReview) return;

    try {
      // Update the vocabulary item as correct in the database
      if (currentReview.id && !hasSubmittedReview) {
        await updateReviewWithResult(currentReview.id, true);
        setHasSubmittedReview(true);
        // Invalidate accuracy stats to force refresh
        queryClient.invalidateQueries({ queryKey: ["accuracy-stats"] });
      }

      // Play the current sentence automatically before moving to next
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

                // Move to next question
                setTimeout(() => {
                  if (currentReviewIndex < reviewItems.length - 1) {
                    setCurrentReviewIndex((prev) => prev + 1);
                    setUserAnswer("");
                    setIsCorrect(null);
                    setShowAnswer(false);
                    setShowMarkAsKnown(false);
                    setHasSubmittedReview(false);
                    setShowMarkAsKnown(false);
                  } else {
                    // Review completed
                    setShowCompletionDialog(true);
                    setReviewStarted(false);
                    setCurrentReviewIndex(0);
                    setUserAnswer("");
                    setIsCorrect(null);
                    setShowAnswer(false);
                    setShowMarkAsKnown(false);
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
                }, 500);
              }
            };

            video.addEventListener("timeupdate", handleTimeUpdate);
          })
          .catch((error) => {
            console.error("Error playing video after marking as known:", error);
            setShouldAutoPause(true);

            // Still move to next even if video fails
            if (currentReviewIndex < reviewItems.length - 1) {
              setCurrentReviewIndex((prev) => prev + 1);
              setUserAnswer("");
              setIsCorrect(null);
              setShowAnswer(false);
              setShowMarkAsKnown(false);
            } else {
              setShowCompletionDialog(true);
              setReviewStarted(false);
              setCurrentReviewIndex(0);
              setUserAnswer("");
              setIsCorrect(null);
              setShowAnswer(false);
              setShowMarkAsKnown(false);
              setShownAnswerItems(new Set());
              // Refresh vocabulary to update pending review counts
              refreshVocabulary();
              // If we have a video ID, go back to vocabulary detail page
              if (reviewVideoId) {
                setLocation(`/vocabulary-list/${reviewVideoId}`);
              } else {
                setLocation("/vocabulary-review");
              }
            }
          });
      }
    } catch (error) {
      console.error("Error marking vocabulary as known:", error);
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

  // Helper function to move to next question and handle failed reviews
  const moveToNextQuestion = async () => {
    // If answer was shown but not marked as known, record as failed review
    if (showAnswer && !hasSubmittedReview && currentReview?.id) {
      await updateReviewWithResult(currentReview.id, false);
      setHasSubmittedReview(true);
      // Invalidate accuracy stats to force refresh
      queryClient.invalidateQueries({ queryKey: ["accuracy-stats"] });
    }

    if (currentReviewIndex < reviewItems.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowMarkAsKnown(false);
      setHasSubmittedReview(false);
    } else {
      // Review completed
      setShowCompletionDialog(true);
      setReviewStarted(false);
      setCurrentReviewIndex(0);
      setUserAnswer("");
      setIsCorrect(null);
      setShowAnswer(false);
      setShowMarkAsKnown(false);
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
    if (currentReview && videoRef.current && (reviewStarted || isActiveSession)) {
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
                {reviewVideoId && videos.find(v => v.id === reviewVideoId) 
                  ? `No words due for review from "${videos.find(v => v.id === reviewVideoId)?.title}"`
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
                      {isCorrect && currentReview?.target_en && (
                        <p className="mt-2 text-sm text-green-700 italic macos-body">
                          "{currentReview.target_en}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Input Section */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 macos-title">
                      Type or Speak
                    </h4>
                    <div className="space-y-3">
                      <textarea
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type or speak the English translation..."
                        className="w-full macos-input resize-none macos-body"
                        rows={3}
                      />

                      <div className="flex space-x-2">
                        {!isListening &&
                        !isProcessingAudio &&
                        countdown === null ? (
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
                        ) : countdown !== null ? (
                          <button
                            disabled
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-orange-500 text-white cursor-not-allowed"
                          >
                            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                            <span className="text-sm font-medium">
                              {countdown === 0
                                ? t("speakNow") || "Speak now!"
                                : `${t("getReady") || "Get ready"} ${countdown}...`}
                            </span>
                          </button>
                        ) : isListening ? (
                          <button
                            onClick={stopVoiceRecording}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-red-500 text-white hover:bg-red-600 animate-pulse"
                          >
                            <div className="w-4 h-4 bg-white rounded-full" />
                            <span className="text-sm font-medium">
                              {t("stopRecording") || "Stop Recording"}
                            </span>
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-gray-400 text-white cursor-not-allowed"
                          >
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            <span className="text-sm font-medium">
                              {t("processing") || "Processing..."}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={handleSkip}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-gray-500 text-white hover:bg-gray-600"
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {t("skip")}
                          </span>
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
                        {showMarkAsKnown && isCorrect === false && (
                          <button
                            onClick={handleMarkAsKnown}
                            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-macos bg-green-500 text-white hover:bg-green-600"
                          >
                            <Check className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              {t("markAsKnown")}
                            </span>
                          </button>
                        )}
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
        
        {/* Speech Recognition Error Dialog */}
        <SpeechRecognitionErrorDialog
          open={showSpeechErrorDialog}
          onOpenChange={setShowSpeechErrorDialog}
          errorType={speechErrorType}
          errorMessage={speechErrorMessage}
          onRetry={handleVoiceInput}
        />
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
                          {videoReviewCounts.length > 0 && (
                            showVideoList ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />
                          )}
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
                                        setNavigationSource("review-video-list");
                                        // Go directly to review session for this video
                                        setLocation(`/vocabulary-review/${videoData.videoId}/session`);
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
      
      {/* Speech Recognition Error Dialog */}
      <SpeechRecognitionErrorDialog
        open={showSpeechErrorDialog}
        onOpenChange={setShowSpeechErrorDialog}
        errorType={speechErrorType}
        errorMessage={speechErrorMessage}
        onRetry={handleVoiceInput}
      />
    </div>
  );
}
