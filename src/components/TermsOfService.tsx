import React from 'react';
import { Shield, FileText, ArrowLeft, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';

interface TermsOfServiceProps {
  onBack?: () => void;
  onOpenPrivacy?: () => void;
  onOpenAuth?: (mode: 'signin' | 'signup') => void;
}

export const TermsOfService: React.FC<TermsOfServiceProps> = ({
  onBack,
  onOpenPrivacy,
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
              <img src="/logo.png" alt="EnvShare logo" className="w-8 h-8 object-contain" />
              <span className="font-extrabold text-stone-900 text-base tracking-tight">EnvShare</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full text-emerald-800 hover:bg-emerald-50 transition cursor-pointer"
              >
                Privacy Policy
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
            <FileText className="w-3.5 h-3.5 text-emerald-600" />
            <span>LEGAL AGREEMENT</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight">
            Terms and Conditions of Service
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
              Acceptance of Terms
            </h2>
            <p>
              Welcome to <strong>EnvShare</strong> (&quot;we&quot;, &quot;our&quot;, or &quot;the Service&quot;). By creating an account, authenticating via Google OAuth or email, or accessing any part of the EnvShare platform, you agree to be bound by these Terms and Conditions. If you do not agree to all terms stated herein, you may not access or use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">2</span>
              Description of the Service
            </h2>
            <p>
              EnvShare provides an secure &quot;Eco-Vault&quot; environment for software development teams to store, synchronize, audit, and share environment configuration variables across environments (e.g., Development, Staging, Production).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">3</span>
              Encryption & Security Responsibilities
            </h2>
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <Lock className="w-4 h-4 text-amber-800" />
                <span>Important Security Disclosure</span>
              </div>
              <p>
                Sensitive variables marked in EnvShare are encrypted server-side using AES-256-GCM with PBKDF2 key derivation before being stored in our Cloud Firestore database.
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>You are responsible for keeping your account credentials secure and for only inviting collaborators you trust, since project members can view decrypted values.</li>
                <li>The master encryption secret is held in Google Cloud Secret Manager and is accessible only to EnvShare&apos;s server-side functions. This is not end-to-end encryption.</li>
              </ul>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">4</span>
              User Accounts & Authentication
            </h2>
            <p>
              You may register using your email and password or authenticate using Google OAuth 2.0. You agree to provide accurate registration information and keep your credentials secure. You are liable for all actions conducted under your authenticated session.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">5</span>
              Collaborator Roles & Workspaces
            </h2>
            <p>
              Projects are owned by the creating user (&quot;Creator / Owner&quot;). Only the Creator may invite, approve, or remove project collaborators. Collaborators may edit non-structural project variables, view permitted environments, or leave the project at will.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">6</span>
              Acceptable Use & Restrictions
            </h2>
            <p>You agree not to use EnvShare to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-stone-600">
              <li>Store or distribute malware, trojans, ransomware, or illicit exploit payloads.</li>
              <li>Attempt to reverse-engineer, circumvent access control rules, or disrupt the Firestore infrastructure.</li>
              <li>Impersonate any person or entity, or register fake email addresses in the user lookup directory.</li>
              <li>Violate any local, national, or international privacy and data protection laws.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">7</span>
              Termination & Permanent Account Deletion
            </h2>
            <p>
              You may terminate your account at any time through the Account Settings portal. Deleting your account is permanent: it immediately cascades and deletes all owned project workspaces, removes collaborator permissions, clears lookup profiles, and permanently erases your credentials.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">8</span>
              Disclaimer of Warranties & Limitation of Liability
            </h2>
            <p className="text-xs text-stone-600">
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. UNDER NO CIRCUMSTANCES SHALL ENVSHARE OR ITS MAINTAINERS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM THE USE OF OR INABILITY TO USE THE SERVICE, LOSS OF SECRETS, OR UNINTENDED SYSTEM DISRUPTIONS.
            </p>
          </section>

          <section className="space-y-3 pt-4 border-t border-stone-100">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">9</span>
              Contact Information
            </h2>
            <p className="text-xs text-stone-600">
              For questions regarding these Terms and Conditions or security disclosures, please reach out to our team at{' '}
              <a href="mailto:support@envshare.app" className="text-emerald-700 font-semibold underline hover:text-emerald-800">
                support@envshare.app
              </a>.
            </p>
          </section>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-8 flex items-center justify-between text-xs text-stone-500">
          <span>© 2026 EnvShare. All rights reserved.</span>
          <div className="flex items-center gap-4">
            {onOpenPrivacy && (
              <button
                type="button"
                onClick={onOpenPrivacy}
                className="hover:text-stone-900 transition underline cursor-pointer"
              >
                Privacy Policy
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
