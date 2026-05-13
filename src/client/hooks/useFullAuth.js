import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { useMemo } from 'react';

export function useFullAuth() {
  const {
    user,
    authToken,
    primaryWallet,
    sdkHasLoaded,
  } = useDynamicContext();

  const isLoggedIn = useIsLoggedIn();

  const isFullyAuthenticated = useMemo(() => {
    return (
      sdkHasLoaded &&
      isLoggedIn &&
      !!authToken &&
      !!user &&
      (user?.missingFields?.length === 0 || !user?.missingFields)
    );
  }, [isLoggedIn, authToken, user, sdkHasLoaded]);

  const isPartialAuth = useMemo(() => {
    return sdkHasLoaded && isLoggedIn && !authToken;
  }, [isLoggedIn, authToken, sdkHasLoaded]);

  return {
    isFullyAuthenticated,
    isPartialAuth,
    authToken,
    user,
    primaryWallet,
    sdkHasLoaded,
  };
}
