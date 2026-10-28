
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string;
}

export interface UserLookup {
  uid: string;
  email: string;
  displayName?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  ownerEmail: string;
  memberUids: string[];
  memberEmails: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Environment {
  id: string;
  name: string;
  projectId: string;
  memberUids: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
  isSensitive: boolean;
  environmentId: string;
  projectId: string;
  memberUids: string[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface HistoryEntry {
  id: string;
  projectId: string;
  environmentId: string;
  memberUids: string[];
  key: string;
  action: 'create' | 'update' | 'delete' | 'toggle_sensitivity' | 'import';
  actionLabel: string;
  oldValue?: string;
  newValue?: string;
  isSensitive: boolean;
  userId: string;
  userEmail: string;
  timestamp: string;
}

export type ViewState = 
  | { type: 'dashboard' }
  | { type: 'project'; projectId: string; tab?: 'variables' | 'members' | 'history' }
  | { type: 'settings' }
  | { type: 'terms' }
  | { type: 'privacy' }
  | { type: 'notfound' };
