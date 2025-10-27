import React from 'react';
import { HomeIcon, HistoryIcon, SubscriptionsIcon, WishlistIcon, SettingsIcon } from './icons';
import { ParentalControls } from '../types';
import ScreenTimeTracker from './ScreenTimeTracker';

type View = 'home' | 'history' | 'subscriptions' | 'wishlist' | 'settings';

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
    { id: 'settings', icon: SettingsIcon, label: 'Settings', notificationCount: 0, parentOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.parentOnly || userRole === 'parent');

  return (
    <nav className="w-20 lg:w-64 bg-white dark:bg-gray-800 p-2 lg:p-4 flex flex-col justify-between border-r border-gray-200 dark:border-gray-700">
      <div>
        {visibleNavItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as View)}
              title={item.label}
              className={`flex items-center p-3 my-1 w-full rounded-lg transition-colors duration-200 relative ${
                isActive
                  ? 'bg-gray-200 dark:bg-gray-700 font-bold'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'text-indigo-500' : 'text-gray-600 dark:text-gray-300'}`} />
              <span className="ml-4 text-gray-800 dark:text-white hidden lg:block">{item.label}</span>
              {item.notificationCount > 0 && (
                  <span className="absolute top-1 right-1 lg:right-3 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {item.notificationCount}
                  </span>
              )}
            </button>
          );
        })}
      </div>
      
      {parentalControls.isEnabled && (
          <ScreenTimeTracker 
            dailyWatchTime={dailyWatchTime}
            dailyTimeLimit={parentalControls.dailyTimeLimit}
          />
      )}
    </nav>
  );
};

export default Sidebar;