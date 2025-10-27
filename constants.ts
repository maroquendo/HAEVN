import { Family } from './types';

export const MOCK_FAMILIES: Family[] = [
  { 
    id: 'family_a', 
    name: 'The Millers', 
    avatarUrl: 'https://i.pravatar.cc/150?u=family_a',
    members: [
      { id: 'dad_a', name: 'Marcial (Dad)', avatarUrl: 'https://i.pravatar.cc/150?u=dad', role: 'parent', status: 'active' },
      { id: 'mom_a', name: 'Jane (Mom)', avatarUrl: 'https://i.pravatar.cc/150?u=mom', role: 'parent', status: 'active' },
      { id: 'child_a', name: 'Leo', avatarUrl: 'https://i.pravatar.cc/150?u=child', role: 'child', status: 'active' },
    ]
  },
  { 
    id: 'family_b', 
    name: 'The Wilsons', 
    avatarUrl: 'https://i.pravatar.cc/150?u=family_b',
    members: [
      { id: 'dad_b', name: 'David (Dad)', avatarUrl: 'https://i.pravatar.cc/150?u=dad_b', role: 'parent', status: 'active' },
      { id: 'child_b_1', name: 'Emily', avatarUrl: 'https://i.pravatar.cc/150?u=child_b_1', role: 'child', status: 'active' },
      { id: 'child_b_2', name: 'Chris', avatarUrl: 'https://i.pravatar.cc/150?u=child_b_2', role: 'child', status: 'active' },
    ]
  },
  { 
    id: 'family_c', 
    name: 'The Garcia Family', 
    avatarUrl: 'https://i.pravatar.cc/150?u=family_c',
    members: [
      { id: 'mom_c', name: 'Maria (Mom)', avatarUrl: 'https://i.pravatar.cc/150?u=mom_c', role: 'parent', status: 'active' },
      { id: 'child_c', name: 'Sofia', avatarUrl: 'https://i.pravatar.cc/150?u=child_c', role: 'child', status: 'active' },
    ]
  },
];