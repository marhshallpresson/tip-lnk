import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

const STORAGE_KEY = 'creator_hub_state';

const defaultState = {
  onboardingStep: 0,
  onboardingComplete: false,
  profile: {
    nftAvatar: null,
    solDomain: null,
    displayName: '',
  },
  nfts: [],
  nftsLoading: false,
  tipsReceived: [],
  kaminoPositions: [],
  totalTipsUSDC: 0,
  kaminoDeposited: 0,
  kaminoEarnings: 0,
};

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaultState, ...JSON.parse(saved) };
  } catch {}
  return defaultState;
}

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((partial) => {
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  const updateProfile = useCallback((partial) => {
    setState((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...partial },
    }));
  }, []);

  const addTip = useCallback((tip) => {
    setState((prev) => ({
      ...prev,
      tipsReceived: [tip, ...prev.tipsReceived],
      totalTipsUSDC: prev.totalTipsUSDC + tip.amountUSDC,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AppContext.Provider value={{ ...state, update, updateProfile, addTip, resetOnboarding }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
