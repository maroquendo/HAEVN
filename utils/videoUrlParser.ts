/**
 * Video URL Parser Utility
 * Handles extracting video IDs, sanitizing raw share text, and fetching metadata
 * from YouTube, Instagram, TikTok, Twitter/X, and Facebook.
 */

export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'unknown';

export interface ParsedVideoUrl {
    platform: VideoPlatform;
    videoId: string;
    originalUrl: string;
    embedUrl: string | null;
    thumbnailUrl: string | null;
}

export interface VideoMetadata {
    title?: string;
    thumbnailUrl?: string;
    authorName?: string;
    duration?: number;
    description?: string;
    realVideoId?: string;
    directStreamUrl?: string;
}

/**
 * Extract clean URL from raw text (e.g. Android Share Sheet message containing captions + link)
 */
export function extractCleanUrl(rawText: string): string {
    if (!rawText) return '';
    const trimmed = rawText.trim();

    // Match HTTP/HTTPS URL
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch && urlMatch[1]) {
        let url = urlMatch[1];
        // Strip trailing punctuation like parenthesis, commas, dots
        url = url.replace(/[).,;!?]+$/, '');
        return url;
    }
    return trimmed;
}

/**
 * Parse a video URL and extract platform-specific information
 */
export function parseVideoUrl(urlInput: string): ParsedVideoUrl {
    const trimmedUrl = extractCleanUrl(urlInput);

    // YouTube
    const youtubeId = extractYouTubeId(trimmedUrl);
    if (youtubeId) {
        return {
            platform: 'youtube',
            videoId: youtubeId,
            originalUrl: trimmedUrl,
            // youtube-nocookie with maximum kid safety params
            embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&showinfo=0&autoplay=1&controls=1&iv_load_policy=3&disablekb=1&loop=1&playlist=${youtubeId}`,
            thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        };
    }

    // Instagram
    const instagramId = extractInstagramId(trimmedUrl);
    if (instagramId) {
        return {
            platform: 'instagram',
            videoId: instagramId,
            originalUrl: trimmedUrl,
            embedUrl: `https://www.instagram.com/p/${instagramId}/embed/?hidecaption=1`,
            thumbnailUrl: null,
        };
    }

    // TikTok
    const tiktokData = extractTikTokId(trimmedUrl);
    if (tiktokData) {
        return {
            platform: 'tiktok',
            videoId: tiktokData.videoId,
            originalUrl: trimmedUrl,
            embedUrl: `https://www.tiktok.com/embed/v2/${tiktokData.videoId}`,
            thumbnailUrl: null,
        };
    }

    // Twitter/X
    const twitterId = extractTwitterId(trimmedUrl);
    if (twitterId) {
        return {
            platform: 'twitter',
            videoId: twitterId,
            originalUrl: trimmedUrl,
            embedUrl: null,
            thumbnailUrl: null,
        };
    }

    // Facebook
    const facebookId = extractFacebookId(trimmedUrl);
    if (facebookId) {
        return {
            platform: 'facebook',
            videoId: facebookId,
            originalUrl: trimmedUrl,
            embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(trimmedUrl)}&show_text=false`,
            thumbnailUrl: null,
        };
    }

    return {
        platform: 'unknown',
        videoId: '',
        originalUrl: trimmedUrl,
        embedUrl: null,
        thumbnailUrl: null,
    };
}

/**
 * Extract YouTube video ID from various URL formats (watch, youtu.be, shorts, embed)
 */
export function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
        /^([a-zA-Z0-9_-]{11})$/,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Extract Instagram post/reel ID from URL
 */
export function extractInstagramId(url: string): string | null {
    const patterns = [
        /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/i,
        /instagr\.am\/p\/([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Extract TikTok video ID from URL
 */
export function extractTikTokId(url: string): { videoId: string; username?: string } | null {
    const patterns = [
        /tiktok\.com\/@([^\/]+)\/video\/(\d+)/i,
        /tiktok\.com\/t\/([a-zA-Z0-9]+)/i,
        /vm\.tiktok\.com\/([a-zA-Z0-9]+)/i,
    ];

    const fullMatch = url.match(patterns[0]);
    if (fullMatch && fullMatch[2]) {
        return { videoId: fullMatch[2], username: fullMatch[1] };
    }

    for (let i = 1; i < patterns.length; i++) {
        const match = url.match(patterns[i]);
        if (match && match[1]) {
            return { videoId: match[1] };
        }
    }
    return null;
}

/**
 * Extract Twitter/X video tweet ID from URL
 */
export function extractTwitterId(url: string): string | null {
    const patterns = [
        /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Extract Facebook video ID from URL
 */
export function extractFacebookId(url: string): string | null {
    const patterns = [
        /facebook\.com\/.*\/videos\/(\d+)/i,
        /facebook\.com\/watch\/?\?v=(\d+)/i,
        /fb\.watch\/([a-zA-Z0-9_-]+)/i,
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Fetch video metadata via backend extractor (yt-dlp) or oEmbed fallback
 */
export async function fetchVideoMetadata(urlInput: string): Promise<VideoMetadata> {
    const cleanUrl = extractCleanUrl(urlInput);
    const parsed = parseVideoUrl(cleanUrl);

    // Tier 1: Try local HAEVN yt-dlp backend
    try {
        const res = await fetch('http://localhost:9123/api/haevn/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: cleanUrl }),
            signal: AbortSignal.timeout(3000),
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                return {
                    title: data.title,
                    thumbnailUrl: data.thumbnailUrl || (parsed.platform === 'youtube' ? parsed.thumbnailUrl || undefined : undefined),
                    authorName: data.uploader,
                    duration: data.duration,
                    description: data.description,
                    realVideoId: data.videoId,
                    directStreamUrl: data.directStreamUrl,
                };
            }
        }
    } catch (err) {
        // Backend not available or timed out, proceed to Tier 2
    }

    // Tier 2: Try oEmbed
    try {
        const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(cleanUrl)}`;
        const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });

        if (response.ok) {
            const data = await response.json();
            let realVideoId: string | undefined = undefined;
            if (data.html) {
                const tiktokMatch = data.html.match(/data-video-id="(\d+)"/);
                if (tiktokMatch && tiktokMatch[1]) {
                    realVideoId = tiktokMatch[1];
                }
            }

            return {
                title: data.title,
                thumbnailUrl: data.thumbnail_url || (parsed.platform === 'youtube' ? parsed.thumbnailUrl || undefined : undefined),
                authorName: data.author_name,
                realVideoId,
            };
        }
    } catch (error) {
        // oEmbed failed
    }

    // Tier 3: Static fallback
    if (parsed.platform === 'youtube' && parsed.thumbnailUrl) {
        return { thumbnailUrl: parsed.thumbnailUrl };
    }

    return {};
}

/**
 * Check if a URL is a valid video URL from a supported platform
 */
export function isValidVideoUrl(url: string): boolean {
    const parsed = parseVideoUrl(url);
    return parsed.platform !== 'unknown' && parsed.videoId !== '';
}

/**
 * Get a human-readable platform name
 */
export function getPlatformDisplayName(platform: VideoPlatform): string {
    const names: Record<VideoPlatform, string> = {
        youtube: 'YouTube',
        instagram: 'Instagram',
        tiktok: 'TikTok',
        twitter: 'X (Twitter)',
        facebook: 'Facebook',
        unknown: 'Unknown',
    };
    return names[platform] || 'Video';
}
