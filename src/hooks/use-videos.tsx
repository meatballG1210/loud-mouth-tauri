import { useState, useEffect } from 'react';
import { Video, VideoLibraryStats } from '@/types/video';

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

export function useVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoLibraryStats>({ totalVideos: 0, totalVocabulary: 0, dueReviews: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setVideos(mockVideos);
      setStats(mockStats);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const refreshVideos = () => {
    setIsLoading(true);
    setTimeout(() => {
      setVideos(mockVideos);
      setStats(mockStats);
      setIsLoading(false);
    }, 500);
  };

  const deleteVideo = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
    setStats(prev => ({ ...prev, totalVideos: prev.totalVideos - 1 }));
  };

  return {
    videos,
    stats,
    isLoading,
    refreshVideos,
    deleteVideo,
  };
}
