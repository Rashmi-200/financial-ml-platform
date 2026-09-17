import React, { useState } from 'react';
import { ShieldAlert, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SignInModal } from './SignInModal';
import { TabType } from '../types';

interface ProtectedRouteProps {
  requiredRole?: 'admin' | 'user';
  children: React.ReactNode;
  onNavigateToDashboard?: (tab: TabType) => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  requiredRole = 'admin',
  children,
  onNavigateToDashboard,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const hasPermission = isAuthenticated && user && user.role === requiredRole;

  if (hasPermission) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-xl mb-5 animate-pulse">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">
          403 - Restricted Admin Area
        </h2>
        <p className="text-sm text-[var(--text-muted)] max-w-md mt-2 mb-6 leading-relaxed">
          The Admin & MLOps Console requires elevated <span className="font-bold text-rose-400">ADMIN</span> RBAC permissions.
          {!isAuthenticated
            ? ' Please sign in with administrator credentials.'
            : ` Current user (${user?.email}) holds standard '${user?.role}' role.`}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 hover:opacity-90 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign In as Admin
          </button>

          {onNavigateToDashboard && (
            <button
              onClick={() => onNavigateToDashboard('dashboard')}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] font-bold text-xs flex items-center gap-2 hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Dashboard
            </button>
          )}
        </div>
      </div>

      <SignInModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </>
  );
};
