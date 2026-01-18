import React, { useState, useEffect, useRef } from 'react';
import { UploadIcon, UserIcon, HaevnLogo } from './icons';
import { Family, User } from '../types';

interface HeaderProps {
  currentUser: User | null;
  onSwitchProfile: () => void;
  onAddVideoClick: () => void;
  currentFamily: Family | null;
  onLogout: () => void;
}


const Header: React.FC<HeaderProps> = ({ currentUser, onSwitchProfile, onAddVideoClick, currentFamily, onLogout }) => {
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

  return (
    <header className="glass-panel fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 m-4 rounded-2xl shadow-sm">
      <div className="flex items-center">
        <div className="flex items-center ml-2 text-brand-700 dark:text-white">
          <HaevnLogo className="h-8 drop-shadow-sm" />
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-8">
        <input
          type="text"
          placeholder="Search for fun videos..."
          className="w-full px-5 py-2.5 bg-white/50 dark:bg-gray-800/50 rounded-full border border-white/20 focus:border-brand-400 focus:ring-2 focus:ring-brand-200 focus:outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-500 backdrop-blur-sm"
        />
      </div>

      <div className="flex items-center space-x-4 mr-2 flex-shrink-0">
        {currentUser?.role === 'parent' && (
          <button onClick={onAddVideoClick} className="p-2.5 rounded-full bg-brand-100 hover:bg-brand-200 text-brand-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-brand-300 transition shadow-sm" aria-label="Add Video" title="Share a new video">
            <UploadIcon className="w-5 h-5" />
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition" aria-label="Open user menu" title="Open user menu">
            {currentUser ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
            ) : (
              <UserIcon className="w-9 h-9 text-gray-600 dark:text-gray-300" />
            )}
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-3 w-64 glass-panel rounded-2xl shadow-xl py-2 z-30 animate-fade-in-fast overflow-hidden">
              {currentUser && (
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 bg-brand-50/50 dark:bg-gray-800/50">
                  <p className="text-base font-bold text-gray-800 dark:text-white">{currentUser.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{currentFamily?.name}</p>
                </div>
              )}
              <div className="py-1">
                <button onClick={() => { onSwitchProfile(); setIsMenuOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-brand-50 dark:hover:bg-gray-700 transition-colors flex items-center" title="Go back to profile selection">
                  Switch Profile
                </button>
                <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-left px-5 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center" title="Sign out of your family account">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;