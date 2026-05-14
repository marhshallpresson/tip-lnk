import { getAuthToken, useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { useMemo } from 'react';

const readAuthToken = (candidateToken) => {
  if (candidateToken) return candidateToken;
  try {
    return getAuthToken() || null;
  } catch {
    return null;
  }
};

export function useFullAuth() {
  const {
    user,
    authToken,
    primaryWallet,
    sdkHasLoaded,
  } = useDynamicContext();

  const isLoggedIn = useIsLoggedIn();
  const resolvedAuthToken = readAuthToken(authToken);

  const isFullyAuthenticated = useMemo(() => {
    return (
      sdkHasLoaded &&
      isLoggedIn &&
      !!resolvedAuthToken &&
      !!user &&
      (user?.missingFields?.length === 0 || !user?.missingFields)
    );
  }, [isLoggedIn, resolvedAuthToken, user, sdkHasLoaded]);

  const isPartialAuth = useMemo(() => {
    return sdkHasLoaded && isLoggedIn && !resolvedAuthToken;
  }, [isLoggedIn, resolvedAuthToken, sdkHasLoaded]);

  return {
    isFullyAuthenticated,
    isPartialAuth,
    authToken: resolvedAuthToken,
    user,
    primaryWallet,
    sdkHasLoaded,
  };
}
