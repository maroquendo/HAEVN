import React, { useState } from 'react';
import { signInWithEmail, sendPasswordReset, signInWithGoogle } from '../services/firebase';
import { HaevnLogo, GoogleIcon } from './icons';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onRegister: () => void;
  onChildLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, onRegister, onChildLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmail(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await signInWithGoogle();
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Google login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await sendPasswordReset(email);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen login-background overflow-hidden">
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl p-8">
          <div className="flex items-center justify-center mb-6">
            <HaevnLogo className="w-40 h-auto" />
          </div>

          <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
            A safe place to see the world.
          </p>

          {!showForgotPassword ? (
            <>
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-2 border-transparent focus:border-indigo-500 focus:outline-none transition text-gray-800 dark:text-gray-200"
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl text-sm">
                    {successMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-indigo-500/30 flex items-center justify-center"
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all border border-gray-200 dark:border-gray-600"
              >
                <GoogleIcon className="w-5 h-5 mr-3" />
                Continue with Google
              </button>

              <div className="mt-6 text-center space-y-2">
                <button
                  onClick={onRegister}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-sm"
                >
                  Create a new account
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-4">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
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
                className="w-full p-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>

              <button
                type="button"
                onClick={() => { setShowForgotPassword(false); setError(''); }}
                className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
              >
                ← Back to login
              </button>
            </form>
          )}
        </div>

        {/* Child Login Button */}
        <button
          onClick={onChildLogin}
          className="mt-6 px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2"
        >
          <span className="text-2xl">👦</span>
          <span>I'm a Child</span>
        </button>
      </main>
    </div>
  );
};

export default LoginView;