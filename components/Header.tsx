import React, { useState, useEffect, useRef } from 'react';
import { UploadIcon, UserIcon, HaevnLogo } from './icons';
import { Family, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  currentUser: User | null;
  onSwitchProfile: () => void;
  onAddVideoClick: () => void;
  currentFamily: Family | null;
  onLogout: () => void;
  viewMode?: 'parent' | 'child';
  onSwitchToChildView?: () => void;
  onSwitchToParentView?: () => void;
  onChangePin?: () => void;
  onOpenFamilyTree?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchProfile,
  onAddVideoClick,
  currentFamily,
  onLogout,
  viewMode = 'parent',
  onSwitchToChildView,
  onSwitchToParentView,
  onChangePin,
  onOpenFamilyTree,
  searchQuery = '',
  onSearchChange
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const isParent = currentUser?.role === 'parent';
  const isInChildView = isParent && viewMode === 'child';

  return (
    <header className="fixed top-0 left-0 right-0 z-30 px-3 sm:px-6 py-2.5">
      <div className="glass-panel mx-auto max-w-7xl rounded-2xl sm:rounded-3xl shadow-lg border border-white/30 dark:border-white/10 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer select-none">
          <div className="text-brand-600 dark:text-brand-400">
            <HaevnLogo className="h-7 sm:h-8 drop-shadow-sm transition-transform hover:scale-105" />
          </div>
        </div>

        {/* Center: Streamlined Search Bar with Search & Clear Icons */}
        <div className="flex-1 max-w-md mx-1 sm:mx-4 relative">
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-gray-400 dark:text-gray-500 text-sm pointer-events-none select-none">
              🔍
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search for fun videos..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white/70 dark:bg-gray-800/70 rounded-full border border-gray-200/60 dark:border-gray-700/60 focus:border-brand-500 dark:focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-gray-850 focus:outline-none transition-all text-gray-800 dark:text-gray-100 placeholder-gray-400 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange?.('')}
                className="absolute right-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs p-1 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls & User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          
          {/* Child View Active Banner / Toggle */}
          {isInChildView && onSwitchToParentView ? (
            <button
              onClick={onSwitchToParentView}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-semibold text-xs shadow-md shadow-purple-500/20 transition-transform active:scale-95"
              title="Exit child view simulation"
            >
              <span>🔒</span>
              <span className="hidden sm:inline">Exit Child Mode</span>
            </button>
          ) : (
            isParent && viewMode === 'parent' && onSwitchToChildView && (
              <button
                onClick={onSwitchToChildView}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-medium text-xs border border-purple-200/60 dark:border-purple-800/50 transition-all hover:scale-105"
                title="Preview the app as your child sees it"
              >
                <span>👁️</span>
                <span>Child View</span>
              </button>
            )
          )}

          {/* Family Tree Button */}
          {onOpenFamilyTree && (
            <button
              onClick={onOpenFamilyTree}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-medium text-xs border border-emerald-200/60 dark:border-emerald-800/50 transition-all hover:scale-105"
              title="View Family Tree"
            >
              <span>🌳</span>
              <span>Tree</span>
            </button>
          )}

          {/* Share Video Button */}
          {isParent && viewMode === 'parent' && (
            <button
              onClick={onAddVideoClick}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-transform hover:scale-105 active:scale-95"
              aria-label="Add Video"
              title="Share a new video"
            >
              <UploadIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Share Video</span>
            </button>
          )}

          {/* User Profile Avatar & Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none ring-2 ring-transparent focus:ring-brand-400"
              aria-label="Open user menu"
              title="Open user menu"
            >
              {currentUser ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover"
                />
              ) : (
                <UserIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2.5 w-64 glass-panel rounded-2xl shadow-2xl py-2 z-40 border border-white/20 dark:border-white/10 overflow-hidden"
                >
                  {currentUser && (
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 bg-gray-50/70 dark:bg-gray-800/70">
                      <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{currentUser.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{currentFamily?.name || 'My Family'}</p>
                      {isInChildView && (
                        <span className="inline-block mt-1.5 text-[10px] bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-semibold">
                          Viewing as Child
                        </span>
                      )}
                    </div>
                  )}

                  <div className="py-1">
                    {/* Mobile Only: Child View & Family Tree Shortcuts */}
                    {isParent && viewMode === 'parent' && onSwitchToChildView && (
                      <button
                        onClick={() => { onSwitchToChildView(); setIsMenuOpen(false); }}
                        className="md:hidden w-full text-left px-4 py-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2"
                        title="Preview as child"
                      >
                        <span>👁️</span> Preview as Child
                      </button>
                    )}
                    {onOpenFamilyTree && (
                      <button
                        onClick={() => { onOpenFamilyTree(); setIsMenuOpen(false); }}
                        className="sm:hidden w-full text-left px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex items-center gap-2"
                        title="Family Tree"
                      >
                        <span>🌳</span> Family Tree
                      </button>
                    )}
                    {isParent && onChangePin && (
                      <button
                        onClick={() => { onChangePin(); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                        title="Change your parent PIN"
                      >
                        <span>🔐</span> Change Parent PIN
                      </button>
                    )}
                    <button
                      onClick={() => { onSwitchProfile(); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-2"
                      title="Go back to profile selection"
                    >
                      <span>🔄</span> Switch Profile
                    </button>
                    <div className="my-1 border-t border-gray-100 dark:border-gray-700/60" />
                    <button
                      onClick={() => { onLogout(); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                      title="Sign out of your family account"
                    >
                      <span>🚪</span> Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
