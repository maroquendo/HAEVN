import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { CloseIcon, KeyIcon, TrashIcon } from './components/icons';
import { MOCK_FAMILIES } from './constants';
import { Video, Subscription, Wish, ParentalControls, AppData, Family, User } from './types';
import { getRecommendedVideosForWish } from './services/geminiService';
import { showLocalNotification } from './services/notificationService';
import getInitialData, { SHARABLE_VIDEOS } from './utils/data';
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
  verifyChildPin
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
  const [currentView, setCurrentView] = useState<'home' | 'history' | 'subscriptions' | 'wishlist' | 'settings'>('home');
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [videoFormData, setVideoFormData] = useState<{ url: string, title: string } | undefined>(undefined);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

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
        setCurrentUser(appUser);
        // Don't set isLoading to false here - let family initialization do it
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

  // Magic Link Handler
  useEffect(() => {
    const handleMagicLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const pin = params.get('child_pin');

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

      // Timeout promise to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Family initialization timeout (10s)')), 10000);
      });

      try {
        // Race between family init and timeout
        const familyInit = async () => {
          let family = await getFamilyForUser(currentUser.email);

          if (family) {
            console.log('Found existing family:', family.name);
            // Check if pending and join
            const me = family.members.find(m => m.email === currentUser.email);
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
        // Show error but still allow app to load - user can retry
        // Don't block the entire app
      } finally {
        console.log('Family initialization complete, setting isLoading to false');
        setIsLoading(false);
      }
    };

    initFamily();
  }, [currentUser]); // Depend only on currentUser

  // Handle Web Share Target (Android Share Menu)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const title = params.get('title');
    const text = params.get('text');
    const url = params.get('url');

    if (title || text || url) {
      // Some apps put the URL in 'text'
      let finalUrl = url;
      if (!finalUrl && text && text.startsWith('http')) {
        finalUrl = text;
      }

      if (finalUrl) {
        setVideoFormData({
          title: title || '',
          url: finalUrl
        });
        setIsAddVideoOpen(true);

        // Clean URL without refresh
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
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
    await updateFamilyData(currentFamily.id, { videos: newVideos });

    if (document.visibilityState === 'hidden') {
      showLocalNotification('New Video Added!', {
        body: `"${video.title}" is now ready for your child to watch.`,
        tag: `new-video-${video.id}`,
      });
    }
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
    await updateFamilyData(currentFamily.id, { wishes: newWishes });
  }, [currentFamily, wishes]);

  const handleRejectWish = useCallback(async (wishId: string) => {
    if (!currentFamily) return;
    const newWishes = wishes.filter(w => w.id !== wishId);
    setWishes(newWishes);
    await updateFamilyData(currentFamily.id, { wishes: newWishes });
  }, [currentFamily, wishes]);

  const handleAddMember = useCallback((name: string, role: 'child' | 'parent', email?: string): User | null => {
    if (!currentFamily) return null;

    if (email) {
      inviteMember(currentFamily.id, email, role).catch(err => {
        console.error("Failed to invite member:", err);
        alert("Failed to send invite. Please check the email.");
      });
      return null; // Async invite
    }

    // Fallback for non-email members (e.g. dummy child accounts)?
    // For now, we enforce email for simplicity or just create a local dummy?
    // The previous logic created a dummy user.
    // Let's keep the dummy logic if no email is provided, but warn.
    // Actually, SettingsView now asks for email.

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
    setIsAddVideoOpen(false);
    setVideoFormData(undefined);
  }, []);

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
    const timeLimitInSeconds = parentalControls.dailyTimeLimit * 60;
    if (dailyWatchTime >= timeLimitInSeconds) {
      return { isLocked: true, lockReason: 'timeLimit' };
    }
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMinute] = parentalControls.schedule.start.split(':').map(Number);
    const startTime = startHour * 60 + startMinute;
    const [endHour, endMinute] = parentalControls.schedule.end.split(':').map(Number);
    const endTime = endHour * 60 + endMinute;
    if (currentTime < startTime || currentTime > endTime) {
      return { isLocked: true, lockReason: 'schedule' };
    }
    return { isLocked: false, lockReason: null };
  }, [currentUser, parentalControls, dailyWatchTime]);

  const pendingWishesCount = useMemo(() => wishes.filter(w => w.status === 'pending').length, [wishes]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-brand-500"></div>
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
            onChildLogin={() => setAuthView('child-login')}
          />
        );
    }
  }

  return (
    <div className="min-h-screen bg-brand-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col h-screen font-sans">
      <Header
        currentUser={currentUser}
        onSwitchProfile={handleSwitchProfile}
        onAddVideoClick={() => setIsAddVideoOpen(true)}
        currentFamily={currentFamily}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 pt-20 overflow-hidden">
        <Sidebar
          userRole={currentUser.role}
          currentView={currentView}
          onViewChange={setCurrentView}
          pendingWishesCount={currentUser.role === 'parent' ? pendingWishesCount : 0}
          dailyWatchTime={dailyWatchTime}
          parentalControls={parentalControls}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {isLocked ? (
            <LockedScreenView reason={lockReason as 'timeLimit' | 'schedule'} />
          ) : (
            <>
              {currentView === 'home' && <HomeView videos={videos} onSelectVideo={handleSelectVideo} currentUser={currentUser} onDeleteVideo={handleDeleteVideoClick} />}
              {currentView === 'history' && <HistoryView videos={videos} onSelectVideo={handleSelectVideo} currentUser={currentUser} onDeleteVideo={handleDeleteVideoClick} />}
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
              {currentView === 'settings' && currentUser.role === 'parent' && (
                <SettingsView
                  controls={parentalControls}
                  onUpdateControls={(newControls) => {
                    setParentalControls(newControls);
                    if (currentFamily) updateFamilyData(currentFamily.id, { parentalControls: newControls });
                  }}
                  family={currentFamily}
                  onAddMember={handleAddMember}
                  onEditMember={handleEditMember}
                  onRemoveMember={handleRemoveMember}
                />
              )}
            </>
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
    </div>
  );
};

export default App;