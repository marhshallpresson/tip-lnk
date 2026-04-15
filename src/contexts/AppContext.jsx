import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
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
    socials: {
      twitter: null,
      discord: null,
      isTwitterVerified: false,
      isDiscordVerified: false,
    },
    referralCode: 'REF-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
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
  const { publicKey, connected, wallet } = useWallet();
  const pubkeyStr = publicKey?.toBase58() || null;
  
  const [state, setState] = useState(defaultState);
  const [dbSynced, setDbSynced] = useState(false);
  const [agent, setAgent] = useState(null);

  // ─── Initialize AI Agent ───
  useEffect(() => {
    const initAgent = async () => {
      if (connected && wallet && pubkeyStr) {
        try {
          // In production: import { SolanaAgentKit } from 'solana-agent-kit'
          // We provide the interface for AI-driven autonomous distribution
          console.log(`AI Agent Initialized for ${pubkeyStr} - Ready for Phase 2 Autonomy`);
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

  // ─── Phase 2: Supabase Infrastructure Sync ───
  useEffect(() => {
    const syncWithDb = async () => {
      if (pubkeyStr && !dbSynced) {
        console.log('Syncing with Supabase via eitherway.ai...');
        const dbProfile = await getProfile(pubkeyStr);
        if (dbProfile) {
          setState(prev => ({ ...prev, ...dbProfile }));
        }
        setDbSynced(true);
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
      
      // Remote Sync (Supabase via eitherway.ai)
      saveProfile(pubkeyStr, state);
    }
  }, [state, pubkeyStr]);

  const role = useMemo(() => {
    if (!connected || !pubkeyStr) return 'guest';
    if (state.onboardingComplete) return 'creator';
    return 'user';
  }, [connected, pubkeyStr, state.onboardingComplete]);

  const update = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((partial) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...partial },
    }));
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
    if (pubkeyStr) {
      logTip(pubkeyStr, tip, isSent);
    }
  }, [pubkeyStr]);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    if (pubkeyStr) {
      localStorage.removeItem(`${STORAGE_KEY}_${pubkeyStr}`);
    }
  }, [pubkeyStr]);

  return (
    <AppContext.Provider value={{ ...state, role, dbSynced, agent, update, updateProfile, addTip, resetOnboarding }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
