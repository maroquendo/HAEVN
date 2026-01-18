import { initializeApp } from 'firebase/app';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    User as FirebaseUser
} from 'firebase/auth';
import { User } from '../types';

const firebaseConfig = {
    apiKey: "AIzaSyBq6d2XV4gjy-3KuhPgSdsSsVabmGMxwIU",
    authDomain: "gen-lang-client-0636949609.firebaseapp.com",
    projectId: "gen-lang-client-0636949609",
    storageBucket: "gen-lang-client-0636949609.firebasestorage.app",
    messagingSenderId: "525364614633",
    appId: "1:525364614633:web:0951be67bb82294e89e778",
    measurementId: "G-HMS4C6BQ2J"
};

import { getFirestore } from 'firebase/firestore';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ==================== GOOGLE AUTH ====================

export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

// ==================== EMAIL/PASSWORD AUTH ====================

/**
 * Register a new parent account with email and password
 */
export const registerWithEmail = async (email: string, password: string, displayName: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Update the user's display name
        await updateProfile(result.user, {
            displayName: displayName,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=6366f1&color=fff`
        });

        return result.user;
    } catch (error: any) {
        console.error("Error registering with email", error);
        // Provide user-friendly error messages
        if (error.code === 'auth/email-already-in-use') {
            throw new Error('This email is already registered. Please sign in instead.');
        } else if (error.code === 'auth/weak-password') {
            throw new Error('Password is too weak. Please use at least 8 characters.');
        } else if (error.code === 'auth/invalid-email') {
            throw new Error('Please enter a valid email address.');
        }
        throw error;
    }
};

/**
 * Sign in with email and password
 */
export const signInWithEmail = async (email: string, password: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error: any) {
        console.error("Error signing in with email", error);
        // Provide user-friendly error messages
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password. Please try again.');
        } else if (error.code === 'auth/too-many-requests') {
            throw new Error('Too many failed attempts. Please try again later.');
        }
        throw error;
    }
};

/**
 * Send password reset email
 */
export const sendPasswordReset = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return true;
    } catch (error: any) {
        console.error("Error sending password reset", error);
        if (error.code === 'auth/user-not-found') {
            throw new Error('No account found with this email address.');
        }
        throw error;
    }
};

// ==================== SIGN OUT ====================

export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error("Error signing out", error);
        throw error;
    }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate password strength (minimum 8 characters)
 */
export const validatePassword = (password: string): { valid: boolean; error?: string } => {
    if (password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long.' };
    }
    return { valid: true };
};

/**
 * Helper to map Firebase user to our App's User type
 */
export const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUser, role: 'parent' | 'child' = 'parent'): User => {
    return {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || 'User',
        avatarUrl: firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=User',
        role: role,
        status: 'active',
        email: firebaseUser.email || '',
    };
};
