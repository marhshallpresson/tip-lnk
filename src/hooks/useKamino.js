import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '../contexts/WalletContext';
import { KaminoMarket, KaminoAction, VanillaObligation, PROGRAM_ID } from '@kamino-finance/klend-sdk';
import { PublicKey, Transaction } from '@solana/web3.js';

const MAIN_MARKET = new PublicKey('7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF');

const MAINNET_RESERVES = [
  { id: 'usdc', name: 'USDC Reserve', token: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', apy: 12.5, tvl: 450000000, logo: '💵', multiplier: 1 },
  { id: 'sol', name: 'SOL Reserve', token: 'SOL', mint: 'So11111111111111111111111111111111111111112', apy: 8.2, tvl: 820000000, logo: '◎', multiplier: 1.5 },
];

export function useKamino(walletConnected) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [positions, setPositions] = useState([]);
  const [vaults, setVaults] = useState(MAINNET_RESERVES);
  const [selectedVault, setSelectedVault] = useState(MAINNET_RESERVES[0]);
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [streamData, setStreamData] = useState({ connected: false, lastUpdate: null });
  const [market, setMarket] = useState(null);

  useEffect(() => {
    let active = true;
    const fetchMarket = async () => {
      try {
        if (connection) {
          // Ensure connection methods are correctly bound to avoid prototype issues with some SDKs
          // Some older Anchor/Kamino versions might expect standard v1 behavior but fail on proxied objects
          const robustConnection = Object.create(connection);
          robustConnection.getAccountInfo = connection.getAccountInfo.bind(connection);
          robustConnection.getMultipleAccountsInfo = connection.getMultipleAccountsInfo.bind(connection);
          robustConnection.getLatestBlockhash = connection.getLatestBlockhash.bind(connection);

          const loadedMarket = await KaminoMarket.load(robustConnection, MAIN_MARKET);
          if (active) setMarket(loadedMarket);
        }
      } catch (err) {
        console.error("Failed to load Kamino Market:", err.message);
      }
    };
    fetchMarket();
    return () => { active = false; };
  }, [connection]);

  useEffect(() => {
    const fetchLiveApys = async () => {
      try {
        const response = await fetch('https://api.kamino.finance/v1/reserves');
        const data = await response.json();
        
        if (data?.reserves) {
          const updatedVaults = MAINNET_RESERVES.map(v => {
            const realRes = data.reserves.find(r => r.mint === v.mint);
            return realRes ? {
              ...v,
              apy: (realRes.supplyApy * 100).toFixed(2),
              tvl: realRes.totalDeposits
            } : v;
          });
          setVaults(updatedVaults);
        }
      } catch (e) {
        console.warn('🛡️ Kamino API fetch failed, using fallbacks');
      }
    };
    fetchLiveApys();
  }, []);

  useEffect(() => {
    let active = true;
    const fetchPositions = async () => {
      if (!publicKey || !market) return;
      try {
        await market.refreshAll();
        const obligation = await market.getUserVanillaObligation(publicKey);
        if (active && obligation) {
          const stats = obligation.refreshedStats;
          setPositions([{
            id: 'kamino-main',
            deposited: stats.depositedValue.toNumber(),
            currentValue: stats.netAccountValue.toNumber(),
            earnings: stats.netAccountValue.toNumber() - stats.depositedValue.toNumber()
          }]);
        }
      } catch (err) {
        console.error("Failed to fetch Kamino positions", err);
      }
    };
    fetchPositions();
    const interval = setInterval(fetchPositions, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [publicKey, market]);

  const deposit = useCallback(
    async (amount) => {
      if (!selectedVault || !publicKey || !connection) throw new Error("Missing requirements for deposit");
      setDepositing(true);

      try {
        const kaminoMarket = await KaminoMarket.load(connection, MAIN_MARKET);
        const action = await KaminoAction.buildDepositTxns(
          kaminoMarket,
          amount.toString(),
          selectedVault.token,
          publicKey,
          new VanillaObligation(PROGRAM_ID),
          0,
          true,
          undefined,
          undefined,
          "confirmed"
        );

        const tx = new Transaction().add(...action.setupIxs, ...action.lendingIxs, ...action.cleanupIxs);
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = publicKey;

        // In a production app, we would use the wallet adapter here
        // For the sake of this implementation, we assume the caller handles signing
        console.log(`Ready to sign Kamino deposit for ${amount} ${selectedVault.token}`);
        return tx;
      } catch (err) {
        console.error('Deposit construction failed:', err);
        throw err;
      } finally {
        setDepositing(false);
      }
    },
    [selectedVault, publicKey, connection]
  );

  const withdraw = useCallback(async (amount) => {
    if (!selectedVault || !publicKey || !connection) throw new Error("Missing requirements for withdrawal");
    setWithdrawing(true);
    try {
      const kaminoMarket = await KaminoMarket.load(connection, MAIN_MARKET);
      const action = await KaminoAction.buildWithdrawTxns(
        kaminoMarket,
        amount === 'max' ? 'max' : amount.toString(),
        selectedVault.token,
        publicKey,
        new VanillaObligation(PROGRAM_ID),
        0,
        true,
        undefined,
        "confirmed"
      );

      const tx = new Transaction().add(...action.setupIxs, ...action.lendingIxs, ...action.cleanupIxs);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      return tx;
    } catch (err) {
        console.error('Withdrawal construction failed:', err);
        throw err;
    } finally {
      setWithdrawing(false);
    }
  }, [selectedVault, publicKey, connection]);

  const totalDeposited = positions.reduce((s, p) => s + (p.deposited || 0), 0);
  const totalEarnings = positions.reduce((s, p) => s + (p.earnings || 0), 0);
  const totalValue = positions.reduce((s, p) => s + (p.currentValue || 0), 0);

  return {
    vaults,
    positions,
    selectedVault,
    setSelectedVault,
    deposit,
    withdraw,
    depositing,
    withdrawing,
    totalDeposited,
    totalEarnings,
    totalValue,
    streamData
  };
}
