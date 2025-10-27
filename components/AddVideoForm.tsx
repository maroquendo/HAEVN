import React, { useState, useEffect, useRef } from 'react';
import { summarizeVideoContent, generateVideoDescriptionFromTitle } from '../services/geminiService';
import { Video, ReactionType, User } from '../types';
import { CloseIcon, VideoIcon } from './icons';

interface AddVideoFormProps {
  onAddVideo: (video: Video) => void;
  onClose: () => void;
  initialData?: { url: string; title: string };
  currentUser: User;
  familyMembers: User[];
}

const AddVideoForm: React.FC<AddVideoFormProps> = ({ onAddVideo, onClose, initialData, currentUser, familyMembers }) => {
  const [url, setUrl] = useState(initialData?.url || '');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState(initialData?.title || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { descriptionRef.current = description; }, [description]);

  const childMembers = familyMembers.filter(m => m.role === 'child' && m.status === 'active');

  const handleRecipientToggle = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getYouTubeID = (videoUrl: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = videoUrl.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    const videoId = getYouTubeID(url);
    if (videoId) {
      setThumbnailUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    } else {
      setThumbnailUrl('');
    }
  }, [url]);


  useEffect(() => {
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = window.setTimeout(async () => {
        const videoId = getYouTubeID(url);
        if (videoId) {
            setIsAutoFilling(true);
            setError('');
            try {
                const oEmbedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
                const response = await fetch(oEmbedUrl);
                if (!response.ok) {
                    throw new Error('Could not fetch video details.');
                }
                const data = await response.json();
                
                let fetchedTitle = '';
                if (data.title) {
                    fetchedTitle = data.title;
                    if (titleRef.current.trim() === '') {
                        setTitle(fetchedTitle);
                    }
                } else {
                    throw new Error('Video title not found in response.');
                }

                if (descriptionRef.current.trim() === '' && fetchedTitle) {
                    const generatedDescription = await generateVideoDescriptionFromTitle(fetchedTitle);
                    if (descriptionRef.current.trim() === '') { // Check again in case user typed while waiting
                        setDescription(generatedDescription);
                    }
                }

            } catch (err) {
                console.error("Auto-fill error:", err);
            } finally {
                setIsAutoFilling(false);
            }
        }
    }, 1000);

    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const videoId = getYouTubeID(url);

    if (!videoId) {
      setError('Please enter a valid YouTube URL.');
      return;
    }
    if (!description.trim() || !title.trim()) {
        setError('Please provide a title and a description for summarization.');
        return;
    }
     if (childMembers.length > 0 && selectedRecipients.length === 0) {
      setError('Please select at least one recipient.');
      return;
    }

    setIsLoading(true);
    try {
      const summary = await summarizeVideoContent(description);
      const recipients = familyMembers.filter(member => selectedRecipients.includes(member.id));
      const newVideo: Video = {
        id: videoId,
        url,
        title,
        summary,
        sender: currentUser,
        recipients,
        status: 'unseen',
        watchDuration: 0,
        totalDuration: Math.floor(Math.random() * 300) + 120, // Mock duration
        reactions: {
          [ReactionType.LOVE]: 0,
          [ReactionType.DISLIKE]: 0,
        },
        userReaction: null,
        comments: [
          {
            id: Date.now().toString(),
            author: currentUser,
            text: 'Here is a new video for you!',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        ],
      };
      onAddVideo(newVideo);
      onClose(); // Close modal on success
    } catch (err) {
      setError('Failed to add video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg ring-1 ring-black/10 dark:ring-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-lg relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-1 bg-white/50 dark:bg-black/50" aria-label="Close form" title="Close form">
                <CloseIcon />
            </button>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Share a New Video</h2>
            
            <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-lg mb-6 flex items-center justify-center overflow-hidden transition-all">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-400 dark:text-gray-500">
                    <VideoIcon className="w-16 h-16 mx-auto" />
                    <p className="mt-2 text-sm">Thumbnail will appear here</p>
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="YouTube URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                    disabled={isLoading}
                />
                 {isAutoFilling && (
                    <div className="flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Auto-filling details...</span>
                    </div>
                )}
                 <input
                    type="text"
                    placeholder="Video Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                    disabled={isLoading}
                />
                <textarea
                    placeholder="Paste video transcript or description here for AI summary..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-gray-100/50 dark:bg-gray-700/50 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition h-24 resize-none text-gray-800 dark:text-gray-200"
                    disabled={isLoading}
                />

                {childMembers.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Send to:</label>
                        <div className="flex flex-wrap gap-3">
                            {childMembers.map(child => (
                                <button
                                    type="button"
                                    key={child.id}
                                    onClick={() => handleRecipientToggle(child.id)}
                                    className={`flex items-center space-x-2 p-2 rounded-lg transition-all border-2 ${
                                    selectedRecipients.includes(child.id)
                                        ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500'
                                        : 'bg-gray-100/50 dark:bg-gray-700/50 border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                                    }`}
                                >
                                    <img src={child.avatarUrl} alt={child.name} className="w-8 h-8 rounded-full" />
                                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200">{child.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    type="submit"
                    className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-indigo-500/50"
                    disabled={isLoading}
                    title="Generate AI summary and share video"
                >
                {isLoading ? (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : 'Summarize & Share'}
                </button>
            </form>
        </div>
    </div>
  );
};

export default AddVideoForm;