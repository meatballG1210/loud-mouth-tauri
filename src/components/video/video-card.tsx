import { useState } from 'react';
import { MoreHorizontal, Play, Edit, Folder, Trash2, Image } from 'lucide-react';
import { Video } from '@/types/video';
import { VideoEditModal } from './video-edit-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
  onDelete: (videoId: string) => void;
  onEdit?: (videoId: string, newTitle: string) => Promise<void>;
}

export function VideoCard({ video, onPlay, onDelete, onEdit }: VideoCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePlay = () => {
    onPlay(video);
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const handleShowInFinder = () => {
    console.log('Show in Finder:', video.id);
  };

  const handleDelete = () => {
    onDelete(video.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:-translate-y-1 hover:border-blue-300 hover:ring-2 hover:ring-blue-100">
        <div className="relative" onClick={handlePlay}>
          {!imageError ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-40 object-cover rounded-t-xl"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-40 bg-gray-200 rounded-t-xl flex items-center justify-center">
              <Image className="w-12 h-12 text-gray-400" />
            </div>
          )}
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
            {video.duration}
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-all duration-200 rounded-t-xl flex items-center justify-center">
            <div className="w-14 h-14 bg-white bg-opacity-90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
              <Play className="w-6 h-6 text-blue-600 ml-1" />
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        {video.progress && video.progress > 0 && (
          <div className="h-1 bg-gray-200">
            <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${video.progress}%` }}></div>
          </div>
        )}
        
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2">
            {video.title}
          </h3>
          
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <span>{video.uploadDate}</span>
            <span>{video.fileSize}</span>
          </div>
          
          {/* Language badges and menu */}
          <div className="flex items-center justify-between">
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
            
            {/* Context menu button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-all">
                  <MoreHorizontal className="w-4 h-4 text-gray-500" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handlePlay}>
                  <Play className="w-4 h-4 mr-3" />
                  Play Video
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-3" />
                  Edit Info
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShowInFinder}>
                  <Folder className="w-4 h-4 mr-3" />
                  Show in Finder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="w-4 h-4 mr-3" />
                  Delete Video
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{video.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {onEdit && (
        <VideoEditModal
          video={video}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={onEdit}
        />
      )}
    </>
  );
}
