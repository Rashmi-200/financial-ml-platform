import React, { useState, useRef, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Sun, Moon, LogOut, LogIn, ChevronDown, RefreshCw, Eye, Settings, User } from 'lucide-react';

interface HeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

interface GoogleUser {
  name: string;
  email: string;
  picture: string;
  given_name?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onRefresh,
  isRefreshing,
  theme,
  onToggleTheme,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
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

  /* ── Real Google OAuth Login ── */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user info');
        const data: GoogleUser = await res.json();
        setUser(data);
        setIsAuthModalOpen(false);
        setAuthError(null);
      } catch {
        setAuthError('Could not retrieve profile. Please try again.');
      }
    },
    onError: () => {
      setAuthError('Google sign-in was cancelled or failed. Please try again.');
    },
  });

  const handleSignOut = () => {
    googleLogout();
    setUser(null);
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
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              >
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover ring-1 ring-[var(--accent)]/40"
                />
                <span className="hidden sm:block text-xs font-semibold text-[var(--text-primary)] max-w-[100px] truncate">
                  {user.given_name || user.name}
                </span>
                <ChevronDown className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl p-3 space-y-2 z-50">
                  {/* Profile Card */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--bg-muted)]">
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--accent)]/30"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-[var(--text-primary)] truncate">{user.name}</div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</div>
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-400 border border-cyan-300 dark:border-cyan-500/30">
                        INSTITUTIONAL PRO
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border)] pt-1 space-y-0.5">
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-xl transition-colors cursor-pointer">
                      <User className="w-3.5 h-3.5" /> Profile & Preferences
                    </button>
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] rounded-xl transition-colors cursor-pointer">
                      <Settings className="w-3.5 h-3.5" /> Settings
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
              className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ── Google OAuth Modal ── */}
      {isAuthModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setIsAuthModalOpen(false); setAuthError(null); }}}
        >
          <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-3xl p-7 max-w-sm w-full space-y-5 shadow-2xl text-center">
            {/* Logo */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Sign in to QuantVision</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs mx-auto leading-relaxed">
                  Access institutional quant models, live streaming feeds, and AI-driven trade signals.
                </p>
              </div>
            </div>

            {/* Error */}
            {authError && (
              <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 rounded-xl px-3 py-2">
                {authError}
              </div>
            )}

            {/* Google Sign-In Button */}
            <button
              onClick={() => { setAuthError(null); googleLogin(); }}
              className="w-full py-3 px-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 hover:shadow-md transition-all cursor-pointer"
            >
              {/* Official Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-[11px] text-[var(--text-muted)]">
              By signing in you agree to QuantVision's{' '}
              <span className="text-[var(--accent)] cursor-pointer hover:underline">Terms</span> and{' '}
              <span className="text-[var(--accent)] cursor-pointer hover:underline">Privacy Policy</span>.
            </p>

            <button
              onClick={() => { setIsAuthModalOpen(false); setAuthError(null); }}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};
