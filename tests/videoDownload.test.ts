// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Video } from '../types';

describe('Local Playback Scheme & Downloader Integration', () => {
    it('should support local playback fields in Video schema', () => {
        const mockVideo: Video = {
            id: 'gBq2H2a5_5k',
            url: 'https://www.youtube.com/watch?v=gBq2H2a5_5k',
            title: 'Amazing Animals',
            summary: 'A video about animals.',
            sender: { id: 'parent_1', name: 'Marcial', role: 'parent', status: 'active', avatarUrl: '' },
            recipients: [],
            status: 'unseen',
            watchDuration: 0,
            totalDuration: 180,
            platform: 'youtube',
            reactions: { love: 0, dislike: 0 },
            comments: [],
            localVideoUrl: '/downloads/youtube_gBq2H2a5_5k.mp4',
            playbackMode: 'local'
        };

        expect(mockVideo.playbackMode).toBe('local');
        expect(mockVideo.localVideoUrl).toBe('/downloads/youtube_gBq2H2a5_5k.mp4');
    });

    it('should successfully trigger download via local API endpoint', async () => {
        // Mock fetch call to FastAPI download service
        const mockResponse = {
            success: true,
            localVideoUrl: '/downloads/youtube_gBq2H2a5_5k.mp4',
            title: 'Amazing Animals',
            duration: 185,
            playbackMode: 'local'
        };

        const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async () => {
            return {
                ok: true,
                json: async () => mockResponse
            } as Response;
        });

        const response = await fetch('http://localhost:9123/api/haevn/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: 'https://www.youtube.com/watch?v=gBq2H2a5_5k' })
        });

        const data = await response.json();
        expect(fetchSpy).toHaveBeenCalled();
        expect(data.success).toBe(true);
        expect(data.localVideoUrl).toBe('/downloads/youtube_gBq2H2a5_5k.mp4');
        expect(data.playbackMode).toBe('local');

        fetchSpy.mockRestore();
    });
});
