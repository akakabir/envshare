import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  updateProfile,
  auth,
  googleProvider,
  syncUserProfile,
  getFriendlyAuthErrorMessage,
} from '../firebase.ts';
import {
  KeyRound,
  Shield,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sprout,
  Leaf,
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'signin' | 'signup';
  onSuccess?: () => void;
  onBackToLanding?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signin',
  onSuccess,
  onBackToLanding,
}) => {
  const [isSignUp, setIsSignUp] = useState(initialMode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Invalid email address format.');
      return false;
    }
    if (!password) {
      setError('Please enter your password.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        if (name.trim()) {
          await updateProfile(userCred.user, { displayName: name.trim() });
        }
        await syncUserProfile(userCred.user, name.trim());
      } else {
        const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);
        await syncUserProfile(userCred.user);
      }
      onSuccess?.();
    } catch (err: any) {
      setError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const userCred = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(userCred.user);
      onSuccess?.();
    } catch (err: any) {
      if (err.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          setError(getFriendlyAuthErrorMessage(redirectErr));
        }
      } else {
        setError(getFriendlyAuthErrorMessage(err));
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition cursor-pointer"
          >
            ← Back to Features Overview
          </button>
        )}

        {/* Brand Header with Eco-Vault Sprout Logo */}
        <div className="flex justify-center">
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
            <Sprout className="w-6 h-6 text-emerald-100" />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-900 text-amber-100 border border-white flex items-center justify-center">
              <KeyRound className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        <h2 className="mt-4 text-center text-2xl font-extrabold tracking-tight text-stone-900">
          EnvShare
        </h2>
        <p className="mt-1 text-center text-sm text-stone-500">
          A protected eco-vault for your team's environment variables
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-3xl sm:px-10">
          {/* Mode Switch Tabs */}
          <div className="flex rounded-full bg-stone-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                !isSignUp
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                isSignUp
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-800 flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Form */}
          <form className="space-y-4" onSubmit={handleEmailAuth}>
            {isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm shadow-xs transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@company.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm shadow-xs transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 text-sm shadow-xs transition"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Must be at least 6 characters
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition cursor-pointer"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{isSignUp ? 'Create EnvShare Account' : 'Sign In'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-stone-400 font-medium">or</span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <div className="mt-5">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading || googleLoading}
                className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium rounded-full text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100 border border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-stone-400 border-t-stone-800 rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Security Assurance Badges */}
          <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              Role Access
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-800" />
              AES-256 Secrets
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Audit Log
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
