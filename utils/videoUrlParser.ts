/**
 * Video URL Parser Utility
 * Handles extracting video IDs and metadata from various social media platforms
 */

export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'unknown';

export interface ParsedVideoUrl {
    platform: VideoPlatform;
    videoId: string;
    originalUrl: string;
    embedUrl: string | null;
    thumbnailUrl: string | null;
}

/**
 * Parse a video URL and extract platform-specific information
 */
export function parseVideoUrl(url: string): ParsedVideoUrl {
    const trimmedUrl = url.trim();

    // YouTube
    const youtubeId = extractYouTubeId(trimmedUrl);
    if (youtubeId) {
        return {
            platform: 'youtube',
            videoId: youtubeId,
            originalUrl: trimmedUrl,
            embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&showinfo=0&autoplay=1&controls=1`,
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
            // Instagram embed requires specific format - use blockquote embed approach
            embedUrl: `https://www.instagram.com/p/${instagramId}/embed/?hidecaption=1`,
            thumbnailUrl: null, // Instagram requires oEmbed API for thumbnails
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
            thumbnailUrl: null, // TikTok requires oEmbed API for thumbnails
        };
    }

    // Twitter/X
    const twitterId = extractTwitterId(trimmedUrl);
    if (twitterId) {
        return {
            platform: 'twitter',
            videoId: twitterId,
            originalUrl: trimmedUrl,
            embedUrl: null, // Twitter videos need special handling via their embed widget
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

    // Unknown platform
    return {
        platform: 'unknown',
        videoId: '',
        originalUrl: trimmedUrl,
        embedUrl: null,
        thumbnailUrl: null,
    };
}

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYouTubeId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/, // Direct ID
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
function extractInstagramId(url: string): string | null {
    const patterns = [
        /instagram\.com\/(?:p|reel|reels|tv)\/([a-zA-Z0-9_-]+)/,
        /instagr\.am\/p\/([a-zA-Z0-9_-]+)/,
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
function extractTikTokId(url: string): { videoId: string; username?: string } | null {
    const patterns = [
        /tiktok\.com\/@([^\/]+)\/video\/(\d+)/,
        /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
        /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
    ];

    // Full video URL pattern
    const fullMatch = url.match(patterns[0]);
    if (fullMatch && fullMatch[2]) {
        return { videoId: fullMatch[2], username: fullMatch[1] };
    }

    // Short URL patterns
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
function extractTwitterId(url: string): string | null {
    const patterns = [
        /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/,
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
function extractFacebookId(url: string): string | null {
    const patterns = [
        /facebook\.com\/.*\/videos\/(\d+)/,
        /facebook\.com\/watch\/?\?v=(\d+)/,
        /fb\.watch\/([a-zA-Z0-9_-]+)/,
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
 * Fetch video metadata using oEmbed API (for platforms that support it)
 */
export async function fetchVideoMetadata(url: string): Promise<{
    title?: string;
    thumbnailUrl?: string;
    authorName?: string;
    duration?: number;
}> {
    const parsed = parseVideoUrl(url);

    try {
        // noembed.com supports multiple platforms
        const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(5000) });

        if (response.ok) {
            const data = await response.json();
            return {
                title: data.title,
                thumbnailUrl: data.thumbnail_url,
                authorName: data.author_name,
            };
        }
    } catch (error) {
        console.warn('Failed to fetch oEmbed metadata:', error);
    }

    // Platform-specific fallbacks
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
    return names[platform];
}
