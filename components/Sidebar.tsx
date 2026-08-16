import React from 'react';
import { HomeIcon, HistoryIcon, SubscriptionsIcon, WishlistIcon, SettingsIcon, UserIcon } from './icons';
import { ParentalControls } from '../types';
import ScreenTimeTracker from './ScreenTimeTracker';
import { motion } from 'framer-motion';
import clsx from 'clsx';

type View = 'home' | 'history' | 'subscriptions' | 'wishlist' | 'settings' | 'family';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  pendingWishesCount: number;
  userRole: 'parent' | 'child';
  dailyWatchTime: number;
  parentalControls: ParentalControls;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, pendingWishesCount, userRole, dailyWatchTime, parentalControls }) => {
  const navItems = [
    { id: 'home', icon: HomeIcon, label: 'Home', notificationCount: 0, parentOnly: false },
    { id: 'history', icon: HistoryIcon, label: 'History', notificationCount: 0, parentOnly: false },
    { id: 'subscriptions', icon: SubscriptionsIcon, label: 'Subscriptions', notificationCount: 0, parentOnly: false },
    { id: 'wishlist', icon: WishlistIcon, label: 'Wishlist', notificationCount: pendingWishesCount, parentOnly: false },
    { id: 'family', icon: UserIcon, label: 'Family', notificationCount: 0, parentOnly: true },
    { id: 'settings', icon: SettingsIcon, label: 'Settings', notificationCount: 0, parentOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.parentOnly || userRole === 'parent');

  return (
    <nav className="w-20 lg:w-60 glass-panel rounded-3xl shadow-lg border border-white/20 dark:border-white/10 m-4 mt-0 p-3 flex flex-col justify-between overflow-hidden transition-all duration-300">
      <div className="space-y-1.5">
        {visibleNavItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as View)}
              title={item.label}
              className={clsx(
                "flex items-center p-3 w-full rounded-2xl transition-all duration-200 relative group select-none",
                isActive
                  ? "text-brand-600 dark:text-white font-bold"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeSidebarPill"
                  className="absolute inset-0 bg-gradient-to-r from-brand-500/15 to-indigo-500/15 dark:from-brand-500/25 dark:to-indigo-500/25 border border-brand-500/20 rounded-2xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <div className="relative z-10 flex items-center justify-center lg:justify-start w-full">
                <item.icon
                  className={clsx(
                    "w-5 h-5 transition-transform duration-200 group-hover:scale-110 flex-shrink-0",
                    isActive ? "text-brand-500 dark:text-brand-400" : "text-gray-500 dark:text-gray-400"
                  )}
                />
                <span className="ml-3.5 text-sm hidden lg:block truncate">{item.label}</span>
                {item.notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 lg:top-1/2 lg:-translate-y-1/2 lg:right-1.5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900 animate-bounce">
                    {item.notificationCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {parentalControls.isEnabled && (
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
          <ScreenTimeTracker
            dailyWatchTime={dailyWatchTime}
            dailyTimeLimit={parentalControls.dailyTimeLimit}
          />
        </div>
      )}
    </nav>
  );
};

export default Sidebar;