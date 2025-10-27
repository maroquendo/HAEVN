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
import LoginView from './components/LoginView';
import SkeletonLoader from './components/SkeletonLoader';
import { CloseIcon, KeyIcon, TrashIcon } from './components/icons';
import { MOCK_FAMILIES } from './constants';
import { Video, Subscription, Wish, ParentalControls, AppData, Family, User } from './types';
import { getRecommendedVideosForWish } from './services/geminiService';
import { showLocalNotification } from './services/notificationService';
import getInitialData, { SHARABLE_VIDEOS } from './utils/data';
import * as storage from './services/storageService';


// --- Join with PIN Modal ---
const JoinPinModal: React.FC<{
  onClose: () => void;
  onJoin: (pin: string) => void;
}> = ({ onClose, onJoin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length !== 6) {
      setError('Please enter a valid 6-digit PIN.');
      return;
    }
    setError('');
    onJoin(pin.trim());
  };
  return (
    <div className="fixed inset-0 bg-gray-900/80 z-50 flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" title="Close"><CloseIcon /></button>
        <KeyIcon className="w-12 h-12 mx-auto text-indigo-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Join a Family</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Enter the 6-digit PIN from your parent.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            maxLength={6}
            placeholder="123456"
            className="w-full p-3 text-center text-2xl tracking-[.5em] bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all" title="Join Family with PIN">Join Family</button>
        </form>
      </div>
    </div>
  );
};


// --- Profile Picker Component ---
interface ProfilePickerProps {
  family: Family;
  onSelectProfile: (user: User) => void;
  onLogout: () => void;
  onJoinWithPinClick: () => void;
}
const ProfilePicker: React.FC<ProfilePickerProps> = ({ family, onSelectProfile, onLogout, onJoinWithPinClick }) => (
  <div className="fixed inset-0 bg-gray-900/80 z-50 flex justify-center items-center p-4 animate-fade-in">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Who's watching?</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Select your profile from {family.name}.</p>
      <div className="space-y-3 mb-6">
        {family.members.filter(u => u.status === 'active').map(user => (
          <button
            key={user.id}
            onClick={() => onSelectProfile(user)}
            className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            title={`Select ${user.name}'s profile`}
          >
            <img src={user.avatarUrl} alt={user.name} className="w-12 h-12 rounded-full mr-4" />
            <span className="font-semibold text-lg text-gray-800 dark:text-gray-200">{user.name}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <button onClick={onLogout} className="text-sm text-gray-500 hover:underline" title="Choose a different family">
          Not your family?
        </button>
        <button onClick={onJoinWithPinClick} className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline" title="Join this family using an invitation PIN">
          Join with a PIN
        </button>
      </div>
    </div>
  </div>
);


const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

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
  const [videoFormData, setVideoFormData] = useState<{url: string, title: string} | undefined>(undefined);
  const [isJoinPinModalOpen, setIsJoinPinModalOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null);

  const loadAppData = (data: AppData, family: Family) => {
    setVideos(data.videos);
    setSubscriptions(data.subscriptions);
    setWishes(data.wishes);
    setParentalControls(data.parentalControls);
    setDailyWatchTime(data.dailyWatchTime);
    setLastResetDate(data.lastResetDate);
    setCurrentFamily(family);
  };

  const assembleAppData = useCallback((): AppData => {
      return { videos, subscriptions, wishes, parentalControls, dailyWatchTime, lastResetDate };
  }, [videos, subscriptions, wishes, parentalControls, dailyWatchTime, lastResetDate]);

  // Auth and Data Loading Effect
  useEffect(() => {
    const familyId = storage.getCurrentFamilyId();
    if (familyId) {
      const family = MOCK_FAMILIES.find(f => f.id === familyId);
      if (family) {
        setIsLoggingIn(true);
        setTimeout(() => {
            const data = storage.loadDataForFamily(family.id);
            loadAppData(data, family);
            setIsLoggingIn(false);
        }, 1000);
      }
    }
    setIsLoading(false);
  }, []);

  // Data Persistence Effect
  useEffect(() => {
    if (currentFamily && !isLoading && !isLoggingIn) {
      storage.saveDataForFamily(currentFamily.id, assembleAppData());
    }
  }, [currentFamily, isLoading, isLoggingIn, assembleAppData]);

  // Daily Watch Time Reset Effect
  useEffect(() => {
    const today = new Date().toDateString();
    if (today !== lastResetDate) {
      setDailyWatchTime(0);
      setLastResetDate(today);
    }
  }, [lastResetDate]);

  const handleOpenAddVideoFormWithData = useCallback((data: {url: string, title: string}) => {
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

  const handleFamilySelect = useCallback((family: Family) => {
    setIsLoggingIn(true);
    setTimeout(() => {
      const data = storage.loadDataForFamily(family.id);
      loadAppData(data, family);
      storage.setCurrentFamilyId(family.id);
      setIsLoggingIn(false);
    }, 1200);
  }, []);
  
  const handleProfileSelect = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);
  
  const handleSwitchProfile = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const handleLogout = useCallback(() => {
    storage.clearCurrentFamilyId();
    setCurrentFamily(null);
    setCurrentUser(null);
    const initialData = getInitialData();
    setVideos(initialData.videos);
    setSubscriptions(initialData.subscriptions);
    setWishes(initialData.wishes);
    setParentalControls(initialData.parentalControls);
    setDailyWatchTime(initialData.dailyWatchTime);
    setLastResetDate(initialData.lastResetDate);
    setCurrentView('home');
  }, []);

  const handleAddVideo = useCallback((video: Video) => {
    setVideos(prevVideos => [video, ...prevVideos]);
    if (document.visibilityState === 'hidden') {
      showLocalNotification('New Video Added!', {
          body: `"${video.title}" is now ready for your child to watch.`,
          tag: `new-video-${video.id}`,
      });
    }
  }, []);
  
  const handleAddSubscription = useCallback((subscription: Subscription) => {
    setSubscriptions(prevSubs => [subscription, ...prevSubs]);
  }, []);

  const handleSelectVideo = useCallback((video: Video) => {
    setSelectedVideo(video);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleUpdateVideo = useCallback((updatedVideo: Video) => {
    setVideos(prevVideos => prevVideos.map(v => v.id === updatedVideo.id ? updatedVideo : v));
    if (selectedVideo && selectedVideo.id === updatedVideo.id) {
        setSelectedVideo(updatedVideo);
    }
  }, [selectedVideo]);

  const handleTimeUpdate = useCallback((seconds: number) => {
    setDailyWatchTime(prev => prev + seconds);
  }, []);

  const handleAddWish = useCallback((wishText: string) => {
    if (!currentUser) return;
    const newWish: Wish = {
      id: `wish_${Date.now()}`,
      text: wishText,
      status: 'pending',
      author: currentUser,
      timestamp: new Date().toLocaleDateString(),
    };
    setWishes(prevWishes => [newWish, ...prevWishes]);
    if (document.visibilityState === 'hidden') {
        showLocalNotification('New Wish Request!', {
            body: `Your child wished for: "${wishText}"`,
            tag: `new-wish-${newWish.id}`,
        });
    }
  }, [currentUser]);
  
  const handleAiHelpRequest = useCallback((video: Video) => {
    if (!currentUser) return;
    showLocalNotification(`${currentUser.name} has a question!`, {
        body: `They asked about "${video.title}" and the AI assistant suggested asking a grown-up.`,
        tag: `ai-help-${video.id}-${Date.now()}`
    });
  }, [currentUser]);

  const handleFulfillWish = useCallback((wishId: string) => {
    setWishes(wishes => wishes.map(w => w.id === wishId ? { ...w, status: 'fulfilled' } : w));
  }, []);

  const handleRejectWish = useCallback((wishId: string) => {
    setWishes(wishes => wishes.filter(w => w.id !== wishId));
  }, []);
  
  const handleAddMember = useCallback((name: string, role: 'child' | 'parent'): User | null => {
    if (!currentFamily) return null;
    const isChild = role === 'child';
    const newMember: User = {
        id: `${role}_${Date.now()}`,
        name,
        avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}`,
        role: role,
        status: isChild ? 'pending' : 'active',
        joinPin: isChild ? String(Math.floor(100000 + Math.random() * 900000)) : undefined,
    };
    const updatedFamily = {
        ...currentFamily,
        members: [...currentFamily.members, newMember]
    };
    setCurrentFamily(updatedFamily);
    
    // This is a mock update, in a real app this would be an API call
    const familyIndex = MOCK_FAMILIES.findIndex(f => f.id === currentFamily.id);
    if(familyIndex !== -1) {
        MOCK_FAMILIES[familyIndex] = updatedFamily;
    }
    return newMember;
  }, [currentFamily]);

  const handleEditMember = useCallback((userId: string, newName: string) => {
    if (!currentFamily) return;
    const updatedMembers = currentFamily.members.map(m => m.id === userId ? {...m, name: newName} : m);
    setCurrentFamily({...currentFamily, members: updatedMembers});
  }, [currentFamily]);

  const handleRemoveMember = useCallback((userId: string) => {
    if (!currentFamily) return;
    const updatedMembers = currentFamily.members.filter(m => m.id !== userId);
    setCurrentFamily({...currentFamily, members: updatedMembers});
  }, [currentFamily]);
  
  const handleJoinWithPin = useCallback((pin: string) => {
    if (!currentFamily) return;
    let found = false;
    const updatedMembers = currentFamily.members.map(member => {
      if (member.status === 'pending' && member.joinPin === pin) {
        found = true;
        return { ...member, status: 'active' as 'active', joinPin: undefined };
      }
      return member;
    });

    if (found) {
      setCurrentFamily({ ...currentFamily, members: updatedMembers });
      setIsJoinPinModalOpen(false);
      // In a real app, you might show a success message
    } else {
      // In a real app, you'd show an error in the modal
      alert("Invalid PIN. Please try again.");
    }
  }, [currentFamily]);


  const handleFindRecommendations = useCallback(async (wishId: string) => {
    const wish = wishes.find(w => w.id === wishId);
    if (!wish) return;

    setWishes(prevWishes => prevWishes.map(w => w.id === wishId ? { ...w, isLoadingRecommendations: true } : w));
    const recommendations = await getRecommendedVideosForWish(wish.text);
    setWishes(prevWishes => prevWishes.map(w => w.id === wishId ? { ...w, recommendations, isLoadingRecommendations: false } : w));
  }, [wishes]);
  
  const handleCloseAddVideoForm = useCallback(() => {
    setIsAddVideoOpen(false);
    setVideoFormData(undefined);
  }, []);

  const handleDeleteVideoClick = useCallback((videoId: string) => {
    setVideoToDelete(videoId);
  }, []);

  const handleConfirmDeleteVideo = useCallback(() => {
    if (!videoToDelete) return;
    setVideos(prevVideos => prevVideos.filter(v => v.id !== videoToDelete));
    if (selectedVideo?.id === videoToDelete) {
        setSelectedVideo(null);
    }
    setVideoToDelete(null);
  }, [videoToDelete, selectedVideo]);

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
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isLoggingIn) {
    return <SkeletonLoader />;
  }

  if (!currentFamily) {
    return <LoginView onFamilySelect={handleFamilySelect} />;
  }
  
  if (!currentUser) {
    return (
      <>
        <ProfilePicker
          family={currentFamily}
          onSelectProfile={handleProfileSelect}
          onLogout={handleLogout}
          onJoinWithPinClick={() => setIsJoinPinModalOpen(true)}
        />
        {isJoinPinModalOpen && (
          <JoinPinModal
            onClose={() => setIsJoinPinModalOpen(false)}
            onJoin={handleJoinWithPin}
          />
        )}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col h-screen">
      <Header 
        currentUser={currentUser}
        onSwitchProfile={handleSwitchProfile}
        onAddVideoClick={() => setIsAddVideoOpen(true)}
        currentFamily={currentFamily}
        onLogout={handleLogout}
      />
      <div className="flex flex-1 pt-16 overflow-hidden">
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
                    onUpdateControls={setParentalControls}
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                <TrashIcon className="w-12 h-12 mx-auto text-red-500 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Are you sure?</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">This will permanently delete the video. This action cannot be undone.</p>
                <div className="flex space-x-4">
                    <button onClick={handleCancelDelete} className="flex-1 p-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition" title="Cancel">Cancel</button>
                    <button onClick={handleConfirmDeleteVideo} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition" title="Confirm deletion">Delete Video</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;