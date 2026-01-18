import React, { useState } from 'react';
import { registerWithEmail, validatePassword } from '../services/firebase';
import { HaevnLogo, CloseIcon } from './icons';

interface RegisterViewProps {
    onSuccess: () => void;
    onBackToLogin: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onSuccess, onBackToLogin }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate inputs
        if (!name.trim()) {
            setError('Please enter your name.');
            return;
        }

        if (!email.trim()) {
            setError('Please enter your email address.');
            return;
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.error || 'Invalid password.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await registerWithEmail(email, password, name.trim());
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen login-background overflow-hidden">
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8">
                    <div className="flex items-center justify-center mb-6">
                        <HaevnLogo className="w-32 h-auto" />
                    </div>

                    <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-2">
                        Create Account
                    </h2>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        Register as a parent to manage your family
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Your Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., John Smith"
                                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your password"
                                className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                                disabled={isLoading}
                            />
                        </div>

                        {error && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Creating Account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <button
                            onClick={onBackToLogin}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-sm"
                        >
                            Already have an account? Sign in
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterView;
