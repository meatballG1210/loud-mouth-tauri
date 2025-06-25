import { Upload } from 'lucide-react';

interface EmptyStateProps {
  onUploadVideo: () => void;
}

export function EmptyState({ onUploadVideo }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <div className="text-4xl">📹</div>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">No Videos Yet</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        Upload your first video to start building your language learning library.
      </p>
      <button
        onClick={onUploadVideo}
        className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-macos"
      >
        <Upload className="w-4 h-4" />
        <span className="font-medium">Upload Your First Video</span>
      </button>
    </div>
  );
}
