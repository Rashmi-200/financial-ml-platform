import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, LogOut, LogIn, ChevronDown, RefreshCw, Eye, Settings, User as UserIcon, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SignInModal } from './SignInModal';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  theme,
  onToggleTheme,
}) => {
  const { user, logout } = useAuth();
  const [timeStr, setTimeStr] = useState<string>('');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── UTC Clock ── */
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toUTCString().replace(' GMT', ' UTC'));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Close dropdown when clicking outside ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = () => {
    logout();
    setIsProfileOpen(false);
  };

  /* ─── shared class helpers ─── */
  const btnBase =
    'p-2 rounded-xl border transition-all cursor-pointer ' +
    'bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] ' +
    'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

  return (
    <>
      <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-base)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200">

        {/* ── Brand ── */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Eye className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-[var(--text-primary)] font-sans leading-none">
              Quant<span className="text-[var(--accent)]">Vision</span>
            </h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-widest uppercase rounded bg-[var(--bg-muted)] text-[var(--text-muted)] border border-[var(--border-strong)]">
              PRO
            </span>
          </div>
        </div>

        {/* ── Right Controls ── */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* UTC Clock */}
          <span className="hidden lg:block text-xs font-mono text-[var(--text-muted)] tabular-nums">
            {timeStr}
          </span>

          {/* Refresh */}
          {onRefresh && (
            <button onClick={onRefresh} disabled={isRefreshing} className={btnBase} title="Refresh Data">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[var(--accent)]' : ''}`} />
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={btnBase + (theme === 'dark' ? ' hover:text-amber-400' : ' hover:text-indigo-500')}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile / Sign-In */}
          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-[var(--text-primary)] max-w-[120px] truncate">
                  {user.name}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                    user.role === 'admin'
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                      : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30'
                  }`}
                >
                  {user.role.toUpperCase()}
                </span>
                <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl p-3 space-y-2 z-50">
                  {/* Profile Card */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-muted)]">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-base ring-2 ring-[var(--accent)]/30">
                      {user.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
                      <span
                        className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded border ${
                          user.role === 'admin'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
                        }`}
                      >
                        {user.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                        {user.role === 'admin' ? 'ADMINISTRATOR' : 'QUANT TRADER'}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-1 space-y-0.5">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-xl transition-colors cursor-pointer">
                      <UserIcon className="w-3.5 h-3.5" /> Profile & RBAC Info
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-xl transition-colors cursor-pointer">
                      <Settings className="w-3.5 h-3.5" /> Platform Preferences
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <SignInModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
