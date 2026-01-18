import React, { useState, useEffect } from 'react';
import { HaevnLogo } from './icons';
import { User } from '../types';

interface ChildLoginViewProps {
    onLoginSuccess: (childUser: User, familyId: string) => void;
    onBackToParentLogin: () => void;
    verifyPin: (pin: string) => Promise<{ user: User; familyId: string } | null>;
}

const ChildLoginView: React.FC<ChildLoginViewProps> = ({ onLoginSuccess, onBackToParentLogin, verifyPin }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [shake, setShake] = useState(false);

    const handleDigitClick = (digit: string) => {
        if (pin.length < 6) {
            setPin(prev => prev + digit);
            setError('');
        }
    };

    const handleBackspace = () => {
        setPin(prev => prev.slice(0, -1));
        setError('');
    };

    const handleClear = () => {
        setPin('');
        setError('');
    };

    // Auto-verify when PIN reaches 6 digits
    useEffect(() => {
        if (pin.length === 6) {
            handleVerify();
        }
    }, [pin]);

    const handleVerify = async () => {
        if (pin.length !== 6) {
            setError('Please enter your 6-digit PIN');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await verifyPin(pin);
            if (result) {
                onLoginSuccess(result.user, result.familyId);
            } else {
                setShake(true);
                setTimeout(() => setShake(false), 500);
                setError('Invalid PIN. Please try again.');
                setPin('');
            }
        } catch (err) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            setError('Something went wrong. Please try again.');
            setPin('');
        } finally {
            setIsLoading(false);
        }
    };

    const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''];

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 overflow-hidden">
            <main className="flex-1 flex flex-col items-center justify-center p-4">
                <div className={`w-full max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg rounded-3xl shadow-2xl p-8 transition-all ${shake ? 'animate-shake' : ''}`}>

                    {/* Fun Header */}
                    <div className="text-center mb-6">
                        <div className="text-6xl mb-2">🌟</div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Hi there, kiddo!
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Enter your secret PIN to start watching!
                        </p>
                    </div>

                    {/* PIN Display */}
                    <div className="flex justify-center space-x-3 mb-6">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                            <div
                                key={i}
                                className={`w-10 h-12 flex items-center justify-center rounded-xl text-2xl font-bold transition-all
                                    ${pin.length > i
                                        ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white scale-110'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-300'
                                    }`}
                            >
                                {pin.length > i ? '●' : ''}
                            </div>
                        ))}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <div className="mb-4 flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-b-4 border-purple-500"></div>
                        </div>
                    )}

                    {/* Number Pad */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        {digits.map((digit, index) => (
                            digit !== '' ? (
                                <button
                                    key={index}
                                    onClick={() => handleDigitClick(digit)}
                                    disabled={isLoading}
                                    className="h-16 text-3xl font-bold bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-gray-700 dark:to-gray-600 text-gray-800 dark:text-white rounded-2xl hover:scale-105 hover:shadow-lg active:scale-95 transition-all duration-150 disabled:opacity-50"
                                >
                                    {digit}
                                </button>
                            ) : (
                                <div key={index}></div>
                            )
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3">
                        <button
                            onClick={handleClear}
                            disabled={isLoading || pin.length === 0}
                            className="flex-1 py-3 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleBackspace}
                            disabled={isLoading || pin.length === 0}
                            className="flex-1 py-3 text-sm font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all disabled:opacity-50"
                        >
                            ← Back
                        </button>
                    </div>
                </div>

                {/* Back to Parent Login */}
                <button
                    onClick={onBackToParentLogin}
                    className="mt-6 px-6 py-2 text-white/90 font-medium hover:text-white transition-all flex items-center space-x-2"
                >
                    <span>← I'm a parent</span>
                </button>
            </main>

            {/* Fun decorations */}
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default ChildLoginView;
