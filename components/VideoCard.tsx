import React, { useState, useRef, useEffect } from 'react';
import { Video, User } from '../types';
import { MoreVerticalIcon, TrashIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  currentUser: User;
  onDelete: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, currentUser, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use video's thumbnailUrl or YouTube fallback
  const thumbnailUrl = video.thumbnailUrl || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(video.id);
    setIsMenuOpen(false);
  };

  const getPlatformLabel = () => {
    switch (video.platform) {
      case 'instagram': return { label: 'Reel', color: 'bg-gradient-to-r from-pink-500 to-rose-500' };
      case 'tiktok': return { label: 'TikTok', color: 'bg-black text-white' };
      default: return { label: 'Video', color: 'bg-red-600' };
    }
  };

  const platformInfo = getPlatformLabel();
  const watchPercent = video.totalDuration > 0 ? Math.round((video.watchDuration / video.totalDuration) * 100) : 0;

  return (
    <motion.div
      className="group relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-3xl p-3 border border-white/40 dark:border-white/10 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 350, damping: 25 }}
    >
      <div
        className="cursor-pointer"
        onClick={() => onSelect(video)}
        title={`Watch "${video.title}"`}
      >
        {/* Thumbnail Wrapper */}
        <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner bg-black/10 dark:bg-black/40 mb-3 group-hover:ring-2 group-hover:ring-brand-500/50 transition-all">
          <img
            src={thumbnailUrl}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Platform / NEW Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
            <span className={`text-[10px] font-extrabold text-white px-2 py-0.5 rounded-full shadow-sm ${platformInfo.color}`}>
              {platformInfo.label}
            </span>
            {video.status === 'unseen' && (
              <span className="bg-gradient-to-r from-rose-500 to-orange-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-sm">
                NEW
              </span>
            )}
          </div>

          {/* Duration Badge */}
          <div className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm font-mono">
            {Math.floor(video.totalDuration / 60)}:{(video.totalDuration % 60).toString().padStart(2, '0')}
          </div>

          {/* Play Hover Overlay */}
          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[1px]">
            <div className="w-12 h-12 bg-white/95 rounded-full flex items-center justify-center shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
              <svg className="w-5 h-5 text-brand-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>

          {/* Watch Progress Bottom Bar */}
          {video.status === 'seen' && watchPercent < 100 && (
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/40">
              <div className="h-full bg-brand-500 rounded-r-full" style={{ width: `${watchPercent}%` }} />
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="px-1">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
            {video.title}
          </h3>

          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60">
            {/* Sender Chip */}
            <div className="flex items-center gap-1.5 truncate">
              <img
                src={video.sender.avatarUrl}
                alt={video.sender.name}
                className="w-5 h-5 rounded-full border border-white dark:border-gray-700 object-cover flex-shrink-0"
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
                {video.sender.name}
              </span>
            </div>

            {/* Status Pill */}
            {video.status === 'seen' ? (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <span>✓</span> Watched {watchPercent}%
              </span>
            ) : (
              <span className="text-[10px] font-bold text-brand-600 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-full">
                Ready to watch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Parent Admin Menu */}
      {currentUser.role === 'parent' && (
        <div ref={menuRef} className="absolute top-4 right-4 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 rounded-full text-white bg-black/50 hover:bg-black/80 backdrop-blur-sm transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-sm"
            title="More options"
          >
            <MoreVerticalIcon className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -5 }}
                className="absolute right-0 mt-1.5 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-1 z-30 border border-gray-100 dark:border-gray-700 overflow-hidden"
              >
                <button
                  onClick={handleDeleteClick}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};

export default VideoCard;
