import { useState, useCallback, useEffect } from 'react';
import { 
  initializeSDK, 
  initiate, 
  verify, 
  getBanks, 
  resolveBankAccount, 
  createOfframpOrder,
  getRateByAmount
} from 'paj_ramp';
import { useApp } from '../contexts/AppContext';

/**
 * usePajRamp Hook
 * Manages the PajCash off-ramping lifecycle for Nigerian Naira (NGN) payouts.
 */
export function usePajRamp() {
  const { authUser } = useApp();
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('paj_session_token'));
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);

  // Initialize SDK on load
  useEffect(() => {
    // Note: The SDK might require merchant configuration or environment settings
    // For now, we initialize as per the stateless wrapper pattern
    initializeSDK();
  }, []);

  // Persist session token
  useEffect(() => {
    if (sessionToken) {
      localStorage.setItem('paj_session_token', sessionToken);
    } else {
      localStorage.removeItem('paj_session_token');
    }
  }, [sessionToken]);

  const initiateAuth = useCallback(async (emailOrPhone) => {
    setError(null);
    try {
      const res = await initiate(emailOrPhone || authUser?.email);
      return res; // Should contain success status
    } catch (err) {
      setError(err.message || 'Failed to initiate OTP');
      throw err;
    }
  }, [authUser]);

  const verifyOTP = useCallback(async (emailOrPhone, otp) => {
    setIsVerifying(true);
    setError(null);
    try {
      const res = await verify(emailOrPhone || authUser?.email, otp);
      if (res && res.sessionToken) {
        setSessionToken(res.sessionToken);
        return res.sessionToken;
      }
      throw new Error('No session token returned');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, [authUser]);

  const fetchBanks = useCallback(async () => {
    if (banks.length > 0) return banks;
    setLoadingBanks(true);
    try {
      const bankList = await getBanks();
      setBanks(bankList);
      return bankList;
    } catch (err) {
      console.error('Failed to fetch banks', err);
      return [];
    } finally {
      setLoadingBanks(false);
    }
  }, [banks]);

  const resolveAccount = useCallback(async (bankId, accountNumber) => {
    if (!sessionToken) throw new Error('Authentication required');
    try {
      const res = await resolveBankAccount(sessionToken, bankId, accountNumber);
      return res; // Should contain accountName
    } catch (err) {
      throw err;
    }
  }, [sessionToken]);

  const getRate = useCallback(async (amount, type = 'offRamp') => {
    try {
      const rateData = await getRateByAmount(amount, type);
      return rateData; // contains userTax, merchantTax, totalReceived, etc.
    } catch (err) {
      console.error('Rate fetch failed', err);
      return null;
    }
  }, []);

  const createOrder = useCallback(async (amount, bankId, accountNumber, token = 'USDC') => {
    if (!sessionToken) throw new Error('Authentication required');
    try {
      const order = await createOfframpOrder(sessionToken, {
        amount,
        bank: bankId,
        accountNumber,
        token
      });
      return order; // Contains the deposit address
    } catch (err) {
      setError(err.message || 'Failed to create off-ramp order');
      throw err;
    }
  }, [sessionToken]);

  const logout = () => {
    setSessionToken(null);
  };

  return {
    sessionToken,
    banks,
    loadingBanks,
    isVerifying,
    error,
    initiateAuth,
    verifyOTP,
    fetchBanks,
    resolveAccount,
    createOrder,
    getRate,
    logout
  };
}
