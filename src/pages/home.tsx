import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Grid,
  List,
  RefreshCw,
  Search,
  SortAsc,
  SortDesc,
  Filter,
} from "lucide-react";
import { WindowTitleBar } from "@/components/layout/window-titlebar";
import { Sidebar } from "@/components/layout/sidebar";
import { VideoGrid } from "@/components/video/video-grid";
import { useVideos } from "@/hooks/use-videos";
import { Video } from "@/types/video";
import { useLanguage } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export default function Home() {
  const { videos, stats, isLoading, refreshVideos, deleteVideo } = useVideos();
  const [activeSection, setActiveSection] = useState("videos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [subtitleFilters, setSubtitleFilters] = useState({
    english: true,
    chinese: true,
    noSubtitles: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const VIDEOS_PER_PAGE = 9;

  const handleNavigate = (section: string) => {
    console.log("Navigate to:", section);
    if (section === "vocabulary") {
      setLocation("/vocabulary-list");
    } else if (section === "reviews") {
      setLocation("/vocabulary-review");
    } else if (section === "progress") {
      setLocation("/progress");
    } else if (section === "settings") {
      setLocation("/settings");
    } else if (section === "videos") {
      setActiveSection("videos");
      setLocation("/");
    } else {
      setActiveSection(section);
    }
  };

  const handleUploadVideo = () => {
    console.log("Upload video clicked");
    setLocation("/upload");
  };

  const handlePlayVideo = (video: Video) => {
    console.log("Play video:", video.title);
    setLocation(`/video/${video.id}`);
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    console.log("View mode changed to:", mode);
  };

  // Filter and sort videos based on search query, subtitle filters, and sort order
  const filteredAndSortedVideos = useMemo(() => {
    let filtered = videos.filter((video) => {
      // Filter by search query
      const matchesSearch = video.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      // Filter by subtitle availability
      const hasEnglish = video.subtitles.english;
      const hasChinese = video.subtitles.chinese;
      const hasNoSubtitles = !hasEnglish && !hasChinese;

      const matchesSubtitleFilter =
        (subtitleFilters.english && hasEnglish) ||
        (subtitleFilters.chinese && hasChinese) ||
        (subtitleFilters.noSubtitles && hasNoSubtitles);

      return matchesSearch && matchesSubtitleFilter;
    });

    filtered.sort((a, b) => {
      // Parse dates in "MMM DD, YYYY" format
      const dateA = new Date(a.uploadDate);
      const dateB = new Date(b.uploadDate);

      if (sortOrder === "newest") {
        return dateB.getTime() - dateA.getTime();
      } else {
        return dateA.getTime() - dateB.getTime();
      }
    });

    return filtered;
  }, [videos, searchQuery, subtitleFilters, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(
    filteredAndSortedVideos.length / VIDEOS_PER_PAGE,
  );
  const paginatedVideos = useMemo(() => {
    const startIndex = (currentPage - 1) * VIDEOS_PER_PAGE;
    const endIndex = startIndex + VIDEOS_PER_PAGE;
    return filteredAndSortedVideos.slice(startIndex, endIndex);
  }, [filteredAndSortedVideos, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSubtitleFilterChange = (filter: keyof typeof subtitleFilters) => {
    setSubtitleFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
  };

  const getActiveFiltersCount = () => {
    return Object.values(subtitleFilters).filter(Boolean).length;
  };

  const hasActiveFilters = getActiveFiltersCount() < 3;

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      {/* <WindowTitleBar title={t("homeTitle")} /> */}

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          stats={stats}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onUploadVideo={handleUploadVideo}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={refreshVideos}
          isLoading={isLoading}
        />

        <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
          {/* Content Header */}
          <div className="flex flex-col space-y-4 p-6 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t("videos")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t("homeSubtitle")}
                </p>
              </div>

              {activeSection === "videos" && (
                <div className="flex items-center space-x-3">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => handleViewModeChange("grid")}
                      className={`px-3 py-2 rounded-md transition-macos ${
                        viewMode === "grid"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleViewModeChange("list")}
                      className={`px-3 py-2 rounded-md transition-macos ${
                        viewMode === "list"
                          ? "bg-white shadow-sm text-gray-900"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={refreshVideos}
                    disabled={isLoading}
                    className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-macos disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                    <span className="text-sm font-medium">{t("refresh")}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Search and Sort Controls */}
            {activeSection === "videos" && (
              <div className="flex items-center space-x-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search videos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 border font-medium text-sm ${
                        hasActiveFilters
                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span>
                        Subtitles
                        {hasActiveFilters && ` (${getActiveFiltersCount()})`}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by Subtitles</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={subtitleFilters.english}
                      onCheckedChange={() =>
                        handleSubtitleFilterChange("english")
                      }
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        English Subtitles
                      </span>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={subtitleFilters.chinese}
                      onCheckedChange={() =>
                        handleSubtitleFilterChange("chinese")
                      }
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                        Chinese Subtitles
                      </span>
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={subtitleFilters.noSubtitles}
                      onCheckedChange={() =>
                        handleSubtitleFilterChange("noSubtitles")
                      }
                    >
                      <span className="flex items-center">
                        <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                        No Subtitles
                      </span>
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 font-medium text-sm">
                      {sortOrder === "newest" ? (
                        <SortDesc className="w-4 h-4" />
                      ) : (
                        <SortAsc className="w-4 h-4" />
                      )}
                      <span>
                        {sortOrder === "newest"
                          ? "Newest First"
                          : "Oldest First"}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setSortOrder("newest")}>
                      <SortDesc className="w-4 h-4 mr-2" />
                      Newest First
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                      <SortAsc className="w-4 h-4 mr-2" />
                      Oldest First
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {(searchQuery ||
                  hasActiveFilters ||
                  filteredAndSortedVideos.length !== videos.length) && (
                  <div className="text-sm text-gray-500">
                    {filteredAndSortedVideos.length} of {videos.length} videos
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Content */}
          {activeSection === "videos" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                <VideoGrid
                  videos={paginatedVideos}
                  isLoading={isLoading}
                  onPlayVideo={handlePlayVideo}
                  onDeleteVideo={deleteVideo}
                  onUploadVideo={handleUploadVideo}
                  viewMode={viewMode}
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-center items-center p-6 bg-white border-t border-gray-100 gap-4">
                  <Pagination>
                    <PaginationContent className="gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            handlePageChange(Math.max(1, currentPage - 1))
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {[...Array(totalPages)].map((_, index) => {
                        const page = index + 1;
                        const isCurrentPage = page === currentPage;

                        // Show first page, last page, current page, and pages around current
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1;

                        if (!showPage) {
                          // Show ellipsis for gaps
                          if (page === 2 && currentPage > 4) {
                            return (
                              <PaginationItem key={`ellipsis-${page}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          if (
                            page === totalPages - 1 &&
                            currentPage < totalPages - 3
                          ) {
                            return (
                              <PaginationItem key={`ellipsis-${page}`}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => handlePageChange(page)}
                              isActive={isCurrentPage}
                              className="cursor-pointer"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            handlePageChange(
                              Math.min(totalPages, currentPage + 1),
                            )
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <div className="sm:ml-6 text-sm text-gray-500 whitespace-nowrap flex-shrink-0">
                    Page {currentPage} of {totalPages} (
                    {filteredAndSortedVideos.length} videos)
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {activeSection.charAt(0).toUpperCase() +
                    activeSection.slice(1)}
                </h2>
                <p className="text-gray-500">This section is coming soon!</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
