import { Navigate, useLocation } from 'react-router-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useApp } from '../contexts/AppContext';

/**
 * Route guard that enforces Role-Based Access Control (RBAC).
 *
 * Current Roles:
 * - guest: No wallet connected
 * - user: Wallet connected, ONBOARDING incomplete
 * - creator: Wallet connected, ONBOARDING complete
 */
export default function RequireAuth({ children, requiredRole }) {
  const { role, dbSynced } = useApp();
  const location = useLocation();

  // ─── Phase 1: Deep Sync Check ───
  // If we have a wallet but haven't checked the DB yet, show a loader to prevent flickers
  const { connected } = useWallet();
  if (connected && !dbSynced) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-surface-400 animate-pulse">Monitor your Growth</p>
        </div>
      </div>
    );
  }

  // If the user isn't minimally a 'user' (i.e. no wallet), and we need higher privileges
  if (role === 'guest' && requiredRole !== 'guest') {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requiredRole === 'creator') {
    if (role === 'user') {
      return <Navigate to="/onboarding" replace />;
    } else if (role !== 'creator') {
      return <Navigate to="/" replace />;
    }
  }

  if (requiredRole === 'user') {
    // If they are already a creator, they shouldn't be here (e.g. going to /onboarding)
    if (role === 'creator') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
