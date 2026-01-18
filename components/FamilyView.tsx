import React, { useState } from 'react';
import { Family, User } from '../types';
import { UserPlusIcon, EditIcon, KeyIcon, TrashIcon, CloseIcon, CheckIcon, UserIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface FamilyViewProps {
    family: Family;
    currentUser: User;
    onAddMember: (name: string, role: 'child' | 'parent', email?: string) => User | null;
    onEditMember: (userId: string, newName: string) => void;
    onRemoveMember: (userId: string) => void;
    onResetPin: (childId: string) => Promise<string>;
    onSuspendChild: (childId: string) => Promise<void>;
    onUnsuspendChild: (childId: string) => Promise<void>;
}

// --- Modal Component ---
const Modal: React.FC<{ children: React.ReactNode; onClose: () => void; title: string }> = ({ children, onClose, title }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex justify-center items-center p-4">
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl ring-1 ring-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden"
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
                    NEW
                </div>
            )}
        </div>

        <h4 className="text-lg font-bold tracking-tight">{member.name}</h4>
        <p className={`text-xs uppercase tracking-wider font-semibold opacity-70 mt-1`}>
            {isParent ? 'Head of Household' : 'Child Account'}
        </p>

        {!isParent && (
            <div className="mt-3 flex gap-2 w-full justify-center">
                <span className="text-xs font-mono bg-black/5 dark:bg-white/10 px-2 py-1 rounded-md">
                    Tap to Edit
                </span>
            </div>
        )}
    </motion.div>
);

const FamilyView: React.FC<FamilyViewProps> = ({
    family, currentUser, onAddMember, onEditMember, onRemoveMember, onResetPin, onSuspendChild, onUnsuspendChild
}) => {
    const [selectedChild, setSelectedChild] = useState<User | null>(null);
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newlyAddedChild, setNewlyAddedChild] = useState<User | null>(null);

    const parents = family.members.filter(m => m.role === 'parent');
    const children = family.members.filter(m => m.role === 'child');

    const handleAddChild = () => {
        if (newMemberName.trim()) {
            const newMember = onAddMember(newMemberName.trim(), 'child');
            if (newMember) {
                setNewlyAddedChild(newMember);
            }
            setNewMemberName('');
            setShowAddChildModal(false);
        }
    };

    const handleCopyLink = (pin: string) => {
        const url = `${window.location.origin}?child_pin=${pin}`;
        navigator.clipboard.writeText(url);
        alert("Magic link copied to clipboard! 🪄");
    };

    return (
        <div className="min-h-full p-8 flex flex-col items-center">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="inline-block p-4 rounded-full bg-white/30 dark:bg-white/5 mb-4 backdrop-blur-sm border border-white/20">
                    <img src={family.avatarUrl} alt="Family" className="w-12 h-12 rounded-full" />
                </div>
                <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                    The {family.name} Family
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Manage your family tree and access controls</p>
            </motion.div>

            {/* Tree Structure */}
            <div className="relative flex flex-col items-center w-full max-w-5xl">

                {/* Parents Level */}
                <div className="flex justify-center gap-8 mb-16 relative z-10">
                    {parents.map((parent, idx) => (
                        <FamilyNode key={parent.id} member={parent} isParent={true} delay={idx * 0.1} />
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
                            {/* Vertical Connector (up to horizontal line) */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-blue-400/30 transition-colors group-hover:bg-indigo-400"></div>

                            <FamilyNode
                                member={child}
                                isParent={false}
                                onClick={() => setSelectedChild(child)}
                                delay={0.2 + (idx * 0.1)}
                            />
                        </div>
                    ))}

                    {/* Add Child Node */}
                    <div className="relative group">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-0.5 h-8 bg-dashed bg-gray-300 dark:bg-gray-700 w-0.5 border-l-2 border-dashed border-gray-300 dark:border-gray-700 opacity-50"></div>
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowAddChildModal(true)}
                            className="flex flex-col items-center justify-center w-[160px] h-[180px] rounded-3xl glass-panel border border-dashed border-gray-400 dark:border-gray-600 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
                                <UserPlusIcon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-600 dark:text-gray-300">Add Child</span>
                        </motion.button>
                    </div>
                </div>
            </div>

            {/* --- Dialogs --- */}

            {/* Child Details Modal */}
            <AnimatePresence>
                {selectedChild && (
                    <Modal onClose={() => setSelectedChild(null)} title={selectedChild.name}>
                        <div className="space-y-6">
                            <div className="flex justify-center mb-6">
                                <img src={selectedChild.avatarUrl} className="w-24 h-24 rounded-full shadow-lg border-4 border-white dark:border-gray-700" />
                            </div>

                            {/* Access & PIN */}
                            <div className="glass-panel p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-2">
                                    <KeyIcon className="w-4 h-4" /> Access
                                </h4>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-3xl font-mono font-bold tracking-widest text-gray-800 dark:text-white">
                                        {selectedChild.joinPin}
                                    </div>
                                    <button
                                        onClick={() => selectedChild.joinPin && handleCopyLink(selectedChild.joinPin)}
                                        className="text-xs font-bold bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all text-indigo-600"
                                    >
                                        Copy Link 🔗
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            if (confirm("Generate a new PIN? The old one will stop working.")) {
                                                await onResetPin(selectedChild.id);
                                                // Close to refresh or figure out way to update local state (parent updates usually trigger re-render)
                                                setSelectedChild(null);
                                            }
                                        }}
                                        className="text-xs text-gray-500 hover:text-indigo-600 underline"
                                    >
                                        Reset PIN
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => {
                                        const newName = prompt("Enter new name:", selectedChild.name);
                                        if (newName && newName.trim()) {
                                            onEditMember(selectedChild.id, newName.trim());
                                            setSelectedChild(null);
                                        }
                                    }}
                                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 font-semibold text-sm transition-colors"
                                >
                                    <EditIcon className="w-4 h-4" /> Rename
                                </button>

                                <button
                                    onClick={async () => {
                                        if (selectedChild.suspended) {
                                            await onUnsuspendChild(selectedChild.id);
                                        } else {
                                            if (confirm(`Block ${selectedChild.name} from logging in?`)) {
                                                await onSuspendChild(selectedChild.id);
                                            }
                                        }
                                        setSelectedChild(null);
                                    }}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm transition-colors ${selectedChild.suspended
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                        }`}
                                >
                                    {selectedChild.suspended ? <CheckIcon className="w-4 h-4" /> : <CloseIcon className="w-4 h-4" />}
                                    {selectedChild.suspended ? 'Unblock' : 'Suspend'}
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    if (confirm(`Are you sure you want to remove ${selectedChild.name}? This cannot be undone.`)) {
                                        onRemoveMember(selectedChild.id);
                                        setSelectedChild(null);
                                    }
                                }}
                                className="w-full p-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <TrashIcon className="w-4 h-4" /> Remove Child
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Add Child Input Modal */}
                {showAddChildModal && (
                    <Modal onClose={() => setShowAddChildModal(false)} title="New Family Member">
                        <div className="pt-2">
                            <div className="mb-6 text-center">
                                <div className="w-20 h-20 bg-indigo-100 dark:bg-gray-800 rounded-full mx-auto flex items-center justify-center mb-3">
                                    <UserIcon className="w-10 h-10 text-indigo-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Create a safe space for your little one.</p>
                            </div>

                            <input
                                type="text"
                                value={newMemberName}
                                onChange={e => setNewMemberName(e.target.value)}
                                placeholder="Child's Name"
                                className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition-all text-lg mb-4 text-center font-bold"
                                autoFocus
                            />

                            <button
                                onClick={handleAddChild}
                                disabled={!newMemberName.trim()}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                Create Account
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Success Modal */}
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
                                <span className="font-bold text-gray-900 dark:text-white text-lg">{newlyAddedChild.name}</span> has been added!
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
            </AnimatePresence>
        </div>
    );
};

export default FamilyView;
