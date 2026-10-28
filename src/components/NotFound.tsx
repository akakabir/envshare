import React from 'react';
import { Sprout, KeyRound, Compass, ArrowLeft, Home } from 'lucide-react';

interface NotFoundProps {
  onGoHome: () => void;
  onOpenPrivacy?: () => void;
  onOpenTerms?: () => void;
}

export const NotFound: React.FC<NotFoundProps> = ({
  onGoHome,
  onOpenPrivacy,
  onOpenTerms,
}) => {
  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 border-b border-stone-200">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onGoHome}>
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white shadow-sm">
            <Sprout className="w-4 h-4 text-emerald-100" />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-900 text-amber-100 border border-white flex items-center justify-center">
              <KeyRound className="w-2 h-2" />
            </div>
          </div>
          <span className="font-extrabold text-stone-900 text-base tracking-tight">EnvShare</span>
        </div>

        <button
          onClick={onGoHome}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-600 bg-white hover:bg-stone-100 border border-stone-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to App</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto w-full text-center my-auto py-12">
        <div className="relative w-20 h-20 rounded-3xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 mx-auto flex items-center justify-center mb-6 shadow-sm">
          <Compass className="w-10 h-10 animate-spin" style={{ animationDuration: '20s' }} />
          <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-stone-900 text-stone-100 text-[11px] font-mono font-bold">
            404
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          The endpoint you are trying to access doesn&apos;t exist or has moved. Your secrets remain safely encrypted in the eco-vault.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onGoHome}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition cursor-pointer shadow-sm shadow-emerald-700/20"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto w-full pt-6 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 gap-2">
        <span>© 2026 EnvShare Eco-Vault. All rights reserved.</span>
        <div className="flex items-center gap-4">
          {onOpenPrivacy && (
            <button onClick={onOpenPrivacy} className="hover:text-stone-700 transition cursor-pointer underline">
              Privacy Policy
            </button>
          )}
          {onOpenTerms && (
            <button onClick={onOpenTerms} className="hover:text-stone-700 transition cursor-pointer underline">
              Terms of Service
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
