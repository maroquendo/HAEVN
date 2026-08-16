import React from 'react';
import { ClockIcon } from './icons';

interface ScreenTimeTrackerProps {
  dailyWatchTime: number; // in seconds
  dailyTimeLimit: number; // in minutes
}

const ScreenTimeTracker: React.FC<ScreenTimeTrackerProps> = ({ dailyWatchTime, dailyTimeLimit }) => {
  const timeLimitInSeconds = dailyTimeLimit * 60;
  const watchPercentage = timeLimitInSeconds > 0 ? Math.min((dailyWatchTime / timeLimitInSeconds) * 100, 100) : 0;
  
  const watchedMinutes = Math.floor(dailyWatchTime / 60);
  const remainingMinutes = Math.max(0, dailyTimeLimit - watchedMinutes);
  
  // Dynamic color based on usage
  const getProgressColor = () => {
    if (watchPercentage >= 90) return 'bg-rose-500 shadow-rose-500/30';
    if (watchPercentage >= 60) return 'bg-amber-500 shadow-amber-500/30';
    return 'bg-emerald-500 shadow-emerald-500/30';
  };

  return (
    <div className="p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-200">
          <ClockIcon className="w-4 h-4 text-brand-500" />
          <span className="font-bold text-xs">Screen Time</span>
        </div>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300">
          {remainingMinutes}m left
        </span>
      </div>
      
      <div className="w-full bg-gray-200/80 dark:bg-gray-700/80 rounded-full h-2 overflow-hidden shadow-inner">
        <div 
          className={`h-2 rounded-full transition-all duration-500 shadow-sm ${getProgressColor()}`} 
          style={{ width: `${Math.max(3, watchPercentage)}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1.5 font-medium">
        <span>{watchedMinutes}m watched</span>
        <span>{dailyTimeLimit}m limit</span>
      </div>
    </div>
  );
};

export default ScreenTimeTracker;
