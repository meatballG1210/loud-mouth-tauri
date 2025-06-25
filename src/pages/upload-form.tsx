import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, File, CheckCircle, AlertCircle } from "lucide-react";
import { WindowTitleBar } from "@/components/layout/window-titlebar";
import { Sidebar } from "@/components/layout/sidebar";
import { useVideos } from "@/hooks/use-videos";

export default function UploadForm() {
  const [, setLocation] = useLocation();
  const { stats } = useVideos();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [activeSection, setActiveSection] = useState("upload");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));

    if (videoFile) {
      setSelectedFile(videoFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleNavigate = (section: string) => {
    if (section === "videos") {
      setLocation("/");
    } else {
      setActiveSection(section);
      console.log("Navigate to:", section);
    }
  };

  const handleUploadVideo = () => {
    // Already on upload page
  };

  const handleRefresh = () => {
    console.log("Refresh clicked");
  };

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setUploadComplete(true);
          setTimeout(() => {
            setLocation("/");
          }, 2000);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
      <WindowTitleBar />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          stats={stats}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onUploadVideo={handleUploadVideo}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          onRefresh={handleRefresh}
          isLoading={false}
        />

        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Content Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Video</h1>
              <p className="text-sm text-gray-500 mt-1">
                Upload your MP4 video file. The system will automatically extract
                bilingual subtitles if available.
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : selectedFile
                      ? "border-green-400 bg-green-50"
                      : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {uploadComplete ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900 mb-1">
                        Upload Complete!
                      </h3>
                      <p className="text-green-700">
                        Your video has been successfully uploaded and is being processed.
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        Redirecting to video library...
                      </p>
                    </div>
                  </div>
                ) : isUploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-blue-600 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Uploading...
                      </h3>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">{uploadProgress}% complete</p>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <File className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        File Selected
                      </h3>
                      <p className="text-gray-600 font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={handleUpload}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Upload Video
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        Upload MP4 Video
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Drag and drop your video file here, or click to browse
                      </p>
                      <label className="inline-block">
                        <input
                          type="file"
                          accept="video/mp4"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <span className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer font-medium">
                          Select MP4 Video
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Features Section */}
              <div className="mt-12">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Supported Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">MP4 H.264 Encoding</h4>
                      <p className="text-sm text-gray-600">
                        Optimized for high-quality video playback
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Automatic Subtitle Extraction
                      </h4>
                      <p className="text-sm text-gray-600">
                        Extract embedded subtitle tracks automatically
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Bilingual Support</h4>
                      <p className="text-sm text-gray-600">
                        Support for both English and Chinese subtitle tracks
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-orange-600 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-gray-900">Thumbnail Generation</h4>
                      <p className="text-sm text-gray-600">
                        Automatic thumbnail creation for easier video identification
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Requirements */}
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">File Requirements</h4>
                    <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                      <li>• Maximum file size: 2GB</li>
                      <li>• Supported format: MP4 with H.264 encoding</li>
                      <li>• Recommended resolution: 720p or higher</li>
                      <li>
                        • Subtitle tracks will be automatically detected if embedded
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
