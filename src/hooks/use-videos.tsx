import { useState, useEffect } from 'react';
import { Video, VideoLibraryStats } from '@/types/video';
import { invoke } from '@tauri-apps/api/core';

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

// Mock data for the video library
const mockVideos: Video[] = [
  {
    id: '1',
    title: 'Modern Family S01E01 2009 1080p Blu-ray',
    duration: '22:47',
    uploadDate: 'May 16, 2025',
    fileSize: '1.2 GB',
    thumbnail: 'https://picsum.photos/800/450?random=1',
    subtitles: {
      english: true,
      chinese: true,
    },
  },
  {
    id: '2',
    title: 'Tech Conference 2024 - AI and Machine Learning',
    duration: '45:23',
    uploadDate: 'Mar 8, 2025',
    fileSize: '892 MB',
    thumbnail: 'https://picsum.photos/800/450?random=2',
    subtitles: {
      english: true,
      chinese: false,
    },
  },
  {
    id: '3',
    title: 'Chinese Language Documentary - Culture',
    duration: '58:12',
    uploadDate: 'Feb 15, 2025',
    fileSize: '1.5 GB',
    thumbnail: 'https://picsum.photos/800/450?random=3',
    subtitles: {
      english: true,
      chinese: true,
    },
  },
  {
    id: '4',
    title: 'Business English - Meeting Presentation',
    duration: '34:56',
    uploadDate: 'Jan 22, 2025',
    fileSize: '678 MB',
    thumbnail: 'https://picsum.photos/800/450?random=4',
    subtitles: {
      english: true,
      chinese: false,
    },
  },
  {
    id: '5',
    title: 'Friends S01E01 - The One Where Monica Gets a Roommate',
    duration: '22:34',
    uploadDate: 'Dec 10, 2024',
    fileSize: '1.1 GB',
    thumbnail: 'https://picsum.photos/800/450?random=5',
    subtitles: {
      english: true,
      chinese: true,
    },
  },
  {
    id: '6',
    title: 'The Office S01E01 - Pilot',
    duration: '22:11',
    uploadDate: 'Nov 28, 2024',
    fileSize: '950 MB',
    thumbnail: 'https://picsum.photos/800/450?random=6',
    subtitles: {
      english: true,
      chinese: false,
    },
  },
  {
    id: '7',
    title: 'TED Talk - The Power of Vulnerability',
    duration: '20:19',
    uploadDate: 'Oct 15, 2024',
    fileSize: '512 MB',
    thumbnail: 'https://picsum.photos/800/450?random=7',
    subtitles: {
      english: true,
      chinese: true,
    },
  },
  {
    id: '8',
    title: 'Breaking Bad S01E01 - Pilot',
    duration: '58:33',
    uploadDate: 'Sep 20, 2024',
    fileSize: '2.1 GB',
    thumbnail: 'https://picsum.photos/800/450?random=8',
    subtitles: {
      english: true,
      chinese: false,
    },
  },
  {
    id: '9',
    title: 'Chinese Cooking Master Class',
    duration: '45:12',
    uploadDate: 'Aug 30, 2024',
    fileSize: '1.8 GB',
    thumbnail: 'https://picsum.photos/800/450?random=9',
    subtitles: {
      english: false,
      chinese: true,
    },
  },
  {
    id: '10',
    title: 'Silicon Valley Startup Documentary',
    duration: '67:45',
    uploadDate: 'Jul 14, 2024',
    fileSize: '2.5 GB',
    thumbnail: 'https://picsum.photos/800/450?random=10',
    subtitles: {
      english: true,
      chinese: false,
    },
  },
  {
    id: '11',
    title: 'Mandarin Conversation Practice',
    duration: '38:22',
    uploadDate: 'Jun 05, 2024',
    fileSize: '1.3 GB',
    thumbnail: 'https://picsum.photos/800/450?random=11',
    subtitles: {
      english: false,
      chinese: true,
    },
  },
  {
    id: '12',
    title: 'Nature Documentary - Ocean Life',
    duration: '52:18',
    uploadDate: 'May 18, 2024',
    fileSize: '1.9 GB',
    thumbnail: 'https://picsum.photos/800/450?random=12',
    subtitles: {
      english: false,
      chinese: false,
    },
  },
];

const mockStats: VideoLibraryStats = {
  totalVideos: 12,
  totalVocabulary: 127,
  dueReviews: 8,
};

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
      year: 'numeric' 
    });
  } catch {
    return 'Unknown date';
  }
}

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoLibraryStats>({ totalVideos: 0, totalVocabulary: 0, dueReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

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
      
      setVideos(formattedVideos);
      setStats({
        totalVideos: formattedVideos.length,
        totalVocabulary: mockStats.totalVocabulary, // Keep mock data for now
        dueReviews: mockStats.dueReviews, // Keep mock data for now
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      // Fall back to mock data on error
      setVideos(mockVideos);
      setStats(mockStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const refreshVideos = () => {
    fetchVideos();
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

  return {
    videos,
    stats,
    isLoading,
    refreshVideos,
    deleteVideo,
  };
}
