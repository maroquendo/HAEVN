import React, { useState } from 'react';
import { Subscription } from '../types';
import { CloseIcon } from './icons';

interface AddSubscriptionFormProps {
  onAddSubscription: (subscription: Subscription) => void;
  onClose: () => void;
}

const AddSubscriptionForm: React.FC<AddSubscriptionFormProps> = ({ onAddSubscription, onClose }) => {
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !avatarUrl.trim() || !description.trim()) {
      setError('Please fill out all fields.');
      return;
    }

    try {
        new URL(avatarUrl);
    } catch (_) {
        setError('Please enter a valid URL for the avatar.');
        return;
    }

    const newSubscription: Subscription = {
      id: `sub_${Date.now().toString()}`,
      name,
      avatarUrl,
      description,
    };
    onAddSubscription(newSubscription);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 animate-fade-in">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" aria-label="Close form" title="Close form">
                <CloseIcon />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Add New Subscription</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="text"
                    placeholder="Channel Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                />
                <input
                    type="text"
                    placeholder="Channel Avatar URL"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                />
                <textarea
                    placeholder="Short description of the channel..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:border-indigo-500 focus:outline-none transition h-24 resize-none text-gray-800 dark:text-gray-200"
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                    type="submit"
                    className="w-full p-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center"
                    title="Add new subscription"
                >
                    Add Subscription
                </button>
            </form>
        </div>
    </div>
  );
};

export default AddSubscriptionForm;