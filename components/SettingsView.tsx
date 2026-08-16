import React, { useState, useEffect } from 'react';
import { ParentalControls, Family, User, ChildControlOverride } from '../types';
import { InfoIcon, CogIcon, CloseIcon, UserIcon, TrashIcon, KeyIcon, EditIcon, CheckIcon } from './icons';
import { getMailtoLink, generateInviteLink } from '../services/emailService';
import { getCacheStorageStats, clearAllMediaCache, CacheStats, MAX_CACHE_BYTES } from '../services/mediaCacheService';

type SettingsTab = 'general' | 'about' | 'admin';

interface SettingsViewProps {
    controls: ParentalControls;
    onUpdateControls: (newControls: ParentalControls) => void;
    family: Family | null;
    currentUser: User;
    onAddMember: (name: string, role: 'child' | 'parent', email?: string, relationship?: string) => Promise<User | null>;
    onEditMember: (userId: string, newName: string) => void;
    onRemoveMember: (userId: string) => void;
    onResetPin: (childId: string) => Promise<string>;
    onSuspendChild: (childId: string) => Promise<void>;
    onUnsuspendChild: (childId: string) => Promise<void>;
    onResetFamilyData?: () => Promise<void>;
}

// --- Modal Component ---
const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg ring-1 ring-black/10 dark:ring-white/10 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-1 bg-white/50 dark:bg-black/50" title="Close dialog"><CloseIcon /></button>
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">{title}</h3>
            {children}
        </div>
    </div>
);

const SettingsView: React.FC<SettingsViewProps> = ({
    controls,
    onUpdateControls,
    family,
    currentUser,
    onAddMember,
    onEditMember,
    onRemoveMember,
    onResetPin,
    onSuspendChild,
    onUnsuspendChild,
    onResetFamilyData
}) => {
    const [localControls, setLocalControls] = useState<ParentalControls>(controls);
    const [saved, setSaved] = useState(false);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [selectedChildId, setSelectedChildId] = useState<string>('all');
    const [cacheStats, setCacheStats] = useState<CacheStats>({ totalBytes: 0, totalVideos: 0, formattedSize: '0 MB', usagePercent: 0 });
    const [isClearingCache, setIsClearingCache] = useState(false);

    // Admin State
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRelationship, setNewMemberRelationship] = useState('');
    const [addMemberType, setAddMemberType] = useState<'child' | 'parent'>('child');
    const [newlyAddedChild, setNewlyAddedChild] = useState<User | null>(null);

    // Permission check for Admin Tab
    const isAdmin = currentUser.role === 'parent' && family?.ownerId === currentUser.id;

    useEffect(() => {
        setLocalControls(controls);
    }, [controls]);

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
        loadCacheStats();
    }, []);

    const loadCacheStats = async () => {
        try {
            const stats = await getCacheStorageStats();
            setCacheStats(stats);
        } catch (e) {
            console.warn('Failed to load cache stats:', e);
        }
    };

    const handleClearCache = async () => {
        setIsClearingCache(true);
        try {
            await clearAllMediaCache();
            await loadCacheStats();
            alert('Offline video cache cleared successfully!');
        } finally {
            setIsClearingCache(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked } = e.target;
        if (name === 'isEnabled') {
            setLocalControls(prev => ({ ...prev, isEnabled: checked }));
        } else if (name === 'strictPrivacy') {
            setLocalControls(prev => ({ ...prev, strictPrivacy: checked }));
        } else if (name === 'dailyTimeLimit') {
            setLocalControls(prev => ({ ...prev, dailyTimeLimit: Number(value) }));
        }
    };

    const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalControls(prev => ({
            ...prev,
            schedule: {
                ...prev.schedule,
                [name]: value,
            },
        }));
    };

    const handleSaveChanges = () => {
        onUpdateControls(localControls);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleEnableNotifications = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === 'granted') {
            alert("Notifications are already enabled!");
        } else if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
        }
    };

    const handleAddMemberSubmit = async () => {
        if (addMemberType === 'child' && !newMemberName.trim()) return;
        if (addMemberType === 'parent' && !newMemberEmail.trim()) return;

        try {
            const member = await onAddMember(
                addMemberType === 'child' ? newMemberName.trim() : (newMemberName.trim() || newMemberEmail.split('@')[0]),
                addMemberType,
                addMemberType === 'parent' ? newMemberEmail.trim().toLowerCase() : undefined,
                newMemberRelationship || undefined
            );

            if (addMemberType === 'child' && member) {
                setNewlyAddedChild(member);
                setShowAddMemberModal(false);
            } else {
                // For parent invites, open mailto
                if (family && addMemberType === 'parent') {
                    const link = generateInviteLink(family.id, newMemberEmail.trim().toLowerCase());
                    const mailto = getMailtoLink(newMemberEmail.trim().toLowerCase(), family.name, link);

                    // Try to open email client
                    window.location.href = mailto;

                    alert("Invited! Email app opened. You can also copy the invite link from the table below if needed.");
                    setShowAddMemberModal(false);
                }
            }
            setNewMemberName('');
            setNewMemberEmail('');
            setNewMemberRelationship('');
        } catch (error) {
            console.error("Failed to add member:", error);
            alert("Failed to add member. Please try again.");
        }
    };

    const handleCopyLink = (pin: string) => {
        const url = `${window.location.origin}?child_pin=${pin}`;
        navigator.clipboard.writeText(url);
        alert("Link copied!");
    };


    const TabButton: React.FC<{ tab: SettingsTab, label: string, icon: React.FC<{ className?: string }> }> = ({ tab, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(tab)}
            title={`Switch to ${label} settings`}
            className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
                ? 'bg-indigo-100 text-indigo-700 dark:bg-gray-700 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
        >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
        </button>
    );

    if (!family) return null;

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                        Settings
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage preferences and security.</p>
                </div>
            </div>

            <div className="mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <div className="flex space-x-2 pb-1">
                    <TabButton tab="general" label="General" icon={CogIcon} />
                    {isAdmin && <TabButton tab="admin" label="Admin Manager" icon={KeyIcon} />}
                    <TabButton tab="about" label="About" icon={InfoIcon} />
                </div>
            </div>

            {/* === ADMIN TAB === */}
            {activeTab === 'admin' && isAdmin && (
                <div className="animate-fade-in space-y-6">
                    <div className="glass-panel p-6 rounded-3xl shadow-lg border border-white/20">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2">Family Members</h3>
                                <p className="text-sm text-gray-500">Manage credentials and access for {family.name}.</p>
                            </div>
                            <button
                                onClick={() => setShowAddMemberModal(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                            >
                                <UserIcon className="w-4 h-4" /> Add Member
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700 text-xs uppercase tracking-wider text-gray-500">
                                        <th className="py-3 px-4">Member</th>
                                        <th className="py-3 px-4">Role</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Access Info</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {family.members.map(member => (
                                        <tr key={member.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={member.avatarUrl} className="w-8 h-8 rounded-full bg-gray-200" alt="" />
                                                    <span className="font-semibold">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 capitalize text-gray-600 dark:text-gray-300">
                                                {member.role === 'parent' && member.id === family.ownerId ? (
                                                    <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">Owner</span>
                                                ) : member.role}
                                                {member.relationship && (
                                                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">({member.relationship})</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {member.suspended ? (
                                                    <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-2 py-0.5 rounded text-xs font-bold">Suspended</span>
                                                ) : member.status === 'pending' ? (
                                                    <span className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded text-xs font-bold">Pending</span>
                                                ) : (
                                                    <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded text-xs font-bold">Active</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-gray-500 dark:text-gray-400">
                                                {member.role === 'child' ? (
                                                    member.joinPin ? (
                                                        <div className="flex items-center gap-2">
                                                            <span>{member.joinPin}</span>
                                                            <button
                                                                onClick={() => member.joinPin && handleCopyLink(member.joinPin)}
                                                                className="text-indigo-500 hover:text-indigo-700" title="Copy Magic Link"
                                                            >
                                                                🔗
                                                            </button>
                                                        </div>
                                                    ) : '---'
                                                ) : (
                                                    <span className="truncate max-w-[150px] inline-block" title={member.email}>{member.email || '---'}</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 flex justify-end gap-2">
                                                {member.id !== currentUser.id && (
                                                    <>
                                                        <button
                                                            onClick={async () => {
                                                                const newName = prompt('New Name:', member.name);
                                                                if (newName) onEditMember(member.id, newName);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                                                            title="Edit Name"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>

                                                        {/* COPY INVITE LINK for Pending Parents */}
                                                        {member.status === 'pending' && member.email && (
                                                            <button
                                                                onClick={() => {
                                                                    if (family) {
                                                                        const link = generateInviteLink(family.id, member.email!);
                                                                        navigator.clipboard.writeText(link);
                                                                        alert("Invite link copied to clipboard!");
                                                                    }
                                                                }}
                                                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                                                                title="Copy Invite Link"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                                                                </svg>
                                                            </button>
                                                        )}

                                                        {member.role === 'child' && (
                                                            <>
                                                                <button
                                                                    onClick={async () => {
                                                                        if (confirm('Regenerate login PIN?')) {
                                                                            await onResetPin(member.id);
                                                                        }
                                                                    }}
                                                                    className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 transition-colors"
                                                                    title="Reset PIN"
                                                                >
                                                                    <KeyIcon className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={async () => {
                                                                        member.suspended ? await onUnsuspendChild(member.id) : await onSuspendChild(member.id);
                                                                    }}
                                                                    className={`p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${member.suspended ? 'text-green-600' : 'text-orange-500'}`}
                                                                    title={member.suspended ? "Unsuspend" : "Suspend"}
                                                                >
                                                                    {member.suspended ? <CheckIcon className="w-4 h-4" /> : <CloseIcon className="w-4 h-4" />}
                                                                </button>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                if (confirm(`Remove ${member.name} permanently?`)) onRemoveMember(member.id);
                                                            }}
                                                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                                                            title="Remove User"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Danger Zone */}
                        {onResetFamilyData && (
                            <div className="mt-8 border-t border-red-200 dark:border-red-900/30 pt-8">
                                <h3 className="text-red-600 dark:text-red-400 font-bold mb-2">Danger Zone</h3>
                                <p className="text-sm text-gray-500 mb-4">Irreversible actions that affect the entire family.</p>
                                <button
                                    onClick={onResetFamilyData}
                                    className="px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-bold"
                                >
                                    Reset Family Data
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* === GENERAL TAB === */}
            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in">

                    {/* Device Storage & Media Cache Manager */}
                    <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800 dark:text-white">
                                    <span>💾</span> Device Media Storage & Cache
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">
                                    Controls on-device video caching for offline playback on iPad (Safari) and Android.
                                </p>
                            </div>
                            <button
                                onClick={handleClearCache}
                                disabled={isClearingCache || cacheStats.totalVideos === 0}
                                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm transition-all border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Free up device disk space immediately"
                            >
                                {isClearingCache ? 'Clearing...' : 'Clear Video Cache'}
                            </button>
                        </div>

                        {/* Storage Meter */}
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm font-semibold text-gray-700 dark:text-gray-300">
                                <span>Used: {cacheStats.formattedSize} ({cacheStats.totalVideos} videos)</span>
                                <span>Max Cap: 500 MB</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                                <div
                                    className="bg-brand-500 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${Math.max(2, cacheStats.usagePercent)}%` }}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-2xl text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                            💡 <strong>Smart Storage Guarantee:</strong> HAEVN automatically caps video storage at 500 MB (max 15 videos) using Least Recently Used (LRU) eviction. Videos unwatched for over 7 days are automatically purged to prevent filling your iPad or tablet.
                        </div>
                    </div>

                    {/* Notification Section */}
                    <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/20">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            Notification Settings
                        </h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-300">Get notified about new wishes and activities.</p>
                                <p className="text-sm font-medium mt-2">
                                    Status: <span className={`capitalize font-bold ${notificationPermission === 'granted' ? 'text-green-500' : notificationPermission === 'denied' ? 'text-red-500' : 'text-yellow-500'}`}>{notificationPermission}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleEnableNotifications}
                                disabled={notificationPermission === 'granted' || notificationPermission === 'denied'}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
                                title="Request permission to show browser notifications"
                            >
                                {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
                            </button>
                        </div>
                    </div>

                    {/* Parental Controls Section */}
                    {currentUser.role === 'parent' && (
                        <div className="glass-panel p-8 rounded-3xl shadow-lg border border-white/20">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                <h3 className="text-xl font-bold">Parental Controls</h3>
                                {family && family.members.some(m => m.role === 'child') && (
                                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                                        <button
                                            onClick={() => setSelectedChildId('all')}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedChildId === 'all' ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-500'}`}
                                        >
                                            All Kids
                                        </button>
                                        {family.members.filter(m => m.role === 'child').map(child => (
                                            <button
                                                key={child.id}
                                                onClick={() => setSelectedChildId(child.id)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedChildId === child.id ? 'bg-white dark:bg-gray-700 text-brand-600 dark:text-brand-300 shadow-sm' : 'text-gray-500'}`}
                                            >
                                                {child.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Master Toggle */}
                            <div className="flex items-center justify-between pb-8 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Enable Controls</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Turn all time limits and schedules on or off.</p>
                                </div>
                                <label htmlFor="toggle" className="flex items-center cursor-pointer hover:scale-105 transition-transform" title="Toggle all parental controls on or off">
                                    <div className="relative">
                                        <input type="checkbox" id="toggle" className="sr-only" name="isEnabled" checked={localControls.isEnabled} onChange={handleInputChange} />
                                        <div className={`block w-14 h-8 rounded-full transition-colors ${localControls.isEnabled ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-md ${localControls.isEnabled ? 'translate-x-full bg-indigo-600' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            {/* Strict Privacy Toggle */}
                            <div className="flex items-center justify-between py-6 border-b border-gray-200 dark:border-gray-700">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Strict Privacy Mode</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-normal">Prioritize clean isolated playback to block ads and tracking.</p>
                                </div>
                                <label htmlFor="strictPrivacyToggle" className="flex items-center cursor-pointer hover:scale-105 transition-transform" title="Toggle strict privacy mode">
                                    <div className="relative">
                                        <input type="checkbox" id="strictPrivacyToggle" className="sr-only" name="strictPrivacy" checked={localControls.strictPrivacy || false} onChange={handleInputChange} />
                                        <div className={`block w-14 h-8 rounded-full transition-colors ${localControls.strictPrivacy ? 'bg-indigo-200 dark:bg-indigo-900' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                                        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform shadow-md ${localControls.strictPrivacy ? 'translate-x-full bg-indigo-600' : ''}`}></div>
                                    </div>
                                </label>
                            </div>

                            {/* Controls Content */}
                            <div className={`mt-8 space-y-8 transition-all duration-300 ${localControls.isEnabled ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none grayscale'}`}>

                                {/* Time Limit Slider */}
                                <div>
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                {selectedChildId === 'all' ? 'Daily Time Limit' : `Daily Time Limit for ${family?.members.find(m => m.id === selectedChildId)?.name}`}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Maximum daily watch time.</p>
                                        </div>
                                        <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                            {selectedChildId === 'all'
                                                ? localControls.dailyTimeLimit
                                                : (localControls.childOverrides?.[selectedChildId]?.dailyTimeLimit ?? localControls.dailyTimeLimit)
                                            }<span className="text-sm text-gray-400 ml-1">min</span>
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="15"
                                        max="240"
                                        step="15"
                                        value={selectedChildId === 'all'
                                            ? localControls.dailyTimeLimit
                                            : (localControls.childOverrides?.[selectedChildId]?.dailyTimeLimit ?? localControls.dailyTimeLimit)
                                        }
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            if (selectedChildId === 'all') {
                                                setLocalControls(prev => ({ ...prev, dailyTimeLimit: val }));
                                            } else {
                                                setLocalControls(prev => ({
                                                    ...prev,
                                                    childOverrides: {
                                                        ...prev.childOverrides,
                                                        [selectedChildId]: {
                                                            ...prev.childOverrides?.[selectedChildId],
                                                            dailyTimeLimit: val
                                                        }
                                                    }
                                                }));
                                            }
                                        }}
                                        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600 hover:accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                                        <span>15m</span>
                                        <span>4h</span>
                                    </div>
                                </div>

                                {/* Weekend Extra Bonus Time */}
                                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-purple-900 dark:text-purple-200 text-sm">🎉 Weekend Bonus Screen Time</h4>
                                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">Automatically adds extra minutes on Saturdays and Sundays.</p>
                                    </div>
                                    <select
                                        value={localControls.weekendExtraMinutes || 0}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setLocalControls(prev => ({ ...prev, weekendExtraMinutes: val }));
                                        }}
                                        className="bg-white dark:bg-gray-800 border border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 text-sm font-semibold text-purple-900 dark:text-purple-200 focus:outline-none"
                                    >
                                        <option value={0}>No Extra Time</option>
                                        <option value={15}>+15 Minutes</option>
                                        <option value={30}>+30 Minutes</option>
                                        <option value={60}>+60 Minutes (1 hr)</option>
                                    </select>
                                </div>

                                {/* Schedule Inputs */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-200">Allowed Schedule (Bedtime Curfew)</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">When can they watch?</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                name="start"
                                                value={selectedChildId === 'all'
                                                    ? localControls.schedule.start
                                                    : (localControls.childOverrides?.[selectedChildId]?.schedule?.start ?? localControls.schedule.start)
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (selectedChildId === 'all') {
                                                        setLocalControls(prev => ({ ...prev, schedule: { ...prev.schedule, start: val } }));
                                                    } else {
                                                        setLocalControls(prev => ({
                                                            ...prev,
                                                            childOverrides: {
                                                                ...prev.childOverrides,
                                                                [selectedChildId]: {
                                                                    ...prev.childOverrides?.[selectedChildId],
                                                                    schedule: {
                                                                        start: val,
                                                                        end: prev.childOverrides?.[selectedChildId]?.schedule?.end ?? prev.schedule.end
                                                                    }
                                                                }
                                                            }
                                                        }));
                                                    }
                                                }}
                                                className="w-full bg-transparent font-mono text-lg font-bold text-gray-800 dark:text-white focus:outline-none"
                                            />
                                        </div>
                                        <div className="text-gray-400">to</div>
                                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">End Time</label>
                                            <input
                                                type="time"
                                                name="end"
                                                value={selectedChildId === 'all'
                                                    ? localControls.schedule.end
                                                    : (localControls.childOverrides?.[selectedChildId]?.schedule?.end ?? localControls.schedule.end)
                                                }
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (selectedChildId === 'all') {
                                                        setLocalControls(prev => ({ ...prev, schedule: { ...prev.schedule, end: val } }));
                                                    } else {
                                                        setLocalControls(prev => ({
                                                            ...prev,
                                                            childOverrides: {
                                                                ...prev.childOverrides,
                                                                [selectedChildId]: {
                                                                    ...prev.childOverrides?.[selectedChildId],
                                                                    schedule: {
                                                                        start: prev.childOverrides?.[selectedChildId]?.schedule?.start ?? prev.schedule.start,
                                                                        end: val
                                                                    }
                                                                }
                                                            }
                                                        }));
                                                    }
                                                }}
                                                className="w-full bg-transparent font-mono text-lg font-bold text-gray-800 dark:text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                <button
                                    onClick={handleSaveChanges}
                                    className={`
                                        bg-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-indigo-700 transition-all transform hover:scale-105 shadow-lg shadow-indigo-500/30
                                        ${saved ? 'bg-green-500 hover:bg-green-600 ring-2 ring-green-300' : ''}
                                    `}
                                    title="Save parental control settings"
                                >
                                    {saved ? (
                                        <span className="flex items-center gap-2">Saved! ✨</span>
                                    ) : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* === ABOUT TAB === */}
            {activeTab === 'about' && (
                <div className="glass-panel p-8 rounded-3xl shadow-lg max-w-2xl mb-8 animate-fade-in mx-auto">
                    <h3 className="text-2xl font-bold mb-4 flex items-center">
                        About HAEVN
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                        Created with ❤️ for Annabella and Emiliana (A+E).
                        <br />
                        A safe, curated space to explore the world.
                    </p>
                    <div className="mt-8 text-xs text-gray-400">
                        Version 1.0.0 • Connected to {family.name}
                    </div>
                </div>
            )}

            {/* === ADD MEMBER MODAL === */}
            {showAddMemberModal && (
                <Modal onClose={() => setShowAddMemberModal(false)} title="Add Family Member">
                    <div className="flex gap-2 mb-4 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                        <button
                            className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${addMemberType === 'child' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setAddMemberType('child')}
                        >
                            Child Account
                        </button>
                        <button
                            className={`flex-1 py-2 rounded-md font-medium text-sm transition-colors ${addMemberType === 'parent' ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            onClick={() => setAddMemberType('parent')}
                        >
                            Invite Adult
                        </button>
                    </div>

                    <div className="space-y-4">
                        {addMemberType === 'child' ? (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Child's Name</label>
                                <input
                                    type="text"
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                    placeholder="e.g., Leo"
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">Creates a managed account with PIN login.</p>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    value={newMemberEmail}
                                    onChange={e => setNewMemberEmail(e.target.value)}
                                    placeholder="friend@example.com"
                                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">Sends an invitation to join the family.</p>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship / Title <span className="text-gray-400 font-normal">(Optional)</span></label>
                            <input
                                type="text"
                                value={newMemberRelationship}
                                onChange={e => setNewMemberRelationship(e.target.value)}
                                placeholder="e.g. Grandma, Uncle Bob"
                                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <button
                            onClick={handleAddMemberSubmit}
                            disabled={addMemberType === 'child' ? !newMemberName.trim() : !newMemberEmail.trim()}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl mt-4 hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {addMemberType === 'child' ? 'Create Account' : 'Send Invitation'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* === SUCCESS MODAL === */}
            {newlyAddedChild && (
                <Modal onClose={() => setNewlyAddedChild(null)} title="Account Created!">
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckIcon className="w-8 h-8" />
                        </div>
                        <p className="text-lg font-bold text-gray-800 dark:text-white mb-1">{newlyAddedChild.name}</p>
                        <p className="text-gray-500 mb-6">is now ready to log in.</p>

                        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-6 relative overflow-hidden group">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Login PIN</p>
                            <p className="text-4xl font-mono font-bold tracking-[.2em] text-indigo-600 dark:text-indigo-400 select-all">
                                {newlyAddedChild.joinPin}
                            </p>
                        </div>

                        <button
                            onClick={() => newlyAddedChild.joinPin && handleCopyLink(newlyAddedChild.joinPin)}
                            className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl mb-3 hover:bg-indigo-100 transition-colors"
                        >
                            Copy Magic Link 🔗
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default SettingsView;