import React from 'react';
import { Wish } from '../types';
import RecommendedVideoCard from './RecommendedVideoCard';
import { SparkleIcon, YouTubeIcon, CheckIcon, CloseIcon } from './icons';
import { motion } from 'framer-motion';

interface WishCardProps {
  wish: Wish;
  userRole: 'parent' | 'child';
  onFulfillWish: (wishId: string) => void;
  onRejectWish: (wishId: string) => void;
  onFindRecommendations: (wishId: string) => void;
  onAddRecommendedVideo: (data: { url: string, title: string }) => void;
}

const WishCard: React.FC<WishCardProps> = ({ wish, userRole, onFulfillWish, onRejectWish, onFindRecommendations, onAddRecommendedVideo }) => {
  const isPending = wish.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-3xl p-5 border border-white/20 dark:border-white/10 shadow-md transition-all ${isPending ? 'bg-white/80 dark:bg-gray-800/80' : 'opacity-70 bg-white/40 dark:bg-gray-800/40'}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <img
          src={wish.author.avatarUrl}
          alt={wish.author.name}
          className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-700 shadow-sm object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-base font-extrabold text-gray-800 dark:text-white leading-snug">
                "{wish.text}"
              </p>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                Requested by <span className="font-bold text-gray-700 dark:text-gray-200">{wish.author.name}</span> • {wish.timestamp}
              </p>
            </div>
            <span className={`self-start text-xs font-extrabold px-3 py-1 rounded-full shadow-sm ${isPending ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'}`}>
              {isPending ? '⏳ Pending Review' : '✓ Fulfilled'}
            </span>
          </div>

          {userRole === 'parent' && isPending && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-3">
              <button
                onClick={() => onFindRecommendations(wish.id)}
                disabled={wish.isLoadingRecommendations}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-2.5 px-4 rounded-2xl shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait text-sm"
                title="Use AI to find YouTube videos for this wish"
              >
                <SparkleIcon className="w-4 h-4" />
                <span>{wish.isLoadingRecommendations ? 'Finding best videos...' : 'Find Videos with AI'}</span>
              </button>

              <div className="grid grid-cols-3 gap-2.5 text-xs">
                <button
                  onClick={() => {
                    const query = encodeURIComponent(`kids educational videos about ${wish.text}`);
                    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
                  }}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-750 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold transition border border-gray-200/60 dark:border-gray-700"
                  title="Search for this wish on YouTube"
                >
                  <YouTubeIcon className="w-4 h-4 text-red-500" />
                  <span>YouTube</span>
                </button>
                <button
                  onClick={() => onFulfillWish(wish.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold transition border border-emerald-200/60 dark:border-emerald-800/60"
                  title="Approve this wish and move it to fulfilled"
                >
                  <CheckIcon className="w-4 h-4 text-emerald-500" />
                  <span>Approve</span>
                </button>
                <button
                  onClick={() => onRejectWish(wish.id)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold transition border border-rose-200/60 dark:border-rose-800/60"
                  title="Reject this wish"
                >
                  <CloseIcon className="w-4 h-4 text-rose-500" />
                  <span>Dismiss</span>
                </button>
              </div>

              {wish.isLoadingRecommendations && (
                <div className="flex items-center justify-center gap-2 p-3 text-xs font-semibold text-brand-600 dark:text-brand-400 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping" />
                  Finding kid-safe educational videos with Gemini...
                </div>
              )}

              {wish.recommendations && wish.recommendations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">✨ AI Recommendations:</h4>
                  <div className="grid grid-cols-1 gap-2.5">
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
                <p className="text-center text-xs text-rose-500 mt-2 font-medium">Could not find any video recommendations for this topic.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default WishCard;