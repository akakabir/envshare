import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signOut } from './firebase.ts';
import { ViewState } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthView } from './components/AuthView.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ProjectDetail } from './components/ProjectDetail.tsx';
import { AccountSettings } from './components/AccountSettings.tsx';
import { KeyRound } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>({ type: 'dashboard' });
  const [authMode, setAuthMode] = useState<'landing' | 'signin' | 'signup'>('landing');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setViewState({ type: 'dashboard' });
      setAuthMode('landing');
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 animate-pulse shadow-md shadow-indigo-600/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-600">Loading EnvShare...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user flow
  if (!user) {
    if (authMode === 'landing') {
      return <LandingPage onOpenAuth={(mode) => setAuthMode(mode)} />;
    }

    return (
      <AuthView
        initialMode={authMode}
        onSuccess={() => setViewState({ type: 'dashboard' })}
        onBackToLanding={() => setAuthMode('landing')}
      />
    );
  }

  // Authenticated workspace flow
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased selection:bg-indigo-100 selection:text-indigo-900">
      <Navbar
        user={user}
        viewState={viewState}
        onNavigate={setViewState}
        onSignOut={handleSignOut}
      />

      <main className="flex-1 pb-16">
        {viewState.type === 'dashboard' && (
          <Dashboard
            user={user}
            onSelectProject={(projectId) => setViewState({ type: 'project', projectId })}
          />
        )}

        {viewState.type === 'project' && (
          <ProjectDetail
            projectId={viewState.projectId}
            user={user}
            onBack={() => setViewState({ type: 'dashboard' })}
          />
        )}

        {viewState.type === 'settings' && (
          <AccountSettings
            user={user}
            onAccountDeleted={() => {
              setUser(null);
              setAuthMode('landing');
              setViewState({ type: 'dashboard' });
            }}
          />
        )}
      </main>
    </div>
  );
}
