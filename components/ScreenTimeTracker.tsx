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
  
  return (
    <div className="p-2 lg:p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
      <div className="flex items-center justify-center lg:justify-start mb-2">
        <ClockIcon className="w-5 h-5 text-gray-600 dark:text-gray-300"/>
        <h4 className="font-bold ml-2 text-sm text-gray-800 dark:text-white hidden lg:block">Daily Time</h4>
      </div>
      <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2.5">
          <div 
            className="bg-indigo-500 h-2.5 rounded-full" 
            style={{ width: `${watchPercentage}%` }}
          ></div>
      </div>
      <p className="text-xs text-center lg:text-left text-gray-500 dark:text-gray-400 mt-2">
        {watchedMinutes} of {dailyTimeLimit} min used
      </p>
    </div>
  );
};

export default ScreenTimeTracker;
