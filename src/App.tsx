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
import { NotFound } from './components/NotFound.tsx';

interface ParsedRoute {
  screen: 'landing' | 'signin' | 'signup' | 'privacy' | 'terms' | 'projects' | 'project' | 'settings' | 'notfound';
  projectId?: string;
  tab?: 'variables' | 'members' | 'history';
}

function parseRoute(pathname: string): ParsedRoute {
  const clean = pathname.replace(/\/+$/, '').toLowerCase();
  if (clean === '' || clean === '/') return { screen: 'landing' };
  if (clean === '/login' || clean === '/signin') return { screen: 'signin' };
  if (clean === '/signup' || clean === '/register') return { screen: 'signup' };
  if (clean === '/privacy') return { screen: 'privacy' };
  if (clean === '/terms' || clean === '/tos') return { screen: 'terms' };
  if (clean === '/settings' || clean === '/account') return { screen: 'settings' };
  if (clean === '/projects' || clean === '/dashboard') return { screen: 'projects' };
  if (clean === '/404') return { screen: 'notfound' };

  // Match /projects/:projectId or /project/:projectId (and /variables, /members, /history)
  const segments = clean.split('/').filter(Boolean);
  if (segments[0] === 'projects' || segments[0] === 'project') {
    const pId = segments[1];
    if (!pId) return { screen: 'projects' };
    const sub = segments[2];
    if (sub === 'members') return { screen: 'project', projectId: pId, tab: 'members' };
    if (sub === 'history') return { screen: 'project', projectId: pId, tab: 'history' };
    if (sub === 'variables' || !sub) return { screen: 'project', projectId: pId, tab: 'variables' };
    return { screen: 'notfound' };
  }

  // Direct shortcuts: /variables, /members, /history
  if (clean === '/variables' || clean === '/members' || clean === '/history') {
    const lastPId = localStorage.getItem('last_project_id');
    const tab = clean.slice(1) as 'variables' | 'members' | 'history';
    if (lastPId) {
      return { screen: 'project', projectId: lastPId, tab };
    }
    return { screen: 'projects' };
  }

  return { screen: 'notfound' };
}

function getRoutePath(user: FirebaseUser | null, viewState: ViewState, authMode: string): string {
  if (!user) {
    if (authMode === 'signin') return '/login';
    if (authMode === 'signup') return '/signup';
    if (authMode === 'privacy') return '/privacy';
    if (authMode === 'terms') return '/tos';
    if (authMode === 'notfound') return '/404';
    return '/';
  }

  // Authenticated flow
  if (viewState.type === 'dashboard') return '/projects';
  if (viewState.type === 'project') {
    const tab = viewState.tab || 'variables';
    if (tab === 'members') return `/projects/${viewState.projectId}/members`;
    if (tab === 'history') return `/projects/${viewState.projectId}/history`;
    return `/projects/${viewState.projectId}/variables`;
  }
  if (viewState.type === 'settings') return '/settings';
  if (viewState.type === 'privacy') return '/privacy';
  if (viewState.type === 'terms') return '/tos';
  if (viewState.type === 'notfound') return '/404';
  return '/projects';
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize view state based on current URL
  const [viewState, setViewState] = useState<ViewState>(() => {
    const route = parseRoute(window.location.pathname);
    if (route.screen === 'privacy') return { type: 'privacy' };
    if (route.screen === 'terms') return { type: 'terms' };
    if (route.screen === 'settings') return { type: 'settings' };
    if (route.screen === 'project' && route.projectId) {
      return { type: 'project', projectId: route.projectId, tab: route.tab || 'variables' };
    }
    if (route.screen === 'notfound') return { type: 'notfound' };
    return { type: 'dashboard' };
  });

  const [authMode, setAuthMode] = useState<string>(() => {
    const route = parseRoute(window.location.pathname);
    if (route.screen === 'signin') return 'signin';
    if (route.screen === 'signup') return 'signup';
    if (route.screen === 'privacy') return 'privacy';
    if (route.screen === 'terms') return 'terms';
    if (route.screen === 'notfound') return 'notfound';
    return 'landing';
  });

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

  // Keep address bar URL synchronized with current state
  useEffect(() => {
    if (loading) return;

    if (viewState.type === 'project' && viewState.projectId) {
      try {
        localStorage.setItem('last_project_id', viewState.projectId);
      } catch {
        // ignore
      }
    }

    const targetPath = getRoutePath(user, viewState, authMode);
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, [user, viewState, authMode, loading]);

  // Handle browser back and forward buttons
  useEffect(() => {
    const onPopState = () => {
      const route = parseRoute(window.location.pathname);
      if (route.screen === 'privacy') {
        setAuthMode('privacy');
        setViewState({ type: 'privacy' });
      } else if (route.screen === 'terms') {
        setAuthMode('terms');
        setViewState({ type: 'terms' });
      } else if (route.screen === 'signin') {
        setAuthMode('signin');
      } else if (route.screen === 'signup') {
        setAuthMode('signup');
      } else if (route.screen === 'settings') {
        setViewState({ type: 'settings' });
      } else if (route.screen === 'project' && route.projectId) {
        setViewState({ type: 'project', projectId: route.projectId, tab: route.tab || 'variables' });
      } else if (route.screen === 'notfound') {
        setAuthMode('notfound');
        setViewState({ type: 'notfound' });
      } else if (route.screen === 'projects') {
        setViewState({ type: 'dashboard' });
      } else {
        setAuthMode('landing');
        setViewState({ type: 'dashboard' });
      }
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
          {/* CHANGED: logo image replaces the Sprout + KeyRound icon block */}
          <img src="/logo.png" alt="EnvShare logo" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-sm font-medium text-stone-600">Loading EnvShare...</p>
        </div>
      </div>
    );
  }

  // Unauthenticated user flow
  if (!user) {
    if (authMode === 'notfound') {
      return (
        <NotFound
          onGoHome={() => setAuthMode('landing')}
          onOpenPrivacy={() => setAuthMode('privacy')}
          onOpenTerms={() => setAuthMode('terms')}
        />
      );
    }

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
        initialMode={authMode === 'signup' ? 'signup' : 'signin'}
        onModeChange={(mode) => setAuthMode(mode)}
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
        {viewState.type === 'notfound' && (
          <NotFound
            onGoHome={() => setViewState({ type: 'dashboard' })}
            onOpenPrivacy={() => setViewState({ type: 'privacy' })}
            onOpenTerms={() => setViewState({ type: 'terms' })}
          />
        )}

        {viewState.type === 'dashboard' && (
          <Dashboard
            user={user}
            onSelectProject={(projectId) =>
              setViewState({ type: 'project', projectId, tab: 'variables' })
            }
          />
        )}

        {viewState.type === 'project' && (
          <ProjectDetail
            projectId={viewState.projectId}
            initialTab={viewState.tab || 'variables'}
            onTabChange={(tab) =>
              setViewState({ type: 'project', projectId: viewState.projectId, tab })
            }
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