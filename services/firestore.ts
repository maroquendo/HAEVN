import { db, auth } from './firebase';
import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Family, User, AppData } from '../types';
import getInitialData from '../utils/data';

const FAMILIES_COLLECTION = 'families';

const mergeSecretsIfParent = async (family: Family) => {
    const currentUid = auth.currentUser?.uid;
    const isParent = family.members.some(m => m.id === currentUid && m.role === 'parent');

    if (isParent) {
        try {
            const secretsRef = doc(db, FAMILIES_COLLECTION, family.id, 'private', 'secrets');
            const secretsSnap = await getDoc(secretsRef);
            if (secretsSnap.exists()) {
                const secretsData = secretsSnap.data();
                const childPins = secretsData.childPins || {};
                const parentPins = secretsData.parentPins || {};

                family.members = family.members.map(member => {
                    if (member.role === 'child') {
                        return { ...member, joinPin: childPins[member.id] || member.joinPin };
                    } else if (member.role === 'parent') {
                        return { ...member, parentPin: parentPins[member.id] || member.parentPin };
                    }
                    return member;
                });
            }
        } catch (err) {
            console.warn("Could not merge family secrets:", err);
        }
    } else {
        family.members = family.members.map(member => {
            const cleanMember = { ...member };
            delete cleanMember.joinPin;
            delete cleanMember.parentPin;
            return cleanMember;
        });
    }
};

// Helper to keep memberEmails in sync (lowercase normalized)
const getMemberEmails = (members: User[]): string[] => {
    return members
        .map(m => m.email?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e));
};

export const createFamily = async (user: User): Promise<Family> => {
    const familyId = `family_${user.id}`;
    const normalizedEmail = user.email?.trim().toLowerCase();
    
    const newFamily: Family = {
        id: familyId,
        name: `${user.name}'s Family`,
        members: [{
            ...user,
            email: normalizedEmail,
        }],
        pin: '0000',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=6366f1&color=fff`,
        ownerId: user.id,
    };

    const cleanMembers = newFamily.members.map(m => {
        const copy = { ...m };
        delete copy.joinPin;
        delete copy.parentPin;
        return copy;
    });

    const memberEmails = normalizedEmail ? [normalizedEmail] : [];

    try {
        await setDoc(doc(db, FAMILIES_COLLECTION, familyId), { ...newFamily, members: cleanMembers, memberEmails });
        const initialData = getInitialData(user);
        await setDoc(doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData'), initialData);
    } catch (err) {
        console.warn("Firestore unavailable during createFamily, saving locally:", err);
    }

    localStorage.setItem('haevn_offline_family_meta', JSON.stringify(newFamily));
    return newFamily;
};

export const getFamilyForUser = async (email?: string): Promise<Family | null> => {
    if (!email) return null;
    const normalizedEmail = email.trim().toLowerCase();

    // Check offline cached family first if matched
    const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
    if (offlineMeta) {
        try {
            const localFamily = JSON.parse(offlineMeta) as Family;
            const isLocalMember = localFamily.members?.some(m => m.email?.trim().toLowerCase() === normalizedEmail);
            if (isLocalMember && localFamily.id === 'local_offline_family') {
                return localFamily;
            }
        } catch (e) {}
    }

    try {
        // Query by memberEmails array
        const q = query(collection(db, FAMILIES_COLLECTION), where('memberEmails', 'array-contains', normalizedEmail));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const family = querySnapshot.docs[0].data() as Family;
            await mergeSecretsIfParent(family);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
            return family;
        }

        // Fallback: Scan all families to match case-insensitively on member.email
        const allFamiliesSnapshot = await getDocs(collection(db, FAMILIES_COLLECTION));
        for (const docSnap of allFamiliesSnapshot.docs) {
            const family = docSnap.data() as Family;
            const isMember = family.members?.some(m => m.email?.trim().toLowerCase() === normalizedEmail);
            if (isMember) {
                const memberEmails = getMemberEmails(family.members);
                try {
                    await updateDoc(doc(db, FAMILIES_COLLECTION, family.id), { memberEmails });
                } catch (e) {}
                await mergeSecretsIfParent(family);
                localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
                return family;
            }
        }
    } catch (err) {
        console.warn("Firestore getFamilyForUser error, checking local storage:", err);
    }

    // Return cached offline family if exists as last resort
    if (offlineMeta) {
        try {
            return JSON.parse(offlineMeta) as Family;
        } catch (e) {}
    }

    return null;
};

export const inviteMember = async (
    familyId: string,
    email: string,
    role: 'parent' | 'child',
    relationship?: string,
    name?: string
): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase();
    const displayName = name?.trim() || email.split('@')[0];

    const newMember: User = {
        id: `invite_${Date.now()}`,
        name: displayName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
        role,
        status: 'pending',
        email: normalizedEmail,
        suspended: false,
        ...(relationship ? { relationship } : {})
    };

    // 1. Local / Offline Mode handler
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = [...family.members.filter(m => m.email !== normalizedEmail), newMember];
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return newMember;
    }

    // 2. Firestore handler
    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);

        if (!familySnap.exists()) {
            // Check if we can fallback to offline storage
            const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
            if (offlineMeta) {
                const family = JSON.parse(offlineMeta) as Family;
                family.members = [...family.members.filter(m => m.email !== normalizedEmail), newMember];
                localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
                return newMember;
            }
            throw new Error("Family not found");
        }

        const family = familySnap.data() as Family;
        const updatedMembers = [...family.members.filter(m => m.email !== normalizedEmail), newMember];
        const memberEmails = getMemberEmails(updatedMembers);

        const cleanMembers = updatedMembers.map(m => {
            const copy = { ...m };
            delete copy.joinPin;
            delete copy.parentPin;
            return copy;
        });

        await updateDoc(familyRef, {
            members: cleanMembers,
            memberEmails
        });

        // Update local cache
        localStorage.setItem('haevn_offline_family_meta', JSON.stringify({ ...family, members: updatedMembers }));

        return newMember;
    } catch (error) {
        console.warn("Firestore inviteMember error, applying to local cache:", error);
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = [...family.members.filter(m => m.email !== normalizedEmail), newMember];
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
            return newMember;
        }
        throw error;
    }
};

export const addChildMember = async (familyId: string, name: string, relationship?: string): Promise<User> => {
    const pin = await generateUniqueChildPin();
    const displayName = name.trim();

    const newMember: User = {
        id: `child_${Date.now()}`,
        name: displayName,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`,
        role: 'child',
        status: 'active',
        suspended: false,
        joinPin: pin,
        ...(relationship ? { relationship } : {})
    };

    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = [...family.members, newMember];
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return newMember;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);

        if (!familySnap.exists()) {
            const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
            if (offlineMeta) {
                const family = JSON.parse(offlineMeta) as Family;
                family.members = [...family.members, newMember];
                localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
                return newMember;
            }
            throw new Error("Family not found");
        }

        const family = familySnap.data() as Family;
        const updatedMembers = [...family.members, newMember];

        const cleanMembers = updatedMembers.map(m => {
            const copy = { ...m };
            delete copy.joinPin;
            delete copy.parentPin;
            return copy;
        });

        await updateDoc(familyRef, {
            members: cleanMembers
        });

        try {
            await setDoc(doc(db, 'pins', pin), { familyId, memberId: newMember.id });
            const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
            const secretsSnap = await getDoc(secretsRef);
            let childPins: Record<string, string> = {};
            if (secretsSnap.exists()) {
                childPins = secretsSnap.data().childPins || {};
            }
            childPins[newMember.id] = pin;
            await setDoc(secretsRef, { childPins }, { merge: true });
        } catch (e) {
            console.warn("Could not save PIN to secrets/pins collection:", e);
        }

        localStorage.setItem('haevn_offline_family_meta', JSON.stringify({ ...family, members: updatedMembers }));
        return newMember;
    } catch (error) {
        console.warn("Firestore addChildMember error, saving locally:", error);
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = [...family.members, newMember];
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
            return newMember;
        }
        throw error;
    }
};

export const updateFamilyData = async (familyId: string, data: Partial<AppData>) => {
    if (familyId === 'local_offline_family') {
        const currentLocal = localStorage.getItem('haevn_offline_data');
        const currentData = currentLocal ? JSON.parse(currentLocal) : getInitialData();
        const newData = { ...currentData, ...data };
        localStorage.setItem('haevn_offline_data', JSON.stringify(newData));
        return;
    }

    try {
        const dataRef = doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData');
        await updateDoc(dataRef, data);
    } catch (err) {
        console.warn("Firestore updateFamilyData error, saving locally:", err);
        const currentLocal = localStorage.getItem('haevn_offline_data');
        const currentData = currentLocal ? JSON.parse(currentLocal) : getInitialData();
        const newData = { ...currentData, ...data };
        localStorage.setItem('haevn_offline_data', JSON.stringify(newData));
    }
};

export const subscribeToFamily = (familyId: string, onUpdate: (family: Family) => void) => {
    if (familyId === 'local_offline_family') {
        return () => { };
    }

    try {
        return onSnapshot(doc(db, FAMILIES_COLLECTION, familyId), async (docSnap) => {
            if (docSnap.exists()) {
                const family = docSnap.data() as Family;
                await mergeSecretsIfParent(family);
                onUpdate(family);
            }
        });
    } catch (e) {
        console.warn("Could not attach family snapshot listener:", e);
        return () => { };
    }
};

export const subscribeToAppData = (familyId: string, onUpdate: (data: AppData) => void) => {
    if (familyId === 'local_offline_family') {
        const localData = localStorage.getItem('haevn_offline_data');
        if (localData) {
            onUpdate(JSON.parse(localData));
        } else {
            const initial = getInitialData();
            localStorage.setItem('haevn_offline_data', JSON.stringify(initial));
            onUpdate(initial);
        }
        return () => { };
    }

    try {
        return onSnapshot(doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData'), (docSnap) => {
            if (docSnap.exists()) {
                onUpdate(docSnap.data() as AppData);
            }
        });
    } catch (e) {
        console.warn("Could not attach appData snapshot listener:", e);
        return () => { };
    }
};

export const joinFamily = async (user: User, familyId: string) => {
    const normalizedEmail = user.email?.trim().toLowerCase();

    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            const memberIndex = family.members.findIndex(m => m.email?.toLowerCase() === normalizedEmail);
            if (memberIndex !== -1) {
                family.members[memberIndex] = {
                    ...family.members[memberIndex],
                    ...user,
                    email: normalizedEmail,
                    status: 'active'
                };
                localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
            }
        }
        return familyId;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) return null;

        const family = familySnap.data() as Family;
        const memberIndex = family.members.findIndex(m => m.email?.toLowerCase() === normalizedEmail);

        if (memberIndex !== -1) {
            const updatedMembers = [...family.members];
            updatedMembers[memberIndex] = {
                ...updatedMembers[memberIndex],
                ...user,
                email: normalizedEmail,
                status: 'active'
            };

            const cleanMembers = updatedMembers.map(m => {
                const copy = { ...m };
                delete copy.joinPin;
                delete copy.parentPin;
                return copy;
            });

            const memberEmails = getMemberEmails(updatedMembers);
            await updateDoc(familyRef, {
                members: cleanMembers,
                memberEmails
            });
            return familyId;
        }
    } catch (err) {
        console.warn("Firestore joinFamily error:", err);
    }
    return null;
};

export const updateMember = async (familyId: string, memberId: string, updates: Partial<User>) => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.map(m => m.id === memberId ? { ...m, ...updates } : m);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) return;

        const family = familySnap.data() as Family;
        const updatedMembers = family.members.map(m => m.id === memberId ? { ...m, ...updates } : m);

        const cleanMembers = updatedMembers.map(m => {
            const copy = { ...m };
            delete copy.joinPin;
            delete copy.parentPin;
            return copy;
        });

        await updateDoc(familyRef, { members: cleanMembers });
    } catch (err) {
        console.warn("Firestore updateMember error:", err);
    }
};

export const removeMember = async (familyId: string, memberId: string) => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.filter(m => m.id !== memberId);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) return;

        const family = familySnap.data() as Family;
        const updatedMembers = family.members.filter(m => m.id !== memberId);
        const memberEmails = getMemberEmails(updatedMembers);

        const cleanMembers = updatedMembers.map(m => {
            const copy = { ...m };
            delete copy.joinPin;
            delete copy.parentPin;
            return copy;
        });

        await updateDoc(familyRef, {
            members: cleanMembers,
            memberEmails
        });

        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        if (secretsSnap.exists()) {
            const secretsData = secretsSnap.data();
            const childPins = secretsData.childPins || {};
            const parentPins = secretsData.parentPins || {};

            const pin = childPins[memberId];
            if (pin) {
                try {
                    await deleteDoc(doc(db, 'pins', pin));
                } catch (err) {}
                delete childPins[memberId];
            }
            delete parentPins[memberId];

            await setDoc(secretsRef, { childPins, parentPins }, { merge: true });
        }
    } catch (err) {
        console.warn("Firestore removeMember error:", err);
    }
};

export const updateFamilyTree = async (familyId: string, treeData: any) => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.treeGraph = treeData;
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        await updateDoc(familyRef, { treeGraph: treeData });
    } catch (err) {
        console.warn("Firestore updateFamilyTree error:", err);
    }
};

export const verifyChildPin = async (pin: string): Promise<{ user: User; familyId: string } | null> => {
    const offlineData = localStorage.getItem('haevn_offline_family_meta');
    if (offlineData) {
        const family = JSON.parse(offlineData) as Family;
        const childMember = family.members.find(
            m => m.role === 'child' && m.joinPin === pin && m.status === 'active' && !m.suspended
        );
        if (childMember) {
            return { user: childMember, familyId: family.id };
        }
    }

    try {
        const pinDocRef = doc(db, 'pins', pin);
        const pinDocSnap = await getDoc(pinDocRef);
        if (pinDocSnap.exists()) {
            const { familyId, memberId } = pinDocSnap.data() as { familyId: string; memberId: string };
            const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
            const familySnap = await getDoc(familyRef);
            if (familySnap.exists()) {
                const family = familySnap.data() as Family;
                const childMember = family.members.find(m => m.id === memberId && !m.suspended);
                if (childMember) {
                    return { user: childMember, familyId };
                }
            }
        }
    } catch (error) {
        console.warn("Online PIN verification failed:", error);
    }

    return null;
};

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

export const resetChildPin = async (familyId: string, childId: string): Promise<string> => {
    const newPin = await generateUniqueChildPin();

    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.map(m => m.id === childId ? { ...m, joinPin: newPin } : m);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return newPin;
    }

    try {
        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        
        let oldPin = '';
        let childPins: Record<string, string> = {};
        if (secretsSnap.exists()) {
            childPins = secretsSnap.data().childPins || {};
            oldPin = childPins[childId] || '';
        }

        if (oldPin) {
            try {
                await deleteDoc(doc(db, 'pins', oldPin));
            } catch (err) {}
        }

        await setDoc(doc(db, 'pins', newPin), { familyId, memberId: childId });
        childPins[childId] = newPin;
        await setDoc(secretsRef, { childPins }, { merge: true });
    } catch (err) {
        console.warn("Firestore resetChildPin error:", err);
    }

    return newPin;
};

export const suspendChild = async (familyId: string, childId: string): Promise<void> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.map(m => m.id === childId ? { ...m, suspended: true } : m);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) throw new Error('Family not found');

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m =>
        m.id === childId ? { ...m, suspended: true } : m
    );

    await updateDoc(familyRef, { members: updatedMembers });
};

export const unsuspendChild = async (familyId: string, childId: string): Promise<void> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.map(m => m.id === childId ? { ...m, suspended: false } : m);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
    const familySnap = await getDoc(familyRef);
    if (!familySnap.exists()) throw new Error('Family not found');

    const family = familySnap.data() as Family;
    const updatedMembers = family.members.map(m =>
        m.id === childId ? { ...m, suspended: false } : m
    );

    await updateDoc(familyRef, { members: updatedMembers });
};

export const setParentPin = async (familyId: string, parentId: string, pin: string): Promise<void> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.members = family.members.map(m => m.id === parentId ? { ...m, parentPin: pin } : m);
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    try {
        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        let parentPins: Record<string, string> = {};
        if (secretsSnap.exists()) {
            parentPins = secretsSnap.data().parentPins || {};
        }
        parentPins[parentId] = pin;
        await setDoc(secretsRef, { parentPins }, { merge: true });
    } catch (err) {
        console.warn("Firestore setParentPin error:", err);
    }
};

export const verifyParentPin = async (familyId: string, parentId: string, pin: string): Promise<boolean> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            const parent = family.members.find(m => m.id === parentId && m.role === 'parent');
            return parent?.parentPin === pin;
        }
        return false;
    }

    try {
        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        if (secretsSnap.exists()) {
            const parentPins = secretsSnap.data().parentPins || {};
            return parentPins[parentId] === pin;
        }
    } catch (err) {
        console.warn("Firestore verifyParentPin error:", err);
    }
    return false;
};

export const hasParentPin = async (familyId: string, parentId: string): Promise<boolean> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            const parent = family.members.find(m => m.id === parentId && m.role === 'parent');
            return !!parent?.parentPin;
        }
        return false;
    }

    try {
        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        if (secretsSnap.exists()) {
            const parentPins = secretsSnap.data().parentPins || {};
            return !!parentPins[parentId];
        }
    } catch (err) {
        console.warn("Firestore hasParentPin error:", err);
    }
    return false;
};

export const resetFamilyData = async (familyId: string, ownerId: string): Promise<void> => {
    if (familyId === 'local_offline_family') {
        localStorage.removeItem('haevn_offline_family_meta');
        localStorage.removeItem('haevn_offline_data');
        return;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        const familySnap = await getDoc(familyRef);
        if (!familySnap.exists()) return;

        const family = familySnap.data() as Family;
        const owner = family.members.find(m => m.id === ownerId);
        if (!owner) return;

        const resetMembers = [owner];
        const memberEmails = getMemberEmails(resetMembers);

        await updateDoc(familyRef, {
            members: resetMembers,
            memberEmails,
            treeGraph: null
        });

        const secretsRef = doc(db, FAMILIES_COLLECTION, familyId, 'private', 'secrets');
        const secretsSnap = await getDoc(secretsRef);
        if (secretsSnap.exists()) {
            const childPins = secretsSnap.data().childPins || {};
            for (const childId of Object.keys(childPins)) {
                const pin = childPins[childId];
                if (pin) {
                    try {
                        await deleteDoc(doc(db, 'pins', pin));
                    } catch (err) {}
                }
            }
            try {
                await deleteDoc(secretsRef);
            } catch (err) {}
        }

        const initialData = getInitialData();
        await setDoc(doc(db, FAMILIES_COLLECTION, familyId, 'data', 'appData'), initialData);
    } catch (e) {
        console.error("Failed to reset app data", e);
    }
};

export const updateFamilySharingRules = async (familyId: string, sharingRules: { [senderId: string]: string[] }): Promise<void> => {
    if (familyId === 'local_offline_family') {
        const offlineMeta = localStorage.getItem('haevn_offline_family_meta');
        if (offlineMeta) {
            const family = JSON.parse(offlineMeta) as Family;
            family.sharingRules = sharingRules;
            localStorage.setItem('haevn_offline_family_meta', JSON.stringify(family));
        }
        return;
    }

    try {
        const familyRef = doc(db, FAMILIES_COLLECTION, familyId);
        await updateDoc(familyRef, { sharingRules });
    } catch (err) {
        console.warn("Firestore updateFamilySharingRules error:", err);
    }
};
