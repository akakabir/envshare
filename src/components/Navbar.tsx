import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { KeyRound, LayoutDashboard, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { ViewState } from '../types.ts';

interface NavbarProps {
  user: FirebaseUser;
  viewState: ViewState;
  onNavigate: (view: ViewState) => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  viewState,
  onNavigate,
  onSignOut,
}) => {
  const userInitials = (user.displayName || user.email || 'U')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate({ type: 'dashboard' })}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs group-hover:bg-indigo-700 transition">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 tracking-tight text-lg">EnvShare</span>
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  SECURE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Team Environment Variables</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onNavigate({ type: 'dashboard' })}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
                viewState.type === 'dashboard' || viewState.type === 'project'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              Dashboard
            </button>
          </nav>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate({ type: 'settings' })}
            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition cursor-pointer ${
              viewState.type === 'settings'
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            title="Account Settings"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-6 h-6 rounded-full object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center">
                {userInitials}
              </div>
            )}
            <span className="hidden sm:inline-block max-w-[120px] truncate">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <Settings className="w-4 h-4 text-slate-500" />
          </button>

          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline-block">Log out</span>
          </button>
        </div>
      </div>
    </header>
  );
};
