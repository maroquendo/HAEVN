export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  role: 'parent' | 'child';
  status: 'active' | 'pending';
  joinPin?: string;
}

export enum ReactionType {
  LOVE = 'love',
  DISLIKE = 'dislike',
}

export interface Comment {
  id: string;
  author: User;
  text: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  author: 'user' | 'ai';
  text: string;
  isLoading?: boolean;
}

export interface Video {
  id:string;
  url: string;
  title: string;
  summary: string;
  sender: User;
  recipients: User[];
  status: 'unseen' | 'seen';
  watchDuration: number; // in seconds
  totalDuration: number; // in seconds, mocked
  reactions: {
    [ReactionType.LOVE]: number;
    [ReactionType.DISLIKE]: number;
  };
  userReaction?: ReactionType | null;
  comments: Comment[];
  chatHistory?: ChatMessage[];
}

export interface Subscription {
  id: string;
  name: string;
  avatarUrl: string;
  description: string;
}

export interface RecommendedVideo {
  videoId: string;
  title: string;
}

export interface Wish {
  id: string;
  text: string;
  status: 'pending' | 'fulfilled';
  author: User;
  timestamp: string;
  recommendations?: RecommendedVideo[];
  isLoadingRecommendations?: boolean;
}

export interface ParentalControls {
  dailyTimeLimit: number; // in minutes
  schedule: {
    start: string; // "HH:MM" format
    end: string; // "HH:MM" format
  };
  isEnabled: boolean;
}

export interface Family {
  id: string;
  name: string;
  avatarUrl: string;
  members: User[];
}

export interface AppData {
  videos: Video[];
  subscriptions: Subscription[];
  wishes: Wish[];
  parentalControls: ParentalControls;
  dailyWatchTime: number;
  lastResetDate: string;
}