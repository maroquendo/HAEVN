// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock storage objects
let mockDocs: Record<string, any> = {};
let mockQueries: Array<{ path: string; whereClause: any }> = [];

// Mock Firebase Firestore functions
vi.mock('firebase/firestore', () => {
    return {
        getFirestore: vi.fn(),
        collection: vi.fn((db, path) => ({ type: 'collection', path })),
        doc: vi.fn((db, colPath, ...paths) => {
            const fullPath = [colPath, ...paths].join('/');
            return { type: 'doc', path: fullPath };
        }),
        getDoc: vi.fn(async (docRef) => {
            const data = mockDocs[docRef.path];
            return {
                exists: () => !!data,
                data: () => data,
                id: docRef.path.split('/').pop(),
            };
        }),
        setDoc: vi.fn(async (docRef, data, options) => {
            if (options?.merge) {
                mockDocs[docRef.path] = { ...mockDocs[docRef.path], ...data };
            } else {
                mockDocs[docRef.path] = data;
            }
        }),
        updateDoc: vi.fn(async (docRef, data) => {
            mockDocs[docRef.path] = { ...mockDocs[docRef.path], ...data };
        }),
        deleteDoc: vi.fn(async (docRef) => {
            delete mockDocs[docRef.path];
        }),
        query: vi.fn((colRef, ...clauses) => {
            return { type: 'query', path: colRef.path, clauses };
        }),
        where: vi.fn((field, op, val) => ({ field, op, val })),
        getDocs: vi.fn(async (queryRef) => {
            // Find all docs matching the path
            const colPath = queryRef.path;
            const matches = Object.keys(mockDocs)
                .filter(key => key.startsWith(colPath + '/'))
                .map(key => ({
                    data: () => mockDocs[key],
                    id: key.split('/').pop(),
                }));
            return {
                empty: matches.length === 0,
                docs: matches,
            };
        }),
        onSnapshot: vi.fn(() => vi.fn()),
    };
});

// Mock the local firebase file
vi.mock('../services/firebase', () => {
    return {
        db: {},
        auth: {
            currentUser: { uid: 'parent_123' }
        }
    };
});

import {
    verifyChildPin,
    addChildMember,
    inviteMember,
    resetChildPin,
    setParentPin,
    verifyParentPin,
    hasParentPin,
    updateFamilySharingRules,
} from '../services/firestore';

describe('Firestore Service - Secure PINs', () => {
    beforeEach(() => {
        mockDocs = {};
        mockQueries = [];
        vi.clearAllMocks();
    });

    describe('Parent PIN security (private/secrets subcollection)', () => {
        it('should set parent PIN in private subcollection secrets', async () => {
            await setParentPin('family_abc', 'parent_123', '998877');
            expect(mockDocs['families/family_abc/private/secrets']).toBeDefined();
            expect(mockDocs['families/family_abc/private/secrets'].parentPins['parent_123']).toBe('998877');
        });

        it('should verify parent PIN from private subcollection secrets', async () => {
            mockDocs['families/family_abc/private/secrets'] = {
                parentPins: { 'parent_123': '554433' }
            };

            const isValid = await verifyParentPin('family_abc', 'parent_123', '554433');
            expect(isValid).toBe(true);

            const isInvalid = await verifyParentPin('family_abc', 'parent_123', 'wrong');
            expect(isInvalid).toBe(false);
        });

        it('should report hasParentPin correctly', async () => {
            const hasBefore = await hasParentPin('family_abc', 'parent_123');
            expect(hasBefore).toBe(false);

            mockDocs['families/family_abc/private/secrets'] = {
                parentPins: { 'parent_123': '554433' }
            };

            const hasAfter = await hasParentPin('family_abc', 'parent_123');
            expect(hasAfter).toBe(true);
        });
    });

    describe('Child PIN security (O(1) lookup in pins collection)', () => {
        it('should verify child PIN by fetching pins/{pin} directly', async () => {
            // Setup pin document mapping to family and member ID
            mockDocs['pins/123456'] = {
                familyId: 'family_xyz',
                memberId: 'child_789'
            };
            // Setup family document containing the child member details
            mockDocs['families/family_xyz'] = {
                id: 'family_xyz',
                members: [
                    { id: 'child_789', role: 'child', name: 'Bob', suspended: false }
                ]
            };

            const result = await verifyChildPin('123456');
            expect(result).not.toBeNull();
            expect(result?.user.name).toBe('Bob');
            expect(result?.familyId).toBe('family_xyz');
        });

        it('should fail validation if pin mapping exists but child is suspended', async () => {
            mockDocs['pins/123456'] = {
                familyId: 'family_xyz',
                memberId: 'child_789'
            };
            mockDocs['families/family_xyz'] = {
                id: 'family_xyz',
                members: [
                    { id: 'child_789', role: 'child', name: 'Bob', suspended: true }
                ]
            };

            const result = await verifyChildPin('123456');
            expect(result).toBeNull();
        });

        it('should fail validation if pin document does not exist', async () => {
            const result = await verifyChildPin('999999');
            expect(result).toBeNull();
        });
    });

    describe('Family Sharing Rules & Custom Relationships', () => {
        it('should update sharing rules in the family document', async () => {
            const familyId = 'family_xyz';
            mockDocs[`families/${familyId}`] = {
                id: familyId,
                name: 'Test Family',
                members: []
            };

            const sharingRules = {
                'parent_123': ['child_1', 'child_2'],
                'grandpa_abc': ['child_1']
            };

            await updateFamilySharingRules(familyId, sharingRules);

            const updatedDoc = mockDocs[`families/${familyId}`];
            expect(updatedDoc.sharingRules).toBeDefined();
            expect(updatedDoc.sharingRules['grandpa_abc']).toEqual(['child_1']);
            expect(updatedDoc.sharingRules['parent_123']).toEqual(['child_1', 'child_2']);
        });

        it('should support custom relationship titles when adding child members', async () => {
            const familyId = 'family_xyz';
            mockDocs[`families/${familyId}`] = {
                id: familyId,
                name: 'Test Family',
                members: []
            };

            // Mock O(1) PIN validation response
            mockDocs['pins/111111'] = null; 

            const child = await addChildMember(familyId, 'Timmy', 'Nephew');
            expect(child.relationship).toBe('Nephew');
            expect(mockDocs[`families/${familyId}`].members[0].relationship).toBe('Nephew');
        });

        it('should invite adult family members with email and custom relationship', async () => {
            const familyId = 'family_xyz';
            mockDocs[`families/${familyId}`] = {
                id: familyId,
                name: 'Test Family',
                members: [
                    { id: 'parent_1', name: 'Marcial', role: 'parent', email: 'marcial@test.com', status: 'active' }
                ],
                memberEmails: ['marcial@test.com']
            };

            const invited = await inviteMember(familyId, 'Dr.Oquendo@gmail.com', 'parent', 'Uncle', 'dr.o');
            expect(invited.name).toBe('dr.o');
            expect(invited.email).toBe('dr.oquendo@gmail.com');
            expect(invited.relationship).toBe('Uncle');
            expect(invited.status).toBe('pending');

            const updatedDoc = mockDocs[`families/${familyId}`];
            expect(updatedDoc.members).toHaveLength(2);
            expect(updatedDoc.memberEmails).toContain('dr.oquendo@gmail.com');
        });
    });
});
