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
    <header className="bg-white dark:bg-gray-800 shadow-md p-2 fixed top-0 left-0 right-0 z-20 flex items-center justify-between">
      <div className="flex items-center">
        <div className="flex items-center ml-4 text-gray-800 dark:text-white">
            <HaevnLogo className="h-7" />
        </div>
      </div>
      
      <div className="flex-1 max-w-lg mx-4">
        <input 
            type="text" 
            placeholder="Search" 
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
        />
      </div>

      <div className="flex items-center space-x-4 mr-4 flex-shrink-0">
        {currentUser?.role === 'parent' && (
             <button onClick={onAddVideoClick} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" aria-label="Add Video" title="Share a new video">
                <UploadIcon className="w-6 h-6 text-gray-600 dark:text-gray-300"/>
            </button>
        )}
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition" aria-label="Open user menu" title="Open user menu">
                {currentUser ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full" />
                ) : (
                    <UserIcon className="w-8 h-8 text-gray-600 dark:text-gray-300"/>
                )}
            </button>
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 z-30 ring-1 ring-black ring-opacity-5 animate-fade-in-fast">
                    {currentUser && (
                        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{currentUser.name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{currentFamily?.name}</p>
                        </div>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-700">
                         <button onClick={() => { onSwitchProfile(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title="Go back to profile selection">
                            Switch Profile
                        </button>
                        <button onClick={() => { onLogout(); setIsMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title="Sign out of your family account">
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