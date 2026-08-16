import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './components/Header';
import AddVideoForm from './components/AddVideoForm';
import VideoPlayerView from './components/VideoPlayerView';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import HistoryView from './components/HistoryView';
import SubscriptionsView from './components/SubscriptionsView';
import AddSubscriptionForm from './components/AddSubscriptionForm';
import WishlistView from './components/WishlistView';
import SettingsView from './components/SettingsView';
import LockedScreenView from './components/LockedScreenView';
import SkeletonLoader from './components/SkeletonLoader';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ChildLoginView from './components/ChildLoginView';
import FamilyView from './components/FamilyView';
import OfflineIndicator from './components/OfflineIndicator';
import ParentPinModal from './components/ParentPinModal';
import FamilyTreeView from './components/FamilyTreeView';
import { CloseIcon, KeyIcon, TrashIcon } from './components/icons';
import { MOCK_FAMILIES, MASTER_EMAIL } from './constants';
import { Video, Subscription, Wish, ParentalControls, AppData, Family, User } from './types';
import { getRecommendedVideosForWish } from './services/geminiService';
import { showLocalNotification } from './services/notificationService';
import getInitialData, { SHARABLE_VIDEOS } from './utils/data';
import { extractCleanUrl } from './utils/videoUrlParser';
import { auth, signInWithGoogle, signOut, mapFirebaseUserToAppUser } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  createFamily,
  getFamilyForUser,
  inviteMember,
  updateFamilyData,
  subscribeToFamily,
  subscribeToAppData,
  joinFamily,
  updateMember,
  removeMember,
  verifyChildPin,
  suspendChild,
  unsuspendChild,
  setParentPin,
  verifyParentPin,
  hasParentPin,
  addChildMember,
  resetChildPin,
  resetFamilyData,
  updateFamilySharingRules
} from './services/firestore';


// Auth view type
type AuthView = 'login' | 'register' | 'child-login';


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Auth view state (for switching between login screens)
  const [authView, setAuthView] = useState<AuthView>('login');
  // Child session state (for PIN-based child login without Firebase auth)
  // Initialize from localStorage if available
  const [childSession, setChildSession] = useState<{ user: User; familyId: string } | null>(() => {
    const saved = localStorage.getItem('haevn_child_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Persist child session to localStorage
  useEffect(() => {
    if (childSession) {
      localStorage.setItem('haevn_child_session', JSON.stringify(childSession));
    } else {
      localStorage.removeItem('haevn_child_session');
    }
  }, [childSession]);

  // App data states
  const [videos, setVideos] = useState<Video[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [parentalControls, setParentalControls] = useState<ParentalControls>(getInitialData().parentalControls);
  const [dailyWatchTime, setDailyWatchTime] = useState<number>(0);
  const [lastResetDate, setLastResetDate] = useState(new Date().toDateString());

  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [currentView, setCurrentView] = useState<'home' | 'history' | 'subscriptions' | 'wishlist' | 'settings' | 'family'>('home');
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [isFamilyTreeOpen, setIsFamilyTreeOpen] = useState(false);
  const [videoFormData, setVideoFormData] = useState<{ url: string, title: string } | undefined>(undefined);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // View mode state for parent to preview as child
  const [viewMode, setViewMode] = useState<'parent' | 'child'>('parent');
  const [showPinModal, setShowPinModal] = useState<'setup' | 'verify' | 'change' | null>(null);
  const [needsPinSetup, setNeedsPinSetup] = useState(false);

  // Auth Effect - CRITICAL: Always set isLoading to false after auth resolves
  useEffect(() => {
    console.log('Auth effect starting...');
    let authResolved = false;

    // Timeout fallback: if Firebase auth doesn't respond in 3 seconds, stop loading
    const timeoutId = setTimeout(() => {
      if (!authResolved) {
        console.warn('Firebase auth timeout - showing login screen');
        setIsLoading(false);
        setIsLoggingIn(false);
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? 'User present' : 'No user');
      authResolved = true;
      clearTimeout(timeoutId);

      if (firebaseUser) {
        const appUser = mapFirebaseUserToAppUser(firebaseUser);

        // --- SECURITY CHECK ---
        // 1. Is it the Master Account?
        if (appUser.email === MASTER_EMAIL) {
          setCurrentUser(appUser);
          return;
        }

        // 2. Is it a mapped family member?
        // We need to check if this user is allowed (i.e., is a member of an existing family)
        setIsLoading(true);

        const timeoutPromise = new Promise<{ timeout: true }>((resolve) => {
          setTimeout(() => resolve({ timeout: true }), 10000);
        });

        Promise.race([
          getFamilyForUser(appUser.email!),
          timeoutPromise
        ]).then(async result => {
          if (result && 'timeout' in result) {
            console.warn("User profile load timed out");
            setIsLoading(false);
            return;
          }

          const family = result as Family | null;

          if (family) {
            // Check if we need to "claim" an invite (update temporary ID to real ID)
            const isMemberById = family.members.some(m => m.id === appUser.id);
            if (!isMemberById) {
              console.log("Claiming invite for user", appUser.email);
              try {
                await joinFamily(appUser, family.id);
              } catch (e) {
                console.error("Failed to join family", e);
              }
            }

            setCurrentUser(appUser);
            setCurrentFamily(family);
          } else {
            console.warn(`Access denied for ${appUser.email}. Not a member of any family.`);
            alert("Access Denied: You must be invited to a family to join HAEVN.");
            signOut();
            setCurrentUser(null);
          }
          setIsLoading(false);
        }).catch(err => {
          console.error("Auth verification failed", err);
          signOut();
          setCurrentUser(null);
          setIsLoading(false);
        });

        // Return here to avoid setting currentUser immediately for non-master
        return;
      } else {
        console.log('No user - setting isLoading to false');
        setCurrentUser(null);
        setCurrentFamily(null);
        setIsLoading(false);
      }
      setIsLoggingIn(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Magic Link Handler & Invite Link Handler
  useEffect(() => {
    const handleMagicLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const pin = params.get('child_pin');
      const inviteFamilyId = params.get('invite');
      const inviteEmail = params.get('email');

      if (inviteFamilyId) {
        console.log('Detected family invitation in URL:', inviteFamilyId, inviteEmail);
        sessionStorage.setItem('haevn_pending_invite', JSON.stringify({ familyId: inviteFamilyId, email: inviteEmail }));
      }

      if (pin && !childSession && !currentUser) {
        console.log('Detected Magic Link PIN. Verifying...');
        try {
          const result = await verifyChildPin(pin);
          if (result) {
            console.log('Magic Link Success! Logging in as:', result.user.name);
            setChildSession(result);
            setAuthView('child-login'); // Will switch to dashboard automatically due to childSession

            // Clean URL
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: newUrl }, '', newUrl);
          }
        } catch (err) {
          console.error('Invalid Magic Link:', err);
        }
      }
    };
    handleMagicLink();
  }, [childSession, currentUser]);

  // Fetch/Create Family Effect - with timeout to prevent hanging
  useEffect(() => {
    const initFamily = async () => {
      if (!currentUser) return;

      // If we already have a family loaded and it matches the user, skip
      // But here we want to ensure we fetch the correct one initially
      if (currentFamily) return;

      console.log('Starting family initialization for user:', currentUser.email);
      setIsLoading(true);

      // Timeout promise to prevent hanging (reduced to 5s for dev/offline mode)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Family initialization timeout (5s)')), 5000);
      });

      try {
        // Race between family init and timeout
        const familyInit = async () => {
          let family = await getFamilyForUser(currentUser.email);

          // If not found yet, check if there was a pending invite stored in session
          if (!family) {
            const pendingInviteStr = sessionStorage.getItem('haevn_pending_invite');
            if (pendingInviteStr) {
              try {
                const { familyId } = JSON.parse(pendingInviteStr);
                if (familyId) {
                  await joinFamily(currentUser, familyId);
                  family = await getFamilyForUser(currentUser.email);
                }
              } catch (e) {
                console.warn('Failed to claim pending invite from session storage:', e);
              }
            }
          }

          if (family) {
            console.log('Found existing family:', family.name);
            // Check if pending and join
            const me = family.members.find(m => m.email?.toLowerCase() === currentUser.email?.toLowerCase());
            if (me && me.status === 'pending') {
              await joinFamily(currentUser, family.id);
            }
          } else {
            console.log('Creating new family for user');
            family = await createFamily(currentUser);
          }
          return family;
        };

        const family = await Promise.race([familyInit(), timeoutPromise]);
        setCurrentFamily(family);
      } catch (error) {
        console.error("Error initializing family:", error);
        console.warn("Falling back to local/offline mode due to connection issue");

        // Restore or Create Offline Family
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        let mockFamily: Family;

        if (offlineMeta) {
          console.log("Restoring cached offline family");
          mockFamily = JSON.parse(offlineMeta);
        } else {
          // Create MOCK family for offline development
          mockFamily = {
            id: 'local_offline_family',
            name: `${currentUser.name || 'My'}'s Family (Offline)`,
            members: [{
              ...currentUser,
              role: 'parent',
              status: 'active',
              id: currentUser.id || 'offline_user_id'
            }],
            ownerId: currentUser.id,
            pin: '0000',
            avatarUrl: currentUser.avatarUrl || 'https://ui-avatars.com/api/?name=Family'
          };
          localStorage.setItem('haevn_offline_family_meta', JSON.stringify(mockFamily));
        }

        setCurrentFamily(mockFamily);
      } finally {
        setIsLoading(false);
      }

    };

    initFamily();
  }, [currentUser]); // Depend only on currentUser

  // Check if parent needs to set up PIN (after family is loaded)
  useEffect(() => {
    const checkPinSetup = async () => {
      if (currentFamily && currentUser && currentUser.role === 'parent') {
        const hasPinSet = await hasParentPin(currentFamily.id, currentUser.id);
        if (!hasPinSet) {
          setNeedsPinSetup(true);
          setShowPinModal('setup');
        }
      }
    };
    checkPinSetup();
  }, [currentFamily, currentUser]);

  // Handle view mode switching
  const handleSwitchToChildView = useCallback(() => {
    setViewMode('child');
  }, []);

  const handleSwitchToParentView = useCallback(async () => {
    if (!currentFamily || !currentUser) return;

    // Check if user has a PIN set
    const hasPinSet = await hasParentPin(currentFamily.id, currentUser.id);
    if (hasPinSet) {
      setShowPinModal('verify');
    } else {
      // No PIN set - prompt to create one first
      setShowPinModal('setup');
    }
  }, [currentFamily, currentUser]);

  const handlePinSuccess = useCallback(async (pin: string): Promise<boolean> => {
    if (!currentFamily || !currentUser) return false;

    if (showPinModal === 'setup' || showPinModal === 'change') {
      await setParentPin(currentFamily.id, currentUser.id, pin);
      setNeedsPinSetup(false);
      // If we were in child view and just set up a PIN, return to parent view
      if (viewMode === 'child') {
        setViewMode('parent');
      }
      setShowPinModal(null);
      return true;
    } else if (showPinModal === 'verify') {
      const isValid = await verifyParentPin(currentFamily.id, currentUser.id, pin);
      if (isValid) {
        setViewMode('parent');
        setShowPinModal(null);
        return true;
      } else {
        return false;
      }
    }
    setShowPinModal(null);
    return true;
  }, [currentFamily, currentUser, showPinModal, viewMode]);

  const handlePinCancel = useCallback(() => {
    if (showPinModal === 'setup' && needsPinSetup) {
      // Can't cancel initial setup
      return;
    }
    setShowPinModal(null);
  }, [showPinModal, needsPinSetup]);

  // Effective role considers viewMode for parents previewing as child
  const effectiveRole = currentUser?.role === 'parent' && viewMode === 'child' ? 'child' : currentUser?.role || 'child';

  // Handle Web Share Target (Android Share Menu) & Native Bridge Intents
  useEffect(() => {
    const handleIncomingShare = (rawText?: string | null, rawUrl?: string | null, rawTitle?: string | null) => {
      const source = rawUrl || rawText || '';
      const cleanUrl = extractCleanUrl(source);
      if (cleanUrl && cleanUrl.startsWith('http')) {
        setVideoFormData({
          title: rawTitle || '',
          url: cleanUrl
        });
        setIsAddVideoOpen(true);
      }
    };

    // 1. Check URL query params on page load
    const params = new URLSearchParams(window.location.search);
    const titleParam = params.get('title');
    const textParam = params.get('text');
    const urlParam = params.get('url');

    if (titleParam || textParam || urlParam) {
      handleIncomingShare(textParam, urlParam, titleParam);
      // Clean URL without refresh
      window.history.replaceState({}, '', window.location.pathname);
    }

    // 2. Listen for Native Android postMessage from MainActivity
    const onMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'HAEVN_SHARE_TARGET') {
        handleIncomingShare(event.data.text, null, event.data.title);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Subscriptions Effect
  useEffect(() => {
    if (!currentFamily) return;

    const unsubFamily = subscribeToFamily(currentFamily.id, (updatedFamily) => {
      setCurrentFamily(updatedFamily);
    });

    const unsubData = subscribeToAppData(currentFamily.id, (data) => {
      if (data) {
        setVideos(data.videos || []);
        setSubscriptions(data.subscriptions || []);
        setWishes(data.wishes || []);
        setParentalControls(data.parentalControls || getInitialData().parentalControls);
        // We sync dailyWatchTime from server, but local updates might override it temporarily
        // Ideally, we should handle this carefully. For now, server wins.
        setDailyWatchTime(data.dailyWatchTime || 0);
      }
    });

    return () => {
      unsubFamily();
      unsubData();
    };
  }, [currentFamily?.id]); // Only re-subscribe if family ID changes

  // Daily Watch Time Reset Effect
  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      setDailyWatchTime(0);
      setLastResetDate(today);
      // Update Firestore?
      if (currentFamily) {
        updateFamilyData(currentFamily.id, { dailyWatchTime: 0, lastResetDate: today });
      }
    }
  }, [lastResetDate, currentFamily]);

  const handleOpenAddVideoFormWithData = useCallback((data: { url: string, title: string }) => {
    setVideoFormData(data);
    setIsAddVideoOpen(true);
  }, []);

  // Deep Linking Effect
  useEffect(() => {
    if (!currentUser || isLoggingIn) return;

    const urlParams = new URLSearchParams(window.location.search);
    const sharedUrl = urlParams.get('url');
    const sharedTitle = urlParams.get('title');

    if (sharedUrl && currentUser.role === 'parent') {
      handleOpenAddVideoFormWithData({ url: sharedUrl, title: sharedTitle || '' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [currentUser, isLoggingIn, handleOpenAddVideoFormWithData]);


  const handleProfileSelect = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const handleSwitchProfile = useCallback(() => {
    // In this auth model, switching profile might mean logging out or just switching 'view' mode if we supported multiple profiles per account.
    // For now, let's treat it as logout or maybe just a UI switch if we had child profiles.
    // But since we use Google Auth, 'Switch Profile' is ambiguous.
    // Let's make it logout for now.
    handleLogout();
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await signOut();
      setChildSession(null); // Clear local child session
      setAuthView('login'); // Reset auth view
      setIsLoading(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }, []);

  const handleLogin = useCallback(async () => {
    try {
      setIsLoggingIn(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
      setIsLoggingIn(false);
      alert("Sign in failed. Please check your configuration.");
    }
  }, []);

  const handleAddVideo = useCallback(async (video: Video) => {
    if (!currentFamily) return;
    const newVideos = [video, ...videos];
    // Optimistic update
    setVideos(newVideos);
    showLocalNotification('New Video Added!', {
      body: `"${video.title}" is now ready for your child to watch.`,
      tag: `new-video-${video.id}`,
    });

    await updateFamilyData(currentFamily.id, { videos: newVideos });
  }, [currentFamily, videos]);

  const handleAddSubscription = useCallback(async (subscription: Subscription) => {
    if (!currentFamily) return;
    const newSubs = [subscription, ...subscriptions];
    setSubscriptions(newSubs);
    await updateFamilyData(currentFamily.id, { subscriptions: newSubs });
  }, [currentFamily, subscriptions]);

  const handleSelectVideo = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleUpdateVideo = useCallback(async (updatedVideo: Video) => {
    if (!currentFamily) return;
    const newVideos = videos.map(v => v.id === updatedVideo.id ? updatedVideo : v);
    setVideos(newVideos);
    if (selectedVideo && selectedVideo.id === updatedVideo.id) {
      setSelectedVideo(updatedVideo);
    }
    await updateFamilyData(currentFamily.id, { videos: newVideos });
  }, [currentFamily, videos, selectedVideo]);

  const handleTimeUpdate = useCallback((seconds: number) => {
    setDailyWatchTime(prev => prev + seconds);
    // Debounce this or save periodically?
    // For now, we won't save every second to Firestore to save writes.
    // We rely on local state for the session.
    // Maybe save on pause/close?
  }, []);

  const handleAddWish = useCallback(async (wishText: string) => {
    if (!currentUser || !currentFamily) return;
    const newWish: Wish = {
      id: `wish_${Date.now()}`,
      text: wishText,
      status: 'pending',
      author: currentUser,
      timestamp: new Date().toLocaleDateString(),
    };
    const newWishes = [newWish, ...wishes];
    setWishes(newWishes);
    await updateFamilyData(currentFamily.id, { wishes: newWishes });

    if (document.visibilityState === 'hidden') {
      showLocalNotification('New Wish Request!', {
        body: `Your child wished for: "${wishText}"`,
        tag: `new-wish-${newWish.id}`,
      });
    }
  }, [currentUser, currentFamily, wishes]);

  const handleAiHelpRequest = useCallback((video: Video) => {
    if (!currentUser) return;
    showLocalNotification(`${currentUser.name} has a question!`, {
      body: `They asked about "${video.title}" and the AI assistant suggested asking a grown-up.`,
      tag: `ai-help-${video.id}-${Date.now()}`
    });
  }, [currentUser]);

  const handleFulfillWish = useCallback(async (wishId: string) => {
    if (!currentFamily) return;
    const newWishes = wishes.map(w => w.id === wishId ? { ...w, status: 'fulfilled' as 'fulfilled' } : w);
    setWishes(newWishes);

    // Notify (simulating that the parent fulfilled it)
    showLocalNotification("Wish Granted! ✨", {
      body: "A new wish has been fulfilled!",
      tag: 'wish-fulfilled'
    });
    await updateFamilyData(currentFamily.id, { wishes: newWishes });
  }, [currentFamily, wishes]);

  const handleRejectWish = useCallback(async (wishId: string) => {
    if (!currentFamily) return;
    const newWishes = wishes.filter(w => w.id !== wishId);
    setWishes(newWishes);
    await updateFamilyData(currentFamily.id, { wishes: newWishes });
  }, [currentFamily, wishes]);

  const handleAddMember = useCallback(async (name: string, role: 'child' | 'parent', email?: string, relationship?: string): Promise<User | null> => {
    if (!currentFamily) return null;

    if (email) {
      const invitedMember = await inviteMember(currentFamily.id, email, role, relationship, name);
      // Update local family state immediately so the parent sees the new card in the tree
      const updatedMembers = [...currentFamily.members.filter(m => m.email?.toLowerCase() !== email.toLowerCase()), invitedMember];
      setCurrentFamily(prev => prev ? { ...prev, members: updatedMembers } : prev);
      return invitedMember;
    } else if (role === 'child') {
      try {
        const newMember = await addChildMember(currentFamily.id, name, relationship);
        const updatedMembers = [...currentFamily.members, newMember];
        setCurrentFamily(prev => prev ? { ...prev, members: updatedMembers } : prev);
        return newMember;
      } catch (error) {
        console.error("Error adding child:", error);
        throw error;
      }
    }
    return null;
  }, [currentFamily]);

  const handleEditMember = useCallback((userId: string, newName: string) => {
    if (!currentFamily) return;
    updateMember(currentFamily.id, userId, { name: newName });
  }, [currentFamily]);

  const handleRemoveMember = useCallback((userId: string) => {
    if (!currentFamily) return;
    removeMember(currentFamily.id, userId);
  }, [currentFamily]);

  const handleResetData = useCallback(async () => {
    if (!currentFamily || !currentUser) return;
    if (confirm("DANGER: This will wipe all family data, members, and settings. Only your account will remain. Are you sure?")) {
      await resetFamilyData(currentFamily.id, currentUser.id);
      window.location.reload(); // Reload to refresh all state from clean slate
    }
  }, [currentFamily, currentUser]);


  const handleFindRecommendations = useCallback(async (wishId: string) => {
    const wish = wishes.find(w => w.id === wishId);
    if (!wish) return;

    // Optimistic UI update
    const newWishes = wishes.map(w => w.id === wishId ? { ...w, isLoadingRecommendations: true } : w);
    setWishes(newWishes);

    const recommendations = await getRecommendedVideosForWish(wish.text);

    const finalWishes = wishes.map(w => w.id === wishId ? { ...w, recommendations, isLoadingRecommendations: false } : w);
    setWishes(finalWishes);
    if (currentFamily) {
      await updateFamilyData(currentFamily.id, { wishes: finalWishes });
    }
  }, [wishes, currentFamily]);

  const handleCloseAddVideoForm = useCallback(() => {
    // Show notification if supported
    if (document.hidden && videoFormData?.title) {
      showLocalNotification("New Video Added! 🎬", {
        body: `${videoFormData.title} has been added to the feed.`,
        tag: 'new-video'
      });
    }

    setIsAddVideoOpen(false);
    setVideoFormData(undefined);
  }, [videoFormData]);

  const handleDeleteVideoClick = useCallback((videoId: string) => {
    setVideoToDelete(videoId);
  }, []);

  const handleConfirmDeleteVideo = useCallback(async () => {
    if (!videoToDelete || !currentFamily) return;
    const newVideos = videos.filter(v => v.id !== videoToDelete);
    setVideos(newVideos);
    if (selectedVideo?.id === videoToDelete) {
      setSelectedVideo(null);
    }
    setVideoToDelete(null);
    await updateFamilyData(currentFamily.id, { videos: newVideos });
  }, [videoToDelete, selectedVideo, currentFamily, videos]);

  const handleCancelDelete = useCallback(() => {
    setVideoToDelete(null);
  }, []);

  const { isLocked, lockReason } = useMemo(() => {
    if (currentUser?.role !== 'child' || !parentalControls.isEnabled) {
      return { isLocked: false, lockReason: null };
    }

    // Check if weekend (Saturday = 6, Sunday = 0)
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const weekendExtra = (isWeekend && parentalControls.weekendExtraMinutes) ? parentalControls.weekendExtraMinutes : 0;

    // Check child-specific override
    const childOverride = currentUser ? parentalControls.childOverrides?.[currentUser.id] : undefined;
    const effectiveLimitMinutes = (childOverride?.dailyTimeLimit ?? parentalControls.dailyTimeLimit) + weekendExtra;
    const effectiveSchedule = childOverride?.schedule ?? parentalControls.schedule;

    const timeLimitInSeconds = effectiveLimitMinutes * 60;
    if (dailyWatchTime >= timeLimitInSeconds) {
      return { isLocked: true, lockReason: 'timeLimit' };
    }

    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = effectiveSchedule.start.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const [endHour, endMinute] = effectiveSchedule.end.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;
    if (currentTime < startTime || currentTime > endTime) {
      return { isLocked: true, lockReason: 'schedule' };
    }
    return { isLocked: false, lockReason: null };
  }, [currentUser, parentalControls, dailyWatchTime]);

  const pendingWishesCount = useMemo(() => wishes.filter(w => w.status === 'pending').length, [wishes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-50 dark:bg-gray-900 gap-4">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-500"></div>
        <p className="text-gray-500 dark:text-gray-400 animate-pulse">Loading HAEVN...</p>

        {/* Failsafe Button - shows after a delay via CSS animation or just always there but small */}
        <button
          onClick={() => {
            localStorage.clear();
            window.location.reload();
          }}
          className="mt-8 text-xs text-red-500 hover:text-red-600 underline opacity-80"
        >
          Stuck? Click to Reset App
        </button>
      </div>
    );
  }

  if (isLoggingIn) {
    return <SkeletonLoader />;
  }

  if (!currentUser && !childSession) {
    // Handle child PIN login
    const handleChildPinLogin = async (childUser: User, familyId: string) => {
      setChildSession({ user: childUser, familyId });
      setCurrentUser(childUser);

      // Load family data for child
      try {
        const family = await getFamilyForUser(childUser.email || '');
        if (family) {
          setCurrentFamily(family);
        } else {
          // If we have familyId from PIN verification, construct basic family
          setCurrentFamily({ id: familyId, name: 'Family', members: [childUser], pin: '', ownerId: '', avatarUrl: '' });
        }
      } catch (e) {
        console.error('Failed to load family for child:', e);
      }
      setIsLoading(false);
    };

    // Render appropriate auth view
    switch (authView) {
      case 'register':
        return (
          <RegisterView
            onSuccess={() => setAuthView('login')}
            onBackToLogin={() => setAuthView('login')}
          />
        );
      case 'child-login':
        return (
          <ChildLoginView
            onLoginSuccess={handleChildPinLogin}
            onBackToParentLogin={() => setAuthView('login')}
            verifyPin={verifyChildPin}
          />
        );
      case 'login':
      default:
        return (
          <LoginView
            onLoginSuccess={() => { }} // Firebase auth handles this via onAuthStateChanged
            onRegister={() => setAuthView('register')}
            onChildLogin={handleChildPinLogin}
            verifyPin={verifyChildPin}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col h-screen font-sans">
      <OfflineIndicator />
      <Header
        currentUser={currentUser}
        onSwitchProfile={handleSwitchProfile}
        onAddVideoClick={() => setIsAddVideoOpen(true)}
        currentFamily={currentFamily}
        onLogout={handleLogout}
        viewMode={viewMode}
        onSwitchToChildView={handleSwitchToChildView}
        onSwitchToParentView={handleSwitchToParentView}
        onChangePin={() => setShowPinModal('change')}
        onOpenFamilyTree={() => setIsFamilyTreeOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 pt-20 overflow-hidden">
        <Sidebar
          userRole={effectiveRole}
          currentView={currentView}
          onViewChange={setCurrentView}
          pendingWishesCount={effectiveRole === 'parent' ? pendingWishesCount : 0}
          dailyWatchTime={dailyWatchTime}
          parentalControls={parentalControls}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {isLocked ? (
            <LockedScreenView reason={lockReason as 'timeLimit' | 'schedule'} />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full h-full"
              >
                {currentView === 'home' && (
                  <HomeView
                    videos={videos}
                    onSelectVideo={handleSelectVideo}
                    currentUser={currentUser}
                    onDeleteVideo={handleDeleteVideoClick}
                    searchQuery={searchQuery}
                  />
                )}

                {currentView === 'history' && (
                  <HistoryView
                    videos={videos}
                    onSelectVideo={handleSelectVideo}
                    currentUser={currentUser}
                    onDeleteVideo={handleDeleteVideoClick}
                    searchQuery={searchQuery}
                  />
                )}
                {currentView === 'subscriptions' && (
                  <SubscriptionsView
                    subscriptions={subscriptions}
                    userRole={currentUser.role}
                    onAddSubscriptionClick={() => setIsAddSubOpen(true)}
                  />
                )}
                {currentView === 'wishlist' && (
                  <WishlistView
                    wishes={wishes}
                    currentUser={currentUser}
                    onAddWish={handleAddWish}
                    onFulfillWish={handleFulfillWish}
                    onRejectWish={handleRejectWish}
                    onFindRecommendations={handleFindRecommendations}
                    onAddRecommendedVideo={handleOpenAddVideoFormWithData}
                  />
                )}
                {currentView === 'family' && currentFamily && (
                  <FamilyView
                    family={currentFamily}
                    currentUser={currentUser}
                    onAddMember={handleAddMember}
                    onEditMember={handleEditMember}
                    onRemoveMember={handleRemoveMember}
                    onResetPin={(childId) => resetChildPin(currentFamily.id, childId)}
                    onSuspendChild={(childId) => suspendChild(currentFamily.id, childId)}
                    onUnsuspendChild={(childId) => unsuspendChild(currentFamily.id, childId)}
                    onUpdateSharingRules={(sharingRules) => updateFamilySharingRules(currentFamily.id, sharingRules)}
                  />
                )}
                {currentView === 'settings' && (
                  <SettingsView
                    controls={parentalControls}
                    onUpdateControls={(newControls) => {
                      setParentalControls(newControls);
                      if (currentFamily) {
                        updateFamilyData(currentFamily.id, { parentalControls: newControls });
                      }
                    }}
                    family={currentFamily}
                    currentUser={currentUser}
                    onAddMember={handleAddMember}
                    onEditMember={handleEditMember}
                    onRemoveMember={handleRemoveMember}
                    onResetPin={currentFamily ? (childId) => resetChildPin(currentFamily.id, childId) : async () => ''}
                    onSuspendChild={currentFamily ? (childId) => suspendChild(currentFamily.id, childId) : async () => { }}
                    onUnsuspendChild={currentFamily ? (childId) => unsuspendChild(currentFamily.id, childId) : async () => { }}
                    onResetFamilyData={currentUser.role === 'parent' ? handleResetData : undefined}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {isAddVideoOpen && currentUser.role === 'parent' && currentFamily && (
        <AddVideoForm
          onAddVideo={handleAddVideo}
          onClose={handleCloseAddVideoForm}
          initialData={videoFormData}
          currentUser={currentUser}
          familyMembers={currentFamily.members}
          sharingRules={currentFamily.sharingRules}
        />
      )}

      {isAddSubOpen && currentUser.role === 'parent' && (
        <AddSubscriptionForm
          onAddSubscription={handleAddSubscription}
          onClose={() => setIsAddSubOpen(false)}
        />
      )}

      {selectedVideo && !isLocked && (
        <VideoPlayerView
          video={selectedVideo}
          onClose={handleClosePlayer}
          onUpdateVideo={handleUpdateVideo}
          onTimeUpdate={handleTimeUpdate}
          onAiHelpRequest={handleAiHelpRequest}
          currentUser={currentUser}
          onDeleteVideo={handleDeleteVideoClick}
          parentalControls={parentalControls}
        />
      )}

      {videoToDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
            <TrashIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Are you sure?</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">This will permanently delete the video. This action cannot be undone.</p>
            <div className="flex space-x-4">
              <button onClick={handleCancelDelete} className="flex-1 p-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-500 transition" title="Cancel">Cancel</button>
              <button onClick={handleConfirmDeleteVideo} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition" title="Confirm deletion">Delete Video</button>
            </div>
          </div>
        </div>
      )}

      {/* Parent PIN Modal */}
      {showPinModal && (
        <ParentPinModal
          mode={showPinModal}
          onSuccess={handlePinSuccess}
          onCancel={handlePinCancel}
          title={showPinModal === 'setup' ? 'Set Your Parent PIN' : showPinModal === 'verify' ? 'Enter PIN to Exit Child View' : 'Change Parent PIN'}
        />
      )}

      {/* Child View Mode Banner */}
      {viewMode === 'child' && currentUser?.role === 'parent' && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleSwitchToParentView}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-full shadow-lg hover:bg-purple-700 transition-all animate-pulse"
          >
            👁️ Viewing as Child - Tap to Exit
          </button>
        </div>
      )}

      {/* Family Tree Modal Overlay */}
      {isFamilyTreeOpen && currentFamily && currentUser && (
        <FamilyTreeView
          family={currentFamily}
          currentUser={currentUser}
          onClose={() => setIsFamilyTreeOpen(false)}
          onSelectMember={(member) => {
            // Close tree and switch to family view to manage details
            setIsFamilyTreeOpen(false);
            setCurrentView('family');
          }}
        />
      )}
    </div>
  );
};

export default App;