// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import FamilyView from '../components/FamilyView';
import AddVideoForm from '../components/AddVideoForm';
import { Family, User } from '../types';

// Mock Firestore services
vi.mock('../services/firebase', () => ({
    auth: {
        currentUser: { uid: 'parent_mom' }
    },
    db: {}
}));

describe('HAEVN Multi-User Trial & Click Audit', () => {
    // 5 Trial Accounts Setup
    const parentMom: User = {
        id: 'parent_mom',
        name: 'Mom',
        avatarUrl: 'https://ui-avatars.com/api/?name=Mom',
        role: 'parent',
        status: 'active',
        relationship: 'Mom'
    };

    const grandpaJoe: User = {
        id: 'grandpa_joe',
        name: 'Grandpa Joe',
        avatarUrl: 'https://ui-avatars.com/api/?name=Grandpa+Joe',
        role: 'parent',
        status: 'active',
        relationship: 'Grandpa'
    };

    const uncleBob: User = {
        id: 'uncle_bob',
        name: 'Uncle Bob',
        avatarUrl: 'https://ui-avatars.com/api/?name=Uncle+Bob',
        role: 'parent',
        status: 'active',
        relationship: 'Uncle'
    };

    const childTimmy: User = {
        id: 'child_timmy',
        name: 'Timmy',
        avatarUrl: 'https://ui-avatars.com/api/?name=Timmy',
        role: 'child',
        status: 'active',
        relationship: 'Son',
        joinPin: '123456'
    };

    const childSarah: User = {
        id: 'child_sarah',
        name: 'Sarah',
        avatarUrl: 'https://ui-avatars.com/api/?name=Sarah',
        role: 'child',
        status: 'active',
        relationship: 'Daughter',
        joinPin: '654321'
    };

    // Initial Family Mock State containing all 5 users
    const mockFamily: Family = {
        id: 'family_123',
        name: 'Smith',
        members: [parentMom, grandpaJoe, uncleBob, childTimmy, childSarah],
        pin: '0000', // Parent bypass PIN
        avatarUrl: 'https://ui-avatars.com/api/?name=Smith',
        ownerId: 'parent_mom',
        sharingRules: {
            // Initial rules: grandpa Joe can only share with Timmy, uncle Bob can only share with Sarah
            'grandpa_joe': ['child_timmy'],
            'uncle_bob': ['child_sarah'],
        }
    };

    // Props Mock functions
    const mockAddMember = vi.fn();
    const mockEditMember = vi.fn();
    const mockRemoveMember = vi.fn();
    const mockResetPin = vi.fn();
    const mockSuspendChild = vi.fn();
    const mockUnsuspendChild = vi.fn();
    const mockUpdateSharingRules = vi.fn();

    beforeEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    describe('Audit 1: Family tabbed layout navigation (Click Audit)', () => {
        it('should change tabs correctly on button clicks', () => {
            render(
                <FamilyView
                    family={mockFamily}
                    currentUser={parentMom}
                    onAddMember={mockAddMember}
                    onEditMember={mockEditMember}
                    onRemoveMember={mockRemoveMember}
                    onResetPin={mockResetPin}
                    onSuspendChild={mockSuspendChild}
                    onUnsuspendChild={mockUnsuspendChild}
                    onUpdateSharingRules={mockUpdateSharingRules}
                />
            );

            // Tab elements
            const treeTab = screen.getByRole('button', { name: /tree/i });
            const rulesTab = screen.getByRole('button', { name: /sharing rules/i });
            const sandboxTab = screen.getByRole('button', { name: /pin sandbox/i });

            expect(treeTab).toBeDefined();
            expect(rulesTab).toBeDefined();
            expect(sandboxTab).toBeDefined();

            // Initial view is tree, should render "Mom" and "Timmy"
            expect(screen.getAllByText('Mom')[0]).toBeDefined();
            expect(screen.getByText('Timmy')).toBeDefined();

            // Click Sharing Rules tab
            fireEvent.click(rulesTab);
            expect(screen.getByText(/sharing permission grid/i)).toBeDefined();
            expect(screen.queryByText('Add Member')).toBeNull();

            // Click PIN Sandbox tab
            fireEvent.click(sandboxTab);
            expect(screen.getByText(/pin verification sandbox/i)).toBeDefined();
            expect(screen.queryByText(/sharing permission grid/i)).toBeNull();

            // Click back to Tree tab
            fireEvent.click(treeTab);
            expect(screen.getByText('Add Member')).toBeDefined();
        });
    });

    describe('Audit 2: Member management & custom relationship creation', () => {
        it('should open the Add Member modal and call onAddMember with custom relationship settings', async () => {
            render(
                <FamilyView
                    family={mockFamily}
                    currentUser={parentMom}
                    onAddMember={mockAddMember}
                    onEditMember={mockEditMember}
                    onRemoveMember={mockRemoveMember}
                    onResetPin={mockResetPin}
                    onSuspendChild={mockSuspendChild}
                    onUnsuspendChild={mockUnsuspendChild}
                    onUpdateSharingRules={mockUpdateSharingRules}
                />
            );

            // Click Add Member card
            const addBtn = screen.getByRole('button', { name: /add member/i });
            fireEvent.click(addBtn);

            // Modal headers
            expect(screen.getByText('New Family Member')).toBeDefined();

            // Name field
            const nameInput = screen.getByPlaceholderText(/name \(e\.g\. Timmy/i);
            fireEvent.change(nameInput, { target: { value: 'Aunt Jane' } });

            // Switch to Adult (Email Invite) role
            const adultRoleBtn = screen.getByRole('button', { name: /adult/i });
            fireEvent.click(adultRoleBtn);

            // Email input appears
            const emailInput = screen.getByPlaceholderText('email@example.com');
            fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });

            // Choose Relationship dropdown
            const relationshipSelect = screen.getByRole('combobox');
            fireEvent.change(relationshipSelect, { target: { value: 'Aunt' } });

            // Submit invite
            const submitBtn = screen.getByRole('button', { name: /send invitation/i });
            fireEvent.click(submitBtn);

            expect(mockAddMember).toHaveBeenCalledWith('Aunt Jane', 'parent', 'jane@example.com', 'Aunt');
        });
    });

    describe('Audit 3: Sharing Permissions Matrix enforcement', () => {
        it('should display checkboxes for adults and check initial permissions', () => {
            render(
                <FamilyView
                    family={mockFamily}
                    currentUser={parentMom}
                    onAddMember={mockAddMember}
                    onEditMember={mockEditMember}
                    onRemoveMember={mockRemoveMember}
                    onResetPin={mockResetPin}
                    onSuspendChild={mockSuspendChild}
                    onUnsuspendChild={mockUnsuspendChild}
                    onUpdateSharingRules={mockUpdateSharingRules}
                />
            );

            // Navigate to permissions matrix
            const rulesTab = screen.getByRole('button', { name: /sharing rules/i });
            fireEvent.click(rulesTab);

            // Check headers are correct
            expect(screen.getByText('Sender (Adult)')).toBeDefined();

            // Senders shown: Mom, Grandpa Joe, Uncle Bob
            expect(screen.getByText('Grandpa Joe')).toBeDefined();
            expect(screen.getByText('Uncle Bob')).toBeDefined();

            // Find Grandma Joe checkbox for childTimmy
            const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[];
            expect(checkboxes.length).toBe(6); // 3 rows * 2 children

            // Mom (owner) checkboxes should be disabled (cannot restrict owner)
            expect(checkboxes[0].disabled).toBe(true);
            expect(checkboxes[1].disabled).toBe(true);

            // Grandpa Joe checkboxes: Timmy (checked), Sarah (unchecked by default sharing rules configuration)
            expect(checkboxes[2].checked).toBe(true);  // Timmy
            expect(checkboxes[3].checked).toBe(false); // Sarah

            // Uncle Bob checkboxes: Timmy (unchecked), Sarah (checked)
            expect(checkboxes[4].checked).toBe(false); // Timmy
            expect(checkboxes[5].checked).toBe(true);  // Sarah

            // Toggle Grandpa Joe sharing with Sarah
            fireEvent.click(checkboxes[3]);
            expect(mockUpdateSharingRules).toHaveBeenCalledWith({
                'grandpa_joe': ['child_timmy', 'child_sarah'],
                'uncle_bob': ['child_sarah']
            });
        });

        it('should filter recipients in AddVideoForm based on sharing rules (Multi-User Trial)', () => {
            const mockAddVideo = vi.fn();
            const mockClose = vi.fn();

            // Trial Account: Grandpa Joe adds a video
            const { rerender } = render(
                <AddVideoForm
                    onAddVideo={mockAddVideo}
                    onClose={mockClose}
                    currentUser={grandpaJoe}
                    familyMembers={mockFamily.members}
                    sharingRules={mockFamily.sharingRules}
                />
            );

            // Grandpa Joe can only share with Timmy according to rules
            expect(screen.getByText('Timmy')).toBeDefined();
            expect(screen.queryByText('Sarah')).toBeNull();

            // Trial Account: Uncle Bob adds a video
            rerender(
                <AddVideoForm
                    onAddVideo={mockAddVideo}
                    onClose={mockClose}
                    currentUser={uncleBob}
                    familyMembers={mockFamily.members}
                    sharingRules={mockFamily.sharingRules}
                />
            );

            // Uncle Bob can only share with Sarah according to rules
            expect(screen.getByText('Sarah')).toBeDefined();
            expect(screen.queryByText('Timmy')).toBeNull();

            // Trial Account: Mom (owner) adds a video
            rerender(
                <AddVideoForm
                    onAddVideo={mockAddVideo}
                    onClose={mockClose}
                    currentUser={parentMom}
                    familyMembers={mockFamily.members}
                    sharingRules={mockFamily.sharingRules}
                />
            );

            // Mom can share with both Timmy and Sarah
            expect(screen.getByText('Timmy')).toBeDefined();
            expect(screen.getByText('Sarah')).toBeDefined();
        });
    });

    describe('Audit 4: PIN sandbox diagnostics', () => {
        it('should display child PIN logs and identify PINs correctly in the sandbox text box', () => {
            render(
                <FamilyView
                    family={mockFamily}
                    currentUser={parentMom}
                    onAddMember={mockAddMember}
                    onEditMember={mockEditMember}
                    onRemoveMember={mockRemoveMember}
                    onResetPin={mockResetPin}
                    onSuspendChild={mockSuspendChild}
                    onUnsuspendChild={mockUnsuspendChild}
                    onUpdateSharingRules={mockUpdateSharingRules}
                />
            );

            // Navigate to Sandbox
            const sandboxTab = screen.getByRole('button', { name: /pin sandbox/i });
            fireEvent.click(sandboxTab);

            // PIN logs list should render child PINs
            expect(screen.getByText('123456')).toBeDefined(); // Timmy's PIN
            expect(screen.getByText('654321')).toBeDefined(); // Sarah's PIN

            // Interactive sandbox input field
            const sandboxInput = screen.getByPlaceholderText(/enter pin code/i);

            // 1. Test parent PIN code
            fireEvent.change(sandboxInput, { target: { value: '0000' } });
            expect(screen.getByText('Matches: Parent Bypass PIN')).toBeDefined();
            expect(screen.getByText('Unlocks parental settings & dashboard view override')).toBeDefined();

            // 2. Test Timmy's PIN code
            fireEvent.change(sandboxInput, { target: { value: '123456' } });
            expect(screen.getByText('Matches: Timmy')).toBeDefined();

            // 3. Test invalid PIN code
            fireEvent.change(sandboxInput, { target: { value: '999999' } });
            expect(screen.getByText('No matching user or parent PIN found')).toBeDefined();
        });
    });
});
