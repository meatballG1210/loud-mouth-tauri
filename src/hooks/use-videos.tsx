import { useState, useEffect } from 'react';
import { Video, VideoLibraryStats } from '@/types/video';
import { invoke } from '@tauri-apps/api/core';
import { vocabularyApi } from '@/api/vocabulary';
import { videoProgressApi } from '@/api/video-progress';
import { useAuth } from '@/components/SupabaseAuthProvider';

interface VideoMetadata {
  id: string;
  user_id: number;
  title: string;
  filename: string;
  original_name: string;
  path: string;
  size: number;
  mtime: string;
  duration: number | null;
  thumbnail_path: string | null;
  has_english_subtitles: boolean | null;
  has_chinese_subtitles: boolean | null;
  fast_hash: string | null;
  full_hash: string | null;
  upload_date: string | null;
}


function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '00:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

function formatUploadDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch {
    return 'Unknown date';
  }
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoLibraryStats>({ totalVideos: 0, totalVocabulary: 0, dueReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Get actual user ID from auth context
      const userId = 1; // Backend expects number for videos
      
      const videoMetadatas = await invoke<VideoMetadata[]>('get_videos', { userId });
      
      // Convert VideoMetadata to Video format with resolved thumbnail paths
      const formattedVideos: Video[] = await Promise.all(
        videoMetadatas.map(async (vm) => {
          let thumbnail = 'https://picsum.photos/800/450?random=' + vm.id;
          
          if (vm.thumbnail_path) {
            try {
              // Get thumbnail data as base64
              const thumbnailData = await invoke<number[]>('get_thumbnail_data', { 
                thumbnailPath: vm.thumbnail_path 
              });
              // Convert to Uint8Array and then to base64
              const uint8Array = new Uint8Array(thumbnailData);
              const base64 = btoa(String.fromCharCode(...uint8Array));
              thumbnail = `data:image/jpeg;base64,${base64}`;
            } catch (error) {
              console.error('Error loading thumbnail:', error);
              // Fall back to placeholder
            }
          }
          
          const video = {
            id: vm.id,
            title: vm.title,
            duration: formatDuration(vm.duration),
            uploadDate: formatUploadDate(vm.upload_date),
            fileSize: formatFileSize(vm.size),
            thumbnail,
            subtitles: {
              english: vm.has_english_subtitles || false,
              chinese: vm.has_chinese_subtitles || false,
            },
            path: vm.path, // Add path for video playback
          };
          
          console.log(`Video ${vm.id} subtitle flags:`, {
            has_english_subtitles: vm.has_english_subtitles,
            has_chinese_subtitles: vm.has_chinese_subtitles,
            subtitles: video.subtitles
          });
          
          return video;
        })
      );
      
      // Fetch progress for each video
      const videosWithProgress = await Promise.all(
        formattedVideos.map(async (video) => {
          try {
            const progress = await videoProgressApi.get(userId, video.id);
            if (progress && progress.duration > 0) {
              const percentage = Math.min(100, Math.round((progress.position / progress.duration) * 100));
              return { ...video, progress: percentage };
            }
          } catch (error) {
            // Ignore errors, just no progress shown
            console.log(`No progress data for video ${video.id}`);
          }
          return video;
        })
      );
      
      setVideos(videosWithProgress);
      
      // Fetch real vocabulary stats
      try {
        if (!user?.id) {
          setStats({
            totalVideos: formattedVideos.length,
            totalVocabulary: 0,
            dueReviews: 0,
          });
          return;
        }
        
        const vocabularyItems = await vocabularyApi.getAll(user.id);
        const now = new Date();
        const dueForReview = vocabularyItems.filter(item => 
          new Date(item.next_review_at) <= now
        ).length;
        
        setStats({
          totalVideos: formattedVideos.length,
          totalVocabulary: vocabularyItems.length,
          dueReviews: dueForReview,
        });
      } catch (vocabError) {
        console.error('Error fetching vocabulary stats:', vocabError);
        // If vocabulary fetch fails, still show video count
        setStats({
          totalVideos: formattedVideos.length,
          totalVocabulary: 0,
          dueReviews: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      // On error, show empty state instead of mock data
      setVideos([]);
      setStats({
        totalVideos: 0,
        totalVocabulary: 0,
        dueReviews: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, [user?.id]);

  const refreshVideos = async () => {
    await fetchVideos();
  };

  const deleteVideo = async (videoId: string) => {
    try {
      // Call the backend to delete the video
      await invoke('delete_video', { videoId });

      // Update the local state
      setVideos(prev => prev.filter(video => video.id !== videoId));
      setStats(prev => ({ ...prev, totalVideos: prev.totalVideos - 1 }));
    } catch (error) {
      console.error('Error deleting video:', error);
      alert(`Failed to delete video: ${error}`);
    }
  };

  const updateVideo = async (videoId: string, newTitle: string) => {
    try {
      // Call the backend to update the video
      await invoke('update_video', { videoId, newTitle });

      // Update the local state
      setVideos(prev => prev.map(video =>
        video.id === videoId ? { ...video, title: newTitle } : video
      ));
    } catch (error) {
      console.error('Error updating video:', error);
      throw error;
    }
  };

  return {
    videos,
    stats,
    isLoading,
    refreshVideos,
    deleteVideo,
    updateVideo,
  };
}
