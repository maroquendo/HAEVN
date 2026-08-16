import React, { useState, useEffect, useRef } from 'react';
import { Video, Comment, ReactionType, User, ChatMessage, VideoPlatform, ParentalControls } from '../types';
import { LoveIcon, DislikeIcon, SendIcon, CloseIcon, RobotIcon, InfoIcon, TrashIcon } from './icons';
import { getVideoChatResponse, AI_UNSURE_RESPONSE } from '../services/geminiService';
import { getCachedVideoUrl, cacheVideo } from '../services/mediaCacheService';
import clsx from 'clsx';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
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
  parentalControls: ParentalControls;
}

type PlayerMode = 'local' | 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'loading_fallback' | 'fallback_video' | 'fallback_iframe' | 'error';

const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  video,
  onClose,
  onUpdateVideo,
  onTimeUpdate,
  onAiHelpRequest,
  currentUser,
  onDeleteVideo,
  parentalControls
}) => {
  const [newComment, setNewComment] = useState('');
  const [localVideo, setLocalVideo] = useState<Video>(video);
  const [cachedStreamUrl, setCachedStreamUrl] = useState<string | null>(null);

  // Voice Interaction States for Sparky (100% Free Web Speech API)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const getInitialPlayerMode = (): PlayerMode => {
    if ((video.playbackMode === 'local' && video.localVideoUrl) || cachedStreamUrl) {
      return 'local';
    }
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
  const nativeVideoRef = useRef<HTMLVideoElement | null>(null);
  const watchIntervalRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'comments'>('chat');
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(video.totalDuration || 0);

  const isChild = currentUser.role === 'child';

  const startWatchTimer = () => {
    if (watchIntervalRef.current) clearInterval(watchIntervalRef.current);
    watchIntervalRef.current = window.setInterval(() => {
      onTimeUpdate(1);
      setLocalVideo(prev => {
        const newDuration = prev.watchDuration + 1;
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

  const togglePlayPause = () => {
    if (playerMode === 'local' && nativeVideoRef.current) {
      if (nativeVideoRef.current.paused) {
        nativeVideoRef.current.play();
        setIsPlaying(true);
        setIsVideoEnded(false);
      } else {
        nativeVideoRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    if (playerRef.current) {
      try {
        const state = playerRef.current.getPlayerState();
        if (state === 1) {
          playerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          playerRef.current.playVideo();
          setIsPlaying(true);
          setIsVideoEnded(false);
        }
      } catch (e) {
        setIsPlaying(prev => !prev);
      }
    }
  };

  const handleSkip = (seconds: number) => {
    if (playerMode === 'local' && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = Math.max(0, Math.min(nativeVideoRef.current.duration || 0, nativeVideoRef.current.currentTime + seconds));
    } else if (playerRef.current && playerRef.current.getCurrentTime) {
      try {
        const current = playerRef.current.getCurrentTime();
        playerRef.current.seekTo(Math.max(0, current + seconds), true);
      } catch (e) {}
    }
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
        setIsPlaying(true);
        setIsVideoEnded(false);
        startWatchTimer();
      } else if (event.data === window.YT.PlayerState.ENDED) {
        setIsPlaying(false);
        setIsVideoEnded(true);
        stopWatchTimer();
        try {
          event.target.seekTo(0);
          event.target.pauseVideo();
        } catch (e) {}
      } else {
        setIsPlaying(false);
        stopWatchTimer();
      }
    };

    const onPlayerError = (event: any) => {
      console.warn("YouTube Player encountered an issue:", event.data);
    };

    const loadPlayer = () => {
      if (playerRef.current) return;
      if (!document.getElementById('youtube-player-container')) return;

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
          'rel': 0,
          'modestbranding': 1,
          'disablekb': isChild ? 1 : 0,
          'fs': 1,
          'iv_load_policy': 3,
          'showinfo': 0,
          'cc_load_policy': 0,
          'origin': window.location.origin,
          'loop': 1,
          'playlist': video.id,
        }
      });
    };

    if (window.YT && window.YT.Player) {
      loadPlayer();
    } else {
      const timer = setTimeout(() => {
        loadPlayer();
      }, 500);
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

  // Check for offline cached video stream or cache it in the background
  useEffect(() => {
    let isMounted = true;
    const initMediaCache = async () => {
      try {
        const cachedUrl = await getCachedVideoUrl(video.id);
        if (cachedUrl && isMounted) {
          setCachedStreamUrl(cachedUrl);
          setPlayerMode('local');
        } else if (video.localVideoUrl) {
          // Cache in background for offline tablet playback
          cacheVideo(video.id, video.localVideoUrl, video.title).catch(() => {});
        }
      } catch (e) {
        console.warn('Cache lookup failed:', e);
      }
    };
    initMediaCache();
    return () => { isMounted = false; };
  }, [video.id, video.localVideoUrl, video.title]);

  // Setup Web Speech API for voice Q&A (100% Free on iPad Safari and Android)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0]?.transcript;
          if (transcript) {
            setChatInput(transcript);
            handleDirectVoiceSubmit(transcript);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('Failed to start voice recognition:', e);
      }
    }
  };

  const speakSparkyResponse = (text: string) => {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const cleanText = text.replace(/[\*\#\_]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.pitch = 1.15; // Friendly, warm kid tone
      utterance.rate = 0.95; // Gentle pace
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  const handleDirectVoiceSubmit = async (spokenText: string) => {
    if (!spokenText.trim() || isAiThinking) return;

    const userMessage: ChatMessage = { id: `user_${Date.now()}`, author: 'user', text: spokenText };
    const aiThinkingMessage: ChatMessage = { id: `ai_${Date.now()}`, author: 'ai', text: '', isLoading: true };

    const currentChatHistory = localVideo.chatHistory || [];
    const updatedHistory = [...currentChatHistory, userMessage, aiThinkingMessage];

    const updatedVideo = { ...localVideo, chatHistory: updatedHistory };
    setLocalVideo(updatedVideo);
    onUpdateVideo(updatedVideo);
    setChatInput('');
    setIsAiThinking(true);

    const aiResponseText = await getVideoChatResponse(video.title, video.summary, currentChatHistory, spokenText);

    if (aiResponseText.trim() === AI_UNSURE_RESPONSE && currentUser.role === 'child') {
      onAiHelpRequest(video);
    }

    const finalAiMessage: ChatMessage = { ...aiThinkingMessage, text: aiResponseText, isLoading: false };
    const finalHistory = [...currentChatHistory, userMessage, finalAiMessage];
    const finalVideoUpdate = { ...localVideo, chatHistory: finalHistory };
    setLocalVideo(finalVideoUpdate);
    onUpdateVideo(finalVideoUpdate);
    setIsAiThinking(false);

    speakSparkyResponse(aiResponseText);
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

    speakSparkyResponse(aiResponseText);
  };

  const handleDeleteClick = () => {
    onDeleteVideo(video.id);
  };

  const getSafeEmbedUrl = (): string => {
    if (video.embedUrl) return video.embedUrl;
    const platform = video.platform || 'youtube';

    switch (platform) {
      case 'youtube':
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
    // 1. Clean Native MP4 Stream Playback (Cached Blob or Server Range Stream)
    const activeStreamUrl = cachedStreamUrl || video.localVideoUrl;
    if (activeStreamUrl || playerMode === 'local') {
      return (
        <div className="relative w-full h-full bg-black flex items-center justify-center group overflow-hidden">
          <video
            ref={nativeVideoRef}
            src={activeStreamUrl || undefined}
            autoPlay
            playsInline
            onPlay={() => {
              setIsPlaying(true);
              setIsVideoEnded(false);
              startWatchTimer();
            }}
            onPause={() => {
              setIsPlaying(false);
              stopWatchTimer();
            }}
            onEnded={() => {
              setIsPlaying(false);
              setIsVideoEnded(true);
              stopWatchTimer();
            }}
            onTimeUpdate={(e) => {
              const el = e.currentTarget;
              setCurrentTime(el.currentTime);
              if (el.duration && !isNaN(el.duration)) {
                setTotalDuration(el.duration);
              }
            }}
            className="w-full h-full object-contain cursor-pointer"
            onClick={togglePlayPause}
            aria-label="Clean Video Player"
          />

          {/* Quick 10s Skip Buttons & Center Play/Pause */}
          {!isPlaying && !isVideoEnded && (
            <div 
              className="absolute inset-0 z-10 bg-black/30 flex items-center justify-center cursor-pointer"
              onClick={togglePlayPause}
            >
              <div className="p-5 rounded-full bg-black/60 text-white backdrop-blur-sm shadow-xl border border-white/20 transition transform hover:scale-110 flex items-center justify-center">
                <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}

          {/* Replay Screen */}
          {isVideoEnded && (
            <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-md">
              <h3 className="text-2xl font-bold text-white mb-2">Hope you enjoyed the video! 🌟</h3>
              <p className="text-gray-400 text-sm mb-6 max-w-sm">Ask Sparky questions on the sidebar or watch it again.</p>
              <button
                onClick={() => {
                  if (nativeVideoRef.current) {
                    nativeVideoRef.current.currentTime = 0;
                    nativeVideoRef.current.play();
                  }
                  setIsVideoEnded(false);
                  setIsPlaying(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition transform hover:scale-105 shadow-lg shadow-brand-500/20"
                title="Watch again"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Watch Again
              </button>
            </div>
          )}

          {/* Custom Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-10 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              <button onClick={togglePlayPause} className="p-1.5 hover:bg-white/20 rounded-lg transition" title={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button onClick={() => handleSkip(-10)} className="p-1.5 hover:bg-white/20 rounded-lg transition text-xs font-bold" title="Rewind 10s">
                -10s
              </button>
              <button onClick={() => handleSkip(10)} className="p-1.5 hover:bg-white/20 rounded-lg transition text-xs font-bold" title="Forward 10s">
                +10s
              </button>
              <span className="text-xs font-medium text-gray-300">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')} / {Math.floor(totalDuration / 60)}:{(Math.floor(totalDuration % 60)).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  if (nativeVideoRef.current) {
                    if (nativeVideoRef.current.requestFullscreen) nativeVideoRef.current.requestFullscreen();
                  }
                }}
                className="p-1.5 hover:bg-white/20 rounded-lg transition"
                title="Fullscreen"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 2. Fortified Sandboxed Embed Mode
    switch (playerMode) {
      case 'youtube':
        return (
          <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            <div id="youtube-player-container" className="w-full h-full pointer-events-none"></div>
            
            <div 
              className="absolute inset-0 z-10 bg-transparent flex items-center justify-center cursor-pointer group"
              onClick={togglePlayPause}
            >
              {!isPlaying && !isVideoEnded && (
                <div className="p-5 rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform scale-100 group-hover:scale-110 shadow-lg border border-white/10 flex items-center justify-center">
                  <svg className="w-12 h-12 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}

              {isVideoEnded && (
                <div className="absolute inset-0 bg-black/90 z-20 flex flex-col items-center justify-center p-6 text-center animate-fade-in backdrop-blur-md">
                  <h3 className="text-2xl font-bold text-white mb-2">Hope you enjoyed the video! 🌟</h3>
                  <p className="text-gray-400 text-sm mb-6 max-w-sm">Ask Sparky questions on the sidebar or watch it again.</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlayPause();
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-2xl transition transform hover:scale-105 shadow-lg shadow-brand-500/20"
                    title="Watch again"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Watch Again
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      case 'instagram':
        return (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 relative overflow-hidden">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full max-w-[420px] max-h-[720px] border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Instagram Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
            <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
          </div>
        );

      case 'tiktok':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full max-w-[420px] border-0 pointer-events-none"
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="TikTok Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
            <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
          </div>
        );

      case 'twitter':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
            <div className="text-center text-white w-full h-full flex flex-col justify-center items-center">
              <iframe
                src={`https://platform.twitter.com/embed/Tweet.html?id=${video.id}`}
                className="w-full max-w-[500px] h-[400px] border-0 mx-auto pointer-events-none"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="Twitter Video"
                sandbox="allow-scripts allow-same-origin allow-presentation"
                onLoad={() => startWatchTimer()}
              />
            </div>
            <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
          </div>
        );

      case 'facebook':
        return (
          <div className="w-full h-full flex items-center justify-center bg-[#1877F2] relative overflow-hidden">
            <iframe
              src={getSafeEmbedUrl()}
              className="w-full h-full border-0 pointer-events-none"
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title="Facebook Video"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              onLoad={() => startWatchTimer()}
            />
            <div className="absolute inset-0 z-10 bg-transparent cursor-default" />
          </div>
        );

      case 'error':
      default:
        return (
          <div className="p-6 text-center flex flex-col items-center justify-center h-full">
            <InfoIcon className="mx-auto h-12 w-12 text-yellow-400" />
            <h3 className="mt-2 text-xl font-medium text-white">Playback Problem</h3>
            <div className="mt-2 text-sm text-gray-300">
              <p>{errorMessage || "This video can't be played right now."}</p>
              <p className="mt-2">Please try again later or request your parent to re-share.</p>
            </div>
          </div>
        );
    }
  };

  const watchPercentage = Math.min(100, (localVideo.watchDuration / (localVideo.totalDuration || 180)) * 100);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-panel rounded-3xl shadow-2xl w-full max-w-[96vw] h-[92vh] flex flex-col overflow-hidden border border-white/10">
        <div className="flex justify-between items-center p-5 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3 truncate">
            {video.localVideoUrl && (
              <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-lg border border-green-500/30 flex items-center gap-1">
                <span>🛡️</span> Clean Ad-Free Stream
              </span>
            )}
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white truncate">{video.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" title="Close video player">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-grow flex flex-col lg:flex-row overflow-hidden">
          {/* Video Section */}
          <div className="w-full flex-1 p-6 flex flex-col overflow-y-auto custom-scrollbar bg-black/5">
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-lg flex items-center justify-center text-white ring-1 ring-white/10">
              {renderPlayer()}
            </div>
            
            <div className="mt-6 max-w-5xl mx-auto w-full">
              <div className="flex items-center mb-4">
                <img src={video.sender.avatarUrl} alt={video.sender.name} className="w-12 h-12 rounded-full mr-4 border-2 border-brand-200" />
                <div>
                  <p className="font-bold text-lg text-gray-800 dark:text-gray-100">From {video.sender.name}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{video.summary}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50 max-w-5xl mx-auto w-full">
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

            <div className="mt-6 max-w-5xl mx-auto w-full">
              <div className="flex justify-between items-end mb-2">
                <h4 className="font-bold text-gray-800 dark:text-white">Watch Progress</h4>
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
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700/50 max-w-5xl mx-auto w-full">
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

          {/* Sidebar Section (Sparky AI Chat / Parent Comments) */}
          <div className="w-full lg:w-[400px] lg:flex-none border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-700/50 flex flex-col h-full bg-gray-50/50 dark:bg-black/20">
            <div className="flex border-b border-gray-200 dark:border-gray-700/50 p-2 items-center justify-between">
              <div className="flex flex-1 space-x-1">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={clsx(
                    "flex-1 p-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2",
                    activeTab === 'chat'
                      ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-sm'
                      : 'text-gray-500 hover:bg-white/50 dark:hover:bg-white/5'
                  )}
                >
                  <span>🤖</span> Ask Sparky AI
                </button>
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
                    Family Notes
                  </button>
                )}
              </div>

              {activeTab === 'chat' && (
                <button
                  onClick={() => {
                    setIsVoiceEnabled(!isVoiceEnabled);
                    if (isVoiceEnabled && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                  }}
                  title={isVoiceEnabled ? "Mute Sparky's Voice" : "Enable Sparky's Voice"}
                  className="p-2 ml-2 text-gray-500 hover:text-brand-600 hover:bg-white dark:hover:bg-gray-800 rounded-xl transition text-base flex items-center gap-1 text-xs font-bold"
                >
                  <span>{isVoiceEnabled ? '🔊' : '🔇'}</span>
                  <span className="hidden sm:inline text-[11px] text-gray-400">{isVoiceEnabled ? 'Voice On' : 'Muted'}</span>
                </button>
              )}
            </div>

            {isListening && (
              <div className="px-4 py-2 bg-gradient-to-r from-rose-500/15 to-orange-500/15 border-b border-rose-500/20 flex items-center justify-center gap-2 text-xs font-extrabold text-rose-500 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                Listening to you... Speak to Sparky!
              </div>
            )}

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

            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <form onSubmit={activeTab === 'chat' ? handleSendChatMessage : handleAddComment} className="flex items-center space-x-2">
                {activeTab === 'chat' && speechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={isListening ? "Listening... (Tap to stop)" : "Speak to Sparky (Tap to speak)"}
                    className={clsx(
                      "p-3 rounded-xl transition-all flex items-center justify-center flex-shrink-0",
                      isListening
                        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/40'
                        : 'bg-brand-50 hover:bg-brand-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-brand-600 dark:text-brand-300'
                    )}
                  >
                    <span className="text-lg">{isListening ? '🔴' : '🎙️'}</span>
                  </button>
                )}
                <input
                  type="text"
                  value={activeTab === 'chat' ? chatInput : newComment}
                  onChange={(e) => activeTab === 'chat' ? setChatInput(e.target.value) : setNewComment(e.target.value)}
                  placeholder={
                    activeTab === 'chat'
                      ? (isListening ? "Listening... speak now!" : "Ask Sparky about this video...")
                      : "Add a private note..."
                  }
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition text-gray-800 dark:text-gray-200 placeholder-gray-400 text-sm"
                  disabled={activeTab === 'chat' && isAiThinking}
                />
                <button
                  type="submit"
                  aria-label="Send message"
                  className="bg-brand-500 text-white p-3 rounded-xl hover:bg-brand-600 transition shadow-lg shadow-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
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