import React, { useState, useMemo } from 'react';
import { Wish, User } from '../types';
import WishCard from './WishCard';
import { SendIcon } from './icons';

interface WishlistViewProps {
  wishes: Wish[];
  currentUser: User;
  onAddWish: (wishText: string) => void;
  onFulfillWish: (wishId: string) => void;
  onRejectWish: (wishId: string) => void;
  onFindRecommendations: (wishId: string) => void;
  onAddRecommendedVideo: (data: {url: string, title: string}) => void;
}

const WishlistView: React.FC<WishlistViewProps> = (props) => {
  const { wishes, currentUser, onAddWish } = props;
  const [newWishText, setNewWishText] = useState('');

  const handleAddWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWishText.trim()) {
      onAddWish(newWishText.trim());
      setNewWishText('');
    }
  };

  const pendingWishes = useMemo(() => wishes.filter(w => w.status === 'pending'), [wishes]);
  const fulfilledWishes = useMemo(() => wishes.filter(w => w.status === 'fulfilled'), [wishes]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Video Wishlist</h2>
      </div>

      {currentUser.role === 'child' && (
        <div className="mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3">Have a video you want to see?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Ask Mom or Dad to find it for you! Type what you're looking for below.</p>
            <form onSubmit={handleAddWishSubmit} className="flex items-center space-x-2">
                <input
                    type="text"
                    value={newWishText}
                    onChange={(e) => setNewWishText(e.target.value)}
                    placeholder="e.g., videos about dinosaurs"
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                />
                <button type="submit" className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 transition" aria-label="Make a wish" title="Make a wish">
                    <SendIcon className="w-5 h-5"/>
                </button>
            </form>
        </div>
      )}

      <div>
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">
            {currentUser.role === 'parent' ? 'Pending Requests' : 'Your Wishes'}
        </h3>
        {pendingWishes.length > 0 ? (
            <div className="space-y-4">
                {pendingWishes.map(wish => <WishCard key={wish.id} wish={wish} userRole={currentUser.role} {...props} />)}
            </div>
        ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6 bg-gray-100 dark:bg-gray-800 rounded-lg">No pending wishes!</p>
        )}
      </div>

       <div className="mt-12">
        <h3 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">Fulfilled Wishes</h3>
        {fulfilledWishes.length > 0 ? (
            <div className="space-y-4">
                {fulfilledWishes.map(wish => <WishCard key={wish.id} wish={wish} userRole={currentUser.role} {...props} />)}
            </div>
        ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 py-6 bg-gray-100 dark:bg-gray-800 rounded-lg">No wishes have been fulfilled yet.</p>
        )}
      </div>

    </div>
  );
};

export default WishlistView;