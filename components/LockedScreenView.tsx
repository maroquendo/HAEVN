import React from 'react';
import { LockIcon, ClockIcon } from './icons';

interface LockedScreenViewProps {
  reason: 'timeLimit' | 'schedule';
}

const messages = {
    timeLimit: {
        icon: <ClockIcon className="w-16 h-16 text-indigo-400" />,
        title: "Time's Up for Today!",
        description: "You've had a great time watching videos. It's time for a break now. You can come back tomorrow to watch more!"
    },
    schedule: {
        icon: <LockIcon className="w-16 h-16 text-indigo-400" />,
        title: "It's Rest Time!",
        description: "The video library is closed for now. It's time for other activities, like playing outside or reading a book. Come back later!"
    }
}

const LockedScreenView: React.FC<LockedScreenViewProps> = ({ reason }) => {
  const { icon, title, description } = messages[reason];
  
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-lg max-w-md w-full">
            <div className="mb-6">
                {icon}
            </div>
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">{title}</h2>
            <p className="text-gray-600 dark:text-gray-400">
                {description}
            </p>
        </div>
    </div>
  );
};

export default LockedScreenView;
