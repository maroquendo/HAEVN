import React, { useState, useMemo } from 'react';
import { Wish, User } from '../types';
import WishCard from './WishCard';
import { SendIcon, SparkleIcon } from './icons';
import { motion } from 'framer-motion';

interface WishlistViewProps {
  wishes: Wish[];
  currentUser: User;
  onAddWish: (wishText: string) => void;
  onFulfillWish: (wishId: string) => void;
  onRejectWish: (wishId: string) => void;
  onFindRecommendations: (wishId: string) => void;
  onAddRecommendedVideo: (data: { url: string, title: string }) => void;
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
    <div className="max-w-4xl mx-auto pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight flex items-center gap-2">
            <span>✨</span> Video Wishlist
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {currentUser.role === 'child'
              ? 'Tell Mom or Dad what topics you want to learn about!'
              : 'Review and grant video requests submitted by your children.'}
          </p>
        </div>

        {pendingWishes.length > 0 && currentUser.role === 'parent' && (
          <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-rose-500 text-white shadow-sm animate-pulse">
            {pendingWishes.length} pending
          </span>
        )}
      </div>

      {/* Child Wish Submission Card */}
      {currentUser.role === 'child' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 sm:p-8 rounded-3xl shadow-xl border border-white/30 dark:border-white/10 mb-8 bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-indigo-500/10"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🪄</span>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Make a Video Wish!</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Type anything you want to learn about (e.g. <em>"baby animals"</em>, <em>"how rockets fly"</em>, <em>"origami folding"</em>).
          </p>
          <form onSubmit={handleAddWishSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={newWishText}
              onChange={(e) => setNewWishText(e.target.value)}
              placeholder="e.g. videos about sea turtles"
              className="w-full px-4 py-3 bg-white/90 dark:bg-gray-800/90 rounded-2xl border border-purple-200 dark:border-purple-800/60 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition text-sm text-gray-800 dark:text-gray-100 shadow-inner placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newWishText.trim()}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white p-3 rounded-2xl shadow-md shadow-purple-500/30 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              aria-label="Make a wish"
              title="Make a wish"
            >
              <SendIcon className="w-5 h-5" />
            </button>
          </form>
        </motion.div>
      )}

      {/* Pending Section */}
      <div className="mb-8">
        <h3 className="text-base font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
          {currentUser.role === 'parent' ? 'Pending Requests' : 'Your Wishes'}
        </h3>
        {pendingWishes.length > 0 ? (
          <div className="space-y-4">
            {pendingWishes.map(wish => (
              <WishCard key={wish.id} wish={wish} userRole={currentUser.role} {...props} />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-3xl text-center border border-white/20 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
            🎉 No pending wishes right now!
          </div>
        )}
      </div>

      {/* Fulfilled Section */}
      <div>
        <h3 className="text-base font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
          Fulfilled Wishes ({fulfilledWishes.length})
        </h3>
        {fulfilledWishes.length > 0 ? (
          <div className="space-y-4">
            {fulfilledWishes.map(wish => (
              <WishCard key={wish.id} wish={wish} userRole={currentUser.role} {...props} />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-8 rounded-3xl text-center border border-white/20 dark:border-white/10 text-gray-500 dark:text-gray-400 text-sm">
            No wishes have been fulfilled yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistView;