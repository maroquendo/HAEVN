// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseVideoUrl, isValidVideoUrl } from '../utils/videoUrlParser';

describe('Video URL Parser Stress Tests & Audit', () => {
    // 1. YouTube Stress Test Cases
    it('should parse standard YouTube watch URLs', () => {
        const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        const parsed = parseVideoUrl(url);
        expect(parsed.platform).toBe('youtube');
        expect(parsed.videoId).toBe('dQw4w9WgXcQ');
    });

    it('should parse YouTube Shorts', () => {
        const url = 'https://www.youtube.com/shorts/tPEE9ZwTmy0';
        const parsed = parseVideoUrl(url);
        expect(parsed.platform).toBe('youtube');
        expect(parsed.videoId).toBe('tPEE9ZwTmy0');
    });

    it('should fail on YouTube URLs with query parameters before v (STRESS POINT 1)', () => {
        const url = 'https://www.youtube.com/watch?feature=shared&v=dQw4w9WgXcQ';
        const parsed = parseVideoUrl(url);
        // Let's assert what it currently does, and then we will fix it
        expect(parsed.videoId).toBe('dQw4w9WgXcQ');
    });

    // 2. Instagram Stress Test Cases
    it('should parse standard Instagram posts and reels', () => {
        const postUrl = 'https://www.instagram.com/p/C3zM_81rT8E/';
        const reelUrl = 'https://www.instagram.com/reel/C3zM_81rT8E/?igsh=MWQ1Z3E0';
        
        const parsedPost = parseVideoUrl(postUrl);
        const parsedReel = parseVideoUrl(reelUrl);

        expect(parsedPost.platform).toBe('instagram');
        expect(parsedPost.videoId).toBe('C3zM_81rT8E');
        expect(parsedReel.platform).toBe('instagram');
        expect(parsedReel.videoId).toBe('C3zM_81rT8E');
    });

    // 3. X / Twitter Stress Test Cases
    it('should parse standard X and Twitter video links', () => {
        const xUrl = 'https://x.com/SpaceX/status/1760416954201083904';
        const twitterUrl = 'https://twitter.com/SpaceX/status/1760416954201083904';
        
        const parsedX = parseVideoUrl(xUrl);
        const parsedTwitter = parseVideoUrl(twitterUrl);

        expect(parsedX.platform).toBe('twitter');
        expect(parsedX.videoId).toBe('1760416954201083904');
        expect(parsedTwitter.platform).toBe('twitter');
        expect(parsedTwitter.videoId).toBe('1760416954201083904');
    });

    it('should parse mobile Twitter/X URLs (STRESS POINT 2)', () => {
        const url = 'https://mobile.twitter.com/SpaceX/status/1760416954201083904';
        const parsed = parseVideoUrl(url);
        expect(parsed.platform).toBe('twitter');
        expect(parsed.videoId).toBe('1760416954201083904');
    });

    // 4. TikTok Stress Test Cases
    it('should parse standard TikTok video links', () => {
        const url = 'https://www.tiktok.com/@khaby.lame/video/7338169999999999999?is_from_webapp=1';
        const parsed = parseVideoUrl(url);
        expect(parsed.platform).toBe('tiktok');
        expect(parsed.videoId).toBe('7338169999999999999');
    });

    it('should parse TikTok short links (STRESS POINT 3)', () => {
        const url = 'https://vm.tiktok.com/ZMY123456/';
        const parsed = parseVideoUrl(url);
        expect(parsed.platform).toBe('tiktok');
        expect(parsed.videoId).toBe('ZMY123456'); // Note: will need redirect check in integration, but regex should extract code
    });
});
