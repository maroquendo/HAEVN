import React, { useMemo } from 'react';
import { Video, User } from '../types';
import VideoCard from './VideoCard';
import { motion } from 'framer-motion';

interface HistoryViewProps {
  videos: Video[];
  onSelectVideo: (video: Video) => void;
  currentUser: User;
  onDeleteVideo: (videoId: string) => void;
  searchQuery?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 350, damping: 25 } }
};

const HistoryView: React.FC<HistoryViewProps> = ({ videos, onSelectVideo, currentUser, onDeleteVideo, searchQuery = '' }) => {
  const watchedVideos = useMemo(() => {
    const userVideos = currentUser.role === 'parent'
      ? videos
      : videos.filter(video => video.recipients.some(r => r.id === currentUser.id));
      
    let list = userVideos.filter(v => v.status === 'seen');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.summary?.toLowerCase().includes(q) ||
        v.sender.name.toLowerCase().includes(q)
      );
    }

    return list;
  }, [videos, currentUser, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
            <span>🕒</span> Watch History
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Videos you've already watched. You can rewatch them anytime!
          </p>
        </div>

        {watchedVideos.length > 0 && (
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full self-start">
            {watchedVideos.length} {watchedVideos.length === 1 ? 'video' : 'videos'} watched
          </span>
        )}
      </div>

      {watchedVideos.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {watchedVideos.map(video => (
            <motion.div key={video.id} variants={item}>
              <VideoCard video={video} onSelect={onSelectVideo} currentUser={currentUser} onDelete={onDeleteVideo} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel rounded-3xl p-10 sm:p-16 text-center max-w-lg mx-auto my-12 border border-white/20 dark:border-white/10 shadow-xl"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner text-4xl">
            🕒
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            No watch history yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
            Videos you finish watching will appear here so you can easily find your favorites and watch them again.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default HistoryView;