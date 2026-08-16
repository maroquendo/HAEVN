import React, { useState } from 'react';
import { Family, User } from '../types';
import { UserPlusIcon, EditIcon, KeyIcon, TrashIcon, CloseIcon, CheckIcon, UserIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface FamilyViewProps {
    family: Family;
    currentUser: User;
    onAddMember: (name: string, role: 'child' | 'parent', email?: string, relationship?: string) => Promise<User | null>;
    onEditMember: (userId: string, newName: string) => void;
    onRemoveMember: (userId: string) => void;
    onResetPin: (childId: string) => Promise<string>;
    onSuspendChild: (childId: string) => Promise<void>;
    onUnsuspendChild: (childId: string) => Promise<void>;
    onUpdateSharingRules: (sharingRules: { [senderId: string]: string[] }) => Promise<void>;
}

// --- Modal Component ---
const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-center p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl ring-1 ring-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
        >
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10" title="Close dialog"><CloseIcon /></button>
            <h3 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white flex items-center gap-2">
                {title}
            </h3>
            {children}
        </motion.div>
    </div>
);

const FamilyNode: React.FC<{
    member: User;
    isParent: boolean;
    onClick?: () => void;
    delay?: number;
}> = ({ member, isParent, onClick, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, type: 'spring' }}
        whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
        onClick={onClick}
        className={`
            relative flex flex-col items-center p-4 rounded-3xl cursor-pointer transition-all duration-300
            ${isParent
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white min-w-[200px]'
                : 'glass-panel text-gray-800 dark:text-white min-w-[160px] hover:border-indigo-500/50 hover:bg-white/40 dark:hover:bg-gray-800/60'}
            border border-white/20 shadow-xl backdrop-blur-md
        `}
    >
        <div className="relative">
            <img
                src={member.avatarUrl}
                alt={member.name}
                className={`w-16 h-16 rounded-2xl object-cover mb-3 shadow-lg border-2 ${isParent ? 'border-white/30' : 'border-white/50'}`}
            />
            {member.suspended && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    SUSPENDED
                </div>
            )}
            {member.status === 'pending' && !member.suspended && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    PENDING
                </div>
            )}
        </div>

        <h4 className="text-lg font-bold tracking-tight">{member.name}</h4>
        <p className="text-xs uppercase tracking-wider font-semibold opacity-70 mt-1">
            {member.relationship ? member.relationship : (isParent ? 'Head of Household' : 'Child Account')}
        </p>

        {onClick && (
            <div className="mt-3 flex gap-2 w-full justify-center">
                <span className="text-[10px] font-mono bg-black/5 dark:bg-white/10 dark:text-gray-300 px-2 py-1 rounded-md">
                    {isParent ? 'Tap to Edit' : 'Tap to Manage'}
                </span>
            </div>
        )}
    </motion.div>
);

const FamilyView: React.FC<FamilyViewProps> = ({
    family, currentUser, onAddMember, onEditMember, onRemoveMember, onResetPin, onSuspendChild, onUnsuspendChild, onUpdateSharingRules
}) => {
    const [activeTab, setActiveTab] = useState<'members' | 'sharing' | 'sandbox'>('members');
    const [selectedMember, setSelectedMember] = useState<User | null>(null);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    
    // Add member state
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState<'child' | 'parent'>('child');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRelationship, setNewMemberRelationship] = useState('Child');
    const [newlyAddedChild, setNewlyAddedChild] = useState<User | null>(null);
    const [newlyInvitedAdult, setNewlyInvitedAdult] = useState<User | null>(null);

    // Sandbox diagnostics state
    const [sandboxPin, setSandboxPin] = useState('');
    const [sandboxResult, setSandboxResult] = useState<{ match: boolean; name?: string; role?: string; error?: string } | null>(null);

    const parents = family.members.filter(m => m.role === 'parent');
    const children = family.members.filter(m => m.role === 'child');

    const handleAddMemberSubmit = async () => {
        if (!newMemberName.trim()) return;

        try {
            const relationship = newMemberRelationship.trim() || (newMemberRole === 'child' ? 'Child' : 'Parent');
            const email = newMemberRole === 'parent' ? newMemberEmail.trim().toLowerCase() : undefined;

            const newMember = await onAddMember(newMemberName.trim(), newMemberRole, email, relationship);
            
            setShowAddMemberModal(false);

            if (newMemberRole === 'child' && newMember) {
                setNewlyAddedChild(newMember);
            } else if (newMemberRole === 'parent' && newMember) {
                setNewlyInvitedAdult(newMember);
            }
            
            // Reset state
            setNewMemberName('');
            setNewMemberEmail('');
            setNewMemberRelationship('Child');
            setNewMemberRole('child');
        } catch (error) {
            console.error("Failed to add member:", error);
            alert("Failed to add family member. Please check details and try again.");
        }
    };

    const handleCopyLink = (pin: string) => {
        const url = `${window.location.origin}?child_pin=${pin}`;
        navigator.clipboard.writeText(url);
        alert("Magic login link copied to clipboard! 🪄");
    };

    // Matrix Sharing Permissions handler
    const handleSharingToggle = async (senderId: string, childId: string) => {
        const currentRules = family.sharingRules || {};
        const senderRules = currentRules[senderId] || children.map(c => c.id); // Default to all if empty

        let newSenderRules: string[];
        if (senderRules.includes(childId)) {
            newSenderRules = senderRules.filter(id => id !== childId);
        } else {
            newSenderRules = [...senderRules, childId];
        }

        const updatedRules = {
            ...currentRules,
            [senderId]: newSenderRules
        };

        await onUpdateSharingRules(updatedRules);
    };

    // Diagnostic PIN sandbox logic
    const handleSandboxPinChange = (val: string) => {
        const sanitized = val.replace(/\D/g, '').slice(0, 6);
        setSandboxPin(sanitized);

        if (sanitized.length < 4) {
            setSandboxResult(null);
            return;
        }

        // 1. Check parent bypass PIN
        if (family.pin && family.pin === sanitized) {
            setSandboxResult({
                match: true,
                name: 'Parent Bypass PIN',
                role: 'Unlocks parental settings & dashboard view override'
            });
            return;
        }

        // 2. Check child PINs
        const matchingChild = family.members.find(m => m.role === 'child' && m.joinPin === sanitized);
        if (matchingChild) {
            setSandboxResult({
                match: true,
                name: matchingChild.name,
                role: matchingChild.relationship || 'Child Account'
            });
            return;
        }

        // If length is 6, show no match
        if (sanitized.length === 6) {
            setSandboxResult({
                match: false,
                error: 'No matching user or parent PIN found'
            });
        } else {
            setSandboxResult(null);
        }
    };

    return (
        <div className="min-h-full p-4 sm:p-6 lg:p-8 flex flex-col items-center">
            {/* Header Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8"
            >
                <div className="inline-block p-4 rounded-full bg-white/30 dark:bg-white/5 mb-3 backdrop-blur-sm border border-white/20 shadow-md">
                    <img src={family.avatarUrl} alt="Family" className="w-12 h-12 rounded-full shadow-inner" />
                </div>
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                    The {family.name} Manager
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Control who can watch, who can share, and manage security settings</p>
            </motion.div>

            {/* Premium Tab Selection */}
            <div className="flex bg-white/40 dark:bg-gray-800/40 p-1.5 rounded-2xl border border-white/20 backdrop-blur-md mb-8 w-full max-w-md shadow-lg">
                <button
                    onClick={() => setActiveTab('members')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'members'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5'
                        }`}
                >
                    🌳 Tree
                </button>
                <button
                    onClick={() => setActiveTab('sharing')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'sharing'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5'
                        }`}
                >
                    🔄 Sharing Rules
                </button>
                <button
                    onClick={() => setActiveTab('sandbox')}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === 'sandbox'
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-white/20 dark:hover:bg-white/5'
                        }`}
                >
                    🔐 PIN Sandbox
                </button>
            </div>

            {/* Tab 1: Family Tree / Members list */}
            {activeTab === 'members' && (
                <div className="relative flex flex-col items-center w-full max-w-5xl">
                    {/* Parents Level */}
                    <div className="flex flex-wrap justify-center gap-8 mb-16 relative z-10">
                        {parents.map((parent, idx) => (
                            <FamilyNode 
                                key={parent.id} 
                                member={parent} 
                                isParent={true} 
                                delay={idx * 0.1} 
                                onClick={parent.id !== currentUser.id ? () => setSelectedMember(parent) : undefined}
                            />
                        ))}
                    </div>

                    {/* Vertical Connector Line (from parents down) */}
                    <div className="absolute top-[130px] w-0.5 h-16 bg-gradient-to-b from-purple-500 to-blue-400/50 opacity-50"></div>

                    {/* Horizontal Connector Line (across children) - Only if children exist */}
                    {children.length > 0 && (
                        <div className="absolute top-[194px] h-0.5 bg-blue-400/30 w-[80%] max-w-2xl rounded-full"></div>
                    )}

                    {/* Children Level */}
                    <div className="flex flex-wrap justify-center gap-8 pt-8 w-full relative z-10">
                        {children.map((child, idx) => (
                            <div key={child.id} className="relative group">
                                {/* Vertical Connector */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-blue-400/30 transition-colors group-hover:bg-indigo-400"></div>

                                <FamilyNode
                                    member={child}
                                    isParent={false}
                                    onClick={() => setSelectedMember(child)}
                                    delay={0.2 + (idx * 0.1)}
                                />
                            </div>
                        ))}

                        {/* Add Member Card */}
                        <div className="relative group">
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 border-l-2 border-dashed border-gray-300 dark:border-gray-700 opacity-50"></div>
                            <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowAddMemberModal(true)}
                                className="flex flex-col items-center justify-center w-[160px] h-[180px] rounded-3xl glass-panel border border-dashed border-gray-400 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group shadow-md"
                            >
                                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform shadow-sm">
                                    <UserPlusIcon className="w-6 h-6" />
                                </div>
                                <span className="font-bold text-gray-600 dark:text-gray-300 text-sm">Add Member</span>
                            </motion.button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Sharing Rules Permissions Matrix */}
            {activeTab === 'sharing' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl glass-panel p-6 rounded-3xl border border-white/20 shadow-xl"
                >
                    <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            🔄 Sharing Permission Grid
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Control which adults can share videos with which children. Senders will only be allowed to select enabled recipients.
                        </p>
                    </div>

                    {children.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            🚫 You need to add child members before you can set sharing permissions.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
                            <table className="w-full border-collapse text-left">
                                <thead className="bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 text-sm font-bold border-b border-gray-200 dark:border-gray-800">
                                    <tr>
                                        <th className="p-4">Sender (Adult)</th>
                                        <th className="p-4">Relationship</th>
                                        {children.map(child => (
                                            <th key={child.id} className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <img src={child.avatarUrl} alt={child.name} className="w-8 h-8 rounded-full border border-gray-200" />
                                                    <span className="text-xs truncate max-w-[80px]">{child.name}</span>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                    {parents.map(parent => {
                                        const isOwner = parent.id === family.ownerId;
                                        const allowedRecipients = family.sharingRules?.[parent.id] ?? children.map(c => c.id);

                                        return (
                                            <tr key={parent.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4 flex items-center gap-3">
                                                    <img src={parent.avatarUrl} alt={parent.name} className="w-10 h-10 rounded-xl object-cover border border-white/20" />
                                                    <div>
                                                        <span className="font-bold block text-gray-800 dark:text-white">{parent.name}</span>
                                                        <span className="text-[10px] text-gray-400">{parent.email}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                                                        {parent.relationship || (isOwner ? 'Creator' : 'Adult')}
                                                    </span>
                                                </td>
                                                {children.map(child => {
                                                    const isChecked = allowedRecipients.includes(child.id);
                                                    return (
                                                        <td key={child.id} className="p-4 text-center">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isOwner || isChecked}
                                                                    disabled={isOwner}
                                                                    onChange={() => handleSharingToggle(parent.id, child.id)}
                                                                    className={`w-5 h-5 rounded-md text-brand-500 focus:ring-brand-400 border-gray-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                    title={isOwner ? "Owner permissions cannot be restricted" : `Toggle sharing with ${child.name}`}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {/* Tab 3: PIN Verification Sandbox */}
            {activeTab === 'sandbox' && (
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-4xl grid md:grid-cols-2 gap-6"
                >
                    {/* Diagnostic Tool */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                                🔍 PIN Verification Sandbox
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                Enter a 4 to 6-digit login or parent bypass PIN to test who it belongs to in your family profile database.
                            </p>

                            <input
                                type="text"
                                value={sandboxPin}
                                onChange={e => handleSandboxPinChange(e.target.value)}
                                placeholder="Enter PIN code (e.g. 123456)"
                                className="w-full p-4 text-center text-3xl font-mono tracking-widest bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:outline-none transition-all text-gray-800 dark:text-white"
                            />
                        </div>

                        <div className="mt-6 min-h-[100px] flex items-center justify-center p-4 bg-brand-50/50 dark:bg-gray-800/30 rounded-2xl border border-brand-100/50 dark:border-gray-800">
                            {sandboxResult ? (
                                sandboxResult.match ? (
                                    <div className="text-center animate-fade-in">
                                        <div className="inline-block p-2 bg-green-100 text-green-700 rounded-full mb-2">
                                            <CheckIcon className="w-6 h-6" />
                                        </div>
                                        <h4 className="text-lg font-bold text-gray-800 dark:text-white">
                                            Matches: {sandboxResult.name}
                                        </h4>
                                        <p className="text-xs text-brand-600 dark:text-brand-300 font-semibold mt-1">
                                            {sandboxResult.role}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center animate-fade-in text-red-500">
                                        <span className="text-2xl mb-1 block">❌</span>
                                        <p className="font-bold">{sandboxResult.error}</p>
                                    </div>
                                )
                            ) : (
                                <p className="text-xs text-gray-400 text-center">
                                    Type a PIN to start live validation diagnostics
                                </p>
                            )}
                        </div>
                    </div>

                    {/* PIN Codes List */}
                    <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-2">
                            🔑 Child PIN Logs
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Active PIN codes for children and grandparents bypass keys.
                        </p>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {children.map(child => (
                                <div key={child.id} className="flex items-center justify-between p-3.5 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-gray-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <img src={child.avatarUrl} alt={child.name} className="w-10 h-10 rounded-xl object-cover" />
                                        <div>
                                            <span className="font-bold block text-gray-800 dark:text-white text-sm">{child.name}</span>
                                            <span className="text-[10px] text-gray-400 uppercase tracking-wide">{child.relationship || 'Child'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900 text-sm">
                                            {child.joinPin || 'No PIN'}
                                        </span>
                                        {child.joinPin && (
                                            <button
                                                onClick={() => handleCopyLink(child.joinPin!)}
                                                className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg text-gray-500 transition"
                                                title="Copy Login Link"
                                            >
                                                🔗
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Parent Bypass Info */}
                            <div className="p-3.5 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-between">
                                <div>
                                    <span className="font-bold block text-gray-800 dark:text-white text-sm">Parent Bypass PIN</span>
                                    <span className="text-[10px] text-gray-400">Restores parent access from children mode</span>
                                </div>
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-900 text-sm">
                                    {family.pin || '0000'}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* --- Dialogs --- */}

            {/* Member Management Details Modal */}
            <AnimatePresence>
                {selectedMember && (
                    <Modal onClose={() => setSelectedMember(null)} title={selectedMember.name}>
                        <div className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <img src={selectedMember.avatarUrl} alt={selectedMember.name} className="w-24 h-24 rounded-full shadow-lg border-4 border-white dark:border-gray-700" />
                            </div>

                            {/* Access & PIN for Children */}
                            {selectedMember.role === 'child' && (
                                <div className="glass-panel p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                        <KeyIcon className="w-4 h-4" /> Access
                                    </h4>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-3xl font-mono font-bold tracking-widest text-gray-800 dark:text-white">
                                            {selectedMember.joinPin}
                                        </div>
                                        <button
                                            onClick={() => selectedMember.joinPin && handleCopyLink(selectedMember.joinPin)}
                                            className="text-xs font-bold bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all text-indigo-600"
                                        >
                                            Copy Link 🔗
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={async () => {
                                                if (confirm("Generate a new PIN? The old one will stop working.")) {
                                                    await onResetPin(selectedMember.id);
                                                    setSelectedMember(null);
                                                }
                                            }}
                                            className="text-xs text-gray-500 hover:text-indigo-600 underline"
                                        >
                                            Reset PIN
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Access & Status for Adult Members */}
                            {selectedMember.role === 'parent' && (
                                <div className="glass-panel p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-sm">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2">
                                        Invited Co-Manager
                                    </h4>
                                    <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-800">
                                        <span className="text-gray-400">Email Address</span>
                                        <span className="font-bold text-gray-800 dark:text-white">{selectedMember.email}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 mt-2">
                                        <span className="text-gray-400">Status</span>
                                        <span className={`font-bold capitalize ${selectedMember.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                            {selectedMember.status}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        const newName = prompt("Enter new name:", selectedMember.name);
                                        if (newName && newName.trim()) {
                                            onEditMember(selectedMember.id, newName.trim());
                                            setSelectedMember(null);
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition-colors text-gray-800 dark:text-white"
                                >
                                    <EditIcon className="w-4 h-4" /> Rename
                                </button>

                                {selectedMember.role === 'child' ? (
                                    <button
                                        onClick={async () => {
                                            if (selectedMember.suspended) {
                                                await onUnsuspendChild(selectedMember.id);
                                            } else {
                                                if (confirm(`Block ${selectedMember.name} from logging in?`)) {
                                                    await onSuspendChild(selectedMember.id);
                                                }
                                            }
                                            setSelectedMember(null);
                                        }}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm transition-colors ${selectedMember.suspended
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                            }`}
                                    >
                                        {selectedMember.suspended ? <CheckIcon className="w-4 h-4" /> : <CloseIcon className="w-4 h-4" />}
                                        {selectedMember.suspended ? 'Unblock' : 'Suspend'}
                                    </button>
                                ) : (
                                    <div className="flex items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-gray-400 font-semibold text-xs border border-gray-150 dark:border-gray-800 text-center">
                                        Adult Account
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${selectedMember.name}? This cannot be undone.`)) {
                                        onRemoveMember(selectedMember.id);
                                        setSelectedMember(null);
                                    }
                                }}
                                className="w-full p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" /> Remove from Family
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Add Member Modal */}
                {showAddMemberModal && (
                    <Modal onClose={() => setShowAddMemberModal(false)} title="New Family Member">
                        <div className="pt-2 space-y-4">
                            {/* Role Select Button Group */}
                            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewMemberRole('child');
                                        if (newMemberRelationship === 'Parent') setNewMemberRelationship('Child');
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${newMemberRole === 'child'
                                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    👶 Child (PIN Login)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setNewMemberRole('parent');
                                        if (newMemberRelationship === 'Child') setNewMemberRelationship('Parent');
                                    }}
                                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${newMemberRole === 'parent'
                                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-800'
                                        }`}
                                >
                                    🧑 Adult (Email Invite)
                                </button>
                            </div>

                            {/* Name Input */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Display Name</label>
                                <input
                                    type="text"
                                    value={newMemberName}
                                    onChange={e => setNewMemberName(e.target.value)}
                                    placeholder="Name (e.g. Timmy, Grandma Joe)"
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-transparent focus:border-brand-500 focus:outline-none transition-all text-sm font-semibold text-gray-800 dark:text-white"
                                    autoFocus
                                />
                            </div>

                            {/* Email Input (Adult role only) */}
                            {newMemberRole === 'parent' && (
                                <div className="animate-fade-in">
                                    <label className="text-xs font-bold text-gray-400 block mb-1">Email Address</label>
                                    <input
                                        type="email"
                                        value={newMemberEmail}
                                        onChange={e => setNewMemberEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-transparent focus:border-brand-500 focus:outline-none transition-all text-sm font-semibold text-gray-800 dark:text-white"
                                    />
                                </div>
                            )}

                            {/* Relationship Picker */}
                            <div>
                                <label className="text-xs font-bold text-gray-400 block mb-1">Relationship Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={newMemberRelationship}
                                        onChange={e => setNewMemberRelationship(e.target.value)}
                                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-transparent focus:outline-none text-sm text-gray-800 dark:text-white font-semibold"
                                    >
                                        {newMemberRole === 'child' ? (
                                            <>
                                                <option value="Child">Child</option>
                                                <option value="Sibling">Sibling</option>
                                                <option value="Cousin">Cousin</option>
                                                <option value="Friend">Friend</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Parent">Parent</option>
                                                <option value="Mom">Mom</option>
                                                <option value="Dad">Dad</option>
                                                <option value="Grandpa">Grandpa</option>
                                                <option value="Grandma">Grandma</option>
                                                <option value="Uncle">Uncle</option>
                                                <option value="Aunt">Aunt</option>
                                                <option value="Nanny">Nanny</option>
                                            </>
                                        )}
                                        <option value="Custom">Custom...</option>
                                    </select>

                                    {newMemberRelationship === 'Custom' || !['Child', 'Sibling', 'Cous', 'Friend', 'Parent', 'Mom', 'Dad', 'Grandpa', 'Grandma', 'Uncle', 'Aunt', 'Nanny'].some(r => newMemberRelationship.startsWith(r)) ? (
                                        <input
                                            type="text"
                                            placeholder="Write title..."
                                            value={newMemberRelationship === 'Custom' ? '' : newMemberRelationship}
                                            onChange={e => setNewMemberRelationship(e.target.value)}
                                            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-transparent focus:border-brand-500 focus:outline-none transition-all text-sm font-semibold text-gray-800 dark:text-white"
                                        />
                                    ) : (
                                        <div className="bg-gray-100 dark:bg-gray-800/30 border border-gray-150 dark:border-gray-800 rounded-xl flex items-center justify-center text-xs text-gray-400">
                                            Preset selected
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="button"
                                onClick={handleAddMemberSubmit}
                                disabled={!newMemberName.trim() || (newMemberRole === 'parent' && !newMemberEmail.trim())}
                                className="w-full py-4 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/20 transition-all disabled:opacity-50 disabled:shadow-none mt-2"
                            >
                                {newMemberRole === 'child' ? 'Create PIN Account' : 'Send Invitation Invite'}
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Success Child Account Creation Modal */}
                {newlyAddedChild && (
                    <Modal onClose={() => setNewlyAddedChild(null)} title="Welcome to the Family!">
                        <div className="text-center py-4">
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <CheckIcon className="w-8 h-8" />
                            </motion.div>

                            <p className="text-gray-600 dark:text-gray-300 mb-6">
                                <span className="font-bold text-gray-900 dark:text-white text-lg">{newlyAddedChild.name}</span> (Relationship: {newlyAddedChild.relationship}) has been added!
                            </p>

                            <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl mb-6 relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                                <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Their Login PIN</p>
                                <p className="text-4xl font-mono font-bold tracking-[.2em] text-indigo-600 dark:text-indigo-400 select-all">
                                    {newlyAddedChild.joinPin}
                                </p>
                            </div>

                            <button
                                onClick={() => newlyAddedChild.joinPin && handleCopyLink(newlyAddedChild.joinPin)}
                                className="w-full py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl mb-3 hover:bg-indigo-100 transition-colors"
                            >
                                Copy Login Link 🔗
                            </button>

                            <button
                                onClick={() => setNewlyAddedChild(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Success Adult Invitation Modal */}
                {newlyInvitedAdult && (
                    <Modal onClose={() => setNewlyInvitedAdult(null)} title="Invitation Ready! 💌">
                        <div className="text-center py-4">
                            <motion.div
                                initial={{ scale: 0 }} animate={{ scale: 1 }}
                                className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-full flex items-center justify-center mx-auto mb-4"
                            >
                                <CheckIcon className="w-8 h-8" />
                            </motion.div>

                            <p className="text-gray-700 dark:text-gray-200 mb-2 font-medium">
                                <span className="font-bold text-gray-900 dark:text-white text-lg">{newlyInvitedAdult.name}</span> ({newlyInvitedAdult.relationship || 'Family Member'}) has been invited!
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
                                When they log in with <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">{newlyInvitedAdult.email}</span>, they will automatically join the <span className="font-semibold">{family.name}</span> tree.
                            </p>

                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl mb-4 text-left border border-gray-200 dark:border-gray-700">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Direct Magic Invite Link</p>
                                <p className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all select-all bg-white dark:bg-black/40 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {`${window.location.origin}/?invite=${family.id}&email=${encodeURIComponent(newlyInvitedAdult.email || '')}`}
                                </p>
                            </div>

                            <div className="flex flex-col gap-2.5 mb-4">
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/?invite=${family.id}&email=${encodeURIComponent(newlyInvitedAdult.email || '')}`;
                                        navigator.clipboard.writeText(url);
                                        alert("Invite link copied to clipboard! 📋 Send it via WhatsApp, Messages, or Email.");
                                    }}
                                    className="w-full py-3 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/25 transition"
                                >
                                    📋 Copy Invite Link
                                </button>

                                <a
                                    href={`mailto:${newlyInvitedAdult.email}?subject=${encodeURIComponent(`Join ${family.name} on HAEVN`)}&body=${encodeURIComponent(`Hi ${newlyInvitedAdult.name},\n\nYou have been invited to join the ${family.name} family on HAEVN as ${newlyInvitedAdult.relationship || 'a family member'}!\n\nClick the link below to accept and start sharing videos with the kids:\n${window.location.origin}/?invite=${family.id}&email=${encodeURIComponent(newlyInvitedAdult.email || '')}\n\nWith love,\n${currentUser.name}`)}`}
                                    className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-2"
                                >
                                    ✉️ Send Invitation Email
                                </a>
                            </div>

                            <button
                                onClick={() => setNewlyInvitedAdult(null)}
                                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                            >
                                Done
                            </button>
                        </div>
                    </Modal>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FamilyView;
