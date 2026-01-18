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
    <nav className="w-20 lg:w-64 glass-panel m-4 mt-0 rounded-2xl flex flex-col justify-between shadow-sm overflow-hidden transition-all duration-300">
      <div className="p-3">
        {visibleNavItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as View)}
              title={item.label}
              className={clsx(
                "flex items-center p-3 my-2 w-full rounded-xl transition-all duration-200 relative group overflow-hidden",
                isActive ? "text-brand-600 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:bg-brand-50/50 dark:hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNav"
                  className="absolute inset-0 bg-brand-100 dark:bg-brand-900/30 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative z-10 flex items-center w-full">
                <item.icon className={clsx("w-6 h-6 transition-transform group-hover:scale-110", isActive && "text-brand-600 dark:text-brand-300")} />
                <span className={clsx("ml-4 font-medium hidden lg:block", isActive && "font-bold")}>{item.label}</span>
                {item.notificationCount > 0 && (
                  <span className="absolute top-0 right-0 lg:top-1/2 lg:-translate-y-1/2 lg:right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-800">
                    {item.notificationCount}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {parentalControls.isEnabled && (
        <div className="p-4 bg-brand-50/50 dark:bg-gray-800/50 border-t border-white/20">
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