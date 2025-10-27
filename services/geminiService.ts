import { GoogleGenAI, Type } from "@google/genai";
import { RecommendedVideo, ChatMessage } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  // In a real app, you'd handle this more gracefully.
  // For this example, we'll rely on the environment variable being set.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const AI_UNSURE_RESPONSE = "That's a great question! I'm not sure about that one. Maybe you can ask a grown-up or make a wish for a new video about it!";

export const summarizeVideoContent = async (content: string): Promise<string> => {
  if (!API_KEY) {
    return "AI summarization is unavailable. API key not configured.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Summarize the following video transcript or description for a child in 2-3 friendly sentences. Focus on what makes it fun or interesting. Content: "${content}"`,
    });
    return response.text;
  } catch (error) {
    console.error("Error summarizing content with Gemini:", error);
    return "Could not generate a summary for this video.";
  }
};

export const generateVideoDescriptionFromTitle = async (title: string): Promise<string> => {
  if (!API_KEY) {
    return "AI description generation is unavailable. API key not configured.";
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a short, kid-friendly, hypothetical description for a YouTube video titled "${title}". This description should be suitable to be shown to a parent to approve, and it will be used as source material for a later AI summarization step for a child. The description should be 2-4 sentences and sound engaging. Do not add any introductory phrases like "Here is a description:". Just provide the description itself.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating description from title with Gemini:", error);
    return `Could not generate a description for the video titled "${title}". Please write one manually.`;
  }
};


const recommendationSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        videoId: {
          type: Type.STRING,
          description: 'The unique YouTube video ID.'
        },
        title: {
          type: Type.STRING,
          description: 'The title of the YouTube video.'
        },
      },
      required: ['videoId', 'title'],
    },
};

export const getRecommendedVideosForWish = async (wishText: string): Promise<RecommendedVideo[]> => {
    if (!API_KEY) {
        throw new Error("API key not configured.");
    }
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `A child wants to watch videos about "${wishText}". Suggest 3 real, popular, and kid-friendly YouTube video titles and their YouTube video IDs. The videos should be generally appropriate for a family audience, but the parent will make the final decision.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: recommendationSchema,
            },
        });
        
        const jsonStr = response.text.trim();
        // Sometimes the response might be wrapped in markdown
        const cleanedJsonStr = jsonStr.replace(/^```json\n/, '').replace(/\n```$/, '');
        const recommendations = JSON.parse(cleanedJsonStr);
        return recommendations as RecommendedVideo[];

    } catch (error) {
        console.error("Error getting video recommendations from Gemini:", error);
        return [];
    }
};

export const getVideoChatResponse = async (videoTitle: string, videoSummary: string, chatHistory: ChatMessage[], userQuestion: string): Promise<string> => {
  if (!API_KEY) {
    return "The AI assistant is sleeping right now. Please try again later.";
  }

  const historyContext = (chatHistory || [])
    .filter(msg => !msg.isLoading)
    .map(msg => `${msg.author === 'user' ? 'Child' : 'Sparky'}: ${msg.text}`)
    .join('\n');

  const fullPrompt = `Video Title: "${videoTitle}"
Video Summary: "${videoSummary}"

Conversation History:
${historyContext}
Child: ${userQuestion}
Sparky:`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            systemInstruction: `You are a friendly, curious robot friend named Sparky. Your purpose is to answer questions from children about the provided video content. Your answers must be simple, safe, and strictly related to the video's topic of "${videoTitle}". Do not answer questions about unrelated topics, violence, or any mature themes. If a question is off-topic, inappropriate, or you don't know the answer, you MUST reply with ONLY the following exact phrase: ${AI_UNSURE_RESPONSE}`,
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
        }
    });
    return response.text;
  } catch (error) {
    console.error("Error getting chat response from Gemini:", error);
    return "Oops! I'm having a little trouble thinking right now. Let's try again in a moment.";
  }
};