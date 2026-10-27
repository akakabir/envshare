import React from 'react';
import { Sprout, KeyRound, Shield, Lock, EyeOff, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  onOpenTerms?: () => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  onBack,
  onOpenTerms,
  onOpenAuth,
}) => {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-200">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white shadow-sm">
                <Sprout className="w-4 h-4 text-emerald-100" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-900 text-amber-100 border border-white flex items-center justify-center">
                  <KeyRound className="w-2 h-2" />
                </div>
              </div>
              <span className="font-extrabold text-stone-900 text-base tracking-tight">EnvShare</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
              >
                Terms & Conditions
              </button>
            )}
            {onOpenAuth && (
              <button
                type="button"
                onClick={() => onOpenAuth('signup')}
                className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-semibold rounded-full text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Hero Title */}
        <div className="mb-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 mb-3">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>DATA PRIVACY & PROTECTION</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            Last Updated: October 27, 2026 • Effective Date: October 27, 2026
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 sm:p-10 space-y-8 text-stone-700 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">1</span>
              Our Privacy Commitment
            </h2>
            <p>
              At <strong>EnvShare</strong>, protecting your sensitive environment variables and privacy is fundamental to our architecture. This Privacy Policy details what information we collect, how server-side encryption protects your secrets, and the choices available to you regarding your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">2</span>
              Information We Collect
            </h2>
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <span className="font-semibold text-stone-900 block">A. Account & Profile Data</span>
                <p className="text-stone-600">
                  When you sign in with Google OAuth or register an account, we receive your email address, display name, and profile picture URL. We use this strictly to identify your session and permit project collaborators to invite you by email.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <span className="font-semibold text-stone-900 block">B. Project & Environment Metadata</span>
                <p className="text-stone-600">
                  We store names, descriptions, environment labels (e.g., Development, Staging, Production), member email arrays, and variable key names.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 text-xs space-y-1">
                <span className="font-semibold text-stone-900 block">C. Immutable Audit Logs</span>
                <p className="text-stone-600">
                  To provide project security auditing, the system records creation, update, deletion, and import actions along with the acting user's email and timestamp. Sensitive values are always masked as <code className="font-mono text-stone-800 bg-stone-200/60 px-1 py-0.5 rounded">••••••••</code> in the audit trail.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">3</span>
              Server-Side Encryption of Sensitive Values
            </h2>
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <EyeOff className="w-4 h-4 text-emerald-800" />
                <span>How Your Secrets Are Protected</span>
              </div>
              <p>
                Any environment variable designated as <strong>Sensitive</strong> is encrypted by a Firebase Cloud Function using <strong>AES-256-GCM</strong>, with a per-project key derived via PBKDF2 (SHA-256, 310,000 iterations).
              </p>
              <ul className="list-disc pl-4 space-y-1 text-emerald-900/90">
                <li>Values travel over HTTPS to the encryption function, which verifies you are signed in and a member of the project.</li>
                <li>Firebase Cloud Firestore stores only Base64-encoded Salt + IV + Ciphertext.</li>
                <li>The master secret is held in Google Cloud Secret Manager and is accessible only to our Cloud Functions, never to your browser. Because the service holds this key, this is not end-to-end (zero-knowledge) encryption.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">4</span>
              How We Use Your Information
            </h2>
            <p>Your data is used solely to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-600">
              <li>Authenticate your identity and manage team access permissions.</li>
              <li>Enable secure real-time synchronization of project variables among authorized members.</li>
              <li>Provide transparency through immutable change logs.</li>
              <li>We never sell, rent, or monetize your personal information or environment variable data.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">5</span>
              Third-Party Service Providers
            </h2>
            <p className="text-xs text-stone-600">
              EnvShare relies on Google Cloud and Firebase services for infrastructure:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
              <li><strong>Firebase Authentication & Google OAuth:</strong> For secure sign-in tokens and user identity verification.</li>
              <li><strong>Cloud Functions & Secret Manager:</strong> For server-side encryption and decryption of sensitive values.</li>
              <li><strong>Cloud Firestore:</strong> For encrypted database storage, real-time sync, and security rule enforcement.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">6</span>
              Browser Storage
            </h2>
            <p className="text-xs text-stone-600">
              EnvShare does not store encryption keys or passphrases in your browser. Firebase Authentication keeps a session token in your browser so you stay signed in. We do not use advertising or analytics trackers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">7</span>
              Data Retention & Permanent Erasure (Right to Be Forgotten)
            </h2>
            <p className="text-xs text-stone-600">
              You retain full control over your data. Deleting your account in Account Settings will immediately and irreversibly:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-stone-600">
              <li>Permanently delete all projects and subcollections owned by you.</li>
              <li>Remove your UID and email from all shared collaborator projects.</li>
              <li>Delete your public user lookup directory listing.</li>
              <li>Delete your Firebase Authentication profile.</li>
            </ul>
          </section>

          <section className="space-y-3 pt-4 border-t border-stone-100">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">8</span>
              Contact Us
            </h2>
            <p className="text-xs text-stone-600">
              If you have any questions or concerns regarding our privacy practices, please contact our Data Protection Officer at{' '}
              <a href="mailto:privacy@envshare.app" className="text-emerald-700 font-semibold underline hover:text-emerald-800">
                privacy@envshare.app
              </a>.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex items-center justify-between text-xs text-stone-500">
          <span>© 2026 EnvShare. All rights reserved.</span>
          <div className="flex items-center gap-4">
            {onOpenTerms && (
              <button
                type="button"
                onClick={onOpenTerms}
                className="hover:text-stone-900 transition underline cursor-pointer"
              >
                Terms & Conditions
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="hover:text-stone-900 transition underline cursor-pointer"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
