import React, { useState, useEffect, useRef } from 'react';
import { Video, Comment, ReactionType, User, ChatMessage, VideoPlatform } from '../types';
import { LoveIcon, DislikeIcon, SendIcon, CloseIcon, RobotIcon, InfoIcon, TrashIcon } from './icons';
import { getVideoChatResponse, AI_UNSURE_RESPONSE } from '../services/geminiService';
import clsx from 'clsx';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface VideoPlayerViewProps {
  video: Video;
  onClose: () => void;
  onUpdateVideo: (updatedVideo: Video) => void;
  onTimeUpdate: (seconds: number) => void;
  onAiHelpRequest: (video: Video) => void;
  currentUser: User;
  onDeleteVideo: (videoId: string) => void;
}

type PlayerMode = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'loading_fallback' | 'fallback_video' | 'fallback_iframe' | 'error';

// Helper function to shuffle an array
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};


const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({ video, onClose, onUpdateVideo, onTimeUpdate, onAiHelpRequest, currentUser, onDeleteVideo }) => {
  const [newComment, setNewComment] = useState('');
  const [localVideo, setLocalVideo] = useState<Video>(video);

  // Determine initial player mode based on platform
  const getInitialPlayerMode = (): PlayerMode => {
    const platform = video.platform || 'youtube';
    if (platform === 'instagram') return 'instagram';
    if (platform === 'tiktok') return 'tiktok';
    if (platform === 'twitter') return 'twitter';
    if (platform === 'facebook') return 'facebook';
    return 'youtube';
  };

  const [playerMode, setPlayerMode] = useState<PlayerMode>(getInitialPlayerMode());
  const [fallbackStreamUrl, setFallbackStreamUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const commentsEndRef = useRef<null | HTMLDivElement>(null);
  const chatEndRef = useRef<null | HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchIntervalRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'comments'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Child users should not see comments - only AI chat
  const isChild = currentUser.role === 'child';

  const startWatchTimer = () => {
    if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
    watchIntervalRef.current = window.setInterval(() => {
      onTimeUpdate(1);
      setLocalVideo(prev => {
        const newDuration = prev.watchDuration < prev.totalDuration ? prev.watchDuration + 1 : prev.watchDuration;
        const updated = { ...prev, watchDuration: newDuration };
        onUpdateVideo(updated);
        return updated;
      });
    }, 1000);
  };

  const stopWatchTimer = () => {
    if (watchIntervalRef.current) {
      clearInterval(watchIntervalRef.current);
      watchIntervalRef.current = null;
    }
  };

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.drgns.space',
    'https://pipedapi.privacydev.net',
  ];

  const INVIDIOUS_INSTANCES = [
    'https://vid.puffyan.us',
    'https://iv.ggtyler.dev',
    'https://inv.odyssey346.dev',
  ];

  const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 2000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  };

  const fetchAndPlayFallback = async () => {
    let lastError: Error | null = null;

    console.log("Starting fallback process...");

    // --- Tier 1: Try Piped Instances (direct video stream) ---
    console.log("Fallback Tier 1: Attempting Piped instances...");
    const shuffledPiped = shuffleArray(PIPED_INSTANCES);
    for (const instance of shuffledPiped) {
      if (playerMode !== 'loading_fallback') return;

      try {
        const apiUrl = `${instance}/streams/${video.id}`;
        const response = await fetchWithTimeout(apiUrl);
        if (!response.ok) {
          lastError = new Error(`Piped service at ${instance} responded with status ${response.status}`);
          continue;
        }
        const data = await response.json();
        const videoStream = data.videoStreams?.find((s: any) => s.quality === '720p' && s.format === 'WEBM') || data.videoStreams?.[0];
        if (videoStream && videoStream.url) {
          const streamUrl = new URL(videoStream.url, instance).toString();
          console.log(`Success with Piped instance: ${instance}`);
          setFallbackStreamUrl(streamUrl);
          setPlayerMode('fallback_video');
          return; // Success!
        }
      } catch (err) {
        console.warn(`Error with Piped instance ${instance}:`, err);
        lastError = err as Error;
      }
    }

    // --- Tier 2: Try Invidious API (direct video stream) ---
    console.log("Fallback Tier 2: Piped failed, attempting Invidious API...");
    const shuffledInvidious = shuffleArray(INVIDIOUS_INSTANCES);
    for (const instance of shuffledInvidious) {
      if (playerMode !== 'loading_fallback') return;

      try {
        const apiUrl = `${instance}/api/v1/videos/${video.id}`;
        const response = await fetchWithTimeout(apiUrl);
        if (!response.ok) {
          lastError = new Error(`Invidious API at ${instance} responded with status ${response.status}`);
          continue;
        }
        const data = await response.json();
        // Find a 720p mp4 stream, or fallback to any
        const stream = data.formatStreams?.find((s: any) => s.qualityLabel === '720p' && s.container === 'mp4') || data.formatStreams?.[0];
        if (stream && stream.url) {
          console.log(`Success with Invidious API instance: ${instance}`);
          setFallbackStreamUrl(stream.url); // URL is absolute
          setPlayerMode('fallback_video');
          return; // Success!
        }
      } catch (err) {
        console.warn(`Error with Invidious API instance ${instance}:`, err);
        lastError = err as Error;
      }
    }

    // --- Tier 3: Try Invidious Instances (iframe embed) ---
    console.log("Fallback Tier 3: All fetch attempts failed, trying Invidious iframe embed...");
    if (shuffledInvidious.length > 0) {
      const instance = shuffledInvidious[0];
      const embedUrl = `${instance}/embed/${video.id}?autoplay=1`;
      console.log(`Using Invidious embed fallback: ${embedUrl}`);
      setFallbackStreamUrl(embedUrl);
      setPlayerMode('fallback_iframe');
      return; // Set the iframe and hope for the best.
    }

    // If all tiers fail
    setErrorMessage("Unable to play video from any source.");
    setPlayerMode('error');
  };

  // YouTube Player Initialization
  useEffect(() => {
    if (playerMode !== 'youtube') return;

    let isMounted = true;

    const onPlayerReady = (event: any) => {
      if (isMounted) event.target.playVideo();
    };

    const onPlayerStateChange = (event: any) => {
      if (!window.YT) return;
      if (event.data === window.YT.PlayerState.PLAYING) {
        startWatchTimer();
      } else {
        stopWatchTimer();
      }
    };

    const onPlayerError = (event: any) => {
      console.log("YouTube Player Error:", event.data);
      if (isMounted) setPlayerMode('loading_fallback');
    };

    const loadPlayer = () => {
      if (playerRef.current) return;
      if (!document.getElementById('youtube-player-container')) return;

      // Use youtube-nocookie.com for privacy-enhanced mode
      playerRef.current = new window.YT.Player('youtube-player-container', {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        },
        playerVars: {
          'autoplay': 1,
          'controls': 1,
          'rel': 0,  // Disable related videos from other channels
          'modestbranding': 1,  // Minimal YouTube branding
          'disablekb': isChild ? 1 : 0, // Disable keyboard controls for children
          'fs': 1, // Allow fullscreen
          'iv_load_policy': 3, // Disable video annotations
          'showinfo': 0, // Don't show video title/uploader
          'cc_load_policy': 0, // Don't load captions by default
          'origin': window.location.origin, // For security
        }
      });
    };

    if (window.YT && window.YT.Player) {
      loadPlayer();
    } else {
      // Wait for API or global callback? 
      // Assuming API is loaded in index.html. If not, we might need to load it.
      // For now, if not present, try fallback immediately or wait a bit?
      // Let's try fallback if not present after a timeout.
      const timer = setTimeout(() => {
        if (isMounted && (!window.YT || !window.YT.Player)) {
          setPlayerMode('loading_fallback');
        } else {
          loadPlayer();
        }
      }, 1000);
      return () => clearTimeout(timer);
    }

    return () => {
      isMounted = false;
      stopWatchTimer();
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [video.id, playerMode, isChild]);

  // Fallback Trigger
  useEffect(() => {
    if (playerMode === 'loading_fallback') {
      fetchAndPlayFallback();
    }
  }, [playerMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localVideo.chatHistory]);

  const handleReaction = (reaction: ReactionType) => {
    const updatedReactions = { ...localVideo.reactions };
    let updatedUserReaction: ReactionType | null = localVideo.userReaction || null;
    const currentReaction = localVideo.userReaction;

    if (currentReaction === reaction) {
      updatedReactions[reaction] = Math.max(0, updatedReactions[reaction] - 1);
      updatedUserReaction = null;
    } else {
      if (currentReaction) {
        updatedReactions[currentReaction] = Math.max(0, updatedReactions[currentReaction] - 1);
      }
      updatedReactions[reaction]++;
      updatedUserReaction = reaction;
    }

    const updatedVideo = { ...localVideo, reactions: updatedReactions, userReaction: updatedUserReaction };
    setLocalVideo(updatedVideo);
    onUpdateVideo(updatedVideo);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() === '' || !currentUser) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: currentUser,
      text: newComment,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedVideo = { ...localVideo, comments: [...localVideo.comments, comment] };
    setLocalVideo(updatedVideo);
    onUpdateVideo(updatedVideo);
    setNewComment('');
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = chatInput.trim();
    if (question === '' || isAiThinking) return;

    const userMessage: ChatMessage = { id: `user_${Date.now()}`, author: 'user', text: question };
    const aiThinkingMessage: ChatMessage = { id: `ai_${Date.now()}`, author: 'ai', text: '', isLoading: true };

    const currentChatHistory = localVideo.chatHistory || [];
    const updatedHistory = [...currentChatHistory, userMessage, aiThinkingMessage];

    const updatedVideo = { ...localVideo, chatHistory: updatedHistory };
    setLocalVideo(updatedVideo);
    onUpdateVideo(updatedVideo);
    setChatInput('');
    setIsAiThinking(true);

    const aiResponseText = await getVideoChatResponse(video.title, video.summary, currentChatHistory, question);

    if (aiResponseText.trim() === AI_UNSURE_RESPONSE && currentUser.role === 'child') {
      onAiHelpRequest(video);
    }

    const finalAiMessage: ChatMessage = { ...aiThinkingMessage, text: aiResponseText, isLoading: false };
    const finalHistory = [...currentChatHistory, userMessage, finalAiMessage];
    const finalVideoUpdate = { ...localVideo, chatHistory: finalHistory };
    setLocalVideo(finalVideoUpdate);
    onUpdateVideo(finalVideoUpdate);
    setIsAiThinking(false);
  };

  const handleDeleteClick = () => {
    onDeleteVideo(video.id);
  };

  // Get the safe embed URL for the platform
  const getSafeEmbedUrl = (): string => {
    if (video.embedUrl) return video.embedUrl;

    const platform = video.platform || 'youtube';

    switch (platform) {
      case 'youtube':
        // Privacy-enhanced YouTube embed with restricted parameters
        return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0&modestbranding=1&showinfo=0&autoplay=1&controls=1&iv_load_policy=3`;
      case 'instagram':
        return `https://www.instagram.com/p/${video.id}/embed/?hidecaption=1`;
      case 'tiktok':
        return `https://www.tiktok.com/embed/v2/${video.id}`;
      case 'facebook':
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.url)}&show_text=false`;
      default:
        return '';
    }
  };

  const renderPlayer = () => {
    switch (playerMode) {
      case 'youtube':
        return <div id="youtube-player-container" className="w-full h-full"></div>;

      case 'instagram':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full max-w-[400px] max-h-[700px] border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Instagram Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
          </div>
        );

      case 'tiktok':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full max-w-[400px] border-0"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="TikTok Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
          </div>
        );

      case 'twitter':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <div className="text-center text-white">
              <InfoIcon className="mx-auto h-12 w-12 text-blue-400 mb-4" />
              <h3 className="text-xl font-medium mb-2">Twitter/X Video</h3>
              <p className="text-gray-300 mb-4">This video can be viewed in the player below.</p>
              <iframe
                src={`https://platform.twitter.com/embed/Tweet.html?id=${video.id}`}
                className="w-full max-w-[500px] h-[400px] border-0 mx-auto"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Twitter Video"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                onLoad={() => startWatchTimer()}
              />
            </div>
          </div>
        );

      case 'facebook':
        return (
          <div className="w-full h-full flex items-center justify-center bg-[#1877F2]">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full border-0"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title="Facebook Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
          </div>
        );

      case 'loading_fallback':
        return (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full">
            <svg className="animate-spin h-12 w-12 text-brand-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 className="mt-4 text-xl font-medium text-white">Let me try a little trick...</h3>
            <p className="mt-2 text-sm text-gray-300">This video is being stubborn. Trying a workaround!</p>
          </div>
        );
      case 'fallback_video':
        return (
          <video
            src={fallbackStreamUrl!}
            controls
            autoPlay
            onPlay={startWatchTimer}
            onPause={stopWatchTimer}
            onEnded={stopWatchTimer}
            className="w-full h-full"
            aria-label="Video player"
          />
        );
      case 'fallback_iframe':
        return (
          <iframe
            src={fallbackStreamUrl!}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
            title="Fallback Video Player"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          ></iframe>
        );
      case 'error':
      default:
        return (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full">
            <InfoIcon className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-xl font-medium text-white">Playback Problem</h3>
            <div className="mt-2 text-sm text-gray-300">
              <p>{errorMessage || "This video can't be played right now."}</p>
              <p className="mt-2">Please try again later or contact support if the problem persists.</p>
            </div>
          </div>
        );
    }
  };

  const watchPercentage = (localVideo.watchDuration / localVideo.totalDuration) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel rounded-3xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden border border-white/10">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white truncate">{video.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" title="Close video player">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Video Section */}
          <div className="w-full lg:w-2/3 p-6 flex flex-col overflow-y-auto custom-scrollbar">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg flex items-center justify-center text-white ring-1 ring-white/10">
              {renderPlayer()}
            </div>
            <div className="mt-6">
              <div className="flex items-center mb-4">
                <img src={video.sender.avatarUrl} alt={video.sender.name} className="w-12 h-12 rounded-full mr-4 border-2 border-brand-200" />
                <div>
                  <p className="font-bold text-lg text-gray-800 dark:text-gray-100">From {video.sender.name}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{video.summary}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
              <h4 className="font-bold text-gray-800 dark:text-white mb-3">Your Reaction</h4>
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReaction(ReactionType.LOVE)}
                  title="Love this video"
                  className={clsx(
                    "flex items-center space-x-2 transition px-6 py-3 rounded-full font-semibold shadow-sm",
                    localVideo.userReaction === ReactionType.LOVE
                      ? 'text-white bg-pink-500 shadow-pink-500/30'
                      : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-pink-100 dark:hover:bg-gray-700'
                  )}
                >
                  <LoveIcon className="w-6 h-6" /> <span>Love it ({localVideo.reactions.love})</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleReaction(ReactionType.DISLIKE)}
                  title="Dislike this video"
                  className={clsx(
                    "flex items-center space-x-2 transition px-6 py-3 rounded-full font-semibold shadow-sm",
                    localVideo.userReaction === ReactionType.DISLIKE
                      ? 'text-white bg-blue-500 shadow-blue-500/30'
                      : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700'
                  )}
                >
                  <DislikeIcon className="w-6 h-6" /> <span>Didn't like it ({localVideo.reactions.dislike})</span>
                </motion.button>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-bold text-gray-800 dark:text-white">Progress</h4>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{Math.floor(localVideo.watchDuration / 60)}m {localVideo.watchDuration % 60}s watched</p>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-brand-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${watchPercentage}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>

            {currentUser.role === 'parent' && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50">
                <h4 className="font-bold text-gray-800 dark:text-white mb-3">Admin Actions</h4>
                <button
                  onClick={handleDeleteClick}
                  title="Permanently delete this video"
                  className="flex items-center space-x-2 transition px-5 py-2.5 rounded-xl text-red-600 bg-red-50 dark:bg-red-900/20 font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                >
                  <TrashIcon className="w-5 h-5" /> <span>Delete Video</span>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Section (Chat/Comments) - HIDE COMMENTS FOR CHILDREN */}
          <div className="w-full lg:w-1/3 border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700/50 flex flex-col h-full bg-gray-50/50 dark:bg-black/20">
            {/* Tab buttons - Only show Comments tab to parents */}
            <div className="flex border-b border-gray-200 dark:border-gray-700/50 p-2">
              <button
                onClick={() => setActiveTab('chat')}
                className={clsx(
                  "flex-1 p-3 rounded-xl font-bold text-sm transition-all",
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm'
                    : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/5'
                )}
              >
                AI Chat
              </button>
              {/* Only show Comments tab for parents */}
              {!isChild && (
                <button
                  onClick={() => setActiveTab('comments')}
                  className={clsx(
                    "flex-1 p-3 rounded-xl font-bold text-sm transition-all",
                    activeTab === 'comments'
                      ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/5'
                  )}
                >
                  Comments
                </button>
              )}
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {activeTab === 'chat' ? (
                <>
                  {(localVideo.chatHistory || []).map(msg => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex items-end space-x-2 ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.author === 'ai' && <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-600"><RobotIcon className="w-5 h-5" /></div>}
                      <div className={clsx(
                        "rounded-2xl p-4 max-w-[85%] shadow-sm",
                        msg.author === 'user'
                          ? 'bg-brand-500 text-white rounded-br-none'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                      )}>
                        {msg.isLoading ? (
                          <div className="flex items-center space-x-1">
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-75" />
                            <span className="w-2 h-2 bg-current rounded-full animate-bounce delay-150" />
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed">{msg.text}</p>
                        )}
                      </div>
                      {msg.author === 'user' && <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full shadow-sm" />}
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </>
              ) : (
                // Only render Comments section for parents (additional safety check)
                !isChild && (
                  <>
                    {localVideo.comments.map(comment => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={comment.id}
                        className={`flex flex-col ${comment.author.id === currentUser.id ? 'items-end' : 'items-start'}`}
                      >
                        <div className={clsx(
                          "rounded-2xl p-3 max-w-[85%] shadow-sm",
                          comment.author.id === currentUser.id
                            ? 'bg-brand-500 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-none'
                        )}>
                          <p className="text-sm">{comment.text}</p>
                        </div>
                        <span className="text-xs text-gray-400 mt-1 font-medium px-1">{comment.author.name} • {comment.timestamp}</span>
                      </motion.div>
                    ))}
                    <div ref={commentsEndRef} />
                  </>
                )
              )}
            </div>

            {/* Input - Only show comments input for parents */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={activeTab === 'chat' ? handleSendChatMessage : handleAddComment} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={activeTab === 'chat' ? chatInput : newComment}
                  onChange={(e) => activeTab === 'chat' ? setChatInput(e.target.value) : setNewComment(e.target.value)}
                  placeholder={activeTab === 'chat' ? "Ask Sparky a question..." : "Add a comment..."}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-400"
                  disabled={activeTab === 'chat' && isAiThinking}
                />
                <button
                  type="submit"
                  className="bg-brand-500 text-white p-3 rounded-xl hover:bg-brand-600 transition shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={(activeTab === 'chat' && isAiThinking) || (activeTab === 'comments' && isChild)}
                >
                  <SendIcon className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default VideoPlayerView;