import React, { useState, useRef, useEffect } from 'react';
import { Video, User } from '../types';
import { MoreVerticalIcon, TrashIcon } from './icons';
import { motion } from 'framer-motion';
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

  // Use the video's thumbnailUrl if available, otherwise fall back to YouTube thumbnail
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
    e.stopPropagation(); // Prevent card click
    onDelete(video.id);
    setIsMenuOpen(false);
  };

  return (
    <motion.div
      className="group relative"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div
        className="cursor-pointer"
        onClick={() => onSelect(video)}
        title={`Watch "${video.title}"`}
      >
        <div className="relative mb-3 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-shadow duration-300">
          <img src={thumbnailUrl} alt={video.title} className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-105" />
          {video.status === 'unseen' && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full z-10 shadow-sm">NEW</span>
          )}
          <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-md">
            {`${Math.floor(video.totalDuration / 60)}:${(video.totalDuration % 60).toString().padStart(2, '0')}`}
          </div>

          {/* Play overlay on hover */}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
              <svg className="w-5 h-5 text-brand-600 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </div>

        <div className="flex items-start px-1">
          <img src={video.sender.avatarUrl} alt={video.sender.name} className="w-10 h-10 rounded-full mr-3 mt-1 border border-gray-100 dark:border-gray-700 shadow-sm" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-800 dark:text-white line-clamp-2 leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">{video.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{video.sender.name}</p>
            <div className="flex items-center mt-1">
              {video.status === 'seen' ? (
                <div className="flex items-center text-xs text-green-600 dark:text-green-400 font-medium">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Watched {Math.round((video.watchDuration / video.totalDuration) * 100)}%
                </div>
              ) : (
                <span className="text-xs text-brand-500 font-medium bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">Ready to watch</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {currentUser.role === 'parent' && (
        <div ref={menuRef} className="absolute top-2 right-2 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 rounded-full text-white bg-black/40 hover:bg-black/70 backdrop-blur-sm transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="More options"
          >
            <MoreVerticalIcon className="w-5 h-5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-xl py-1 z-30 ring-1 ring-black ring-opacity-5 animate-fade-in-fast overflow-hidden">
              <button
                onClick={handleDeleteClick}
                className="w-full text-left flex items-center space-x-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="font-medium">Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default VideoCard;
