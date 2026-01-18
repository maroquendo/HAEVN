import { db } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, arrayUnion, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { Family, User, AppData } from '../types';
import getInitialData from '../utils/data';

const FAMILIES_COLLECTION = 'families';

export const createFamily = async (user: User): Promise<Family> => {
    const familyId = `family_${user.id}`;
    const newFamily: Family = {
        id: familyId,
        name: `${user.name}'s Family`,
        members: [user],
        pin: '0000',
        avatarUrl: 'https://ui-avatars.com/api/?name=Family&background=random',
        ownerId: user.id,
    };

    await setDoc(doc(db, FAMILIES_COLLECTION, familyId), newFamily);

    // Initialize app data for the family
    const initialData = getInitialData();
    await setDoc(doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData'), initialData);

    return newFamily;
};

export const getFamilyForUser = async (email: string): Promise<Family | null> => {
    // This is a bit inefficient without a collection group query or denormalized map, 
    // but for a small app it's fine. We'll search for families where the user is a member.
    // Actually, Firestore doesn't support searching inside array of objects easily.
    // We will rely on a separate 'invites' collection or just search by owner for now,
    // OR we can store a 'memberEmails' array on the family doc for querying.

    // Let's assume we update the family doc to have a 'memberEmails' field for easier querying
    const q = query(collection(db, FAMILIES_COLLECTION), where('memberEmails', 'array-contains', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as Family;
    }
    return null;
};

// Helper to keep memberEmails in sync
const getMemberEmails = (members: User[]) => members.map(m => m.email).filter(Boolean);

export const inviteMember = async (familyId: string, email: string, role: 'parent' | 'child'): Promise<void> => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);

    if (!familySnap.exists()) throw new Error("Family not found");

    const family = familySnap.data() as Family;

    const newMember: User = {
        id: `invite_${Date.now()}`,
        name: email.split('@')[0], // Temporary name
        avatarUrl: `https://ui-avatars.com/api/?name=${email}`,
        role,
        status: 'pending',
        email,
        joinPin: role === 'child' ? await generateUniqueChildPin() : undefined,
    };

    const updatedMembers = [...family.members, newMember];
    const memberEmails = getMemberEmails(updatedMembers);

    await updateDoc(familyRef, {
        members: updatedMembers,
        memberEmails // Update the search field
    });
};

export const updateFamilyData = async (familyId: string, data: Partial<AppData>) => {
    const dataRef = doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData');
    await updateDoc(dataRef, data);
};

export const subscribeToFamily = (familyId: string, onUpdate: (family: Family) => void) => {
    return onSnapshot(doc(db, FAMILIES_COLLECTION, familyId), (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data() as Family);
        }
    });
};

export const subscribeToAppData = (familyId: string, onUpdate: (data: AppData) => void) => {
    return onSnapshot(doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData'), (doc) => {
        if (doc.exists()) {
            onUpdate(doc.data() as AppData);
        }
    });
};

export const joinFamily = async (user: User, familyId: string) => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) return null;

    const family = familySnap.data() as Family;
    // Find the pending invite
    const memberIndex = family.members.findIndex(m => m.email === user.email && m.status === 'pending');

    if (memberIndex !== -1) {
        const updatedMembers = [...family.members];
        updatedMembers[memberIndex] = {
            ...updatedMembers[memberIndex],
            ...user, // Update with real user details (id, name, avatar)
            status: 'active'
        };

        await updateDoc(familyRef, {
            members: updatedMembers
        });
        return familyId;
    }
    return null;
};

export const updateMember = async (familyId: string, memberId: string, updates: Partial<User>) => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) return;

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m => m.id === memberId ? { ...m, ...updates } : m);

    await updateDoc(familyRef, { members: updatedMembers });
};

export const removeMember = async (familyId: string, memberId: string) => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) return;

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.filter(m => m.id !== memberId);
    const memberEmails = getMemberEmails(updatedMembers);

    await updateDoc(familyRef, {
        members: updatedMembers,
        memberEmails
    });
};

// ==================== CHILD PIN MANAGEMENT ====================

/**
 * Verify a child's PIN and return the child user if valid
 */
export const verifyChildPin = async (pin: string): Promise<{ user: User; familyId: string } | null> => {
    // Search all families for a child with this PIN
    const q = query(collection(db, FAMILIES_COLLECTION));
    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
        const family = docSnap.data() as Family;
        const childMember = family.members.find(
            m => m.role === 'child' &&
                m.joinPin === pin &&
                m.status === 'active' &&
                !m.suspended
        );

        if (childMember) {
            return {
                user: childMember,
                familyId: family.id
            };
        }
    }

    return null;
};

/**
 * Helper to generate a unique 6-digit PIN
 */
const generateUniqueChildPin = async (): Promise<string> => {
    let pin = '';
    let isUnique = false;
    while (!isUnique) {
        pin = String(Math.floor(100000 + Math.random() * 900000));
        const existing = await verifyChildPin(pin);
        if (!existing) {
            isUnique = true;
        }
    }
    return pin;
};

/**
 * Reset a child's PIN to a new random 6-digit code
 */
export const resetChildPin = async (familyId: string, childId: string): Promise<string> => {
    const newPin = await generateUniqueChildPin();

    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) throw new Error('Family not found');

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m =>
        m.id === childId ? { ...m, joinPin: newPin } : m
    );

    await updateDoc(familyRef, { members: updatedMembers });
    return newPin;
};

/**
 * Suspend a child account (prevents login)
 */
export const suspendChild = async (familyId: string, childId: string): Promise<void> => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) throw new Error('Family not found');

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m =>
        m.id === childId ? { ...m, suspended: true } : m
    );

    await updateDoc(familyRef, { members: updatedMembers });
};

/**
 * Unsuspend a child account (allows login again)
 */
export const unsuspendChild = async (familyId: string, childId: string): Promise<void> => {
    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) throw new Error('Family not found');

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m =>
        m.id === childId ? { ...m, suspended: false } : m
    );

    await updateDoc(familyRef, { members: updatedMembers });
};
