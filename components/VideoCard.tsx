import React, { useState, useRef, useEffect } from 'react';
import { Video, User } from '../types';
import { MoreVerticalIcon, TrashIcon } from './icons';

interface VideoCardProps {
  video: Video;
  onSelect: (video: Video) => void;
  currentUser: User;
  onDelete: (videoId: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onSelect, currentUser, onDelete }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const thumbnailUrl = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

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
    <div className="group relative">
      <div 
        className="cursor-pointer"
        onClick={() => onSelect(video)}
        title={`Watch "${video.title}"`}
      >
        <div className="relative mb-2">
          <img src={thumbnailUrl} alt={video.title} className="w-full rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105" />
           {video.status === 'unseen' && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">NEW</span>
          )}
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-1.5 py-0.5 rounded">
              {`${Math.floor(video.totalDuration / 60)}:${(video.totalDuration % 60).toString().padStart(2, '0')}`}
          </div>
        </div>
         <div className="flex items-start">
              <img src={video.sender.avatarUrl} alt={video.sender.name} className="w-9 h-9 rounded-full mr-3 mt-1" />
              <div>
                  <h3 className="text-base font-bold text-gray-800 dark:text-white line-clamp-2 leading-tight pr-6">{video.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{video.sender.name}</p>
                   <p className="text-xs text-gray-500 dark:text-gray-400">
                      {video.status === 'seen' ? `Watched ${Math.round((video.watchDuration / video.totalDuration) * 100)}%` : 'Ready to watch'}
                  </p>
              </div>
         </div>
      </div>

      {currentUser.role === 'parent' && (
        <div ref={menuRef} className="absolute top-0 right-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1.5 rounded-full text-white bg-black/30 hover:bg-black/60 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
            title="More options"
          >
            <MoreVerticalIcon className="w-5 h-5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-20 ring-1 ring-black ring-opacity-5">
              <button 
                onClick={handleDeleteClick} 
                className="w-full text-left flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50"
              >
                <TrashIcon />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoCard;
