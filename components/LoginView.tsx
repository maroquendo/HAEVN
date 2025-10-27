import React, { useState } from 'react';
import { Family } from '../types';
import { MOCK_FAMILIES } from '../constants';
import { CloseIcon, GoogleIcon, HaevnLogo } from './icons';

interface LoginViewProps {
  onFamilySelect: (family: Family) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onFamilySelect }) => {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen login-background overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs text-center p-6 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 shadow-lg">
          <div className="flex items-center justify-center mb-4 text-white">
            <HaevnLogo className="w-full h-auto drop-shadow-lg" />
          </div>
          <p className="text-md sm:text-lg text-white font-medium drop-shadow-md">
            A safe place to see the world.
          </p>
        </div>
      </main>

      <footer className="w-full max-w-xs mx-auto p-4 pt-0">
        <button
          onClick={() => setIsPickerOpen(true)}
          className="flex items-center justify-center w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 border border-gray-200 dark:border-gray-700"
          title="Simulate signing in"
        >
          <GoogleIcon className="w-6 h-6 mr-4" />
          Sign In with Google
        </button>
      </footer>

      {isPickerOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative">
            <button onClick={() => setIsPickerOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white transition" aria-label="Close form" title="Close account selection">
                <CloseIcon />
            </button>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">Choose an account</h2>
            <p className="text-center text-gray-500 dark:text-gray-400 mb-6 -mt-4 text-sm">(This is a simulation)</p>
            <div className="space-y-3">
              {MOCK_FAMILIES.map(family => (
                <button
                  key={family.id}
                  onClick={() => onFamilySelect(family)}
                  className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                  title={`Sign in as ${family.name}`}
                >
                  <img src={family.avatarUrl} alt={family.name} className="w-10 h-10 rounded-full mr-4" />
                  <span className="font-semibold text-gray-800 dark:text-gray-200">{family.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginView;