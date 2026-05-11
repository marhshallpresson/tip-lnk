import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useMemo } from 'react';

export function useFullAuth() {
  const { 
    isAuthenticated, 
    user, 
    authToken, 
    primaryWallet,
    sdkHasLoaded 
  } = useDynamicContext();

  const isFullyAuthenticated = useMemo(() => {
    return (
      sdkHasLoaded &&
      isAuthenticated &&
      !!authToken &&
      !!user &&
      !user?.scope?.includes('userDataForm') &&
      (user?.missingFields?.length === 0 || !user?.missingFields)
    );
  }, [isAuthenticated, authToken, user, sdkHasLoaded]);

  const isPartialAuth = useMemo(() => {
    return (
      sdkHasLoaded &&
      isAuthenticated &&
      (!authToken || user?.scope?.includes('userDataForm'))
    );
  }, [isAuthenticated, authToken, user, sdkHasLoaded]);

  return { 
    isFullyAuthenticated, 
    isPartialAuth,
    authToken, 
    user, 
    primaryWallet,
    sdkHasLoaded
  };
}
