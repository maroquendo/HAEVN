import React, { useState, useEffect, useRef } from 'react';
import { summarizeVideoContent, generateVideoDescriptionFromTitle } from '../services/geminiService';
import { Video, ReactionType, User, VideoPlatform } from '../types';
import { CloseIcon, VideoIcon } from './icons';
import { parseVideoUrl, fetchVideoMetadata, isValidVideoUrl, getPlatformDisplayName, extractCleanUrl } from '../utils/videoUrlParser';

interface AddVideoFormProps {
  onAddVideo: (video: Video) => void;
  onClose: () => void;
  initialData?: { url: string; title: string };
  currentUser: User;
  familyMembers: User[];
  sharingRules?: { [senderId: string]: string[] };
}

const AddVideoForm: React.FC<AddVideoFormProps> = ({ onAddVideo, onClose, initialData, currentUser, familyMembers, sharingRules }) => {
  const [rawUrlInput, setRawUrlInput] = useState(initialData?.url || '');
  const [url, setUrl] = useState(extractCleanUrl(initialData?.url || ''));
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState(initialData?.title || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [detectedPlatform, setDetectedPlatform] = useState<VideoPlatform | null>(null);
  const [downloadLocally, setDownloadLocally] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Generating AI summary...');
  const [resolvedDuration, setResolvedDuration] = useState<number | null>(null);

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const titleRef = useRef(title);
  const descriptionRef = useRef(description);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { descriptionRef.current = description; }, [description]);

  const allowedRecipientIds = sharingRules?.[currentUser.id];
  const childMembers = familyMembers.filter(m => {
    const isChild = m.role === 'child' && m.status === 'active';
    if (!isChild) return false;
    if (allowedRecipientIds) {
      return allowedRecipientIds.includes(m.id);
    }
    return true;
  });

  // Auto-select all children by default for frictionless sharing
  useEffect(() => {
    if (childMembers.length > 0 && selectedRecipients.length === 0) {
      setSelectedRecipients(childMembers.map(c => c.id));
    }
  }, [childMembers]);

  const [resolvedVideoId, setResolvedVideoId] = useState('');

  const handleRecipientToggle = (userId: string) => {
    setSelectedRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleUrlChange = (value: string) => {
    setRawUrlInput(value);
    const clean = extractCleanUrl(value);
    setUrl(clean);
  };

  // Update thumbnail and platform detection when URL changes
  useEffect(() => {
    const parsed = parseVideoUrl(url);
    if (parsed.platform !== 'unknown') {
      setDetectedPlatform(parsed.platform);
      setResolvedVideoId(parsed.videoId);
      if (parsed.thumbnailUrl) {
        setThumbnailUrl(parsed.thumbnailUrl);
      }
    } else {
      setDetectedPlatform(null);
      setResolvedVideoId('');
      setThumbnailUrl('');
    }
  }, [url]);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!url || !url.startsWith('http')) return;

    debounceTimeoutRef.current = window.setTimeout(async () => {
      const parsed = parseVideoUrl(url);
      if (parsed.platform !== 'unknown') {
        setIsAutoFilling(true);
        setError('');
        try {
          // Unified metadata fetcher (queries yt-dlp backend if live, or oEmbed fallback)
          const metadata = await fetchVideoMetadata(url);

          if (metadata.realVideoId) {
            setResolvedVideoId(metadata.realVideoId);
          }

          if (metadata.title && titleRef.current.trim() === '') {
            setTitle(metadata.title);
          }

          if (metadata.thumbnailUrl) {
            setThumbnailUrl(metadata.thumbnailUrl);
          }

          if (metadata.duration) {
            setResolvedDuration(metadata.duration);
          }

          if (metadata.description && descriptionRef.current.trim() === '') {
            setDescription(metadata.description);
          } else {
            // Generate description from title if no description available
            const videoTitle = metadata.title || titleRef.current;
            if (descriptionRef.current.trim() === '' && videoTitle) {
              const generatedDescription = await generateVideoDescriptionFromTitle(videoTitle);
              if (descriptionRef.current.trim() === '') {
                setDescription(generatedDescription);
              }
            }
          }

        } catch (err) {
          console.error("Auto-fill error:", err);
        } finally {
          setIsAutoFilling(false);
        }
      }
    }, 600);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [url]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUrl = extractCleanUrl(url);
    const parsed = parseVideoUrl(cleanUrl);

    if (!isValidVideoUrl(cleanUrl)) {
      setError('Please enter a valid video URL from YouTube, Instagram, TikTok, Twitter/X, or Facebook.');
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
    setLoadingMessage('Generating AI summary...');
    try {
      const summary = await summarizeVideoContent(description);
      let localVideoUrl: string | undefined = undefined;
      let playbackMode: 'embed' | 'local' = 'embed';

      if (downloadLocally) {
        setLoadingMessage('Downloading and cleaning video with SponsorBlock...');
        try {
          const response = await fetch('http://localhost:9123/api/haevn/download', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: cleanUrl,
              upload_to_firebase: true,
              family_id: `family_${currentUser.id}`
            }),
          });
          
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.localVideoUrl) {
              localVideoUrl = result.localVideoUrl;
              playbackMode = 'local';
            }
          } else {
            console.warn("Backend returned non-200 for download, continuing with safe embed fallback.");
          }
        } catch (downloadErr) {
          console.warn("Local downloader backend not reachable. Using isolated embed player fallback.");
        }
      }

      const recipients = familyMembers.filter(member => selectedRecipients.includes(member.id));
      const finalVideoId = resolvedVideoId || parsed.videoId;
      
      let embedUrl = parsed.embedUrl;
      if (parsed.platform === 'tiktok' && finalVideoId) {
        embedUrl = `https://www.tiktok.com/embed/v2/${finalVideoId}`;
      }

      const newVideo: Video = {
        id: finalVideoId,
        url: cleanUrl,
        title,
        summary,
        sender: currentUser,
        recipients,
        status: 'unseen',
        watchDuration: 0,
        totalDuration: resolvedDuration || Math.floor(Math.random() * 180) + 90,
        platform: parsed.platform,
        embedUrl: embedUrl || undefined,
        thumbnailUrl: thumbnailUrl || parsed.thumbnailUrl || undefined,
        localVideoUrl,
        playbackMode,
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
      onClose();
    } catch (err) {
      console.error("Failed to add video:", err);
      setError('Failed to add video. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg ring-1 ring-black/10 dark:ring-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-1.5 bg-white/50 dark:bg-black/50" aria-label="Close form" title="Close form">
          <CloseIcon className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Share a New Video</h2>

        <div className="w-full aspect-video bg-gray-200 dark:bg-gray-800 rounded-2xl mb-6 flex items-center justify-center overflow-hidden transition-all shadow-inner">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">
              <VideoIcon className="w-16 h-16 mx-auto opacity-40" />
              <p className="mt-2 text-sm font-medium">Video preview will appear here</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Video Link</label>
            <input
              type="text"
              placeholder="Paste YouTube, Instagram Reel, TikTok, or X link..."
              value={rawUrlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="w-full p-3.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:outline-none transition text-gray-800 dark:text-gray-200 text-sm"
              disabled={isLoading}
            />
            {detectedPlatform && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1.5 font-medium flex items-center gap-1">
                <span>✓</span> Detected: <strong>{getPlatformDisplayName(detectedPlatform)}</strong>
              </p>
            )}
          </div>

          {isAutoFilling && (
            <div className="flex items-center justify-center text-xs text-brand-600 dark:text-brand-400 font-medium py-1">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Auto-detecting title & generating educational notes...</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Title</label>
            <input
              type="text"
              placeholder="Video Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:outline-none transition text-gray-800 dark:text-gray-200 text-sm font-medium"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Topic / Description for AI Sparky</label>
            <textarea
              placeholder="Provide a brief context or description for the AI summary..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:outline-none transition h-20 resize-none text-gray-800 dark:text-gray-200 text-sm"
              disabled={isLoading}
            />
          </div>

          {childMembers.length > 0 && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Send To:</label>
              <div className="flex flex-wrap gap-2.5">
                {childMembers.map(child => {
                  const isSelected = selectedRecipients.includes(child.id);
                  return (
                    <button
                      type="button"
                      key={child.id}
                      onClick={() => handleRecipientToggle(child.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all border-2 ${
                        isSelected
                          ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={child.avatarUrl} alt={child.name} className="w-7 h-7 rounded-full border border-white/20" />
                      <span className="font-semibold text-xs text-gray-800 dark:text-gray-200">{child.name}</span>
                      {isSelected && <span className="text-brand-600 dark:text-brand-400 text-xs font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clean Ad-Free Playback Option */}
          <div className="flex items-center space-x-3 p-3 bg-brand-50/50 dark:bg-brand-950/30 rounded-xl border border-brand-200/50 dark:border-brand-800/30">
            <input
              type="checkbox"
              id="downloadLocally"
              checked={downloadLocally}
              onChange={(e) => setDownloadLocally(e.target.checked)}
              className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
              disabled={isLoading}
            />
            <label htmlFor="downloadLocally" className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              <span className="font-bold text-gray-900 dark:text-white">Clean Isolated Playback</span> (Download ad-free stream & remove sponsor segments)
            </label>
          </div>

          {error && <p className="text-red-500 text-xs font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center shadow-lg shadow-brand-500/25"
            disabled={isLoading}
            title="Generate AI summary and share video"
          >
            {isLoading ? (
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {loadingMessage}
              </span>
            ) : (
              'Send to Haven'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddVideoForm;