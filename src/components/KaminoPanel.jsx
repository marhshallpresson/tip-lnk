import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useKamino } from '../hooks/useKamino';
import {
  TrendingUp,
  DollarSign,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Vault,
  Percent,
  Clock,
  Wifi,
} from 'lucide-react';

export default function KaminoPanel() {
  const { connected } = useWallet();
  const {
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
    streamData,
  } = useKamino(connected);

  const [depositAmount, setDepositAmount] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);

  const handleDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) return;
    await deposit(amt);
    setDepositAmount('');
    setShowDeposit(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-brand-400" />
            <span className="text-surface-500 text-sm">Total Deposited</span>
          </div>
          <p className="text-2xl font-bold">${totalDeposited.toFixed(2)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-accent-green" />
            <span className="text-surface-500 text-sm">Total Earnings</span>
          </div>
          <p className="text-2xl font-bold text-accent-green">+${totalEarnings.toFixed(4)}</p>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-accent-cyan" />
            <span className="text-surface-500 text-sm">Portfolio Value</span>
          </div>
          <p className="text-2xl font-bold">${totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Stream Status */}
      <div className="flex items-center gap-2 text-xs text-surface-500">
        <Wifi
          size={12}
          className={streamData.connected ? 'text-accent-green' : 'text-accent-red'}
        />
        <span>
          {streamData.connected ? 'Live streaming' : 'Disconnected'}
          {streamData.lastUpdate &&
            ` — last update ${new Date(streamData.lastUpdate).toLocaleTimeString()}`}
        </span>
      </div>

      {/* Vault Selector & Deposit */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">Kamino Vaults</h3>
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className="btn-primary text-sm py-2 px-4"
          >
            {showDeposit ? 'Cancel' : '+ New Deposit'}
          </button>
        </div>

        {showDeposit && (
          <div className="bg-surface-800/50 rounded-xl p-5 mb-5 space-y-4">
            <div>
              <label className="text-sm text-surface-400 mb-2 block">Select Vault</label>
              <div className="grid grid-cols-3 gap-3">
                {vaults.map((vault) => (
                  <button
                    key={vault.id}
                    onClick={() => setSelectedVault(vault)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedVault.id === vault.id
                        ? 'border-brand-500 bg-brand-600/10'
                        : 'border-surface-700 hover:border-surface-500'
                    }`}
                  >
                    <p className="font-semibold text-sm">{vault.name}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Percent size={12} className="text-accent-green" />
                      <span className="text-accent-green text-sm font-medium">{vault.apy}% APY</span>
                    </div>
                    <p className="text-[10px] text-surface-500 mt-1">
                      TVL: ${(vault.tvl / 1_000_000).toFixed(1)}M
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-surface-400 mb-2 block">Deposit Amount (USDC)</label>
              <input
                type="number"
                className="input-field w-full"
                placeholder="0.00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
            </div>

            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount || parseFloat(depositAmount) <= 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {depositing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Depositing...
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} />
                  Deposit to {selectedVault.name}
                </>
              )}
            </button>
          </div>
        )}

        {/* Active Positions */}
        {positions.length === 0 ? (
          <div className="text-center py-10">
            <TrendingUp size={32} className="text-surface-700 mx-auto mb-3" />
            <p className="text-surface-500">No active positions. Deposit USDC to start earning.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {positions.map((pos) => (
              <div key={pos.id} className="bg-surface-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center">
                      <TrendingUp size={16} className="text-brand-400" />
                    </div>
                    <div>
                      <p className="font-semibold">{pos.vault}</p>
                      <p className="text-accent-green text-sm">{pos.apy}% APY</p>
                    </div>
                  </div>
                  <button
                    onClick={() => withdraw(pos.id)}
                    disabled={withdrawing}
                    className="text-sm text-surface-400 hover:text-accent-red transition-colors flex items-center gap-1"
                  >
                    {withdrawing ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <ArrowDownRight size={14} />
                    )}
                    Withdraw
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-surface-500 text-xs">Deposited</p>
                    <p className="font-medium">${pos.deposited.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Earnings</p>
                    <p className="font-medium text-accent-green">+${pos.earnings.toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 text-xs">Current Value</p>
                    <p className="font-medium">${pos.currentValue.toFixed(2)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-3 text-[10px] text-surface-600">
                  <Clock size={10} />
                  <span>Deposited {new Date(pos.depositedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
