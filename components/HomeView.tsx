import React, { useMemo } from 'react';
import { Video, User } from '../types';
import VideoCard from './VideoCard';

interface HomeViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  currentUser: User;
  onDeleteVideo: (videoId: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ videos, onSelectVideo, currentUser, onDeleteVideo }) => {
  const recommendedVideos = useMemo(() => {
    if (currentUser.role === 'parent') {
      return videos;
    }
    return videos.filter(video => 
      video.recipients.some(recipient => recipient.id === currentUser.id)
    );
  }, [videos, currentUser]);
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Recommended For You</h2>
      {recommendedVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10">
          {recommendedVideos.map(video => (
            <VideoCard key={video.id} video={video} onSelect={onSelectVideo} currentUser={currentUser} onDelete={onDeleteVideo} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Your video library is empty. Ask your parent to share a video!
        </p>
      )}
    </div>
  );
};

export default HomeView;