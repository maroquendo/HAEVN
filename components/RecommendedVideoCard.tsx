import React, { useState, useEffect } from 'react';
import { RecommendedVideo } from '../types';
import { UploadIcon, YouTubeIcon } from './icons';

interface RecommendedVideoCardProps {
  recommendation: RecommendedVideo;
  onAdd: () => void;
}

const RecommendedVideoCard: React.FC<RecommendedVideoCardProps> = ({ recommendation, onAdd }) => {
  const thumbnailUrl = recommendation.videoId ? `https://img.youtube.com/vi/${recommendation.videoId}/mqdefault.jpg` : '';
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [recommendation.videoId]);

  const placeholder = (
    <div className="w-24 h-14 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center flex-shrink-0">
        <YouTubeIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
    </div>
  );

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 flex items-center space-x-3">
      {hasError || !thumbnailUrl ? placeholder : (
        <img 
            src={thumbnailUrl} 
            alt={recommendation.title} 
            className="w-24 h-14 object-cover rounded flex-shrink-0"
            onError={() => setHasError(true)}
        />
      )}
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">{recommendation.title}</p>
      </div>
      <button 
        onClick={onAdd}
        className="p-2 rounded-full bg-white dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500 transition"
        aria-label="Add this video to the feed"
        title="Add this video to the feed"
      >
        <UploadIcon className="w-5 h-5 text-indigo-500" />
      </button>
    </div>
  );
};

export default RecommendedVideoCard;
