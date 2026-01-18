import React, { useState, useEffect, useRef } from 'react';
import { ParentalControls, Family, User } from '../types';
import { InfoIcon, CogIcon, CloseIcon } from './icons';

type SettingsTab = 'general' | 'about';

interface SettingsViewProps {
    controls: ParentalControls;
    onUpdateControls: (newControls: ParentalControls) => void;
    family: Family | null;
    onAddMember: (name: string, role: 'child' | 'parent', email?: string) => User | null;
    onEditMember: (userId: string, newName: string) => void;
    onRemoveMember: (userId: string) => void;
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

const SettingsView: React.FC<SettingsViewProps> = ({ controls, onUpdateControls, family }) => {
    const [localControls, setLocalControls] = useState<ParentalControls>(controls);
    const [saved, setSaved] = useState(false);

    // Notification state
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    useEffect(() => {
        setLocalControls(controls);
    }, [controls]);

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, checked } = e.target;
        if (name === 'isEnabled') {
            setLocalControls(prev => ({ ...prev, isEnabled: checked }));
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
            if (permission === 'granted') {
                console.log("Notification permission granted.");
            }
        }
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
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-3xl font-extrabold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Settings</h2>

            <div className="mb-8 border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                    <TabButton tab="general" label="General" icon={CogIcon} />
                    <TabButton tab="about" label="About" icon={InfoIcon} />
                </div>
            </div>

            {activeTab === 'about' && (
                <div className="glass-panel p-8 rounded-3xl shadow-lg max-w-2xl mb-8 animate-fade-in">
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

            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in">

                    {/* Notification Section */}
                    <div className="glass-panel p-8 rounded-3xl shadow-lg max-w-2xl border border-white/20">
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
                    <div className="glass-panel p-8 rounded-3xl shadow-lg max-w-2xl border border-white/20">
                        <h3 className="text-xl font-bold mb-6">Parental Controls</h3>

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

                        {/* Controls Content */}
                        <div className={`mt-8 space-y-8 transition-all duration-300 ${localControls.isEnabled ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none grayscale'}`}>

                            {/* Time Limit Slider */}
                            <div>
                                <div className="flex justify-between items-end mb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Daily Time Limit</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Maximum daily watch time.</p>
                                    </div>
                                    <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                                        {localControls.dailyTimeLimit}<span className="text-sm text-gray-400 ml-1">min</span>
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="15"
                                    max="240"
                                    step="15"
                                    name="dailyTimeLimit"
                                    value={localControls.dailyTimeLimit}
                                    onChange={handleInputChange}
                                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-indigo-600 hover:accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-2 font-mono">
                                    <span>15m</span>
                                    <span>4h</span>
                                </div>
                            </div>

                            {/* Schedule Inputs */}
                            <div>
                                <h3 className="text-lg font-semibold mb-1 text-gray-800 dark:text-gray-200">Allowed Schedule</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">When can they watch?</p>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Start Time</label>
                                        <input
                                            type="time"
                                            name="start"
                                            value={localControls.schedule.start}
                                            onChange={handleScheduleChange}
                                            className="w-full bg-transparent font-mono text-lg font-bold text-gray-800 dark:text-white focus:outline-none"
                                        />
                                    </div>
                                    <div className="text-gray-400">to</div>
                                    <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">End Time</label>
                                        <input
                                            type="time"
                                            name="end"
                                            value={localControls.schedule.end}
                                            onChange={handleScheduleChange}
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
                </div>
            )}
        </div>
    );
};

export default SettingsView;