import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  User as FirebaseUser,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  signInWithRedirect,
  getRedirectResult,
  EmailAuthProvider,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocFromServer,
  arrayUnion,
  arrayRemove,
  getDocs,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, UserLookup } from './types.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export function emailToKey(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
}

export async function syncUserProfile(user: FirebaseUser, customName?: string) {
  if (!user.email) return;
  const lookupKey = emailToKey(user.email);
  const now = new Date().toISOString();
  const displayName = customName || user.displayName || user.email.split('@')[0];

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const existingSnap = await getDoc(userDocRef);

    const profileData: UserProfile = {
      uid: user.uid,
      email: user.email.toLowerCase(),
      displayName,
      createdAt: existingSnap.exists() ? (existingSnap.data() as UserProfile).createdAt || now : now,
    };
    if (user.photoURL) {
      profileData.photoURL = user.photoURL;
    }

    await setDoc(userDocRef, profileData, { merge: true });

    const lookupDocRef = doc(db, 'userLookup', lookupKey);
    const lookupData: UserLookup = {
      uid: user.uid,
      email: user.email.toLowerCase(),
      displayName,
    };
    await setDoc(lookupDocRef, lookupData);
  } catch (err) {
    console.error('Failed to sync user profile:', err);
  }
}

export function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong password or email. Please check your credentials.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address. Please log in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please enable popups.';
    case 'auth/requires-recent-login':
      return 'This sensitive operation requires recent login. Please log in again before deleting your account.';
    case 'auth/too-many-requests':
      return 'Access temporarily blocked due to many failed attempts. Try again later.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for OAuth sign-in. Please add it to Authorized Domains in the Firebase Console.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in your Firebase project. Please enable it in Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials. Please sign in using your existing provider.';
    case 'auth/cancelled-popup-request':
      return 'Only one sign-in popup can be active at a time. The previous popup request was cancelled.';
    default:
      if (message.includes('auth/')) {
        return message.replace(/^Firebase:\s*/, '');
      }
      return message || 'Authentication failed. Please try again.';
  }
}

export {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  reauthenticateWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  getDocs,
};
