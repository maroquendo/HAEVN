// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import HomeView from '../components/HomeView';
import VideoCard from '../components/VideoCard';
import WishCard from '../components/WishCard';
import ParentPinModal from '../components/ParentPinModal';
import LockedScreenView from '../components/LockedScreenView';
import SubscriptionsView from '../components/SubscriptionsView';
import { User, Video, ReactionType, Family, ParentalControls } from '../types';

// Mock test data
const mockParent: User = {
  id: 'parent_1',
  name: 'Marcial (Dad)',
  avatarUrl: 'https://ui-avatars.com/api/?name=Marcial',
  role: 'parent',
  status: 'active',
  email: 'marcial@test.com'
};

const mockChild1: User = {
  id: 'child_1',
  name: 'Annabella',
  avatarUrl: 'https://ui-avatars.com/api/?name=Annabella',
  role: 'child',
  status: 'active',
  joinPin: '123456'
};

const mockChild2: User = {
  id: 'child_2',
  name: 'Emiliana',
  avatarUrl: 'https://ui-avatars.com/api/?name=Emiliana',
  role: 'child',
  status: 'active',
  joinPin: '654321'
};

const mockFamily: Family = {
  id: 'family_123',
  name: 'Marcial Family',
  members: [mockParent, mockChild1, mockChild2],
  pin: '0000',
  avatarUrl: 'https://ui-avatars.com/api/?name=Family',
  ownerId: mockParent.id,
  sharingRules: {
    'parent_1': ['child_1', 'child_2']
  }
};

const mockControls: ParentalControls = {
  dailyTimeLimit: 60,
  schedule: { start: '08:00', end: '20:00' },
  isEnabled: true,
  strictPrivacy: true
};

const mockVideos: Video[] = [
  {
    id: 'vid_1',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Learn Math with Dinosaurs',
    summary: 'An educational video about dinosaurs and numbers.',
    sender: mockParent,
    recipients: [mockChild1],
    status: 'unseen',
    watchDuration: 0,
    totalDuration: 180,
    platform: 'youtube',
    reactions: { [ReactionType.LOVE]: 2, [ReactionType.DISLIKE]: 0 },
    comments: []
  },
  {
    id: 'vid_2',
    url: 'https://www.instagram.com/reel/C123456/',
    title: 'Science Experiment: Volcano Eruption',
    summary: 'Fun kitchen science baking soda volcano.',
    sender: mockParent,
    recipients: [mockChild1, mockChild2],
    status: 'seen',
    watchDuration: 120,
    totalDuration: 120,
    platform: 'instagram',
    reactions: { [ReactionType.LOVE]: 5, [ReactionType.DISLIKE]: 0 },
    comments: []
  }
];

describe('HAEVN Comprehensive UI & Functionality Map Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('1. Header Navigation & Controls', () => {
    it('renders logo, search bar, child view toggle, tree button, and upload button for parents', () => {
      const onSwitchToChildView = vi.fn();
      const onOpenFamilyTree = vi.fn();
      const onAddVideoClick = vi.fn();
      const onSearchChange = vi.fn();

      render(
        <Header
          currentUser={mockParent}
          onSwitchProfile={vi.fn()}
          onAddVideoClick={onAddVideoClick}
          currentFamily={mockFamily}
          onLogout={vi.fn()}
          viewMode="parent"
          onSwitchToChildView={onSwitchToChildView}
          onOpenFamilyTree={onOpenFamilyTree}
          searchQuery=""
          onSearchChange={onSearchChange}
        />
      );

      // Search input exists and emits onSearchChange
      const searchInput = screen.getByPlaceholderText('Search for fun videos...');
      expect(searchInput).toBeDefined();
      fireEvent.change(searchInput, { target: { value: 'dinosaurs' } });
      expect(onSearchChange).toHaveBeenCalledWith('dinosaurs');

      // Parent specific buttons
      const childViewBtn = screen.getByTitle('Preview the app as your child sees it');
      expect(childViewBtn).toBeDefined();
      fireEvent.click(childViewBtn);
      expect(onSwitchToChildView).toHaveBeenCalledTimes(1);

      const treeBtn = screen.getByTitle('View Family Tree');
      expect(treeBtn).toBeDefined();
      fireEvent.click(treeBtn);
      expect(onOpenFamilyTree).toHaveBeenCalledTimes(1);

      const addVideoBtn = screen.getByTitle('Share a new video');
      expect(addVideoBtn).toBeDefined();
      fireEvent.click(addVideoBtn);
      expect(onAddVideoClick).toHaveBeenCalledTimes(1);
    });

    it('opens user menu with profile, switch profile, and logout buttons', () => {
      const onLogout = vi.fn();
      const onSwitchProfile = vi.fn();

      render(
        <Header
          currentUser={mockParent}
          onSwitchProfile={onSwitchProfile}
          onAddVideoClick={vi.fn()}
          currentFamily={mockFamily}
          onLogout={onLogout}
        />
      );

      const userMenuBtn = screen.getByTitle('Open user menu');
      fireEvent.click(userMenuBtn);

      expect(screen.getByText('Marcial (Dad)')).toBeDefined();
      expect(screen.getByText('Marcial Family')).toBeDefined();

      const switchBtn = screen.getByText('Switch Profile');
      fireEvent.click(switchBtn);
      expect(onSwitchProfile).toHaveBeenCalledTimes(1);

      fireEvent.click(userMenuBtn);
      const signOutBtn = screen.getByText('Sign Out');
      fireEvent.click(signOutBtn);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Sidebar & Roles Permitted Navigation', () => {
    it('renders all nav tabs for parent including Family and Settings', () => {
      const onViewChange = vi.fn();
      render(
        <Sidebar
          currentView="home"
          onViewChange={onViewChange}
          pendingWishesCount={3}
          userRole="parent"
          dailyWatchTime={1800}
          parentalControls={mockControls}
        />
      );

      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('History')).toBeDefined();
      expect(screen.getByText('Subscriptions')).toBeDefined();
      expect(screen.getByText('Wishlist')).toBeDefined();
      expect(screen.getByText('Family')).toBeDefined();
      expect(screen.getByText('Settings')).toBeDefined();

      // Pending wishes badge
      expect(screen.getByText('3')).toBeDefined();

      fireEvent.click(screen.getByText('Family'));
      expect(onViewChange).toHaveBeenCalledWith('family');
    });

    it('hides Family and Settings tabs when viewing as child', () => {
      const onViewChange = vi.fn();
      render(
        <Sidebar
          currentView="home"
          onViewChange={onViewChange}
          pendingWishesCount={0}
          userRole="child"
          dailyWatchTime={1800}
          parentalControls={mockControls}
        />
      );

      expect(screen.getByText('Home')).toBeDefined();
      expect(screen.getByText('History')).toBeDefined();
      expect(screen.queryByText('Family')).toBeNull();
      expect(screen.queryByText('Settings')).toBeNull();
    });
  });

  describe('3. HomeView Feed & Search Filtering', () => {
    it('filters videos by recipient for child users', () => {
      const onSelectVideo = vi.fn();
      render(
        <HomeView
          videos={mockVideos}
          onSelectVideo={onSelectVideo}
          currentUser={mockChild2}
          onDeleteVideo={vi.fn()}
        />
      );

      // Child 2 is recipient of only Volcano (vid_2), not Dinosaurs (vid_1)
      expect(screen.getByText('Science Experiment: Volcano Eruption')).toBeDefined();
      expect(screen.queryByText('Learn Math with Dinosaurs')).toBeNull();
    });

    it('filters videos in real time when search query is entered', () => {
      render(
        <HomeView
          videos={mockVideos}
          onSelectVideo={vi.fn()}
          currentUser={mockParent}
          onDeleteVideo={vi.fn()}
          searchQuery="volcano"
        />
      );

      expect(screen.getByText('Science Experiment: Volcano Eruption')).toBeDefined();
      expect(screen.queryByText('Learn Math with Dinosaurs')).toBeNull();
    });
  });

  describe('4. VideoCard Interactions & Deletion', () => {
    it('triggers onSelect when card is clicked and shows NEW badge on unseen videos', () => {
      const onSelect = vi.fn();
      render(
        <VideoCard
          video={mockVideos[0]}
          onSelect={onSelect}
          currentUser={mockParent}
          onDelete={vi.fn()}
        />
      );

      expect(screen.getByText('NEW')).toBeDefined();
      expect(screen.getByText('Ready to watch')).toBeDefined();

      const card = screen.getByTitle('Watch "Learn Math with Dinosaurs"');
      fireEvent.click(card);
      expect(onSelect).toHaveBeenCalledWith(mockVideos[0]);
    });
  });

  describe('5. Wishlist & AI Suggestions', () => {
    it('renders wish card with AI recommendation, YouTube search, and Approve/Reject buttons for parent', () => {
      const onFindRecommendations = vi.fn();
      const onFulfillWish = vi.fn();
      const onRejectWish = vi.fn();

      const wish = {
        id: 'wish_1',
        text: 'Space rockets and astronauts',
        status: 'pending' as const,
        author: mockChild1,
        timestamp: '8/16/2026'
      };

      render(
        <WishCard
          wish={wish}
          userRole="parent"
          onFulfillWish={onFulfillWish}
          onRejectWish={onRejectWish}
          onFindRecommendations={onFindRecommendations}
          onAddRecommendedVideo={vi.fn()}
        />
      );

      const aiBtn = screen.getByTitle('Use AI to find YouTube videos for this wish');
      fireEvent.click(aiBtn);
      expect(onFindRecommendations).toHaveBeenCalledWith('wish_1');

      const approveBtn = screen.getByTitle('Approve this wish and move it to fulfilled');
      fireEvent.click(approveBtn);
      expect(onFulfillWish).toHaveBeenCalledWith('wish_1');

      const rejectBtn = screen.getByTitle('Reject this wish');
      fireEvent.click(rejectBtn);
      expect(onRejectWish).toHaveBeenCalledWith('wish_1');
    });
  });

  describe('6. Parent PIN Security Modal', () => {
    it('enters 4 digits and handles verification success', async () => {
      const onSuccess = vi.fn().mockResolvedValue(true);
      render(
        <ParentPinModal
          mode="verify"
          onSuccess={onSuccess}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith('1234');
      });
    });

    it('resets and displays error if PIN is incorrect without getting stuck in loop', async () => {
      const onSuccess = vi.fn().mockResolvedValue(false);
      render(
        <ParentPinModal
          mode="verify"
          onSuccess={onSuccess}
          onCancel={vi.fn()}
        />
      );

      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));
      fireEvent.click(screen.getByText('9'));

      await waitFor(() => {
        expect(screen.getByText('Incorrect PIN. Please try again.')).toBeDefined();
      });
    });
  });

  describe('7. Locked Screen View', () => {
    it('displays friendly bedtime or screen time exceeded lock screen', () => {
      render(<LockedScreenView reason="timeLimit" />);
      expect(screen.getByText("Time's Up for Today!")).toBeDefined();

      const { container } = render(<LockedScreenView reason="schedule" />);
      expect(screen.getByText("It's Rest Time!")).toBeDefined();
    });
  });
});
