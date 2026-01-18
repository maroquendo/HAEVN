import React, { useState, useEffect, useRef } from 'react';
import { ParentalControls, Family, User } from '../types';
import { InfoIcon, CogIcon, MoreVerticalIcon, EditIcon, TrashIcon, UserPlusIcon, KeyIcon, CloseIcon } from './icons';

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

const SettingsView: React.FC<SettingsViewProps> = ({ controls, onUpdateControls, family, onAddMember, onEditMember, onRemoveMember }) => {
    const [localControls, setLocalControls] = useState<ParentalControls>(controls);
    const [saved, setSaved] = useState(false);
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [showAddParentModal, setShowAddParentModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newlyAddedChild, setNewlyAddedChild] = useState<User | null>(null);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [removingUser, setRemovingUser] = useState<User | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);

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

    const handleAddMemberSubmit = (role: 'child' | 'parent') => {
        if (newMemberName.trim()) {
            const newMember = onAddMember(newMemberName.trim(), role);
            if (role === 'child' && newMember) {
                setNewlyAddedChild(newMember);
            }
            setNewMemberName('');
            setShowAddChildModal(false);
            setShowAddParentModal(false);
        }
    };

    const handleEditUserSubmit = () => {
        if (editingUser && newMemberName.trim()) {
            onEditMember(editingUser.id, newMemberName.trim());
        }
        setEditingUser(null);
        setNewMemberName('');
    };

    const handleRemoveUserConfirm = () => {
        if (removingUser) {
            onRemoveMember(removingUser.id);
        }
        setRemovingUser(null);
    }

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
        <div>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h2>

            <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex space-x-2">
                    <TabButton tab="general" label="General" icon={CogIcon} />
                    <TabButton tab="about" label="About" icon={InfoIcon} />
                </div>
            </div>

            {activeTab === 'about' && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl mb-8 animate-fade-in">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        About HAEVN
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                        Created with love for Annabella and Emiliana (A+E) to be a safe place to learn about the world.
                    </p>
                </div>
            )}

            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl">
                        <h3 className="text-xl font-bold mb-4">Notification Settings</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400">Get notified about new wishes and other updates.</p>
                                <p className="text-sm font-medium mt-2">
                                    Status: <span className={`capitalize font-bold ${notificationPermission === 'granted' ? 'text-green-500' : notificationPermission === 'denied' ? 'text-red-500' : 'text-yellow-500'}`}>{notificationPermission}</span>
                                </p>
                            </div>
                            <button
                                onClick={handleEnableNotifications}
                                disabled={notificationPermission === 'granted' || notificationPermission === 'denied'}
                                className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                title="Request permission to show browser notifications"
                            >
                                {notificationPermission === 'granted' ? 'Enabled' : 'Enable Notifications'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Family Management</h3>
                            <div className="flex space-x-2">
                                <button onClick={() => setShowAddChildModal(true)} className="flex items-center space-x-2 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold py-2 px-3 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900 transition" title="Create an invitation for a new child"><UserPlusIcon className="w-5 h-5" /><span>Add Child</span></button>
                                <button onClick={() => setShowAddParentModal(true)} className="flex items-center space-x-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-2 px-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition" title="Add another parent or guardian"><UserPlusIcon className="w-5 h-5" /><span>Add Parent</span></button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {family.members.map(member => (
                                <div key={member.id} className="flex items-center bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                                    <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full mr-3" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 dark:text-white">{member.name}</p>
                                        <div className="flex items-center">
                                            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{member.role}</p>
                                            {member.status === 'pending' && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-200 text-yellow-800">Pending</span>}
                                        </div>
                                    </div>
                                    {member.status === 'pending' && member.joinPin && (
                                        <div className="flex items-center space-x-2">
                                            <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center bg-white dark:bg-gray-800 px-3 py-1 rounded-md">
                                                <KeyIcon className="w-4 h-4 mr-2" />
                                                PIN: <span className="font-bold ml-1 tracking-wider">{member.joinPin}</span>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const url = `${window.location.origin}?child_pin=${member.joinPin}`;
                                                    navigator.clipboard.writeText(url);
                                                    alert(`Magic Link copied for ${member.name}!`);
                                                }}
                                                className="bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                                title="Copy a special link that logs them in automatically"
                                            >
                                                Copy Link 🔗
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative ml-2" ref={menuRef}>
                                        <button onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600" title="Open member options"><MoreVerticalIcon className="w-5 h-5" /></button>
                                        {openMenuId === member.id && (
                                            <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-1 z-10 ring-1 ring-black ring-opacity-5">
                                                <button onClick={() => { setEditingUser(member); setNewMemberName(member.name); setOpenMenuId(null); }} className="w-full text-left flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700" title="Edit member's name"><EditIcon /><span>Edit</span></button>
                                                <button onClick={() => { setRemovingUser(member); setOpenMenuId(null); }} className="w-full text-left flex items-center space-x-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/50" title="Remove member from family"><TrashIcon /><span>Remove</span></button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md max-w-2xl">
                        <h3 className="text-xl font-bold mb-4">Parental Controls</h3>
                        <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold">Enable Controls</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Turn all time limits and schedules on or off.</p>
                            </div>
                            <label htmlFor="toggle" className="flex items-center cursor-pointer" title="Toggle all parental controls on or off">
                                <div className="relative">
                                    <input type="checkbox" id="toggle" className="sr-only" name="isEnabled" checked={localControls.isEnabled} onChange={handleInputChange} />
                                    <div className="block bg-gray-300 dark:bg-gray-600 w-14 h-8 rounded-full"></div>
                                    <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform"></div>
                                </div>
                            </label>
                            <style>{`
                        input:checked ~ .dot {
                            transform: translateX(100%);
                            background-color: #4f46e5;
                        }
                        input:checked ~ .block {
                            background-color: #a5b4fc;
                        }
                    `}</style>
                        </div>

                        <div className={`mt-6 space-y-6 transition-opacity ${localControls.isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                            <div>
                                <h3 className="text-lg font-semibold">Daily Time Limit</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Set the maximum total watch time per day.</p>
                                <div className="flex items-center space-x-4">
                                    <input
                                        type="range"
                                        min="15"
                                        max="240"
                                        step="15"
                                        name="dailyTimeLimit"
                                        value={localControls.dailyTimeLimit}
                                        onChange={handleInputChange}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                                    />
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 w-28 text-center">{localControls.dailyTimeLimit} minutes</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold">Allowed Schedule</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Set the time window when videos can be watched.</p>
                                <div className="flex items-center space-x-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">From</label>
                                        <input
                                            type="time"
                                            name="start"
                                            value={localControls.schedule.start}
                                            onChange={handleScheduleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">To</label>
                                        <input
                                            type="time"
                                            name="end"
                                            value={localControls.schedule.end}
                                            onChange={handleScheduleChange}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                            <button
                                onClick={handleSaveChanges}
                                className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 transition"
                                title="Save parental control settings"
                            >
                                {saved ? 'Saved!' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals for Family Management */}
            {(showAddChildModal || showAddParentModal) && (
                <Modal onClose={() => { setShowAddChildModal(false); setShowAddParentModal(false); setNewMemberName(''); }} title={showAddChildModal ? 'Add a Child' : 'Add a Parent'}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{showAddChildModal ? "Create an invitation PIN for a new child to join the family." : "Add a new parent or guardian to the family."}</p>
                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Enter name" className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition mb-4" />
                    <button onClick={() => handleAddMemberSubmit(showAddChildModal ? 'child' : 'parent')} className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition" title={showAddChildModal ? 'Create Invitation PIN' : 'Add Parent to Family'}>
                        {showAddChildModal ? 'Create Invitation' : 'Add Parent'}
                    </button>
                </Modal>
            )}

            {newlyAddedChild && (
                <Modal onClose={() => setNewlyAddedChild(null)} title="Invitation Created!">
                    <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400 mb-4">Share this PIN with <span className="font-bold">{newlyAddedChild.name}</span> so they can join the family.</p>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                            <p className="text-3xl font-bold tracking-[.2em] text-indigo-600 dark:text-indigo-400">{newlyAddedChild.joinPin}</p>
                        </div>
                        <button onClick={() => setNewlyAddedChild(null)} className="mt-6 w-full p-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition" title="Close">Done</button>
                    </div>
                </Modal>
            )}

            {editingUser && (
                <Modal onClose={() => { setEditingUser(null); setNewMemberName(''); }} title={`Edit ${editingUser.name}`}>
                    <input type="text" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Enter new name" className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition mb-4" />
                    <button onClick={handleEditUserSubmit} className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition" title="Save new name">Save Name</button>
                </Modal>
            )}

            {removingUser && (
                <Modal onClose={() => setRemovingUser(null)} title={`Remove ${removingUser.name}?`}>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Are you sure? This will remove them from the family and cannot be undone.</p>
                    <div className="flex space-x-4">
                        <button onClick={() => setRemovingUser(null)} className="flex-1 p-3 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition" title="Cancel">Cancel</button>
                        <button onClick={handleRemoveUserConfirm} className="flex-1 p-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition" title="Confirm removal">Remove</button>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default SettingsView;