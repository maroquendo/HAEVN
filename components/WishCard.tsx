import React from 'react';
import { Wish } from '../types';
import RecommendedVideoCard from './RecommendedVideoCard';
import { SparkleIcon, YouTubeIcon, CheckIcon, CloseIcon } from './icons';

interface WishCardProps {
  wish: Wish;
  userRole: 'parent' | 'child';
  onFulfillWish: (wishId: string) => void;
  onRejectWish: (wishId: string) => void;
  onFindRecommendations: (wishId: string) => void;
  onAddRecommendedVideo: (data: {url: string, title: string}) => void;
}

const WishCard: React.FC<WishCardProps> = ({ wish, userRole, onFulfillWish, onRejectWish, onFindRecommendations, onAddRecommendedVideo }) => {
  const isPending = wish.status === 'pending';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-5 transition-all ${isPending ? '' : 'opacity-60'}`}>
      <div className="flex items-start space-x-4">
        <img src={wish.author.avatarUrl} alt={wish.author.name} className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-800 dark:text-white">"{wish.text}"</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Wished by {wish.author.name} on {wish.timestamp}</p>
            </div>
            <div className={`text-sm font-bold px-3 py-1 rounded-full ${isPending ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>
              {isPending ? 'Pending' : 'Fulfilled'}
            </div>
          </div>

          {userRole === 'parent' && isPending && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                <button
                    onClick={() => onFindRecommendations(wish.id)}
                    disabled={wish.isLoadingRecommendations}
                    className="w-full flex items-center justify-center bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-indigo-400 disabled:cursor-wait"
                    title="Use AI to find YouTube videos for this wish"
                >
                    <SparkleIcon className="w-5 h-5 mr-2" />
                    {wish.isLoadingRecommendations ? 'Searching...' : 'Find Videos with AI'}
                </button>

                <div className="grid grid-cols-3 gap-2 text-sm text-center">
                    <button
                        onClick={() => {
                            const query = encodeURIComponent(`kids videos about ${wish.text}`);
                            window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                        }}
                        className="flex flex-col items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                        title="Search for this wish on YouTube"
                    >
                        <YouTubeIcon className="w-6 h-6 mb-1 text-red-500"/>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">YouTube</span>
                    </button>
                    <button
                        onClick={() => onFulfillWish(wish.id)}
                        className="flex flex-col items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                        title="Approve this wish and move it to fulfilled"
                    >
                        <CheckIcon className="w-6 h-6 mb-1 text-green-500"/>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Approve</span>
                    </button>
                    <button
                        onClick={() => onRejectWish(wish.id)}
                        className="flex flex-col items-center p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                        title="Reject this wish"
                    >
                        <CloseIcon className="w-6 h-6 mb-1 text-red-500"/>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Reject</span>
                    </button>
                </div>

                {wish.isLoadingRecommendations && (
                    <div className="text-center p-4 text-gray-500 dark:text-gray-400">Finding perfect videos...</div>
                )}
                 {wish.recommendations && wish.recommendations.length > 0 && (
                    <div className="mt-4">
                        <h4 className="font-semibold mb-2">AI Suggestions:</h4>
                        <div className="grid grid-cols-1 gap-3">
                            {wish.recommendations.map(rec => (
                                <RecommendedVideoCard 
                                    key={rec.videoId} 
                                    recommendation={rec}
                                    onAdd={() => onAddRecommendedVideo({
                                        url: `https://www.youtube.com/watch?v=${rec.videoId}`,
                                        title: rec.title
                                    })}
                                />
                            ))}
                        </div>
                    </div>
                 )}
                 {wish.recommendations && wish.recommendations.length === 0 && !wish.isLoadingRecommendations && (
                     <p className="text-center text-sm text-red-500 mt-4">Could not find any video recommendations for this wish.</p>
                 )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishCard;