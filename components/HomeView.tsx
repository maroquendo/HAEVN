import React, { useMemo } from 'react';
import { Video, User } from '../types';
import VideoCard from './VideoCard';
import { motion } from 'framer-motion';

interface HomeViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  currentUser: User;
  onDeleteVideo: (videoId: string) => void;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

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
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Recommended For You</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Hand-picked videos just for you!</p>
        </div>
      </div>

      {recommendedVideos.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          {recommendedVideos.map(video => (
            <motion.div key={video.id} variants={item}>
              <VideoCard video={video} onSelect={onSelectVideo} currentUser={currentUser} onDelete={onDeleteVideo} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No videos yet</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Your video library is empty. Ask your parent to share a fun video with you!
          </p>
        </div>
      )}
    </div>
  );
};

export default HomeView;