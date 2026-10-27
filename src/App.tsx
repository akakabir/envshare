import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, signOut, getRedirectResult, syncUserProfile } from './firebase.ts';
import { ViewState } from './types.ts';
import { Navbar } from './components/Navbar.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { AuthView } from './components/AuthView.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { ProjectDetail } from './components/ProjectDetail.tsx';
import { AccountSettings } from './components/AccountSettings.tsx';
import { TermsOfService } from './components/TermsOfService.tsx';
import { PrivacyPolicy } from './components/PrivacyPolicy.tsx';
import { KeyRound, Sprout } from 'lucide-react';

type LegalPage = 'privacy' | 'terms';

// Maps the browser URL to a public legal page so /privacy and /tos are real,
// shareable URLs (needed for the Google OAuth consent screen).
const legalPageFromPath = (): LegalPage | null => {
  const p = window.location.pathname.replace(/\/+$/, '');
  return p === '/privacy' ? 'privacy' : (p === '/terms' || p === '/tos') ? 'terms' : null;
};

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewState, setViewState] = useState<ViewState>(() => {
    const legal = legalPageFromPath();
    return legal ? { type: legal } : { type: 'dashboard' };
  });
  const [authMode, setAuthMode] = useState<'landing' | 'signin' | 'signup' | 'terms' | 'privacy'>(
    () => legalPageFromPath() ?? 'landing'
  );

  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          syncUserProfile(result.user);
        }
      })
      .catch((err) => {
        console.error('Redirect sign-in error:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Keep the address bar in sync with the legal pages.
  useEffect(() => {
    if (loading) return;
    const screen = user ? viewState.type : authMode;
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const path = screen === 'privacy'
      ? '/privacy'
      : screen === 'terms'
        ? (currentPath === '/terms' ? '/terms' : '/tos')
        : '/';
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  }, [user, viewState, authMode, loading]);

  // Browser back/forward buttons.
  useEffect(() => {
    const onPopState = () => {
      const legal = legalPageFromPath();
      setAuthMode(legal ?? 'landing');
      setViewState(legal ? { type: legal } : { type: 'dashboard' });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
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
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white mx-auto mb-4 animate-pulse shadow-md shadow-emerald-700/20">
            <Sprout className="w-6 h-6 text-emerald-100" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-900 text-amber-100 border border-white flex items-center justify-center">
              <KeyRound className="w-2.5 h-2.5" />
            </div>
          </div>
          <p className="text-sm font-medium text-stone-600">Loading EnvShare...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user flow
  if (!user) {
    if (authMode === 'terms') {
      return (
        <TermsOfService
          onBack={() => setAuthMode('landing')}
          onOpenPrivacy={() => setAuthMode('privacy')}
          onOpenAuth={(mode) => setAuthMode(mode)}
        />
      );
    }

    if (authMode === 'privacy') {
      return (
        <PrivacyPolicy
          onBack={() => setAuthMode('landing')}
          onOpenTerms={() => setAuthMode('terms')}
          onOpenAuth={(mode) => setAuthMode(mode)}
        />
      );
    }

    if (authMode === 'landing') {
      return (
        <LandingPage
          onOpenAuth={(mode) => setAuthMode(mode)}
          onOpenTerms={() => setAuthMode('terms')}
          onOpenPrivacy={() => setAuthMode('privacy')}
        />
      );
    }

    return (
      <AuthView
        initialMode={authMode}
        onSuccess={() => setViewState({ type: 'dashboard' })}
        onBackToLanding={() => setAuthMode('landing')}
        onOpenTerms={() => setAuthMode('terms')}
        onOpenPrivacy={() => setAuthMode('privacy')}
      />
    );
  }

  // Authenticated workspace flow
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col text-stone-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
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

        {viewState.type === 'terms' && (
          <TermsOfService
            onBack={() => setViewState({ type: 'dashboard' })}
            onOpenPrivacy={() => setViewState({ type: 'privacy' })}
          />
        )}

        {viewState.type === 'privacy' && (
          <PrivacyPolicy
            onBack={() => setViewState({ type: 'dashboard' })}
            onOpenTerms={() => setViewState({ type: 'terms' })}
          />
        )}
      </main>
    </div>
  );
}
