import { useState } from "react";
import { useLocation } from "wouter";
import {
  BookOpen,
  Play,
  Search,
} from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useVocabulary } from "@/hooks/use-vocabulary";
import { useVideos } from "@/hooks/use-videos";
import { VocabularyItem } from "@/types/video";
import { useLanguage } from "@/lib/i18n";
import { VocabularyErrorBoundary } from "@/components/vocabulary/vocabulary-error-boundary";

export default function VocabularyList() {
  const { stats: videoStats, refreshVideos, videos } = useVideos();
  const { vocabulary, stats, isLoading } = useVocabulary(videos);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"word" | "lastReviewed" | "videoUploadDate">("videoUploadDate");
  const [filterBy, setFilterBy] = useState<"all" | "starred" | "due">("all");
  const [activeSection, setActiveSection] = useState("vocabulary");

  // Filter vocabulary first
  const filteredVocabulary = vocabulary.filter((item) => {
    const matchesSearch =
      item.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.translation.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterBy === "starred") return item.isStarred;
    if (filterBy === "due") return new Date(item.nextReview) <= new Date();

    return true;
  });

  // Sort filtered vocabulary
  const sortedVocabulary = [...filteredVocabulary].sort((a, b) => {
    switch (sortBy) {
      case "word":
        return a.word.localeCompare(b.word);
      case "lastReviewed":
        return (
          new Date(b.lastReviewed).getTime() -
          new Date(a.lastReviewed).getTime()
        );
      case "videoUploadDate":
        // Sort by video upload date (newest first)
        // If date is missing, treat as oldest
        const dateA = a.videoUploadDate ? new Date(a.videoUploadDate).getTime() : 0;
        const dateB = b.videoUploadDate ? new Date(b.videoUploadDate).getTime() : 0;
        return dateB - dateA;
      default:
        return 0;
    }
  });

  // Group filtered and sorted vocabulary by video
  const vocabularyByVideo = sortedVocabulary.reduce(
    (acc, item) => {
      if (!acc[item.videoId]) {
        acc[item.videoId] = {
          videoTitle: item.videoTitle,
          words: [],
        };
      }
      acc[item.videoId].words.push(item);
      return acc;
    },
    {} as Record<string, { videoTitle: string; words: VocabularyItem[] }>,
  );

  const handleNavigate = (section: string) => {
    console.log("Navigate to:", section);
    if (section === "videos") {
      setLocation("/");
    } else if (section === "vocabulary") {
      // Already on vocabulary page
      return;
    } else if (section === "reviews") {
      setLocation("/vocabulary-review");
    } else {
      setActiveSection(section);
    }
  };

  const handleUploadVideo = () => {
    console.log("Upload video clicked");
    setLocation("/upload");
  };

  const handleViewWords = (videoId: string) => {
    setLocation(`/vocabulary-list/${videoId}`);
  };

  const handlePlayVideo = (videoId: string, timestamp?: number) => {
    const timestampParam = timestamp ? `?t=${timestamp}` : "";
    setLocation(`/video-player/${videoId}${timestampParam}`);
  };


  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          stats={videoStats}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onUploadVideo={handleUploadVideo}
          viewMode="grid"
          onViewModeChange={() => {}}
          onRefresh={refreshVideos}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <VocabularyErrorBoundary>
            {/* Content Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-6 h-6 text-blue-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("vocabularyList")}
                </h1>
                <p className="text-sm text-gray-500">
                  Manage your saved vocabulary across all videos
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex space-x-4">
              <div className="bg-blue-50 rounded-lg px-4 py-2">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalWords}
                </div>
                <div className="text-xs text-blue-500">{t("totalWords")}</div>
              </div>
              <div className="bg-orange-50 rounded-lg px-4 py-2">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.wordsToReview}
                </div>
                <div className="text-xs text-orange-500">
                  {t("wordsToReview")}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg px-4 py-2">
                <div className="text-2xl font-bold text-green-600">
                  {stats.masteredWords}
                </div>
                <div className="text-xs text-green-500">
                  {t("masteredWords")}
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("searchVocabulary")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-80"
                  />
                </div>

                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all">{t("allWords")}</option>
                  <option value="starred">{t("starredWords")}</option>
                  <option value="due">{t("dueForReview")}</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="word">
                    {t("sortBy")} {t("wordColumn")}
                  </option>
                  <option value="lastReviewed">
                    {t("sortBy")} {t("lastReviewedColumn")}
                  </option>
                  <option value="videoUploadDate">
                    {t("sortBy")} {t("videoUploadDateColumn")}
                  </option>
                </select>
              </div>

              {/* Results Summary */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  {searchTerm || filterBy !== "all" ? (
                    <>
                      <span>
                        Showing{" "}
                        <span className="font-semibold text-gray-900">
                          {filteredVocabulary.length}
                        </span>{" "}
                        of {vocabulary.length} words
                      </span>
                      {searchTerm && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                          "{searchTerm}"
                        </span>
                      )}
                      {filterBy !== "all" && (
                        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                          {filterBy}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>
                      <span className="font-semibold text-gray-900">
                        {vocabulary.length}
                      </span>{" "}
                      total words
                    </span>
                  )}
                </div>

                {(searchTerm || filterBy !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterBy("all");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {/* Video Groups */}
            <div className="p-6 space-y-4">
              {Object.keys(vocabularyByVideo).length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm || filterBy !== "all"
                      ? "No matching words found"
                      : "No vocabulary words yet"}
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    {searchTerm || filterBy !== "all"
                      ? "Try adjusting your search or filter criteria."
                      : "Start watching videos and add vocabulary words to see them here."}
                  </p>
                  {(searchTerm || filterBy !== "all") && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterBy("all");
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                Object.entries(vocabularyByVideo).map(
                  ([videoId, videoData]) => {
                    return (
                      <div
                        key={videoId}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                      >
                        {/* Video Header */}
                        <div className="px-6 py-4 flex items-center justify-between bg-gray-50">
                          <div className="flex items-center space-x-3 flex-1">
                            <Play className="w-5 h-5 text-gray-600" />
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {videoData.videoTitle}
                              </h3>
                            </div>
                          </div>
                          <button
                            onClick={() => handleViewWords(videoId)}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium flex items-center space-x-2"
                          >
                            <span>View All</span>
                            <span className="bg-red-500 px-1.5 py-0.5 rounded-full text-xs font-semibold">
                              {videoData.words.length}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </div>
          </div>
          </VocabularyErrorBoundary>
        </div>
      </div>
    </div>
  );
}
