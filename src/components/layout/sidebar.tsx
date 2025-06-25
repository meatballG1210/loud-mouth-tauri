import { useState, useEffect } from "react";
import {
  Upload,
  BarChart3,
  Settings,
  BookOpen,
  Brain,
  Video,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { VideoLibraryStats } from "@/types/video";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/components/SupabaseAuthProvider";

interface SidebarProps {
  stats: VideoLibraryStats;
  activeSection: string;
  onNavigate: (section: string) => void;
  onUploadVideo: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function Sidebar({
  stats,
  activeSection,
  onNavigate,
  onUploadVideo,
}: SidebarProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  // Use localStorage to persist sidebar state
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved ? JSON.parse(saved) : false;
  });

  // Save state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div
      className={`${isCollapsed ? "w-16" : "w-64"} bg-gray-50 border-r border-gray-200 flex flex-col macos-sidebar-shadow transition-all duration-300 ease-in-out`}
    >
      {/* Sidebar Header */}
      <div className="relative border-b border-gray-200">
        <div className="p-4 flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">
              {user?.email ? user.email.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          {!isCollapsed && user && (
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold text-gray-900 truncate">
                {user.email}
              </h1>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          )}
        </div>

        {/* Toggle button positioned on the right edge */}
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -translate-y-1/2 -right-3 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm z-10"
          title={isCollapsed ? t("expandSidebar") : t("collapseSidebar")}
        >
          {isCollapsed ? (
            <ChevronRight className="w-3 h-3 text-gray-600" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-600" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1">
        {!isCollapsed && (
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2">
            {t("library")}
          </div>
        )}

        <button
          onClick={() => onNavigate("videos")}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
            activeSection === "videos"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
          }`}
          title={isCollapsed ? t("videos") : undefined}
        >
          <Video className="w-4 h-4" />
          {!isCollapsed && (
            <>
              <span className="text-sm font-medium">{t("videos")}</span>
              <span
                className={`ml-auto text-xs rounded-full px-2 py-0.5 ${
                  activeSection === "videos"
                    ? "bg-white bg-opacity-20 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {stats.totalVideos}
              </span>
            </>
          )}
        </button>

        <button
          onClick={() => onNavigate("vocabulary")}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
            activeSection === "vocabulary"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
          }`}
          title={isCollapsed ? t("vocabulary") : undefined}
        >
          <BookOpen className="w-4 h-4" />
          {!isCollapsed && (
            <>
              <span className="text-sm font-medium">{t("vocabulary")}</span>
              <span className="ml-auto text-xs text-gray-500">
                {stats.totalVocabulary}
              </span>
            </>
          )}
        </button>

        <button
          onClick={() => onNavigate("reviews")}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
            activeSection === "reviews"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
          }`}
          title={isCollapsed ? t("reviews") : undefined}
        >
          <Brain className="w-4 h-4" />
          {!isCollapsed && (
            <>
              <span className="text-sm font-medium">{t("reviews")}</span>
              {stats.dueReviews > 0 && (
                <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-2 py-0.5">
                  {stats.dueReviews}
                </span>
              )}
            </>
          )}
        </button>

        {!isCollapsed && (
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide px-3 py-2 mt-6">
            {t("analytics")}
          </div>
        )}

        <button
          onClick={() => onNavigate("progress")}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
            activeSection === "progress"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
          }`}
          title={isCollapsed ? t("progress") : undefined}
        >
          <BarChart3 className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm font-medium">{t("progress")}</span>}
        </button>

        <button
          onClick={() => onNavigate("settings")}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "space-x-3"} px-3 py-2.5 rounded-lg transition-all duration-200 ${
            activeSection === "settings"
              ? "bg-blue-500 text-white shadow-sm"
              : "text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200"
          }`}
          title={isCollapsed ? t("settings") : undefined}
        >
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm font-medium">{t("settings")}</span>}
        </button>
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-gray-200 space-y-2">
        <button
          onClick={onUploadVideo}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center space-x-2"} px-3 py-2.5 rounded-lg transition-all duration-200 bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md`}
          title={isCollapsed ? t("uploadVideo") : undefined}
        >
          <Upload className="w-4 h-4" />
          {!isCollapsed && (
            <span className="text-sm font-medium">{t("uploadVideo")}</span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center ${isCollapsed ? "justify-center" : "justify-center space-x-2"} px-3 py-2.5 rounded-lg transition-all duration-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200`}
          title={isCollapsed ? t("logout") : undefined}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="text-sm font-medium">{t("logout")}</span>}
        </button>
      </div>
    </div>
  );
}
