import React, { useState, useEffect, useRef } from 'react';
import { Video, Comment, ReactionType, User, ChatMessage } from '../types';
import { LoveIcon, DislikeIcon, SendIcon, CloseIcon, ChatIcon, RobotIcon, InfoIcon, TrashIcon } from './icons';
import { getVideoChatResponse, AI_UNSURE_RESPONSE } from '../services/geminiService';

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

type PlayerMode = 'youtube' | 'loading_fallback' | 'fallback_video' | 'fallback_iframe' | 'error';

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
  const [playerMode, setPlayerMode] = useState<PlayerMode>('youtube');
  const [fallbackStreamUrl, setFallbackStreamUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const commentsEndRef = useRef<null | HTMLDivElement>(null);
  const chatEndRef = useRef<null | HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const watchIntervalRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'comments'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

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
    'https://pipedapi.smnz.de',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.aeong.one',
    'https://piped-api.lunar.icu',
    'https://pipedapi.ggxt.dev',
    'https://pipedapi.simpleprivacy.fr',
    'https://pipedapi.drgns.space',
    'https://piped-api.garudalinux.org',
    'https://pipedapi.privacydev.net',
    'https://pipedapi.moomoo.me',
    'https://api-piped.mha.fi',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.frontend.social',
  ];

  const INVIDIOUS_INSTANCES = [
    'https://vid.puffyan.us',
    'https://invidious.lunar.icu',
    'https://iv.ggtyler.dev',
    'https://inv.odyssey346.dev',
    'https://invidious.nerdvpn.de',
    'https://invidious.protokolla.fi',
    'https://iv.datura.network',
    'https://invidious.projectsegfau.lt',
    'https://invidious.slipfox.xyz',
    'https://invidious.kavin.rocks',
    'https://invidious.io.lol',
    'https://inv.vern.cc',
    'https://invidious.private.coffee',
    'https://iv.melmac.space',
  ];

  const fetchAndPlayFallback = async () => {
    let lastError: Error | null = null;
  
    // --- Tier 1: Try Piped Instances (direct video stream) ---
    console.log("Fallback Tier 1: Attempting Piped instances...");
    const shuffledPiped = shuffleArray(PIPED_INSTANCES);
    for (const instance of shuffledPiped) {
        try {
            const apiUrl = `${instance}/streams/${video.id}`;
            const response = await fetch(apiUrl);
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
        try {
            const apiUrl = `${instance}/api/v1/videos/${video.id}`;
            const response = await fetch(apiUrl);
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
    console.error("All fallback attempts failed:", lastError);
    const errorMessage = lastError?.message ? `All fallback attempts failed:\n${lastError.message}` : "Even my best tricks didn't work for this video. So sorry!";
    setErrorMessage(errorMessage);
    setPlayerMode('error');
  };

  useEffect(() => {
    if (localVideo.status === 'unseen') {
      const updated = { ...localVideo, status: 'seen' as 'seen' };
      setLocalVideo(updated);
      onUpdateVideo(updated);
    }
    
    if (playerMode !== 'youtube') {
      return;
    }

    const onPlayerReady = (event: any) => {};

    const onPlayerStateChange = (event: any) => {
        if (event.data === window.YT.PlayerState.PLAYING) {
            startWatchTimer();
        } else {
            stopWatchTimer();
        }
    };
    
    const onPlayerError = (event: any) => {
      stopWatchTimer();
      console.error("YouTube Player Error Code:", event.data);

      if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy();
          playerRef.current = null;
      }
      setPlayerMode('loading_fallback');
      fetchAndPlayFallback();
    };

    const setupPlayer = () => {
        if (document.getElementById('youtube-player-container')) {
            playerRef.current = new window.YT.Player('youtube-player-container', {
                videoId: video.id,
                playerVars: { 'autoplay': 1, 'controls': 1, 'rel': 0, 'iv_load_policy': 3, 'modestbranding': 1, 'playsinline': 1, 'fs': 1, 'cc_load_policy': 1, 'origin': window.location.origin },
                events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange, 'onError': onPlayerError },
            });
        }
    };

    if (!window.YT || !window.YT.Player) {
        window.onYouTubeIframeAPIReady = setupPlayer;
    } else {
        setupPlayer();
    }

    return () => {
        stopWatchTimer();
        if (playerRef.current && playerRef.current.destroy) {
            playerRef.current.destroy();
            playerRef.current = null;
        }
        if(window.onYouTubeIframeAPIReady) {
            window.onYouTubeIframeAPIReady = () => {};
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, playerMode]);

  useEffect(() => {
    if (playerMode === 'fallback_iframe') {
      startWatchTimer();
    }
  }, [playerMode]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localVideo.comments]);

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
  
  const renderPlayer = () => {
    switch (playerMode) {
      case 'youtube':
        return <div id="youtube-player-container" className="w-full h-full"></div>;
      case 'loading_fallback':
        return (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full">
            <svg className="animate-spin h-12 w-12 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
              </div>
          </div>
        );
    }
  };

  const watchPercentage = (localVideo.watchDuration / localVideo.totalDuration) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-30 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white truncate">{video.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition" title="Close video player">
            <CloseIcon />
          </button>
        </div>

        <div className="flex-grow flex flex-col md:flex-row overflow-y-auto">
          <div className="w-full md:w-2/3 p-4 flex flex-col">
            <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center text-white">
                {renderPlayer()}
            </div>
             <div className="mt-4">
                <div className="flex items-center mb-3">
                    <img src={video.sender.avatarUrl} alt={video.sender.name} className="w-10 h-10 rounded-full mr-3" />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">From {video.sender.name}</p>
                    </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mt-2">{video.summary}</p>
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Your Reaction</h4>
                <div className="flex space-x-4">
                  <button 
                    onClick={() => handleReaction(ReactionType.LOVE)}
                    title="Love this video"
                    className={`flex items-center space-x-2 transition px-4 py-2 rounded-full ${ localVideo.userReaction === ReactionType.LOVE ? 'text-pink-500 bg-pink-100 dark:bg-pink-900/50 font-semibold' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:text-pink-500 hover:bg-pink-50 dark:hover:bg-gray-600'}`}
                  >
                    <LoveIcon /> <span>Love it ({localVideo.reactions.love})</span>
                  </button>
                  <button 
                    onClick={() => handleReaction(ReactionType.DISLIKE)}
                    title="Dislike this video"
                    className={`flex items-center space-x-2 transition px-4 py-2 rounded-full ${ localVideo.userReaction === ReactionType.DISLIKE ? 'text-blue-500 bg-blue-100 dark:bg-blue-900/50 font-semibold' : 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-gray-600'}`}
                  >
                    <DislikeIcon /> <span>Didn't like it ({localVideo.reactions.dislike})</span>
                  </button>
                </div>
             </div>
             <div className="mt-4">
                 <h4 className="font-semibold text-gray-800 dark:text-white mb-1">Progress</h4>
                 <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
                    <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${watchPercentage}%` }}></div>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Watched for {Math.floor(localVideo.watchDuration / 60)}m {localVideo.watchDuration % 60}s</p>
             </div>
              {currentUser.role === 'parent' && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="font-semibold text-gray-800 dark:text-white mb-2">Admin Actions</h4>
                      <button 
                          onClick={handleDeleteClick}
                          title="Permanently delete this video"
                          className="flex items-center space-x-2 transition px-4 py-2 rounded-full text-red-600 bg-red-100 dark:bg-red-900/50 font-semibold hover:bg-red-200 dark:hover:bg-red-900"
                      >
                          <TrashIcon className="w-5 h-5"/> <span>Delete Video</span>
                      </button>
                  </div>
              )}
          </div>

          <div className="w-full md:w-1/3 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setActiveTab('chat')}
                  title="Chat with Sparky the AI about the video"
                  className={`flex-1 p-3 font-semibold text-sm transition-colors ${activeTab === 'chat' ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                >
                  AI Chat
                </button>
                <button 
                  onClick={() => setActiveTab('comments')}
                  title="View and add comments"
                  className={`flex-1 p-3 font-semibold text-sm transition-colors ${activeTab === 'comments' ? 'bg-indigo-50 dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                >
                  Comments
                </button>
            </div>
            {activeTab === 'chat' && (
              <>
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {(localVideo.chatHistory || []).map(msg => (
                      <div key={msg.id} className={`flex items-end space-x-2 ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {msg.author === 'ai' && <RobotIcon className="w-8 h-8 p-1.5 rounded-full bg-gray-200 dark:bg-gray-600 text-indigo-500 flex-shrink-0" />}
                          <div className={`rounded-xl p-3 max-w-xs ${msg.author === 'user' ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                              {msg.isLoading ? (
                                <div className="flex items-center space-x-1">
                                  <span className="dot animate-bounce">.</span>
                                  <span className="dot animate-bounce-delay-150">.</span>
                                  <span className="dot animate-bounce-delay-300">.</span>
                                </div>
                              ) : (
                                <p className="text-sm">{msg.text}</p>
                              )}
                          </div>
                           {msg.author === 'user' && <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-8 h-8 rounded-full flex-shrink-0" />}
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                    <form onSubmit={handleSendChatMessage} className="flex items-center space-x-2">
                        <input 
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Ask Sparky a question..."
                          className="w-full p-2 bg-gray-200 dark:bg-gray-600 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                          disabled={isAiThinking}
                        />
                        <button type="submit" className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition disabled:bg-indigo-400" disabled={isAiThinking} title="Send message">
                          <SendIcon className="w-5 h-5"/>
                        </button>
                    </form>
                </div>
              </>
            )}
            {activeTab === 'comments' && (
              <>
                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                  {localVideo.comments.map(comment => (
                    <div key={comment.id} className={`flex flex-col ${comment.author.id === currentUser.id ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-xl p-3 max-w-xs ${comment.author.id === currentUser.id ? 'bg-indigo-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200'}`}>
                        <p className="text-sm">{comment.text}</p>
                      </div>
                       <span className="text-xs text-gray-400 mt-1">{comment.author.name} at {comment.timestamp}</span>
                    </div>
                  ))}
                  <div ref={commentsEndRef} />
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                  <form onSubmit={handleAddComment} className="flex items-center space-x-2">
                    <input 
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Chat about the video..."
                      className="w-full p-2 bg-gray-200 dark:bg-gray-600 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                    />
                    <button type="submit" className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition" disabled={currentUser.role === 'parent'} title="Send comment">
                      <SendIcon className="w-5 h-5"/>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


export default VideoPlayerView;