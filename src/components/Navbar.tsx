import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Sprout, KeyRound, LayoutDashboard, Settings, LogOut, Leaf } from 'lucide-react';
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
    <header className="sticky top-3.5 z-40 px-4 sm:px-6 max-w-5xl mx-auto w-full transition-all">
      <div className="bg-white/90 backdrop-blur-md rounded-full border border-stone-200/90 shadow-lg shadow-stone-900/5 px-4 sm:px-5 py-2 flex items-center justify-between">
        {/* Brand & Logo with Botanical Theme */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => onNavigate({ type: 'dashboard' })}
            className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          >
            {/* Redesigned Botanic Logo: Sprout + Key in Earth & Forest Gradient */}
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Sprout className="w-4 h-4 text-emerald-100" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-900 text-amber-100 border border-white flex items-center justify-center">
                <KeyRound className="w-2 h-2" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-extrabold text-stone-900 tracking-tight text-base">
                EnvShare
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                <Leaf className="w-2.5 h-2.5 text-emerald-600" />
                ECO-VAULT
              </span>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-2 border-l border-stone-200">
            <button
              onClick={() => onNavigate({ type: 'dashboard' })}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer ${
                viewState.type === 'dashboard' || viewState.type === 'project'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Projects</span>
            </button>
          </nav>
        </div>

        {/* User Pill Menu */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate({ type: 'settings' })}
            className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-full transition cursor-pointer ${
              viewState.type === 'settings'
                ? 'bg-stone-900 text-white'
                : 'text-stone-700 hover:bg-stone-100'
            }`}
            title="Account Settings"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Avatar'}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-600/40"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                {userInitials}
              </div>
            )}
            <span className="hidden sm:inline-block max-w-[110px] truncate text-xs">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <Settings className="w-3.5 h-3.5 text-stone-400" />
          </button>

          <button
            onClick={onSignOut}
            className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
