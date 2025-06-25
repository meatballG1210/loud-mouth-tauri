import { useState } from 'react';
import { Image } from 'lucide-react';
import { Video } from '@/types/video';
import { VideoCard } from './video-card';
import { EmptyState } from './empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface VideoGridProps {
  videos: Video[];
  isLoading: boolean;
  onPlayVideo: (video: Video) => void;
  onDeleteVideo: (videoId: string) => void;
  onUploadVideo: () => void;
  viewMode: 'grid' | 'list';
}

export function VideoGrid({ videos, isLoading, onPlayVideo, onDeleteVideo, onUploadVideo, viewMode }: VideoGridProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [imageErrors, setImageErrors] = useState<string[]>([]);

  const handleDeleteClick = (video: Video) => {
    console.log('Delete button clicked for video:', video.title);
    setVideoToDelete(video);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (videoToDelete) {
      onDeleteVideo(videoToDelete.id);
      setShowDeleteDialog(false);
      setVideoToDelete(null);
    }
  };

  const handleImageError = (videoId: string) => {
    setImageErrors(prev => prev.includes(videoId) ? prev : [...prev, videoId]);
  };
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg macos-shadow animate-pulse">
              <div className="w-full h-40 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                <div className="flex space-x-2">
                  <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                  <div className="h-5 bg-gray-200 rounded-full w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return <EmptyState onUploadVideo={onUploadVideo} />;
  }

  let content;
  
  if (viewMode === 'list') {
    content = (
      <div className="p-6 bg-gray-50">
        <div className="space-y-4">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-blue-300 hover:ring-2 hover:ring-blue-100"
              onClick={() => onPlayVideo(video)}
            >
              <div className="flex p-4">
                <div className="relative flex-shrink-0 w-32 h-20">
                  {!imageErrors.includes(video.id) ? (
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-xl"
                      onError={() => handleImageError(video.id)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center">
                      <Image className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                </div>
                
                <div className="flex-1 ml-4 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                        {video.title}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500 space-x-4 mb-2">
                        <span>{video.uploadDate}</span>
                        <span>{video.fileSize}</span>
                      </div>
                      <div className="flex space-x-2">
                        {video.subtitles.english && (
                          <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium border border-blue-200">
                            EN
                          </span>
                        )}
                        {video.subtitles.chinese && (
                          <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium border border-green-200">
                            中文
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(video);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-100 rounded transition-all ml-2"
                    >
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    content = (
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onPlay={onPlayVideo}
              onDelete={onDeleteVideo}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {content}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{videoToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
