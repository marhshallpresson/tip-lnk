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

  useEffect(() => {
    initializeSDK();
  }, []);

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
      return res;
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
    setLoadingBanks(true);
    try {
      const bankList = await getBanks();
      setBanks(bankList || []);
      return bankList || [];
    } catch (err) {
      console.error('usePajRamp: Failed to fetch banks', err);
      return [];
    } finally {
      setLoadingBanks(false);
    }
  }, []);

  const resolveAccount = useCallback(async (bankId, accountNumber) => {
    if (!sessionToken) throw new Error('Authentication required');
    try {
      const res = await resolveBankAccount(sessionToken, bankId, accountNumber);
      return res;
    } catch (err) {
      console.error('usePajRamp: Resolve error', err);
      throw err;
    }
  }, [sessionToken]);

  const getRate = useCallback(async (amount, type = 'offRamp') => {
    if (!amount || isNaN(amount)) return null;
    try {
      const rateData = await getRateByAmount(amount, type);
      return rateData;
    } catch (err) {
      console.error('usePajRamp: Rate fetch failed', err);
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
      return order;
    } catch (err) {
      const msg = err.message || 'Failed to create off-ramp order';
      setError(msg);
      throw new Error(msg);
    }
  }, [sessionToken]);

  const logout = useCallback(() => {
    setSessionToken(null);
    setBanks([]);
  }, []);

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
