import React from 'react';
import { Subscription } from '../types';
import SubscriptionCard from './SubscriptionCard';
import { UploadIcon } from './icons'; // Re-using for "add" action

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  userRole: 'parent' | 'child';
  onAddSubscriptionClick: () => void;
}

const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ subscriptions, userRole, onAddSubscriptionClick }) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Subscribed Channels</h2>
        {userRole === 'parent' && (
          <button 
            onClick={onAddSubscriptionClick}
            className="flex items-center space-x-2 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
            title="Add a new channel subscription"
          >
            <UploadIcon className="w-5 h-5" />
            <span>Add New Subscription</span>
          </button>
        )}
      </div>

      {subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-6">
          {subscriptions.map(sub => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
          You haven't subscribed to any channels yet.
        </p>
      )}
    </div>
  );
};

export default SubscriptionsView;