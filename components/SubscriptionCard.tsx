import React from 'react';
import { Subscription } from '../types';

interface SubscriptionCardProps {
  subscription: Subscription;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ subscription }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 flex items-center space-x-4">
      <img 
        src={subscription.avatarUrl} 
        alt={`${subscription.name} avatar`} 
        className="w-16 h-16 rounded-full object-cover"
      />
      <div className="flex-1">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white">{subscription.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{subscription.description}</p>
      </div>
       <button className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-2 px-4 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition" title="You are subscribed to this channel">
        Subscribed
      </button>
    </div>
  );
};

export default SubscriptionCard;