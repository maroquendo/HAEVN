import React, { useMemo } from 'react';
import { Video, User } from '../types';
import VideoCard from './VideoCard';

interface HistoryViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  currentUser: User;
  onDeleteVideo: (videoId: string) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ videos, onSelectVideo, currentUser, onDeleteVideo }) => {
  const watchedVideos = useMemo(() => {
    const userVideos = currentUser.role === 'parent'
      ? videos
      : videos.filter(video => video.recipients.some(r => r.id === currentUser.id));
      
    return userVideos.filter(v => v.status === 'seen');
  }, [videos, currentUser]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Watch History</h2>
      {watchedVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {watchedVideos.map(video => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} currentUser={currentUser} onDelete={onDeleteVideo} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
          You haven't watched any videos yet. Go to Home to see what's new!
        </p>
      )}
    </div>
  );
};

export default HistoryView;