import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import bs58 from 'bs58';
import { useAuth } from './AuthContext';
import { getProfile, saveProfile, logTip } from '../utils/database';

const AppContext = createContext(null);

const STORAGE_KEY = 'creator_hub_state';

const defaultState = {
  onboardingStep: 0,
  onboardingComplete: false,
  profile: {
    avatarUrl: null,
    avatarType: 'none', // none, nft, social, uploaded
    solDomain: '',
    displayName: '',
    bio: '',
    roleTitle: '',
    roleTier: null,
    category: null,
    location: '',
    link: '',
    preferences: {
      generationSound: 'first', // first, always, never
    },
    socials: {
      twitter: null,
      discord: null,
      youtube: null,
      instagram: null,
      pinterest: null,
      github: null,
      isTwitterVerified: false,
      isDiscordVerified: false,
    },
    referralId: '', // Will be set to username
    referrals: [], // Real referral data only
  },
  nfts: [],
  nftsLoading: false,
  tipsReceived: [],
  tipsSent: [],
  kaminoPositions: [],
  totalTipsUSDC: 0,
  kaminoDeposited: 0,
  kaminoEarnings: 0,
  creatorVault: {
    isAutonomous: false,
    rebalanceThreshold: 0.05,
    autoStakeEnabled: true,
  }
};

export function AppProvider({ children }) {
  const { publicKey, connected, wallet, signMessage } = useWallet();
  const { user: authUser, loading: authLoading } = useAuth();
  const pubkeyStr = publicKey?.toBase58() || (authUser ? `auth_${authUser.id}` : null);

  const [state, setState] = useState(defaultState);
  const [dbSynced, setDbSynced] = useState(false);
  const [agent, setAgent] = useState(null);

  // ─── Initialize AI Agent ───
  useEffect(() => {
    const initAgent = async () => {
      if (connected && wallet && pubkeyStr) {
        try {
          // Initialize interface for Phase 2 autonomous actions
          setAgent({
            id: 'tiplnk-agent-01',
            status: 'active',
            capabilities: ['rebalance', 'autostake', 'airdrop']
          });
        } catch (err) {
          console.error('Agent Init Error:', err);
        }
      } else {
        setAgent(null);
      }
    };
    initAgent();
  }, [connected, wallet, pubkeyStr]);

  // ─── Phase 1: Local Cache Hydration ───
  useEffect(() => {
    if (pubkeyStr) {
      const saved = localStorage.getItem(`${STORAGE_KEY}_${pubkeyStr}`);
      if (saved) {
        setState({ ...defaultState, ...JSON.parse(saved) });
      } else {
        setState(defaultState);
      }
    } else {
      setState(defaultState);
    }
  }, [pubkeyStr]);

  // ─── Phase 2: Professional Supabase Sync ───
  useEffect(() => {
    const syncWithDb = async () => {
      if (pubkeyStr && !dbSynced) {
        try {
            const dbProfile = await getProfile(pubkeyStr);
            if (dbProfile) {
            setState(prev => {
                const newState = { ...prev, ...dbProfile, profile: { ...prev.profile, ...dbProfile } };

                // ─── ELITE ONBOARDING RESOLUTION ───
                if (dbProfile.onboardingComplete === true) {
                    newState.onboardingComplete = true;
                }

                // Restore socials correctly into the nested structure if they exist at root
                if (dbProfile.twitterHandle || dbProfile.discordHandle) {
                  newState.profile.socials = {
                    ...newState.profile.socials,
                    twitter: dbProfile.twitterHandle || newState.profile.socials.twitter,
                    discord: dbProfile.discordHandle || newState.profile.socials.discord,
                    isTwitterVerified: !!dbProfile.twitterHandle,
                    isDiscordVerified: !!dbProfile.discordHandle,
                  };
                }
                return newState;
            });
            }
            setDbSynced(true);
        } catch (err) {
            console.error('🛡️ AppContext: Sync fault. Using local state.', err);
            setDbSynced(true); 
        }
      }
    };
    syncWithDb();
  }, [pubkeyStr, dbSynced]);

  // Reset sync flag on disconnect
  useEffect(() => {
    if (!pubkeyStr) {
      setDbSynced(false);
    }
  }, [pubkeyStr]);

  // ─── Phase 3: Persistence ───
  useEffect(() => {
    if (pubkeyStr && state !== defaultState) {
      // Local Cache
      localStorage.setItem(`${STORAGE_KEY}_${pubkeyStr}`, JSON.stringify(state));

      // ─── ELITE SYNC GUARD ───
      // Only sync if we have a real auth session.
      if (authUser) {
        if (!authUser.walletAddress || authUser.walletAddress === publicKey?.toBase58()) {
          // Sync just the profile data and onboarding status
          saveProfile(pubkeyStr, {
            ...state.profile,
            onboardingComplete: state.onboardingComplete
          });
        }
      }
    }
  }, [state, pubkeyStr, authUser, publicKey]);

  const role = useMemo(() => {
    if (authLoading) return 'guest'; // Hold until auth state is known

    // Elite Fix: Wallet connection alone does not grant a backend session.
    if (!authUser) return 'guest';

    // Elite Admin Shortcut: Admins are always creators
    const isAdmin = authUser?.roles?.includes('admin');
    
    // ─── ELITE ROLE CALCULATION ───
    // 'creator' now strictly means 'onboarding complete'
    // 'user' means authenticated but setup is pending
    if (isAdmin || state.onboardingComplete) return 'creator';

    return 'user';
  }, [authUser, authLoading, state.onboardingComplete]);

  const update = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((partial) => {
    setState((prev) => {
      const newProfile = { ...prev.profile, ...partial };

      // ─── Deep Social Merging ───
      if (partial.socials) {
        newProfile.socials = {
          ...prev.profile.socials,
          ...partial.socials
        };
      }

      // Auto-generate referralId from username/domain if missing
      if (!newProfile.referralId) {
        const baseName = newProfile.solDomain
          ? newProfile.solDomain.replace('.tiplnk.sol', '')
          : (newProfile.displayName || '').toLowerCase().replace(/\s+/g, '');

        if (baseName) {
          newProfile.referralId = baseName;
        }
      }

      return {
        ...prev,
        profile: newProfile,
      };
    });
  }, []);

  const addTip = useCallback((tip, isSent = false) => {
    setState((prev) => {
      const newState = { ...prev };
      if (isSent) {
        newState.tipsSent = [tip, ...prev.tipsSent];
      } else {
        newState.tipsReceived = [tip, ...prev.tipsReceived];
        newState.totalTipsUSDC = prev.totalTipsUSDC + tip.amountUSDC;
      }
      return newState;
    });
  }, [pubkeyStr]);

  const claimHandle = useCallback(async (handle) => {
    if (!publicKey || !signMessage) throw new Error('Wallet connection required for handle verification.');
    
    const message = `Claiming TipLnk handle: ${handle}`;
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await signMessage(encodedMessage);
    const signatureBase58 = bs58.encode(signature);

    // Explicit sync for handle claim with verification
    const result = await saveProfile(pubkeyStr, { ...state.profile, solDomain: handle }, signatureBase58, message);
    
    if (result.success) {
        updateProfile({ solDomain: handle });
        return { success: true };
    } else {
        throw new Error(result.error || 'Failed to verify handle claim.');
    }
  }, [publicKey, signMessage, pubkeyStr, state.profile, updateProfile]);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    if (pubkeyStr) {
      localStorage.removeItem(`${STORAGE_KEY}_${pubkeyStr}`);
    }
  }, [pubkeyStr]);

  return (
    <AppContext.Provider value={{ ...state, role, dbSynced, agent, update, updateProfile, claimHandle, addTip, resetOnboarding, publicKey, connected, authUser, authLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
