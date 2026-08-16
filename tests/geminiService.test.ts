import { describe, it, expect, vi, beforeEach } from 'vitest';

// Define mock response text
let mockGenerateContentResultText = '';

// Mock import.meta.env
vi.stubEnv('VITE_GEMINI_API_KEY', 'mock-api-key');

// Mock @google/genai module
vi.mock('@google/genai', () => {
    class MockGoogleGenAI {
        models = {
            generateContent: vi.fn(async (params: any) => {
                return {
                    text: mockGenerateContentResultText
                };
            })
        };
        constructor(config: { apiKey: string }) {}
    }
    return {
        GoogleGenAI: MockGoogleGenAI,
        Type: {
            ARRAY: 'ARRAY',
            OBJECT: 'OBJECT',
            STRING: 'STRING',
        }
    };
});

import {
    summarizeVideoContent,
    generateVideoDescriptionFromTitle,
    getRecommendedVideosForWish,
    getVideoChatResponse
} from '../services/geminiService';

describe('Gemini AI Service', () => {
    beforeEach(() => {
        mockGenerateContentResultText = '';
        vi.clearAllMocks();
    });

    describe('summarizeVideoContent', () => {
        it('should return child-friendly summary of the video transcript', async () => {
            mockGenerateContentResultText = 'This is a fun video about puppies and how they learn to play!';
            const summary = await summarizeVideoContent('Puppies playing together in the backyard learning to fetch.');
            expect(summary).toBe('This is a fun video about puppies and how they learn to play!');
        });
    });

    describe('generateVideoDescriptionFromTitle', () => {
        it('should return hypothetical child-friendly description from title', async () => {
            mockGenerateContentResultText = 'A cool chemistry video demonstrating explosive reaction tests!';
            const desc = await generateVideoDescriptionFromTitle('Science Experiments');
            expect(desc).toBe('A cool chemistry video demonstrating explosive reaction tests!');
        });
    });

    describe('getRecommendedVideosForWish', () => {
        it('should parse JSON recommendations and return RecommendedVideo array', async () => {
            const mockRecommendations = [
                { videoId: 'abc12345', title: 'Funny Cat Video 1' },
                { videoId: 'xyz98765', title: 'Funny Cat Video 2' }
            ];
            mockGenerateContentResultText = JSON.stringify(mockRecommendations);

            const recommendations = await getRecommendedVideosForWish('videos about cats');
            expect(recommendations).toHaveLength(2);
            expect(recommendations[0].videoId).toBe('abc12345');
            expect(recommendations[0].title).toBe('Funny Cat Video 1');
        });
    });

    describe('getVideoChatResponse', () => {
        it('should return the chatbot response text', async () => {
            mockGenerateContentResultText = 'Hi! That is because dogs have a great sense of smell!';
            const response = await getVideoChatResponse(
                'How Dogs Smell',
                'A kid-friendly video about dogs smelling sense.',
                [],
                'Why do dogs sniff everything?'
            );
            expect(response).toContain('sense of smell');
        });
    });
});
