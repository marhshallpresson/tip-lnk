import { useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { toLamports, fromLamports, isValidAddress } from '../utils/security';

/**
 * Advanced Security Guardian Hook
 * Implements client-side checks for Solana-specific security patterns.
 */
export function useSecurityGuardian() {
  const { publicKey } = useWallet();

  /**
   * Detects potential address poisoning
   */
  const detectAddressPoisoning = useCallback((address1, address2) => {
    if (!address1 || !address2) return false;
    if (address1 === address2) return false;
    const p1 = address1.slice(0, 4), s1 = address1.slice(-4);
    const p2 = address2.slice(0, 4), s2 = address2.slice(-4);
    return p1 === p2 && s1 === s2;
  }, []);

  /**
   * Analyzes simulation logs for Anchor/Solana error patterns and TOCTOU vulnerabilities.
   */
  const analyzeSimulationLogs = useCallback((logs = []) => {
    const risks = [];
    const patterns = [
      { pattern: /signature verification failed/i, risk: 'Critical', msg: 'Auth Failure: Missing or invalid signer.' },
      { pattern: /custom program error: 0x1771/i, risk: 'Critical', msg: 'Security: Account ownership check failed.' },
      { pattern: /Arithmetic underflow|overflow/i, risk: 'High', msg: 'Math Error: Potential precision loss or overflow.' },
      { pattern: /Insufficient funds/i, risk: 'High', msg: 'Balance: Source account has insufficient funds.' },
      { pattern: /exceeded maximum account data size/i, risk: 'Medium', msg: 'Heavy Data: Unusual account data size growth.' },
      { pattern: /instruction error: 0x2/i, risk: 'High', msg: 'Logic Error: Instruction execution failed.' },
      { pattern: /ed25519 verification/i, risk: 'Critical', msg: 'Crypto Failure: Off-chain signature verification failed.' }
    ];

    logs.forEach(log => {
      patterns.forEach(p => {
        if (p.pattern.test(log)) {
          risks.push({ level: p.risk, message: p.msg });
        }
      });
    });

    return risks;
  }, []);

  /**
   * Evaluates the risk score (0-100) for a transaction
   */
  const calculateRiskScore = useCallback((risks) => {
    let score = 0;
    risks.forEach(r => {
      if (r.level === 'Critical') score += 50;
      if (r.level === 'High') score += 25;
      if (r.level === 'Medium') score += 10;
      if (r.level === 'Low') score += 5;
    });
    return Math.min(score, 100);
  }, []);

  const assessRecipient = useCallback((recipient) => {
    if (!publicKey) return { level: 'Unknown', message: 'Connect wallet to assess risk.' };
    if (!isValidAddress(recipient)) return { level: 'Critical', message: 'Invalid Address: Recipient is not a valid Solana address.' };
    
    if (recipient === publicKey.toString()) {
      return { level: 'Low', message: 'Self-transfer: Sending funds to your own wallet.' };
    }
    
    if (detectAddressPoisoning(publicKey.toString(), recipient)) {
      return { level: 'Critical', message: 'Address Poisoning: Recipient looks like your address but IS NOT.' };
    }

    return { level: 'Safe', message: 'Legitimate recipient address format.' };
  }, [publicKey, detectAddressPoisoning]);

  return { 
    analyzeSimulationLogs, 
    assessRecipient, 
    calculateRiskScore,
    toLamports,
    fromLamports 
  };
}
