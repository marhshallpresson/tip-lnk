import { useState, useEffect, useCallback, useRef } from 'react';

// ─── SendAI Kamino klend-sdk Simulation ───
const MAIN_MARKET = '7uSSTPu2SJYyR84i1zSvcr62TDR9X9eLoR9D9reW6RjO';

const RESERVES = [
  { mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', supplyApy: 12.4, totalDeposits: 450_200_000, logo: '💵' },
  { mint: 'So11111111111111111111111111111111111111112', symbol: 'SOL', supplyApy: 8.7, totalDeposits: 820_100_000, logo: '◎' },
  { mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', symbol: 'JUP', supplyApy: 15.2, totalDeposits: 120_400_000, logo: '🪐' },
];

const VAULTS = RESERVES.map(r => ({
  id: r.symbol.toLowerCase(),
  name: `${r.symbol} Reserve`,
  apy: r.supplyApy,
  tvl: r.totalDeposits,
  token: r.symbol,
  logo: r.logo
}));

export function useKamino(walletConnected) {
  const [positions, setPositions] = useState([]);
  const [selectedVault, setSelectedVault] = useState(VAULTS[0]);
  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [streamData, setStreamData] = useState({ connected: false, lastUpdate: null });
  const intervalRef = useRef(null);

  // Simulate WebSocket streaming of vault positions
  useEffect(() => {
    if (!walletConnected) return;

    // Load saved positions
    try {
      const saved = localStorage.getItem('kamino_positions');
      if (saved) setPositions(JSON.parse(saved));
    } catch {}

    // Simulate real-time streaming updates
    setStreamData({ connected: true, lastUpdate: Date.now() });

    intervalRef.current = setInterval(() => {
      setPositions((prev) =>
        prev.map((pos) => {
          const apyPerSecond = pos.apy / 100 / 365 / 24 / 3600;
          const elapsed = 5; // 5 second intervals
          const newEarnings = pos.deposited * apyPerSecond * elapsed;
          return {
            ...pos,
            earnings: pos.earnings + newEarnings,
            currentValue: pos.deposited + pos.earnings + newEarnings,
            lastUpdate: Date.now(),
          };
        })
      );
      setStreamData({ connected: true, lastUpdate: Date.now() });
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [walletConnected]);

  // Persist positions
  useEffect(() => {
    if (positions.length > 0) {
      localStorage.setItem('kamino_positions', JSON.stringify(positions));
    }
  }, [positions]);

  const deposit = useCallback(
    async (amount) => {
      setDepositing(true);
      
      // Simulate KaminoAction.buildDepositTxns(market, amount, mint)
      await new Promise((r) => setTimeout(r, 2000));

      const newPosition = {
        id: `pos-${Date.now()}`,
        market: MAIN_MARKET,
        vault: selectedVault.name,
        vaultId: selectedVault.id,
        deposited: amount,
        earnings: 0,
        currentValue: amount,
        apy: selectedVault.apy,
        depositedAt: Date.now(),
        lastUpdate: Date.now(),
        token: selectedVault.token,
      };

      setPositions((prev) => [...prev, newPosition]);
      setDepositing(false);
      return newPosition;
    },
    [selectedVault]
  );

  const withdraw = useCallback(async (positionId) => {
    setWithdrawing(true);
    await new Promise((r) => setTimeout(r, 2000));

    setPositions((prev) => prev.filter((p) => p.id !== positionId));
    setWithdrawing(false);
  }, []);

  const totalDeposited = positions.reduce((s, p) => s + p.deposited, 0);
  const totalEarnings = positions.reduce((s, p) => s + p.earnings, 0);
  const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);

  return {
    vaults: VAULTS,
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
    streamData,
  };
}
