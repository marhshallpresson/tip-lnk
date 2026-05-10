import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useWallet } from './WalletContext';
import bs58 from 'bs58';
import { useAuth } from './AuthContext';
import { getProfile, saveProfile } from '../utils/database';

const AppContext = createContext(null);

const STORAGE_KEY = 'creator_hub_state';

const defaultState = {
  onboardingStep: 0,
  onboardingComplete: false,
  profile: {
    avatarUrl: null,
    avatarType: 'none',
    solDomain: '',
    displayName: '',
    bio: '',
    roleTitle: '',
    roleTier: null,
    category: null,
    location: '',
    link: '',
    preferences: {
      generationSound: 'first',
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
    referralId: '',
    referrals: [],
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

  useEffect(() => {
    const syncWithDb = async () => {
      if (pubkeyStr && !dbSynced) {
        try {
            const dbProfile = await getProfile(pubkeyStr);
            if (dbProfile) {
            setState(prev => {
                const newState = { ...prev, ...dbProfile, profile: { ...prev.profile, ...dbProfile } };

                if (dbProfile.onboardingComplete === true) {
                    newState.onboardingComplete = true;
                }

                if (dbProfile.twitterHandle || dbProfile.discordHandle) {
                  newState.profile.socials = {
                    ...newState.profile.socials,
                    twitter: dbProfile.twitterHandle || newState.profile.socials.twitter,
                    discord: dbProfile.discordHandle || newState.profile.socials.discord,
                    isTwitterVerified: !!dbProfile.twitterHandle,
                    isDiscordVerified: !!dbProfile.discordHandle,
                  };
                }

                // Carry over name from auth if profile name is empty
                if (!newState.profile.displayName && authUser?.name) {
                  newState.profile.displayName = authUser.name;
                }

                return newState;
            });
            } else if (authUser?.name) {
              // No DB profile yet, but we have auth name
              setState(prev => ({
                ...prev,
                profile: {
                  ...prev.profile,
                  displayName: authUser.name
                }
              }));
            }
            setDbSynced(true);
        } catch (err) {
            console.error('🛡️ AppContext: Sync fault. Using local state.', err);
            setDbSynced(true); 
        }
      }
    };
    syncWithDb();
  }, [pubkeyStr, dbSynced, authUser]);

  useEffect(() => {
    const fetchTips = async () => {
      if (pubkeyStr && connected) {
        try {
          const isProd = import.meta.env.MODE === 'production';
          const API_BASE_URL = isProd ? window.location.origin : (import.meta.env.VITE_API_BASE_URL);
          
          const res = await fetch(`${API_BASE_URL}/api/solana/tips/history?address=${pubkeyStr}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              const allTips = data.tips || [];
              // Filter for received tips only for the revenue total
              const receivedTips = allTips.filter(t => t.recipient === pubkeyStr).map(t => ({
                ...t,
                amountUSDC: t.valueUsd // Map API field to UI expected field
              }));
              
              const total = receivedTips.reduce((acc, tip) => acc + (tip.amountUSDC || 0), 0);
              
              setState(prev => ({
                ...prev,
                tipsReceived: receivedTips,
                tipsSent: allTips.filter(t => t.sender === pubkeyStr),
                totalTipsUSDC: total
              }));
            }
          }
        } catch (err) {
          console.error('🛡️ AppContext: Tip hydration fault.', err);
        }
      }
    };
    fetchTips();
  }, [pubkeyStr, connected]);

  useEffect(() => {
    if (pubkeyStr && state !== defaultState) {
      localStorage.setItem(`${STORAGE_KEY}_${pubkeyStr}`, JSON.stringify(state));

      if (authUser) {
        if (!authUser.walletAddress || authUser.walletAddress === publicKey?.toBase58()) {
          saveProfile(pubkeyStr, {
            ...state.profile,
            onboardingComplete: state.onboardingComplete
          });
        }
      }
    }
  }, [state, pubkeyStr, authUser, publicKey]);

  const role = useMemo(() => {
    if (authLoading) return 'guest';

    if (!authUser) return 'guest';

    const isAdmin = authUser?.roles?.includes('admin');
    
    if (isAdmin || authUser?.onboardingComplete || authUser?.onboarding_complete || state.onboardingComplete) return 'creator';

    return 'user';
  }, [authUser, authLoading, state.onboardingComplete]);

  const update = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((partial) => {
    setState((prev) => {
      const newProfile = { ...prev.profile, ...partial };

      if (partial.socials) {
        newProfile.socials = {
          ...prev.profile.socials,
          ...partial.socials
        };
      }

      if (!newProfile.referralId) {
        const baseName = newProfile.solDomain
          ? newProfile.solDomain.replace('.tipstack.sol', '')
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
        newState.totalTipsUSDC = prev.totalTipsUSDC + (tip.amountUSDC || tip.valueUsd || 0);
      }
      return newState;
    });
  }, [pubkeyStr]);

  const claimHandle = useCallback(async (handle) => {
    if (!publicKey || !signMessage) throw new Error('Wallet connection required for handle verification.');
    
    const message = `Claiming Tip Stack handle: ${handle}`;
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await signMessage(encodedMessage);
    const signatureBase58 = bs58.encode(signature);

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
    <AppContext.Provider value={{ ...state, role, dbSynced, update, updateProfile, claimHandle, addTip, resetOnboarding, publicKey, connected, authUser, authLoading }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
