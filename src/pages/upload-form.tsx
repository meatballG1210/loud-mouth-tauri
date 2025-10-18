import { useState } from "react";
import { useLocation } from "wouter";
import { Upload, File, CheckCircle, AlertCircle, AlertTriangle, FileX } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { useVideos } from "@/hooks/use-videos";
import { useLanguage } from "@/lib/i18n";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
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

export default function UploadForm() {
  const [, setLocation] = useLocation();
  const { stats } = useVideos();
  const { t } = useLanguage();
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<{ path: string; name: string; size?: number } | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [activeSection, setActiveSection] = useState("upload");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [error, setError] = useState<{ title: string; message: string; isDuplicate: boolean } | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

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

    // In Tauri, we cannot access file paths from drag events due to security restrictions
    // Show a message to use the file picker instead
    alert(t('dragDropNotSupported'));
  };

  const handleFileSelect = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Video',
          extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm']
        }]
      });
      
      if (selected && typeof selected === 'string') {
        // Extract filename from path
        const pathParts = selected.split(/[/\\]/);
        const filename = pathParts[pathParts.length - 1];
        
        setSelectedFile({
          path: selected,
          name: filename
        });
      }
    } catch (error) {
      console.error('Error selecting file:', error);
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

  const handleErrorDialogClose = () => {
    setShowErrorDialog(false);
    setError(null);
  };

  const handleViewLibrary = () => {
    setShowErrorDialog(false);
    setError(null);
    setLocation("/");
  };

  const handleRetry = () => {
    setShowErrorDialog(false);
    setError(null);
    setSelectedFile(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Get the title from the filename (remove extension)
      const title = selectedFile.name.replace(/\.[^/.]+$/, "");
      
      // TODO: Get actual user ID from auth context
      const userId = 1;
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Call the Tauri command to save video metadata
      const result = await invoke('upload_video', {
        filePath: selectedFile.path,
        title: title,
        userId: userId
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log('Video uploaded successfully:', result);
      
      setIsUploading(false);
      setUploadComplete(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        setLocation("/");
      }, 2000);
    } catch (error: any) {
      console.error('Error uploading video:', error);
      setIsUploading(false);
      setUploadProgress(0);
      
      // Parse the error message
      let errorTitle = t('uploadFailedTitle');
      let errorMessage = "";
      let isDuplicate = false;

      // Extract the actual error message from different possible formats
      if (error) {
        // Handle different error formats from Tauri
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
        } else {
          // Try to extract any string representation
          try {
            errorMessage = JSON.stringify(error);
          } catch {
            errorMessage = t('unexpectedError');
          }
        }

        // Now check for specific error types in the extracted message
        if (errorMessage.includes('DUPLICATE_VIDEO')) {
          errorTitle = t('duplicateVideoDetected');
          isDuplicate = true;
          // Extract the existing video title from the error details
          const match = errorMessage.match(/already exists: '([^']+)'/);
          if (match && match[1]) {
            errorMessage = t('duplicateVideoMessage').replace('{title}', match[1]);
          } else {
            errorMessage = t('duplicateVideoGeneric');
          }
        } else if (errorMessage.includes('FILE_NOT_FOUND')) {
          errorTitle = t('fileNotFoundTitle');
          errorMessage = t('fileNotFoundMessage');
        } else if (errorMessage.includes('INVALID_INPUT')) {
          errorTitle = t('invalidInputTitle');
          errorMessage = t('invalidInputMessage');
        } else {
          // Clean up the error message by removing error code prefix if present
          errorMessage = errorMessage.replace(/^[A-Z_]+:\s*/, '');
        }
      } else {
        errorMessage = t('unexpectedError');
      }
      
      setError({ title: errorTitle, message: errorMessage, isDuplicate });
      setShowErrorDialog(true);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return `0 ${t('bytes')}`;
    const k = 1024;
    const sizes = [t('bytes'), t('kb'), t('mb'), t('gb')];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden select-none">
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
              <h1 className="text-2xl font-bold text-gray-900">{t('uploadVideoTitle')}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {t('uploadVideoDescription')}
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex items-center justify-center overflow-y-auto p-8">
            <div className="max-w-2xl mx-auto">
              {/* Upload Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
                  isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : error && !showErrorDialog
                      ? "border-red-400 bg-red-50"
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
                        {t('uploadComplete')}
                      </h3>
                      <p className="text-green-700">
                        {t('uploadCompleteMessage')}
                      </p>
                      <p className="text-sm text-green-600 mt-2">
                        {t('redirectingToLibrary')}
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
                        {t('uploadingProgress')}
                      </h3>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {uploadProgress}% {t('uploadProgressComplete')}
                      </p>
                    </div>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <File className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {t('fileSelected')}
                      </h3>
                      <p className="text-gray-600 font-medium">
                        {selectedFile.name}
                      </p>
                      {selectedFile.size && (
                        <p className="text-sm text-gray-500">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleUpload}
                      className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {t('uploadVideoButton')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {t('uploadVideoTitle')}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {t('dragDropVideoHere')}
                      </p>
                      <button
                        onClick={handleFileSelect}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        {t('selectVideo')}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* File Requirements */}
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-900">
                      {t('fileRequirementsTitle')}
                    </h4>
                    <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                      <li>• {t('maxFileSize4GB')}</li>
                      <li>• {t('supportedFormatsUpload')}</li>
                      <li>
                        • {t('subtitlesAutoExtracted')}
                      </li>
                      <li>• {t('thumbnailAutoGenerated')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      <AlertDialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              {error?.isDuplicate ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                  <FileX className="h-6 w-6 text-amber-600" />
                </div>
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              )}
              <AlertDialogTitle className="text-xl">
                {error?.title || t('error')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="mt-3 text-base leading-relaxed">
              {error?.message || t('unexpectedError')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            {error?.isDuplicate ? (
              <>
                <AlertDialogCancel
                  onClick={handleRetry}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900"
                >
                  {t('uploadDifferentVideo')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleViewLibrary}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('viewLibrary')}
                </AlertDialogAction>
              </>
            ) : (
              <>
                <AlertDialogCancel
                  onClick={handleErrorDialogClose}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-900"
                >
                  {t('cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRetry}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {t('tryAgain')}
                </AlertDialogAction>
              </>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
