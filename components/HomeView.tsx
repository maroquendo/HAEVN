import React, { useMemo } from 'react';
import { Video, User } from '../types';
import VideoCard from './VideoCard';
import { motion } from 'framer-motion';

interface HomeViewProps {
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

const HomeView: React.FC<HomeViewProps> = ({ videos, onSelectVideo, currentUser, onDeleteVideo, searchQuery = '' }) => {
  const recommendedVideos = useMemo(() => {
    let list = currentUser.role === 'parent'
      ? videos
      : videos.filter(video =>
          video.recipients.some(recipient => recipient.id === currentUser.id)
        );

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

  const unseenCount = recommendedVideos.filter(v => v.status === 'unseen').length;

  return (
    <div className="max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              {currentUser.role === 'child' ? `Welcome, ${currentUser.name}! 🌟` : 'Curated Family Feed'}
            </h2>
            {unseenCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-sm">
                {unseenCount} new
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentUser.role === 'child'
              ? 'Hand-picked educational and fun videos from your family!'
              : 'All curated videos shared with your children.'}
          </p>
        </div>

        {searchQuery && (
          <div className="text-xs font-semibold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 rounded-full border border-brand-200 dark:border-brand-800 self-start">
            Showing results for "{searchQuery}" ({recommendedVideos.length})
          </div>
        )}
      </div>

      {/* Videos Grid */}
      {recommendedVideos.length > 0 ? (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {recommendedVideos.map(video => (
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
          <div className="w-20 h-20 bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-900/40 dark:to-indigo-900/40 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-inner text-4xl">
            {searchQuery ? '🔍' : '🎬'}
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {searchQuery ? 'No matching videos found' : 'Your feed is ready for videos!'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
            {searchQuery
              ? `We couldn't find any videos matching "${searchQuery}". Try searching with a different word.`
              : currentUser.role === 'parent'
                ? "You haven't shared any videos yet. Tap 'Share Video' in the top bar to send your first clip!"
                : "No videos in your feed yet. Ask Mom or Dad to share a fun learning video with you!"}
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default HomeView;