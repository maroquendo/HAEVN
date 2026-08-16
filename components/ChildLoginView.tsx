import React, { useState, useEffect } from 'react';
import { HaevnLogo } from './icons';
import { User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

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
        if (pin.length < 6 && !isLoading && !isLocked) {
            setPin(prev => prev + digit);
            setError('');
        }
    };

    const handleBackspace = () => {
        if (!isLoading && !isLocked) {
            setPin(prev => prev.slice(0, -1));
            setError('');
        }
    };

    const handleClear = () => {
        if (!isLoading && !isLocked) {
            setPin('');
            setError('');
        }
    };

    // Auto-verify when PIN reaches 6 digits
    useEffect(() => {
        if (pin.length === 6) {
            handleVerify();
        }
    }, [pin]);

    // Rate limiting state
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutTimer, setLockoutTimer] = useState(0);

    useEffect(() => {
        const lockoutEnd = localStorage.getItem('haevn_lockout_end');
        if (lockoutEnd) {
            const timeLeft = Math.ceil((parseInt(lockoutEnd) - Date.now()) / 1000);
            if (timeLeft > 0) {
                setIsLocked(true);
                setLockoutTimer(timeLeft);
            } else {
                localStorage.removeItem('haevn_lockout_end');
                localStorage.removeItem('haevn_failed_attempts');
            }
        }
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isLocked && lockoutTimer > 0) {
            interval = setInterval(() => {
                setLockoutTimer((prev) => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        localStorage.removeItem('haevn_lockout_end');
                        localStorage.removeItem('haevn_failed_attempts');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isLocked, lockoutTimer]);

    const handleVerify = async () => {
        if (isLocked) return;

        if (pin.length !== 6) {
            setError('Please enter your 6-digit PIN');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const result = await verifyPin(pin);
            if (result) {
                localStorage.removeItem('haevn_failed_attempts');
                localStorage.removeItem('haevn_lockout_end');
                onLoginSuccess(result.user, result.familyId);
            } else {
                const attempts = parseInt(localStorage.getItem('haevn_failed_attempts') || '0') + 1;
                localStorage.setItem('haevn_failed_attempts', attempts.toString());

                setShake(true);
                setTimeout(() => setShake(false), 500);

                if (attempts >= 5) {
                    const lockoutDuration = 5 * 60;
                    const lockoutEnd = Date.now() + (lockoutDuration * 1000);
                    localStorage.setItem('haevn_lockout_end', lockoutEnd.toString());
                    setIsLocked(true);
                    setLockoutTimer(lockoutDuration);
                    setError('Too many failed attempts. Try again in 5 minutes.');
                } else {
                    setError(`Invalid PIN. ${5 - attempts} attempts remaining.`);
                }
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
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 overflow-y-auto p-4 flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`w-full max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/20 relative ${shake ? 'animate-shake' : ''}`}
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-5xl mb-2 select-none animate-bounce">🌟</div>
                    <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight">
                        Hi there!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-1">
                        Enter your 6-digit PIN to watch your videos!
                    </p>
                </div>

                {/* PIN Display Dots */}
                <div className="flex justify-center space-x-2.5 mb-6">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            animate={pin.length > i ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            className={`w-9 h-11 sm:w-10 sm:h-12 flex items-center justify-center rounded-2xl text-xl font-bold transition-all shadow-inner
                                ${pin.length > i
                                    ? 'bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-brand-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            {pin.length > i ? '●' : ''}
                        </motion.div>
                    ))}
                </div>

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl text-xs text-center font-bold border border-rose-200 dark:border-rose-900/50"
                        >
                            {error}
                            {isLocked && (
                                <div className="text-base font-extrabold mt-1 font-mono">
                                    {Math.floor(lockoutTimer / 60)}:{(lockoutTimer % 60).toString().padStart(2, '0')}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Loading Spinner */}
                {isLoading && (
                    <div className="mb-4 flex justify-center">
                        <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-brand-500"></div>
                    </div>
                )}

                {/* Keypad */}
                <div className={`grid grid-cols-3 gap-2.5 mb-4 ${isLocked ? 'opacity-40 pointer-events-none' : ''}`}>
                    {digits.map((digit, index) => (
                        digit !== '' ? (
                            <button
                                key={index}
                                onClick={() => handleDigitClick(digit)}
                                disabled={isLoading || isLocked}
                                className="h-14 sm:h-16 text-2xl sm:text-3xl font-extrabold bg-gray-50 hover:bg-brand-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white rounded-2xl shadow-sm hover:shadow-md active:scale-90 transition-all duration-150 border border-gray-200/60 dark:border-gray-700/60"
                            >
                                {digit}
                            </button>
                        ) : (
                            <div key={index}></div>
                        )
                    ))}
                </div>

                {/* Clear / Back Controls */}
                <div className="flex space-x-2.5">
                    <button
                        onClick={handleClear}
                        disabled={isLoading || isLocked || pin.length === 0}
                        className="flex-1 py-3 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-40"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleBackspace}
                        disabled={isLoading || isLocked || pin.length === 0}
                        className="flex-1 py-3 text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-all disabled:opacity-40"
                    >
                        ← Delete
                    </button>
                </div>
            </motion.div>

            {/* Switch to Parent Login */}
            <button
                onClick={onBackToParentLogin}
                className="mt-5 px-5 py-2 text-white/90 font-semibold text-sm hover:text-white transition-all flex items-center gap-1.5 hover:underline"
            >
                <span>🔒</span>
                <span>Switch to Parent Login</span>
            </button>

            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
                    20%, 40%, 60%, 80% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.45s cubic-bezier(.36,.07,.19,.97) both;
                }
            `}</style>
        </div>
    );
};

export default ChildLoginView;
