import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloseIcon } from './icons';

interface ParentPinModalProps {
    mode: 'setup' | 'verify' | 'change';
    onSuccess: (pin: string) => Promise<boolean | void> | boolean | void;
    onCancel: () => void;
    title?: string;
}

const ParentPinModal: React.FC<ParentPinModalProps> = ({ mode, onSuccess, onCancel, title }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [step, setStep] = useState<'enter' | 'confirm'>(mode === 'verify' ? 'enter' : 'enter');

    const getTitle = () => {
        if (title) return title;
        switch (mode) {
            case 'setup': return 'Set Your Parent PIN';
            case 'verify': return 'Enter Parent PIN';
            case 'change': return 'Change Parent PIN';
        }
    };

    const getSubtitle = () => {
        switch (mode) {
            case 'setup': return 'This PIN protects parent-only features';
            case 'verify': return 'Enter your 4-digit PIN to continue';
            case 'change': return step === 'enter' ? 'Enter your new PIN' : 'Confirm your new PIN';
        }
    };

    const handleDigitClick = (digit: string) => {
        if (isVerifying) return;
        if (step === 'confirm') {
            if (confirmPin.length < 4) {
                setConfirmPin(prev => prev + digit);
                setError('');
            }
        } else {
            if (pin.length < 4) {
                setPin(prev => prev + digit);
                setError('');
            }
        }
    };

    const handleBackspace = () => {
        if (isVerifying) return;
        if (step === 'confirm') {
            setConfirmPin(prev => prev.slice(0, -1));
        } else {
            setPin(prev => prev.slice(0, -1));
        }
        setError('');
    };

    const handleClear = () => {
        if (isVerifying) return;
        if (step === 'confirm') {
            setConfirmPin('');
        } else {
            setPin('');
        }
        setError('');
    };

    // Auto-submit when PIN reaches 4 digits
    useEffect(() => {
        let isCancelled = false;
        const checkAutoSubmit = async () => {
            if (mode === 'verify' && pin.length === 4 && !isVerifying) {
                setIsVerifying(true);
                try {
                    const result = await onSuccess(pin);
                    if (result === false && !isCancelled) {
                        setError('Incorrect PIN. Please try again.');
                        setPin('');
                    }
                } catch (e) {
                    if (!isCancelled) {
                        setError('Verification failed. Try again.');
                        setPin('');
                    }
                } finally {
                    if (!isCancelled) setIsVerifying(false);
                }
            } else if ((mode === 'setup' || mode === 'change') && step === 'enter' && pin.length === 4) {
                setStep('confirm');
            } else if ((mode === 'setup' || mode === 'change') && step === 'confirm' && confirmPin.length === 4 && !isVerifying) {
                if (pin === confirmPin) {
                    setIsVerifying(true);
                    try {
                        await onSuccess(pin);
                    } finally {
                        if (!isCancelled) setIsVerifying(false);
                    }
                } else {
                    setError('PINs do not match. Try again.');
                    setConfirmPin('');
                }
            }
        };
        checkAutoSubmit();
        return () => { isCancelled = true; };
    }, [pin, confirmPin, mode, step, onSuccess]);

    const currentPin = step === 'confirm' ? confirmPin : pin;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm p-6 relative"
            >
                {mode !== 'setup' && (
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close"
                    >
                        <CloseIcon />
                    </button>
                )}

                <div className="text-center mb-6">
                    <div className="text-4xl mb-2">🔐</div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{getTitle()}</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{getSubtitle()}</p>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center space-x-4 mb-6">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className={`w-12 h-14 flex items-center justify-center rounded-xl text-2xl font-bold transition-all
                                ${currentPin.length > i
                                    ? 'bg-indigo-500 text-white scale-105'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-300'
                                }`}
                        >
                            {currentPin.length > i ? '●' : ''}
                        </div>
                    ))}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', ''].map((digit, index) => (
                        digit !== '' ? (
                            <button
                                key={index}
                                onClick={() => handleDigitClick(digit)}
                                className="h-14 text-2xl font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-95 transition-all"
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
                        disabled={currentPin.length === 0}
                        className="flex-1 py-3 text-sm font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                    >
                        Clear
                    </button>
                    <button
                        onClick={handleBackspace}
                        disabled={currentPin.length === 0}
                        className="flex-1 py-3 text-sm font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-all disabled:opacity-50"
                    >
                        ← Back
                    </button>
                </div>

                {mode === 'setup' && (
                    <p className="text-xs text-gray-400 text-center mt-4">
                        You'll need this PIN to access parent features
                    </p>
                )}
            </motion.div>
        </div>
    );
};

export default ParentPinModal;
