import { describe, it, expect } from 'vitest';
import { parseVideoUrl, isValidVideoUrl, getPlatformDisplayName, extractCleanUrl } from '../utils/videoUrlParser';

describe('Video URL Parser', () => {
    describe('extractCleanUrl', () => {
        it('should extract clean URL from Android YouTube share text', () => {
            const raw = 'Watch this interesting science lesson: https://youtu.be/gBq2H2a5_5k?si=abcdef';
            expect(extractCleanUrl(raw)).toBe('https://youtu.be/gBq2H2a5_5k?si=abcdef');
        });

        it('should extract clean URL from Instagram reel share text with punctuation', () => {
            const raw = 'Check out this reel! (https://www.instagram.com/reel/CrG2jKJA_f1/?igsh=token123).';
            expect(extractCleanUrl(raw)).toBe('https://www.instagram.com/reel/CrG2jKJA_f1/?igsh=token123');
        });

        it('should handle already clean URLs', () => {
            const raw = 'https://www.youtube.com/watch?v=gBq2H2a5_5k';
            expect(extractCleanUrl(raw)).toBe('https://www.youtube.com/watch?v=gBq2H2a5_5k');
        });
    });

    describe('parseVideoUrl', () => {
        it('should parse YouTube watch URLs', () => {
            const result = parseVideoUrl('https://www.youtube.com/watch?v=gBq2H2a5_5k');
            expect(result.platform).toBe('youtube');
            expect(result.videoId).toBe('gBq2H2a5_5k');
            expect(result.embedUrl).toContain('youtube-nocookie.com/embed/gBq2H2a5_5k');
            expect(result.thumbnailUrl).toBe('https://img.youtube.com/vi/gBq2H2a5_5k/hqdefault.jpg');
        });

        it('should parse YouTube shorts URLs', () => {
            const result = parseVideoUrl('https://www.youtube.com/shorts/gBq2H2a5_5k');
            expect(result.platform).toBe('youtube');
            expect(result.videoId).toBe('gBq2H2a5_5k');
        });

        it('should parse YouTube youtu.be URLs', () => {
            const result = parseVideoUrl('https://youtu.be/gBq2H2a5_5k');
            expect(result.platform).toBe('youtube');
            expect(result.videoId).toBe('gBq2H2a5_5k');
        });

        it('should parse Instagram post/reel URLs', () => {
            const result = parseVideoUrl('https://www.instagram.com/p/CrG2jKJA_f1/');
            expect(result.platform).toBe('instagram');
            expect(result.videoId).toBe('CrG2jKJA_f1');
            expect(result.embedUrl).toBe('https://www.instagram.com/p/CrG2jKJA_f1/embed/?hidecaption=1');
        });

        it('should parse TikTok URLs', () => {
            const result = parseVideoUrl('https://www.tiktok.com/@username/video/7123456789012345678');
            expect(result.platform).toBe('tiktok');
            expect(result.videoId).toBe('7123456789012345678');
            expect(result.embedUrl).toBe('https://www.tiktok.com/embed/v2/7123456789012345678');
        });

        it('should parse Twitter/X URLs', () => {
            const result = parseVideoUrl('https://twitter.com/NASA/status/1648705345678901248');
            expect(result.platform).toBe('twitter');
            expect(result.videoId).toBe('1648705345678901248');
        });

        it('should parse Facebook video URLs', () => {
            const result = parseVideoUrl('https://www.facebook.com/watch/?v=1234567890');
            expect(result.platform).toBe('facebook');
            expect(result.videoId).toBe('1234567890');
            expect(result.embedUrl).toContain('facebook.com/plugins/video.php');
        });

        it('should return unknown for invalid URLs', () => {
            const result = parseVideoUrl('https://google.com');
            expect(result.platform).toBe('unknown');
            expect(result.videoId).toBe('');
        });
    });

    describe('isValidVideoUrl', () => {
        it('should return true for valid YouTube URLs', () => {
            expect(isValidVideoUrl('https://www.youtube.com/watch?v=gBq2H2a5_5k')).toBe(true);
        });

        it('should return false for invalid URLs', () => {
            expect(isValidVideoUrl('https://google.com')).toBe(false);
        });
    });

    describe('getPlatformDisplayName', () => {
        it('should return display names correctly', () => {
            expect(getPlatformDisplayName('youtube')).toBe('YouTube');
            expect(getPlatformDisplayName('instagram')).toBe('Instagram');
            expect(getPlatformDisplayName('unknown')).toBe('Unknown');
        });
    });
});
