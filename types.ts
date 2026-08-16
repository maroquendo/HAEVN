export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  role: 'parent' | 'child';
  status: 'active' | 'pending';
  joinPin?: string;
  email?: string;
  suspended?: boolean; // If true, child cannot login
  lastActive?: Date; // Track when user was last active
  parentPin?: string; // Parent security PIN for view mode switching
  relationship?: string; // Custom title (e.g., 'Mom', 'Grandpa')
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

export type VideoPlatform = 'youtube' | 'instagram' | 'tiktok' | 'twitter' | 'facebook' | 'unknown';

export interface Video {
  id: string;
  url: string;
  title: string;
  summary: string;
  sender: User;
  recipients: User[];
  status: 'unseen' | 'seen';
  watchDuration: number; // in seconds
  totalDuration: number; // in seconds, mocked
  platform: VideoPlatform; // Platform the video is from
  embedUrl?: string; // Pre-computed safe embed URL
  thumbnailUrl?: string; // Platform-specific thumbnail
  reactions: {
    [ReactionType.LOVE]: number;
    [ReactionType.DISLIKE]: number;
  };
  userReaction?: ReactionType | null;
  comments: Comment[];
  chatHistory?: ChatMessage[];
  localVideoUrl?: string;
  playbackMode?: 'embed' | 'local';
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

export interface ChildControlOverride {
  dailyTimeLimit?: number; // in minutes
  schedule?: {
    start: string;
    end: string;
  };
  weekendBonusMinutes?: number;
}

export interface ParentalControls {
  dailyTimeLimit: number; // default in minutes
  schedule: {
    start: string; // "HH:MM" format
    end: string; // "HH:MM" format
  };
  isEnabled: boolean;
  strictPrivacy: boolean;
  childOverrides?: { [childId: string]: ChildControlOverride };
  weekendExtraMinutes?: number;
}

// Visual layout data for the family tree
export interface TreeGraphData {
  nodes: {
    id: string; // matches User.id
    position: { x: number; y: number };
    data: { label: string; avatarUrl: string; role: string }; // Cached display data
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string; // e.g. "Parent of", "Sibling"
  }[];
}

export interface Family {
  id: string;
  name: string;
  members: User[];
  pin: string; // Parent PIN for settings
  avatarUrl: string;
  ownerId: string; // ID of the parent who created the family
  treeGraph?: TreeGraphData; // Visual family tree layout
  sharingRules?: { [senderId: string]: string[] }; // senderId -> allowedRecipientIds[]
}

export interface AppData {
  videos: Video[];
  subscriptions: Subscription[];
  wishes: Wish[];
  parentalControls: ParentalControls;
  dailyWatchTime: number;
  lastResetDate: string;
}