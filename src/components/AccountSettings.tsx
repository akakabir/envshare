import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import {
  deleteUser,
  db,
  doc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayRemove,
  emailToKey,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  googleProvider,
  EmailAuthProvider,
  getFriendlyAuthErrorMessage,
} from '../firebase.ts';
import {
  User as UserIcon,
  Mail,
  Shield,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface AccountSettingsProps {
  user: FirebaseUser;
  onAccountDeleted: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({
  user,
  onAccountDeleted,
}) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isPasswordProvider = user.providerData.some(
    (p) => p.providerId === 'password'
  );

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationInput !== 'DELETE') {
      setDeleteError('Please type DELETE exactly to confirm.');
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      if (isPasswordProvider) {
        if (passwordInput && user.email) {
          const credential = EmailAuthProvider.credential(user.email, passwordInput);
          await reauthenticateWithCredential(user, credential);
        }
      } else {
        // Google-only user: reauthenticate with Google popup before deleting
        await reauthenticateWithPopup(user, googleProvider);
      }

      const ownedProjectsQuery = query(
        collection(db, 'projects'),
        where('ownerId', '==', user.uid)
      );
      const ownedSnap = await getDocs(ownedProjectsQuery);
      const deleteProjectPromises = ownedSnap.docs.map((docSnap) =>
        deleteDoc(doc(db, 'projects', docSnap.id))
      );
      await Promise.all(deleteProjectPromises);

      if (user.email) {
        const sharedProjectsQuery = query(
          collection(db, 'projects'),
          where('memberUids', 'array-contains', user.uid)
        );
        const sharedSnap = await getDocs(sharedProjectsQuery);
        const leaveProjectPromises = sharedSnap.docs
          .filter((docSnap) => docSnap.data().ownerId !== user.uid)
          .map((docSnap) =>
            updateDoc(doc(db, 'projects', docSnap.id), {
              memberUids: arrayRemove(user.uid),
              memberEmails: arrayRemove(user.email?.toLowerCase()),
              updatedAt: new Date().toISOString(),
            })
          );
        await Promise.all(leaveProjectPromises);
      }

      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch (err) {
        console.warn('Could not delete user profile doc:', err);
      }

      if (user.email) {
        try {
          const lookupKey = emailToKey(user.email);
          await deleteDoc(doc(db, 'userLookup', lookupKey));
        } catch (err) {
          console.warn('Could not delete user lookup doc:', err);
        }
      }

      await deleteUser(user);
      onAccountDeleted();
    } catch (err: any) {
      console.error('Account deletion failed:', err);
      if (err.code === 'auth/requires-recent-login') {
        setDeleteError(
          'Security verification needed: please enter your password above or log out and log back in, then retry.'
        );
      } else {
        setDeleteError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const providerNames = user.providerData
    .map((p) => (p.providerId === 'google.com' ? 'Google' : 'Email & Password'))
    .join(', ') || 'Email & Password';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-stone-500 mt-1">
          Manage your EnvShare user profile, security details, and account preferences
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-6">
            <UserIcon className="w-5 h-5 text-emerald-700" />
            <h2 className="text-base font-bold text-stone-900">User Profile</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-stone-100">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover ring-2 ring-emerald-50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xl flex items-center justify-center">
                {(user.displayName || user.email || 'U').slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-stone-900">
                {user.displayName || 'No display name'}
              </h3>
              <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-0.5">
                <Mail className="w-4 h-4 text-stone-400" />
                {user.email}
              </p>
            </div>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <dt className="text-stone-400 font-medium">Authentication Provider</dt>
              <dd className="text-stone-900 font-semibold mt-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                {providerNames}
              </dd>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-100">
              <dt className="text-stone-400 font-medium">User Identifier (UID)</dt>
              <dd className="text-stone-900 font-mono mt-1 truncate" title={user.uid}>
                {user.uid}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-rose-200 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold">Danger Zone</h2>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed mb-6">
            Deleting your account is permanent. It will permanently delete all projects you created, remove your collaborator privileges from any shared projects, and erase your account data.
          </p>

          <button
            type="button"
            onClick={() => {
              setConfirmationInput('');
              setPasswordInput('');
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-full text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-md w-full p-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-stone-900 mb-1">Permanently Delete Account?</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              This action <strong>cannot be undone</strong>. Your owned projects will be permanently deleted and you will be removed from all team workspaces.
            </p>

            {deleteError && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleDeleteAccount} className="space-y-4">
              {isPasswordProvider ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Enter your current password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm shadow-xs transition"
                  />
                  <span className="text-[11px] text-stone-400 mt-1 block">
                    Required by Firebase to authorize account deletion.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>You will be prompted to re-authenticate with Google before your account is deleted.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Type <span className="font-mono text-rose-600 bg-rose-50 px-1 py-0.5 rounded">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="DELETE"
                  required
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 text-sm shadow-xs transition font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  disabled={deleteLoading}
                  className="px-4 py-2 text-sm font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 border border-stone-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleteLoading || confirmationInput !== 'DELETE'}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold rounded-full text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer"
                >
                  {deleteLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
